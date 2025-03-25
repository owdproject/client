class Terminal {
    private commands: Map<string, CommandFn> = new Map()
    private applicationManager: IApplicationManager
    public terminal: Terminal

    constructor(applicationManager: IApplicationManager) {
        this.applicationManager = applicationManager
        this.terminal = new Terminal(this)
        this.terminal.loadCommandsFromApps()
    }

    defineCommand(name: string, fn: CommandFn) {
        this.commands.set(name, fn)
    }

    execCommand(input: string) {
        const parsed = parseInput(input)
        if (!parsed) return

        const command = this.commands.get(parsed.command)
        if (command) {
            command(parsed.args, this, this.applicationManager)
        } else {
            debugLog(`Command "${parsed.command}" not found.`)
        }
    }

    loadCommandsFromApps() {
        this.applicationManager.apps.forEach((app: IApplicationController) => {
            if (app.config.commands) {
                Object.entries(app.config.commands).forEach(([name, fn]) => {
                    this.defineCommand(name, fn)
                })
            }
        })
    }
}
