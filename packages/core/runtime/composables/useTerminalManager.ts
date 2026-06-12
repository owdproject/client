import { useApplicationManager } from './useApplicationManager'
import { debugLog } from '../utils/utilDebug'

const commands = new Map<string, TerminalCommand>()

// ─── formatting helpers ──────────────────────────────────────────────────────

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function buildHelpList(): string {
  const sorted = Array.from(commands.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const colWidth = Math.max(...sorted.map((c) => c.name.length)) + 4

  const rows = sorted
    .map((cmd) => `  ${padEnd(cmd.name, colWidth)}${cmd.description ?? ''}`)
    .join('\n')

  return (
    `Available commands:\n\n` +
    rows +
    `\n\nType 'help <command>' for more details.`
  )
}

function buildHelpDetail(cmd: TerminalCommand): string {
  const lines: string[] = []

  lines.push(`  ${cmd.name}${cmd.description ? ` — ${cmd.description}` : ''}`)
  lines.push('')

  if (cmd.usage) {
    lines.push(`  Usage: ${cmd.usage}`)
    lines.push('')
  }

  if (cmd.args && cmd.args.length > 0) {
    lines.push('  Arguments:')
    const argColW = Math.max(...cmd.args.map((a) => a.name.length)) + 4
    for (const arg of cmd.args) {
      const required = arg.required ? '' : ' (optional)'
      lines.push(
        `    ${padEnd(arg.name, argColW)}${arg.description ?? ''}${required}`,
      )
    }
    lines.push('')
  }

  if (cmd.options && cmd.options.length > 0) {
    lines.push('  Options:')
    const optColW = Math.max(...cmd.options.map((o) => o.flag.length)) + 4
    for (const opt of cmd.options) {
      lines.push(`    ${padEnd(opt.flag, optColW)}${opt.description ?? ''}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

// ─── composable ─────────────────────────────────────────────────────────────

/**
 * Terminal Manager Composable (Singleton)
 */
export function useTerminalManager(): ITerminalManager {
  /**
   * Add a new terminal command
   */
  const addCommand = (command: TerminalCommand) => {
    for (const existingCommand of commands.keys()) {
      if (
        existingCommand.startsWith(command.name) ||
        command.name.startsWith(existingCommand)
      ) {
        throw new Error(`Command prefix conflict with "${existingCommand}"`)
      }
    }

    commands.set(command.name, command)
    debugLog(`Registered terminal command: ${command.name} → ${command.applicationId}`)
  }

  /**
   * List all registered command names
   */
  const listCommands = (): string[] => {
    return Array.from(commands.keys())
  }

  /**
   * Get a single command by name
   */
  const getCommand = (name: string): TerminalCommand | undefined => {
    return commands.get(name)
  }

  /**
   * Get all registered commands with metadata
   */
  const getAllCommands = (): TerminalCommand[] => {
    return Array.from(commands.values())
  }

  /**
   * Execute a terminal command
   */
  const execCommand = async (input: string): Promise<CommandOutput | void> => {
    const applicationManager = useApplicationManager()

    const trimmed = input.trim()
    const [name, ...rest] = trimmed.split(/\s+/)

    if (!name) return

    // ── built-in: help ────────────────────────────────────────────────────────
    if (name === 'help') {
      const target = rest[0]

      if (!target) {
        return { message: buildHelpList() }
      }

      const cmd = commands.get(target)
      if (!cmd) {
        return {
          message: `help: command not found: '${target}'\nType 'help' to list available commands.`,
          isError: true,
        }
      }

      return { message: buildHelpDetail(cmd) }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!commands.has(name)) {
      return {
        message: `Command not found: '${name}'\nType 'help' to list available commands.`,
        isError: true,
      }
    }

    const application = commands.get(name)!

    return applicationManager.execAppCommand(application.applicationId, input)
  }

  return {
    addCommand,
    listCommands,
    getCommand,
    getAllCommands,
    execCommand,
  }
}
