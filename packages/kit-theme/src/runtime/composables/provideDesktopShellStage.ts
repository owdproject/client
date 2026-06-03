import type { DesktopWorkAreaRect } from '@owdproject/core'
import type { InjectionKey, DeepReadonly, Ref } from 'vue'
import { inject, provide } from 'vue'

export const desktopShellStageKey: InjectionKey<
  Ref<HTMLElement | null | undefined>
> = Symbol('owdDesktopShellStage')

export const desktopWorkAreaKey: InjectionKey<
  DeepReadonly<Ref<DesktopWorkAreaRect>>
> = Symbol('owdDesktopWorkArea')

export function provideDesktopShellStage(
  shellStageRef: Ref<HTMLElement | null | undefined>,
) {
  provide(desktopShellStageKey, shellStageRef)
}

export function provideDesktopWorkArea(
  workArea: DeepReadonly<Ref<DesktopWorkAreaRect>>,
) {
  provide(desktopWorkAreaKey, workArea)
}

export function useDesktopShellStageRef() {
  return inject(desktopShellStageKey, null)
}

export function useInjectedDesktopWorkArea(): DesktopWorkAreaRect {
  const injected = inject(desktopWorkAreaKey, null)
  if (injected) {
    return injected.value
  }
  return { x: 0, y: 0, width: 0, height: 0 }
}
