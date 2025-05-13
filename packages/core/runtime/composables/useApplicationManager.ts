import {ApplicationManager} from "../core/managers/ApplicationManager";

const applicationManager = new ApplicationManager()

export function useApplicationManager(): IApplicationManager {
    return applicationManager
}