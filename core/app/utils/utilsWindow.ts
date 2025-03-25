// support for controller-less windows
// (for ez demos, etc)
export function handleWindowControllerProps(props: any) {
    return props.window ? props.window : {
        config: props.config,
        state: props.config,
    }
}