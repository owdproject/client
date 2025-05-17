// support for controller-less windows
// (for example: dummy windows in docs)
export function handleWindowControllerProps(windowController: any) {
  if (windowController.instanced) {
    return windowController
  }

  return {
    ...windowController,
    ...windowController.config,
    state: {
      ...windowController.config,
    },
  }
}
