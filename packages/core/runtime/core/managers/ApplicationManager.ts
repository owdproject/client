import type { Reactive } from '@vue/reactivity'
import { reactive, markRaw } from '@vue/reactivity'
import { ApplicationController } from '../controllers/ApplicationController'
import { normalizeApplicationConfig } from '../../utils/utilApp'
import { debugLog } from '../../utils/utilDebug'
import * as shellwords from 'shellwords'
import yargsParser from 'yargs-parser'

export class ApplicationManager implements IApplicationManager {
  public apps = reactive(new Map<string, IApplicationController>())

  constructor() {}

  /**
   * Define new application
   *
   * @param id
   * @param config
   */
  public async defineApp(id: string, config: ApplicationConfig) {
    if (this.isAppDefined(id)) {
      debugLog(`App "${id}" is already defined`)
      return this.getAppById(id)!
    }

    const normalizedConfig = normalizeApplicationConfig(config)
    const applicationConfig = markRaw(normalizedConfig)

    const applicationController: IApplicationController = new ApplicationController(id, applicationConfig)
    await applicationController.initApplication()

    this.apps.set(id, applicationController)

    return applicationController
  }

  /**
   * Check if app has been defned
   *
   * @param {string} id
   */
  public isAppDefined(id: string) {
    return this.getAppById(id)
  }

  /**
   * Retrieves an app instance by its unique identifier
   *
   * @param {string} id
   */
  public getAppById(id: string) {
    return this.apps.get(id)
  }

  /**
   * Check if app is running
   *
   * @param {string} id
   */
  public isAppRunning(id: string) {
    if (!this.isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController: IApplicationController = this.getAppById(id)!

    if (!applicationController.isRunning) {
      return false
    }

    return true
  }

  /**
   * Launch app entry
   *
   * @param id
   * @param entryKey
   */
  public async launchAppEntry(
    id: string,
    entryKey: string,
  ): Promise<IApplicationController | undefined | void> {
    if (!this.isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController: IApplicationController = this.getAppById(id)!

    if (
      applicationController.config.entries &&
      !applicationController.config.entries.hasOwnProperty(entryKey)
    ) {
      throw Error(`App entry "${entryKey}" is not defined in ${id} application`)
    }

    const entry: ApplicationEntry = applicationController.config.entries[entryKey]!

    await this.execAppCommand(applicationController.id, entry.command)
  }

  /**
   * Run app command
   *
   * @param id
   * @param rawCommand
   */
  public async execAppCommand(
    id: string,
    rawCommand: string,
  ): Promise<CommandOutput> {
    if (!this.isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController: IApplicationController = this.getAppById(id)!

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

    const commandOutput = await commandFn(
      applicationController,
      parsed,
    )

    applicationController.setRunning(true)

    return commandOutput
  }

  /**
   * Close application
   *
   * @param id
   */
  public closeApp(id: string) {
    if (!this.isAppDefined(id)) {
      throw Error(`App "${id}" is not defined`)
    }

    const applicationController: IApplicationController = this.getAppById(id)!

    applicationController.closeAllWindows()
    applicationController.setRunning(false)
  }

  /**
   * Array of available menu entries for system bars, docks
   */
  public get appsEntries() {
    const entries: Reactive<ApplicationEntryWithInherited[]> = reactive([])

    for (const applicationController of this.apps.values()) {
      if (!applicationController.config.entries) {
        continue
      }

      for (const entryKey of Object.keys(
        applicationController.config.entries,
      )) {
        const entry: ApplicationEntry =
          applicationController.config.entries[entryKey]!

        entries.push({
          application: applicationController,
          title:
            entry.title !== undefined
              ? entry.title
              : applicationController.config.title,
          icon:
            entry.icon !== undefined
              ? entry.icon
              : applicationController.config.icon,
          category:
            entry.category !== undefined
              ? entry.category
              : applicationController.config.category,
          visibility: entry.visibility ?? 'primary',
          command: entry.command,
        })
      }
    }

    return entries
  }

  /**
   * Array of opened windows for system bars, docks
   */
  public get windowsOpened() {
    const windows: Reactive<Map<string, IWindowController>[]> = reactive([])

    for (const applicationController of this.apps.values()) {
      if (applicationController.isRunning) {
        windows.push(...applicationController.windows)
      }
    }

    return windows
  }

  /**
   * Array of opened windows for system bars, docks
   */
  public get appsRunning() {
    const applications: Reactive<IApplicationController[]> = reactive([])

    for (const applicationController of this.apps.values()) {
      if (applicationController.isRunning) {
        applications.push(applicationController)
      }
    }

    return applications
  }

  public getWindowOpenedId(windowId: string) {
    const mapWindowFound: Map<string, IWindowController> | undefined =
      this.windowsOpened.find((window: any) => {
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
  public get appCategories(): string[] {
    const categories = new Set<string>()

    for (const applicationController of this.apps.values()) {
      if (applicationController.config.category) {
        categories.add(applicationController.config.category)
      }
    }
    return Array.from(categories).sort()
  }

  /**
   * Gets the apps ordered by category
   */
  public get appsByCategory(): {
    [category: string]: IApplicationController[]
  } {
    const categorizedApps: {
      [category: string]: IApplicationController[]
    } = {}

    for (const applicationController of this.apps.values()) {
      const category = applicationController.config.category || 'other'
      if (!categorizedApps[category]) {
        categorizedApps[category] = []
      }
      categorizedApps[category].push(applicationController)
    }

    for (const category in categorizedApps) {
      categorizedApps[category]!.sort((a, b) =>
        a.config.title.localeCompare(b.config.title),
      )
    }

    return categorizedApps
  }
}
