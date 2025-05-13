import {defineStore} from "pinia"
import {computed} from "vue"
import {useDesktopStore} from "./storeDesktop"

export const useDesktopWindowStore = defineStore('owd/desktop/window', () => {
    const desktopStore = useDesktopStore()

    const positionZ = computed(() => desktopStore.state.window.positionZ)

    function incrementPositionZ() {
        desktopStore.state.window.positionZ++

        return desktopStore.state.window.positionZ
    }

    return {
        positionZ,
        incrementPositionZ
    }
})
