export default {
  id: 'org.owdproject.todo',
  title: 'To-do',
  category: 'productivity',
  icon: 'mdi:format-list-bulleted',
  windows: {
    main: {
      component: () => import('./components/Window/WindowTodo.vue'),
      resizable: false,
      size: {
        width: 480,
        height: 320,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    todo: {
      command: 'todo',
    },
  },
  commands: {
    todo: (app: IApplicationController) => {
      app.openWindow('main')
    },
  },
}
