import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import {
  isInstallableDesktopModule,
  isDesktopKitPackage,
  shortName,
  getPackagesRequiredByTheme
} from './workspace.js'
import {
  readDesktopConfig,
  readDesktopDependencies,
  writeDesktopConfig,
  resolveConfigPathForWrite,
} from './config.js'
import {
  installPackage,
  materializeToWorkspace,
  runPrepareModules,
  spawnAsync,
  resolveInstallPlan,
  cloneRepo,
  hasLocalWorkspaceSource,
  linkWorkspacePackage,
} from './install.js'
import {
  mergeInstalled,
} from './catalog.js'
import {
  progressTrack,
  radarSpinner,
  spinnerFrameCount,
} from './tuiAscii.js'
function keyHint(key) {
  return `{green-fg}[${key}]{/}`
}

/**
 * Executes the save changes install plan.
 * @param {any} ctx
 */
export async function executeInstallPlan(ctx) {
  ctx.stopSpinner()
  let installSpinnerTimer = null
  const plan = ctx.collectInstallPlan()
  const { packagesToInstall, packagesToMaterialize } = plan
  let { nextApps, nextModules, nextTheme } = plan

  const config = ctx.getConfig()
  const settings = ctx.getSettings()
  const workspaceRoot = ctx.getWorkspaceRoot()
  const installChoices = ctx.getInstallChoices()
  const paths = ctx.getPaths()

  const currentDeps = readDesktopDependencies(paths.packageJson)

  const wizardSet = new Set([...packagesToInstall, ...packagesToMaterialize])
  const confirmed = (pkg) =>
    !wizardSet.has(pkg) ||
    installChoices.has(pkg) ||
    currentDeps.includes(pkg) ||
    hasLocalWorkspaceSource(workspaceRoot, pkg)

  nextApps = nextApps.filter(confirmed)
  nextModules = nextModules.filter(confirmed)
  if (
    nextTheme &&
    wizardSet.has(nextTheme) &&
    !installChoices.has(nextTheme) &&
    !currentDeps.includes(nextTheme) &&
    !hasLocalWorkspaceSource(workspaceRoot, nextTheme)
  ) {
    nextTheme = config.theme
    ctx.setPendingTheme(config.theme)
  }

  const toInstall = packagesToInstall.filter((pkg) => installChoices.has(pkg))
  const toMaterialize = packagesToMaterialize.filter((pkg) => installChoices.has(pkg))

  const activePackages = [...nextApps, ...nextModules, nextTheme].filter(Boolean)
  const toLink = []
  for (const pkgName of activePackages) {
    if (!currentDeps.includes(pkgName)) {
      if (hasLocalWorkspaceSource(workspaceRoot, pkgName)) {
        toLink.push(pkgName)
      }
    }
  }

  const gitPackages = [...toInstall, ...toMaterialize].filter(
    (pkg) => installChoices.get(pkg)?.type === 'git'
  )

  const actualMaterialize = toMaterialize.filter((pkg) => {
    const choice = installChoices.get(pkg)
    return choice && choice.type !== 'npm'
  })

  const gitToInstall = toInstall.filter((pkg) => installChoices.get(pkg)?.type === 'git')
  const expectedClonedPackages = [...gitToInstall, ...actualMaterialize, ...toLink]
  const willClone = expectedClonedPackages.length > 0

  let calculatedTotal = 1 // Initializing
  calculatedTotal += gitPackages.length // Pre-clonings
  calculatedTotal += toLink.length // Linking loop
  calculatedTotal += toInstall.length // Installing loop
  calculatedTotal += actualMaterialize.length // Cloning loop
  if (willClone) {
    calculatedTotal += 1 // Installing dependencies
    calculatedTotal += expectedClonedPackages.length // Preparing loop
    calculatedTotal += 1 // Finalizing workspace
  }
  calculatedTotal += 1 // Updating configuration

  const totalSteps = calculatedTotal
  let step = 0
  let didClone = false
  /** @type {Array<{pkg: string, error: string}>} */
  const failures = []

  const bump = (label) => {
    step++
    const currentStep = Math.min(step, totalSteps)
    ctx.setSaveProgress({ step: currentStep, total: totalSteps, label })
    ctx.setStatus(label)

    // Update the progress modal content
    const bar = `[${progressTrack(currentStep, totalSteps, 0, 36)}]`
    const spin = radarSpinner(ctx.getSpinnerFrame())
    let displayLabel = label
    if (label.startsWith('Cloning ')) {
      displayLabel = `Cloning: ${label.slice(8).replace(/…$/, '')}`
    } else if (label.startsWith('Installing ') && label !== 'Installing dependencies…') {
      displayLabel = `Installing: ${label.slice(11).replace(/…$/, '')}`
    } else if (label.startsWith('Preparing ') && label !== 'Preparing…') {
      displayLabel = `Preparing: ${label.slice(10).replace(/—$/, '')}`
    }

    ctx.installProgressContent.setContent(
      [
        `  {bold}${spin} ${displayLabel}{/}`,
        '',
        `  {cyan-fg}${bar}{/}`,
        `  Step ${currentStep} of ${totalSteps}`,
      ].join('\n')
    )

    ctx.screen.render()
  }

  ctx.setInstalling(true)
  ctx.updateCatalogKeysState()
  ctx.installProgressOverlay.show()
  ctx.installProgressOverlay.setFront()
  ctx.installProgressOverlay.focus()

  installSpinnerTimer = setInterval(() => {
    ctx.setSpinnerFrame((ctx.getSpinnerFrame() + 1) % spinnerFrameCount)
    ctx.renderHelp()

    // Update spinner in modal
    const saveProgress = ctx.getSaveProgress()
    if (saveProgress !== null) {
      const bar = `[${progressTrack(saveProgress.step, saveProgress.total, 0, 36)}]`
      const spin = radarSpinner(ctx.getSpinnerFrame())
      let displayLabel = saveProgress.label
      if (displayLabel.startsWith('Cloning ')) {
        displayLabel = `Cloning: ${displayLabel.slice(8).replace(/…$/, '')}`
      } else if (displayLabel.startsWith('Installing ') && displayLabel !== 'Installing dependencies…') {
        displayLabel = `Installing: ${displayLabel.slice(11).replace(/…$/, '')}`
      } else if (displayLabel.startsWith('Preparing ') && displayLabel !== 'Preparing…') {
        displayLabel = `Preparing: ${displayLabel.slice(10).replace(/—$/, '')}`
      }
      ctx.installProgressContent.setContent(
        [
          `  {bold}${spin} ${displayLabel}{/}`,
          '',
          `  {cyan-fg}${bar}{/}`,
          `  Step ${saveProgress.step} of ${saveProgress.total}`,
        ].join('\n')
      )
    }

    ctx.screen.render()
  }, 150)

  try {
    bump('Initializing…')

    // Pre-clone all Git repositories first to prevent pnpm workspace failures on missing packages
    if (gitPackages.length > 0) {
      for (const pkg of gitPackages) {
        bump(`Cloning ${shortName(pkg)}…`)
        const choice = installChoices.get(pkg)
        const plan = await resolveInstallPlan(pkg, settings, workspaceRoot, choice)
        if (!plan.error && plan.targetDir && plan.source?.gitUrl) {
          try {
            await cloneRepo(plan.targetDir, plan.source.gitUrl, undefined, workspaceRoot, { quiet: true })
          } catch (err) {
            // Non-fatal pre-clone failure
          }
        }
      }
    }

    const clonedPackages = []

    if (toLink.length > 0) {
      for (const pkg of toLink) {
        bump(`Linking ${shortName(pkg)}…`)
        try {
          await linkWorkspacePackage(paths.desktop, pkg)
          clonedPackages.push(pkg)
          didClone = true
        } catch (err) {
          const msg = err.message?.split('\n').find(l => l.trim()) ?? String(err)
          failures.push({ pkg, error: msg })
          nextApps = nextApps.filter((p) => p !== pkg)
          nextModules = nextModules.filter((p) => p !== pkg)
          if (nextTheme === pkg) {
            nextTheme = config.theme
            ctx.setPendingTheme(config.theme)
          }
          ctx.setStatus(`${shortName(pkg)}: ${msg}`, 'error')
          ctx.screen.render()
        }
      }
    }

    for (const pkg of toInstall) {
      const choice = installChoices.get(pkg)
      bump(`Installing ${shortName(pkg)}…`)
      try {
        await installPackage(pkg, settings, workspaceRoot, {
          stdio: 'pipe',
          sourceChoice: choice,
        })
        if (choice?.type === 'git') {
          didClone = true
          clonedPackages.push(pkg)
        }
      } catch (err) {
        const msg = err.message?.split('\n').find(l => l.trim()) ?? String(err)
        failures.push({ pkg, error: msg })
        nextApps = nextApps.filter((p) => p !== pkg)
        nextModules = nextModules.filter((p) => p !== pkg)
        if (nextTheme === pkg) {
          nextTheme = config.theme
          ctx.setPendingTheme(config.theme)
        }
        ctx.setStatus(`${shortName(pkg)}: ${msg}`, 'error')
        ctx.screen.render()
      }
    }

    for (const pkg of toMaterialize) {
      const choice = installChoices.get(pkg)
      if (!choice || choice.type === 'npm') continue
      bump(`Cloning ${shortName(pkg)}…`)
      try {
        await materializeToWorkspace(pkg, settings, workspaceRoot, {
          stdio: 'pipe',
          sourceChoice: choice,
        })
        didClone = true
        clonedPackages.push(pkg)
      } catch (err) {
        const msg = err.message?.split('\n').find(l => l.trim()) ?? String(err)
        failures.push({ pkg, error: msg })
        ctx.setStatus(`${shortName(pkg)}: ${msg}`, 'error')
        ctx.screen.render()
      }
    }

    if (didClone) {
      bump('Installing dependencies…')
      try {
        await spawnAsync('pnpm', ['install'], { cwd: workspaceRoot })
      } catch {
        // Non-fatal
      }

      for (const pkg of clonedPackages) {
        bump(`Preparing ${shortName(pkg)}…`)
        try {
          await spawnAsync('pnpm', ['--filter', pkg, 'run', 'dev:prepare'], { cwd: workspaceRoot })
        } catch {
          // Non-fatal
        }
      }

      bump('Finalizing workspace…')
      await runPrepareModules(workspaceRoot, 'pipe')
    }

    bump('Updating configuration…')
    ctx.setWritingConfig(true)
    writeDesktopConfig(resolveConfigPathForWrite(paths), workspaceRoot, {
      theme: nextTheme,
      apps: nextApps,
      modules: nextModules,
    })

    for (const pkg of config.apps ?? []) {
      if (!nextApps.includes(pkg)) {
        await spawnAsync('pnpm', ['remove', pkg], { cwd: paths.desktop })
      }
    }
    for (const pkg of config.modules ?? []) {
      if (!nextModules.includes(pkg)) {
        await spawnAsync('pnpm', ['remove', pkg], { cwd: paths.desktop })
      }
    }

    pendingPackages.clear()
    installChoices.clear()
    paths.config = resolveConfigPathForWrite(paths)
    ctx.setPaths(paths)

    let configError = null
    let newConfig = config
    try {
      newConfig = readDesktopConfig(paths.config, workspaceRoot)
    } catch (err) {
      configError = err.message
      newConfig = { apps: [], modules: [], theme: null }
    }
    ctx.setConfig(newConfig)
    ctx.setConfigError(configError)

    const newDeps = readDesktopDependencies(paths.packageJson)
    ctx.setDeps(newDeps)
    ctx.setPendingTheme(newConfig.theme)
    ctx.setSaveProgress(null)

    if (ctx.getConfigRestartHintTimer()) {
      clearTimeout(ctx.getConfigRestartHintTimer())
      ctx.setConfigRestartHintTimer(null)
    }
    if (ctx.isDevServerUp()) {
      ctx.setConfigRestartHintUntil(Date.now() + 5000)
      ctx.setConfigRestartHintTimer(setTimeout(() => {
        ctx.setConfigRestartHintUntil(0)
        ctx.setConfigRestartHintTimer(null)
        ctx.renderClient()
        ctx.screen.render()
      }, 5000))
    }

    ctx.renderAll()

    setTimeout(() => {
      ctx.setWritingConfig(false)
    }, 500)

    if (failures.length > 0) {
      const names = failures.map((f) => shortName(f.pkg)).join(', ')
      const detail = failures[0].error
      ctx.setStatus(
        `${failures.length} package(s) failed (${names}) — ${detail}`,
        'error',
      )
      return false
    } else {
      ctx.setStatus(
        ctx.isDevServerUp()
          ? 'Saved — desktop.config.ts updated; Nuxt restarts automatically (see dev server log)'
          : `Saved successfully — start dev server ${keyHint('d')} to apply`,
        'ok',
      )
      return true
    }
  } catch (err) {
    ctx.setWritingConfig(false)
    ctx.setSaveProgress(null)
    ctx.setStatus(`Save failed: ${err.message}`, 'error')
    return false
  } finally {
    if (installSpinnerTimer) {
      clearInterval(installSpinnerTimer)
    }
    ctx.setInstalling(false)
    ctx.installProgressOverlay.hide()
    ctx.updateCatalogKeysState()
    ctx.screen.render()
  }
}

/**
 * Unified startup install flow blocker.
 * @param {any} ctx
 * @param {{ isStartup?: boolean }} [opts]
 */
export async function runStartupInstallFlow(ctx, { isStartup = false } = {}) {
  ctx.stopSpinner()

  const paths = ctx.getPaths()
  const workspaceRoot = ctx.getWorkspaceRoot()
  const installChoices = ctx.getInstallChoices()
  const pendingPackages = ctx.getPendingPackages()
  const settings = ctx.getSettings()
  const catalog = ctx.getCatalog()

  // Reload latest config/deps state
  try {
    ctx.setConfig(readDesktopConfig(paths.config, workspaceRoot))
    ctx.setDeps(readDesktopDependencies(paths.packageJson))
  } catch {}

  const config = ctx.getConfig()
  const deps = ctx.getDeps()

  const plan = ctx.collectInstallPlan()
  let { nextApps, nextModules, nextTheme } = plan

  const allCloned = []
  let didClone = false
  const skippedKits = []

  async function cloneOrInstallPkg(pkg) {
    const choice = installChoices.get(pkg)
    if (!choice) return
    if (choice.type === 'npm') {
      try {
        await installPackage(pkg, settings, workspaceRoot, { stdio: 'pipe', sourceChoice: choice })
      } catch (err) {
        const msg = err.message?.split('\n').find(l => l.trim()) ?? String(err)
        ctx.setStatus(`${shortName(pkg)}: ${msg}`, 'error')
        ctx.screen.render()
      }
      return
    }
    try {
      await materializeToWorkspace(pkg, settings, workspaceRoot, { stdio: 'pipe', sourceChoice: choice })
      didClone = true
      allCloned.push(pkg)
    } catch (err) {
      const msg = err.message?.split('\n').find(l => l.trim()) ?? String(err)
      ctx.setStatus(`${shortName(pkg)}: ${msg}`, 'error')
      ctx.screen.render()
    }
  }

  const merged = mergeInstalled(catalog, config, deps, workspaceRoot)
  const missingAppsModules = merged
    .filter((item) => item.installed && !item.localSource && item.kind !== 'theme')
    .map((item) => item.name)

  const desiredTheme = ctx.getPendingTheme() ?? config.theme
  const themeMissing = !!(desiredTheme && !hasLocalWorkspaceSource(workspaceRoot, desiredTheme))
  const round1Queue = [...missingAppsModules, ...(themeMissing ? [desiredTheme] : [])]

  if (round1Queue.length > 0) {
    ctx.stopSpinner()
    ctx.renderAll()
    const success = await ctx.startInstallWizard(round1Queue, isStartup, { autoExecute: false })
    if (!success) {
      ctx.setStatus('Startup aborted', 'error')
      return false
    }
  }

  // Determine effective theme after wizard choices
  let activeTheme = desiredTheme
  if (themeMissing && !installChoices.has(desiredTheme)) {
    activeTheme = config.theme
    nextTheme = config.theme
    ctx.setPendingTheme(config.theme)
  }

  const activePackages = [...nextApps, ...nextModules, activeTheme].filter(Boolean)
  const toLink = []
  for (const pkgName of activePackages) {
    if (!deps.includes(pkgName)) {
      if (hasLocalWorkspaceSource(workspaceRoot, pkgName)) {
        toLink.push(pkgName)
      }
    }
  }

  const round1Confirmed = round1Queue.filter((pkg) => installChoices.has(pkg))
  const failedLinks = new Set()

  let dynTotal = round1Confirmed.length + toLink.length
  let step = 0
  const syncProgress = { step: 0, total: Math.max(dynTotal, 1), label: 'Initializing…' }

  let installSpinnerTimer = null

  const renderProgressContent = () => {
    let lbl = syncProgress.label
    if (lbl.startsWith('Cloning '))    lbl = `Cloning: ${lbl.slice(8).replace(/…$/, '')}`
    else if (lbl.startsWith('Preparing ')) lbl = `Preparing: ${lbl.slice(10).replace(/…$/, '')}`
    const bar  = `[${progressTrack(syncProgress.step, syncProgress.total, 0, 36)}]`
    const spin = radarSpinner(ctx.getSpinnerFrame())
    ctx.installProgressContent.setContent([
      `  {bold}${spin} ${lbl}{/}`,
      '',
      `  {cyan-fg}${bar}{/}`,
      `  Step ${syncProgress.step} of ${syncProgress.total}`,
    ].join('\n'))
  }

  const bump = (label, addSteps = 0) => {
    step++
    dynTotal += addSteps
    syncProgress.step  = Math.min(step, dynTotal)
    syncProgress.total = dynTotal
    syncProgress.label = label
    ctx.setStatus(label)
    renderProgressContent()
    ctx.screen.render()
  }

  const openProgress = () => {
    ctx.setInstalling(true)
    ctx.updateCatalogKeysState()
    ctx.installProgressOverlay.show()
    ctx.installProgressOverlay.setFront()
    ctx.installProgressOverlay.focus()
    renderProgressContent()
    ctx.screen.render()
  }

  const closeProgress = () => {
    if (installSpinnerTimer) { clearInterval(installSpinnerTimer); installSpinnerTimer = null }
    ctx.setInstalling(false)
    ctx.installProgressOverlay.hide()
    ctx.updateCatalogKeysState()
    ctx.screen.render()
  }

  const hasWork = round1Confirmed.length > 0 || toLink.length > 0
  if (hasWork) {
    openProgress()
    installSpinnerTimer = setInterval(() => {
      ctx.setSpinnerFrame((ctx.getSpinnerFrame() + 1) % spinnerFrameCount)
      ctx.renderHelp()
      renderProgressContent()
      ctx.screen.render()
    }, 150)
  }

  try {
    if (toLink.length > 0) {
      for (const pkg of toLink) {
        bump(`Linking ${shortName(pkg)}…`)
        try {
          await linkWorkspacePackage(paths.desktop, pkg)
          allCloned.push(pkg)
          didClone = true
        } catch (err) {
          const msg = err.message?.split('\n').find(l => l.trim()) ?? String(err)
          failedLinks.add(pkg)
          ctx.setStatus(`${shortName(pkg)}: ${msg}`, 'error')
          ctx.screen.render()
        }
      }
    }

    for (const pkg of round1Confirmed) {
      bump(`Cloning ${shortName(pkg)}…`)
      await cloneOrInstallPkg(pkg)
    }

    if (activeTheme) {
      const themeKits = getPackagesRequiredByTheme(workspaceRoot, activeTheme)
      const missingKits = themeKits.filter((kit) => !hasLocalWorkspaceSource(workspaceRoot, kit))

      if (missingKits.length > 0) {
        closeProgress()
        ctx.renderAll()

        const success = await ctx.startInstallWizard(missingKits, isStartup, {
          autoExecute: false,
          clearChoices: false,
        })

        const kitConfirmed = success
          ? missingKits.filter((kit) => installChoices.has(kit))
          : []
        const kitSkipped = missingKits.filter((kit) => !installChoices.has(kit))
        skippedKits.push(...kitSkipped)

        dynTotal += kitConfirmed.length
        syncProgress.total = dynTotal
        if (kitConfirmed.length > 0) {
          openProgress()
          installSpinnerTimer = setInterval(() => {
            ctx.setSpinnerFrame((ctx.getSpinnerFrame() + 1) % spinnerFrameCount)
            ctx.renderHelp()
            renderProgressContent()
            ctx.screen.render()
          }, 150)

          for (const kit of kitConfirmed) {
            bump(`Cloning ${shortName(kit)}…`)
            await cloneOrInstallPkg(kit)
          }
        }
      }
    }

    if (didClone) {
      if (!ctx.isInstalling()) {
        dynTotal += 1 + allCloned.length + 1
        syncProgress.total = dynTotal
        openProgress()
        installSpinnerTimer = setInterval(() => {
          ctx.setSpinnerFrame((ctx.getSpinnerFrame() + 1) % spinnerFrameCount)
          ctx.renderHelp()
          renderProgressContent()
          ctx.screen.render()
        }, 150)
      } else {
        bump('', 1 + allCloned.length + 1)
        step--
        syncProgress.step = step
      }

      bump('Installing dependencies…')
      try {
        await spawnAsync('pnpm', ['install'], { cwd: workspaceRoot })
      } catch {
        // Non-fatal
      }

      for (const pkg of allCloned) {
        bump(`Preparing ${shortName(pkg)}…`)
        try {
          await spawnAsync('pnpm', ['--filter', pkg, 'run', 'dev:prepare'], { cwd: workspaceRoot })
        } catch {
          // Non-fatal
        }
      }

      bump('Finalizing workspace…')
      await runPrepareModules(workspaceRoot, 'pipe')
    }
  } catch (err) {
    ctx.setStatus(`Install failed: ${err.message}`, 'error')
  } finally {
    closeProgress()
  }

  nextApps = (plan.nextApps ?? []).filter(
    (pkg) => (!installChoices.has(pkg) || installChoices.get(pkg) !== null) && !failedLinks.has(pkg)
  )
  nextModules = (plan.nextModules ?? []).filter(
    (pkg) => (!installChoices.has(pkg) || installChoices.get(pkg) !== null) && !failedLinks.has(pkg)
  )
  if (failedLinks.has(activeTheme)) {
    activeTheme = config.theme
  }
  nextTheme = activeTheme ?? nextTheme

  ctx.setWritingConfig(true)
  try {
    writeDesktopConfig(resolveConfigPathForWrite(paths), workspaceRoot, {
      theme: nextTheme,
      apps: nextApps,
      modules: nextModules,
    })

    for (const pkg of config.apps ?? []) {
      if (!nextApps.includes(pkg)) {
        await spawnAsync('pnpm', ['remove', pkg], { cwd: paths.desktop })
      }
    }
    for (const pkg of config.modules ?? []) {
      if (!nextModules.includes(pkg)) {
        await spawnAsync('pnpm', ['remove', pkg], { cwd: paths.desktop })
      }
    }

    pendingPackages.clear()
    installChoices.clear()
    paths.config = resolveConfigPathForWrite(paths)
    ctx.setPaths(paths)

    let configError = null
    let newConfig = config
    try {
      newConfig = readDesktopConfig(paths.config, workspaceRoot)
    } catch (err) {
      configError = err.message
      newConfig = { apps: [], modules: [], theme: null }
    }
    ctx.setConfig(newConfig)
    ctx.setConfigError(configError)

    const newDeps = readDesktopDependencies(paths.packageJson)
    ctx.setDeps(newDeps)
    ctx.setPendingTheme(newConfig.theme)
    ctx.setSaveProgress(null)

    if (ctx.getConfigRestartHintTimer()) {
      clearTimeout(ctx.getConfigRestartHintTimer())
      ctx.setConfigRestartHintTimer(null)
    }
    if (ctx.isDevServerUp()) {
      ctx.setConfigRestartHintUntil(Date.now() + 5000)
      ctx.setConfigRestartHintTimer(setTimeout(() => {
        ctx.setConfigRestartHintUntil(0)
        ctx.setConfigRestartHintTimer(null)
        ctx.renderClient()
        ctx.screen.render()
      }, 5000))
    }

    ctx.renderAll()
    setTimeout(() => { ctx.setWritingConfig(false) }, 500)

    if (skippedKits.length > 0) {
      const names = skippedKits.map(shortName).join(', ')
      ctx.setStatus(`Done — skipped kit(s): ${names} (server may not work correctly)`, 'warn')
    } else if (!isStartup) {
      ctx.setStatus(
        ctx.isDevServerUp()
          ? 'Saved — desktop.config.ts updated; Nuxt restarts automatically (see dev server log)'
          : `Saved successfully — start dev server ${keyHint('d')} to apply`,
        'ok',
      )
    }
  } catch (err) {
    ctx.setWritingConfig(false)
    ctx.setStatus(`Save failed: ${err.message}`, 'error')
    return false
  }

  return true
}
