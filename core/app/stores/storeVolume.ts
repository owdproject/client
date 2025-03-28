export const useVolumeStore = defineStore('owd/volume', () => {
    const master = ref<number>(100)

    function setMasterVolume(value: number) {
        master.value = value
    }

    return {
        master
    }
}, {
    persist: {
        storage: window.localStorage,
    }
})