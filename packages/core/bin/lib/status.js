import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

export function findDevProcess() {
  try {
    const out = execSync('pgrep -af "nuxt dev|nx run desktop:serve"', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const line = out.split('\n').find((l) => l.includes('nuxt') || l.includes('desktop'))
    if (!line) return null
    const pid = Number.parseInt(line.trim().split(/\s+/)[0], 10)
    return Number.isFinite(pid) ? { pid, cmdline: line } : null
  } catch {
    return null
  }
}

export function readProcessStats(pid) {
  if (!pid || !existsSync(`/proc/${pid}/status`)) {
    return { cpu: 0, memMb: 0, threads: 0 }
  }

  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf8')
    const vmRss = status.match(/^VmRSS:\s+(\d+)/m)?.[1]
    const threads = status.match(/^Threads:\s+(\d+)/m)?.[1]
    return {
      cpu: 0,
      memMb: vmRss ? Math.round(Number(vmRss) / 1024) : 0,
      threads: threads ? Number(threads) : 0,
    }
  } catch {
    return { cpu: 0, memMb: 0, threads: 0 }
  }
}

export async function probeDevServer(port) {
  const url = `http://127.0.0.1:${port}/`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 800)
    const res = await fetch(url, { signal: controller.signal, redirect: 'manual' })
    clearTimeout(timer)
    return { up: res.ok || res.status < 500, status: res.status, url }
  } catch {
    return { up: false, status: 0, url }
  }
}

export async function getClientStatus(port) {
  const proc = findDevProcess()
  const http = await probeDevServer(port)
  const stats = proc ? readProcessStats(proc.pid) : { cpu: 0, memMb: 0, threads: 0 }

  return {
    running: Boolean(proc) || http.up,
    pid: proc?.pid ?? null,
    http,
    stats,
    port,
  }
}

let devChild = null

export function startDev(workspaceRoot) {
  if (devChild) return devChild
  devChild = spawn('pnpm', ['run', 'dev'], {
    cwd: workspaceRoot,
    detached: true,
    stdio: 'ignore',
  })
  devChild.unref()
  return devChild
}

export function stopDev(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 'SIGTERM')
    return true
  } catch {
    return false
  }
}

export function runScript(workspaceRoot, script) {
  return spawn('pnpm', ['run', script], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: false,
  })
}
