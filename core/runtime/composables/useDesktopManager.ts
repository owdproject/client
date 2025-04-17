import {DesktopManager} from "../core/managers/DesktopManager";

const desktopManager = new DesktopManager()

export function useDesktopManager() {
    return desktopManager
}
