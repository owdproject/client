import {TerminalManager} from "../core/managers/TerminalManager";

const terminalManager = new TerminalManager()

export function useTerminalManager() {
    return terminalManager
}