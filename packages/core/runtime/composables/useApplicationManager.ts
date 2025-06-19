import { reactive, markRaw, computed } from 'vue'
import { ApplicationController } from '../core/controllers/ApplicationController'
import { normalizeApplicationConfig } from '../utils/utilApp'
import { debugLog } from '../utils/utilDebug'
import * as shellwords from 'shellwords'
import yargsParser from 'yargs-parser'

const apps = reactive(new Map<string, IApplicationController>())

/**
 * Application Manager Composable (Singleton)
 */
export function useApplicationManager() {
  /**
   * Define new application
   *
   * @param id
   * @param config
   */
  const defineApp = async (id: string, config: ApplicationConfig) => {
    if (isAppDefined(id)) {
      debugLog(`App "${id}" is already defined`)
      return getAppById(id)!
    }

    const normalizedConfig = normalizeApplicationConfig(config)
    const applicationConfig = markRaw(normalizedConfig)

    const applicationController: IApplicationController = new ApplicationController(id, applicationConfig)
    await applicationController.initApplication()

    apps.set(id, applicationController)

    return applicationController
  }

  /**
   * Check if app has been defined
   *
   * @param {string} id
   */
  const isAppDefined = (id: string) => {
    return getAppById(id)
  }

  /**
   * Retrieves an app instance by its unique identifier
   *
   * @param {string} id
   */
  const getAppById = (id: string) => {
    return apps.get(id)
  }

  /**
   * Check if app is running
   *
   * @param {string} id
   */
  const isAppRunning = (id: string) => {
    if (!isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController = getAppById(id)!
    return applicationController.isRunning
  }

  /**
   * Launch app entry
   *
   * @param id
   * @param entryKey
   */
  const launchAppEntry = async (
    id: string,
    entryKey: string,
  ): Promise<IApplicationController | undefined | void> => {
    if (!isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController = getAppById(id)!

    if (
      applicationController.config.entries &&
      !applicationController.config.entries.hasOwnProperty(entryKey)
    ) {
      throw Error(`App entry "${entryKey}" is not defined in ${id} application`)
    }

    const entry: ApplicationEntry = applicationController.config.entries[entryKey]!

    await execAppCommand(applicationController.id, entry.command)
  }

  /**
   * Run app command
   *
   * @param id
   * @param rawCommand
   */
  const execAppCommand = async (
    id: string,
    rawCommand: string,
  ): Promise<CommandOutput> => {
    if (!isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController = getAppById(id)!

    const args = shellwords.split(rawCommand)
    const parsed = yargsParser(args)
    const command: string = parsed._[0]

    if (
      applicationController.config.commands &&
      !applicationController.config.commands.hasOwnProperty(command)
    ) {
      throw Error(
        `App command "${command}" is not defined in ${id} application`,
      )
    }

    const commandFn: any = applicationController.config.commands![command]

    const commandOutput = await commandFn(applicationController, parsed)

    applicationController.setRunning(true)

    return commandOutput
  }

  /**
   * Close application
   *
   * @param id
   */
  const closeApp = (id: string) => {
    if (!isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController = getAppById(id)!

    applicationController.closeAllWindows()
    applicationController.setRunning(false)
  }

  /**
   * Array of available menu entries for system bars, docks
   */
  const appsEntries = computed(() => {
    const entries: ApplicationEntryWithInherited[] = []

    for (const applicationController of apps.values()) {
      if (!applicationController.config.entries) {
        continue
      }

      for (const entryKey of Object.keys(applicationController.config.entries)) {
        const entry = applicationController.config.entries[entryKey]!

        entries.push({
          application: applicationController,
          title: entry.title ?? applicationController.config.title,
          icon: entry.icon ?? applicationController.config.icon,
          category: entry.category ?? applicationController.config.category,
          visibility: entry.visibility ?? 'primary',
          command: entry.command,
        })
      }
    }

    return entries
  })

  /**
   * Array of opened windows for system bars, docks
   */
  const windowsOpened = computed(() => {
    const windows: Map<string, IWindowController>[] = []

    for (const applicationController of apps.values()) {
      if (applicationController.isRunning) {
        windows.push(...applicationController.windows)
      }
    }

    return windows
  })

  /**
   * Array of running applications
   */
  const appsRunning = computed(() => {
    const runningApps: IApplicationController[] = []

    for (const applicationController of apps.values()) {
      if (applicationController.isRunning) {
        runningApps.push(applicationController)
      }
    }

    return runningApps
  })

  const getWindowOpenedId = (windowId: string) => {
    const mapWindowFound = windowsOpened.value.find((window: any) => {
      return window[1].state.id === windowId
    })

    if (mapWindowFound) {
      // @ts-ignore
      return mapWindowFound[1] as IWindowController
    }
  }

  /**
   * Gets all unique categories from the installed apps
   */
  const appCategories = computed(() => {
    const categories = new Set<string>()

    for (const applicationController of apps.values()) {
      if (applicationController.config.category) {
        categories.add(applicationController.config.category)
      }
    }

    return Array.from(categories).sort()
  })

  /**
   * Gets the apps ordered by category
   */
  const appsByCategory = computed(() => {
    const categorizedApps: {
      [category: string]: IApplicationController[]
    } = {}

    for (const applicationController of apps.values()) {
      const category = applicationController.config.category || 'other'
      if (!categorizedApps[category]) {
        categorizedApps[category] = []
      }
      categorizedApps[category].push(applicationController)
    }

    for (const category in categorizedApps) {
      categorizedApps[category].sort((a, b) =>
        a.config.title.localeCompare(b.config.title),
      )
    }

    return categorizedApps
  })

  return {
    apps,
    defineApp,
    isAppDefined,
    getAppById,
    isAppRunning,
    launchAppEntry,
    execAppCommand,
    closeApp,
    getWindowOpenedId,
    appsEntries,
    appsRunning,
    windowsOpened,
    appCategories,
    appsByCategory,
  }
}
