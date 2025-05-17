#!/usr/bin/env node

import { spawn } from 'child_process'

const [, , cmd, pkgName, ...rest] = process.argv

const commandMap = {
  'install-app': 'desktop:install-app',
  'install-module': 'desktop:install-module',
  'install-theme': 'desktop:install-theme',
}

if (!commandMap[cmd]) {
  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}

if (!pkgName) {
  console.error('Missing package name (e.g., @owdproject/package)')
  process.exit(1)
}

const nxArgs = ['run', commandMap[cmd], `--name=${pkgName}`, ...rest]

const child = spawn('pnpm', ['nx', ...nxArgs], {
  stdio: 'inherit',
  shell: true,
})
