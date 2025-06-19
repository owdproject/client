import { useApplicationManager } from './useApplicationManager'
import { debugLog } from '../utils/utilDebug'

const commands = new Map<string, TerminalCommand>()

/**
 * Terminal Manager Composable (Singleton)
 */
export function useTerminalManager() {
  /**
   * Add a new terminal command
   *
   * @param command
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
   * Execute a terminal command
   *
   * @param input
   */
  const execCommand = async (input: string): Promise<CommandOutput | void> => {
    const applicationManager = useApplicationManager()

    const [name, ...args] = input.trim().split(/\s+/)

    if (!name) {
      return
    }

    if (!commands.has(name)) {
      return {
        message: `Command "${name}" not found`,
      }
    }

    const application = commands.get(name)!

    return applicationManager.execAppCommand(application.applicationId, input)
  }

  return {
    addCommand,
    listCommands,
    execCommand,
  }
}
