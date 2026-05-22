interface WasmboyMeta {
  isPaused?: boolean
}

interface WasmboyGame {
  cartridgeInfo: any
  cartridgeRom: WasmboyGameCardridge
  saveStates: WasmboySaveState[]
}

interface WasmboySaveState {
  wasmBoyMemory: {
    wasmBoyInternalState: []
    wasmBoyPaletteMemory: []
    gameBoyMemory: []
    cartridgeRam: []
  }
  date: undefined
  isAuto: undefined
}

interface WasmboyGameCardridge {
  ROM: any
  header: any
  fileName: any
}
