import { execSync, spawn } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  appendFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { desktopMetaDir } from './workspace.js'
import {
  devSpawnCwd,
  devTargetLogLabel,
  normalizeDevTarget,
} from './playgroundContext.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function devPidPath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'dev.pid')
}

export function devLogPath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'dev.log')
}

function readPidFile(workspaceRoot) {
  const path = devPidPath(workspaceRoot)
  if (!existsSync(path)) return null
  const pid = Number.parseInt(readFileSync(path, 'utf8').trim(), 10)
  if (!Number.isFinite(pid)) return null
  try {
    process.kill(pid, 0)
    return pid
  } catch {
    try {
      unlinkSync(path)
    } catch {
      /* ignore */
    }
    return null
  }
}

export function findDevProcess() {
  const patterns = [
    'nuxt dev',
    'nuxi dev',
    'nx run desktop:serve',
    'node.*\\.nuxt',
    'desktop.*nuxt',
  ]

  for (const pattern of patterns) {
    try {
      const out = execSync(`pgrep -af ${JSON.stringify(pattern)}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      for (const line of out.split('\n').filter(Boolean)) {
        if (line.includes('pgrep')) continue
        const pid = Number.parseInt(line.trim().split(/\s+/)[0], 10)
        if (Number.isFinite(pid)) return { pid, cmdline: line.trim() }
      }
    } catch {
      /* try next pattern */
    }
  }

  return null
}

export function findProcessOnPort(port) {
  try {
    const out = execSync(`ss -tlnp 2>/dev/null | grep :${port} || lsof -i :${port} -t 2>/dev/null | head -1`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const pidMatch = out.match(/pid=(\d+)/) ?? out.match(/^(\d+)/m)
    if (pidMatch) {
      const pid = Number.parseInt(pidMatch[1], 10)
      if (Number.isFinite(pid)) return pid
    }
  } catch {
    /* ignore */
  }
  return null
}

export function readProcessStats(pid) {
  if (!pid || !existsSync(`/proc/${pid}/status`)) {
    return { memMb: 0, threads: 0, rssKb: 0 }
  }

  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf8')
    const vmRss = status.match(/^VmRSS:\s+(\d+)/m)?.[1]
    const threads = status.match(/^Threads:\s+(\d+)/m)?.[1]
    const rssKb = vmRss ? Number(vmRss) : 0
    return {
      memMb: rssKb ? Math.round(rssKb / 1024) : 0,
      rssKb,
      threads: threads ? Number(threads) : 0,
    }
  } catch {
    return { memMb: 0, threads: 0, rssKb: 0 }
  }
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█'

/** @param {number[]} samples RSS in MiB */
export function formatSparkline(samples) {
  if (!samples.length) return '—'
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const span = max - min || 1
  return samples
    .map((v) => {
      const idx = Math.min(
        SPARK_CHARS.length - 1,
        Math.floor(((v - min) / span) * (SPARK_CHARS.length - 1)),
      )
      return SPARK_CHARS[idx]
    })
    .join('')
}

/** @param {number} value @param {number} max @param {number} [width] */
export function formatBar(value, max, width = 12) {
  if (max <= 0) return '░'.repeat(width)
  const filled = Math.round((value / max) * width)
  return '█'.repeat(Math.min(width, filled)) + '░'.repeat(Math.max(0, width - filled))
}

export async function probeDevServer(port) {
  const url = `http://127.0.0.1:${port}/`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1200)
    const res = await fetch(url, { signal: controller.signal, redirect: 'manual' })
    clearTimeout(timer)
    return { up: true, status: res.status, url }
  } catch {
    return { up: false, status: 0, url }
  }
}

export async function getClientStatus(workspaceRoot, port) {
  const http = await probeDevServer(port)
  const fromFile = readPidFile(workspaceRoot)
  const fromPg = findDevProcess()
  const portPid = findProcessOnPort(port)

  const pid = fromPg?.pid ?? portPid ?? fromFile ?? null
  const stats = pid ? readProcessStats(pid) : { memMb: 0, threads: 0 }
  const running = http.up || Boolean(fromPg) || Boolean(portPid) || Boolean(fromFile)

  return {
    running,
    pid,
    http,
    stats,
    port,
    cmdline: fromPg?.cmdline ?? null,
  }
}

let devChild = null

/**
 * @param {import('./playgroundContext.js').DevTarget | string} target
 */
export function startDev(target) {
  const resolved = normalizeDevTarget(target)
  if (!resolved) {
    throw new Error('startDev: missing workspace root')
  }

  const { workspaceRoot } = resolved
  const spawnCwd = devSpawnCwd(resolved)

  if (devChild?.pid) {
    try {
      process.kill(devChild.pid, 0)
      return devChild
    } catch {
      devChild = null
    }
  }

  mkdirSync(desktopMetaDir(workspaceRoot), { recursive: true })
  const logPath = devLogPath(workspaceRoot)

  devChild = spawn('pnpm', ['run', 'dev'], {
    cwd: spawnCwd,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const appendLog = (chunk) => {
    try {
      appendFileSync(logPath, chunk)
    } catch {
      /* ignore */
    }
  }
  try {
    appendFileSync(
      logPath,
      `[owd] dev target: ${devTargetLogLabel(resolved)} (cwd ${spawnCwd})\n`,
    )
  } catch {
    /* ignore */
  }
  devChild.stdout?.on('data', appendLog)
  devChild.stderr?.on('data', appendLog)

  devChild.unref()
  writeFileSync(devPidPath(workspaceRoot), String(devChild.pid))
  return devChild
}

export function stopDev(workspaceRoot, pid) {
  const fromPg = findDevProcess()
  const targets = new Set([pid, fromPg?.pid, readPidFile(workspaceRoot)].filter(Boolean))

  for (const p of targets) {
    try {
      process.kill(-p, 'SIGTERM')
    } catch {
      try {
        process.kill(p, 'SIGTERM')
      } catch {
        /* ignore */
      }
    }
  }

  try {
    unlinkSync(devPidPath(workspaceRoot))
  } catch {
    /* ignore */
  }

  devChild = null
  return targets.size > 0
}

export async function waitForDevStop(workspaceRoot, port, timeoutMs = 10_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const status = await getClientStatus(workspaceRoot, port)
    if (!status.running && !status.http.up) return status
    await sleep(500)
  }
  return getClientStatus(workspaceRoot, port)
}

export async function waitForDev(workspaceRoot, port, timeoutMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const status = await getClientStatus(workspaceRoot, port)
    if (status.http.up) return status
    await sleep(1500)
  }
  return getClientStatus(workspaceRoot, port)
}

export function runScript(workspaceRoot, script) {
  return spawn('pnpm', ['run', script], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: false,
  })
}

/** Run dev in the foreground (`desktop dev`). */
export function runDevForeground(target) {
  const resolved = normalizeDevTarget(target)
  if (!resolved) {
    console.error('Not inside an OWD workspace.')
    process.exit(1)
  }

  const spawnCwd = devSpawnCwd(resolved)
  if (resolved.mode === 'playground' && resolved.packageName) {
    console.log(`Starting playground: ${resolved.packageName}`)
  }

  const child = spawn('pnpm', ['run', 'dev'], {
    cwd: spawnCwd,
    stdio: 'inherit',
    shell: false,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}
