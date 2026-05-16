import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { SCOPE } from './workspace.js'

const require = createRequire(import.meta.url)

function loadTsMorph(workspaceRoot) {
  const utilPath = join(
    workspaceRoot,
    'node_modules/@owdproject/nx/dist/utils/utilConfig.js',
  )
  if (!existsSync(utilPath)) {
    throw new Error('Missing @owdproject/nx — run pnpm install at the repo root.')
  }
  const { Project, SyntaxKind } = require('ts-morph')
  return { Project, SyntaxKind }
}

function getConfigObject(sourceFile, SyntaxKind) {
  const exportDefault = sourceFile.getExportAssignmentOrThrow((exp) => !exp.isExportEquals())
  const callExpr = exportDefault.getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
  const args = callExpr.getArguments()
  if (args.length === 0) throw new Error('defineDesktopConfig({}) is empty')
  return args[0].asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
}

function readArrayProperty(configObj, key, SyntaxKind) {
  const prop = configObj.getProperty(key)?.asKind(SyntaxKind.PropertyAssignment)
  if (!prop) return []
  const init = prop.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression)
  if (!init) return []
  return init
    .getElements()
    .map((el) => el.getText().trim().replace(/['"`]/g, ''))
    .filter(Boolean)
}

function readTheme(configObj, SyntaxKind) {
  const prop = configObj.getProperty('theme')?.asKind(SyntaxKind.PropertyAssignment)
  if (!prop) return null
  return prop.getInitializer()?.getText().trim().replace(/['"`]/g, '') ?? null
}

function setArrayProperty(configObj, key, values, SyntaxKind) {
  const quoted = values.map((v) => `'${v}'`).join(', ')
  const initializer = `[ ${quoted} ]`
  const existing = configObj.getProperty(key)?.asKind(SyntaxKind.PropertyAssignment)
  if (existing) {
    existing.setInitializer(initializer)
  } else {
    configObj.addPropertyAssignment({ name: key, initializer })
  }
}

export function readDesktopConfig(configPath, workspaceRoot) {
  const { Project, SyntaxKind } = loadTsMorph(workspaceRoot)
  const project = new Project()
  const sourceFile = project.addSourceFileAtPath(configPath)
  const configObj = getConfigObject(sourceFile, SyntaxKind)

  return {
    theme: readTheme(configObj, SyntaxKind),
    apps: readArrayProperty(configObj, 'apps', SyntaxKind),
    modules: readArrayProperty(configObj, 'modules', SyntaxKind),
  }
}

export function writeDesktopConfig(configPath, workspaceRoot, state) {
  const { Project, SyntaxKind } = loadTsMorph(workspaceRoot)
  const project = new Project()
  const sourceFile = project.addSourceFileAtPath(configPath)
  const configObj = getConfigObject(sourceFile, SyntaxKind)

  if (state.theme) {
    const themeProp = configObj.getProperty('theme')?.asKind(SyntaxKind.PropertyAssignment)
    if (themeProp) themeProp.setInitializer(`'${state.theme}'`)
    else configObj.addPropertyAssignment({ name: 'theme', initializer: `'${state.theme}'` })
  }

  if (state.apps) setArrayProperty(configObj, 'apps', state.apps, SyntaxKind)
  if (state.modules) setArrayProperty(configObj, 'modules', state.modules, SyntaxKind)

  sourceFile.saveSync()
}

export function readDesktopDependencies(packageJsonPath) {
  if (!existsSync(packageJsonPath)) return []
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  return Object.keys(deps).filter((name) => name.startsWith(SCOPE))
}
