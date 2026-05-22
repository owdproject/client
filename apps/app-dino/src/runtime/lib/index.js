import DinoGame from './game/DinoGame.js'

export function createDino(desktopWindow, element) {
  const game = new DinoGame(600, 150, element)
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0

  if (isTouchDevice) {
    document.addEventListener('touchstart', ({ touches }) => {
      if (touches.length === 1) {
        game.onInput('jump')
      } else if (touches.length === 2) {
        game.onInput('duck')
      }
    })

    document.addEventListener('touchend', ({ touches }) => {
      game.onInput('stop-duck')
    })
  } else {
    const keycodes = {
      // up, spacebar
      JUMP: { 38: 1, 32: 1 },
      // down
      DUCK: { 40: 1 },
    }

    document.addEventListener('keydown', ({ keyCode }) => {
      if (!desktopWindow.state.focused) {
        return
      }

      if (keycodes.JUMP[keyCode]) {
        game.onInput('jump')
      } else if (keycodes.DUCK[keyCode]) {
        game.onInput('duck')
      }
    })

    document.addEventListener('keyup', ({ keyCode }) => {
      if (!desktopWindow.state.focused) {
        return
      }

      if (keycodes.DUCK[keyCode]) {
        game.onInput('stop-duck')
      }
    })
  }

  game.start().catch(console.error)
}
