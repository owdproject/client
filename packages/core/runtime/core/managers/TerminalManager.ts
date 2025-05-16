import {useApplicationManager} from "../../composables/useApplicationManager"
import {debugLog} from "../../utils/utilDebug"

export class TerminalManager {
    private commands: Map<string, TerminalCommand> = new Map()

    constructor() {
    }

    public addCommand(command: TerminalCommand) {
        for (const existingCommand of this.commands.keys()) {
            if (existingCommand.startsWith(command.name) || command.name.startsWith(existingCommand)) {
                throw new Error(`Command prefix conflict with "${existingCommand}"`)
            }
        }

        this.commands.set(command.name, command)
        debugLog(`Registered terminal command: ${command.name} → ${command.applicationId}`)
    }

    public listCommands(): string[] {
        return Array.from(this.commands.keys())
    }

    public async execCommand(input: string): Promise<CommandOutput | void> {
        const applicationManager = useApplicationManager()

        const [name, ...args] = input.trim().split(/\s+/)

        if (!name) {
            return
        }

        if (!this.commands.has(name)) {
            return {
              message: `Command "${name}" not found`
            }
        }

        const application = this.commands.get(name)!

        return applicationManager.execAppCommand(application.applicationId, input)
    }
}
