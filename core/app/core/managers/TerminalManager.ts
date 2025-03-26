export class TerminalManager {
    private commands: Map<string, CommandFn> = new Map()
    private applicationManager: IApplicationManager

    constructor() {
        this.applicationManager = useApplicationManager()
        this.loadCommandsFromApps()
    }

    defineCommand(name: string, fn: any, app: IApplicationController) {
        this.commands.set(name, { fn, app })
    }

    execCommand(input: string): CommandOutput | void {
        const parsed = parseInput(input)
        if (!parsed) return;

        const command = this.commands.get(parsed.command);
        if (command) {
            const result = command.fn(command.app, parsed.args);

            if (typeof result === 'string') {
                return { text: result };
            } else if (result) {
                return result;
            }
        } else {
            return { text: `Command "${parsed.command}" not found.`, isError: true };
        }
    }

    loadCommandsFromApps() {
        this.applicationManager.apps.forEach((app: IApplicationController) => {
            if (app.config.commands) {
                Object.entries(app.config.commands).forEach(([name, fn]) => {
                    this.defineCommand(name, fn, app)
                })
            }
        })
    }
}
