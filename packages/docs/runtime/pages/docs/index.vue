<script setup lang="ts">
import {useSeoMeta} from "nuxt/app"
import {useApplicationManager} from "@owdproject/core/runtime/composables/useApplicationManager"

const applicationManager = useApplicationManager()

function launchDemoApp(index: number = 0) {
  const entry = applicationManager.appsEntries[index]
  entry.application.execCommand(entry.command)
}

const features = [
  {
    icon: {
      name: "logos:nuxt-icon",
      size: 16,
    },
    title: "Leverage a flexible architecture",
    description: "Create powerful apps with the versatility of the Nuxt.js ecosystem."
  },
  {
    icon: {
      name: "devicon:tailwindcss",
      size: 24,
    },
    title: "Style using Tailwind and PrimeVue",
    description: "Maintain consistent design across multiple themes with minimal effort."
  },
  {
    icon: {
      name: "tabler:layout-grid-add",
      size: 26,
    },
    title: "Craft your modular web desktop",
    description: "Build apps or frame them — choose the approach that best suits you."
  }
]

useSeoMeta({
  title: "Build Your Web OS with Open Web Desktop",
  description: "Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences using Vue.js and Nuxt.js",
})
</script>

<template>
  <DocsLayoutHome>

    <div class="owd-docs-container">

      <div class="owd-docs-hero grid grid-flow-col gap-4 py-32">
        <div class="flex flex-col place-content-center">

          <div class="text-6xl font-bold">
            Build Your Web OS
          </div>
          <div class="text-2xl mt-6 mb-6 opacity-50" style="max-width: 600px;">
            Learn how to bootstrap your Open Web Desktop project and install or create themes, plugins and applications.
          </div>

          <div class="flex flex-row gap-3 mb-10">
            <div class="flex-col">
              <nuxt-link to="/docs/installation">
                <Button
                    class="p-button--primary"
                    size="large" style="width: 160px;"
                >
                  Getting Started
                </Button>
              </nuxt-link>
            </div>
            <div class="flex-col">
              <Button
                  size="large" style="width: 120px;"
                  @click="launchDemoApp(0)"
              >
                Demo
              </Button>
            </div>
          </div>

          <DocsHomeHeroFeature
              v-for="feature of features"
              v-bind="feature"
              class="mt-4"
          />

        </div>
        <div class="self-center text-right">

          <div class="inline-block mt-3">
            <Window
                style="position: relative;"
                :window="{ title: 'Hello World !', icon: 'uil:robot', config: {size: { width: 360, height: 'auto' } }}"
            >
              <img src="/images/window-hello-world.gif"/>
            </Window>

            <div class="text-center w-full mt-4 opacity-60">
              Robot by Rain Winther<br/>
              <div class="-mt-1 opacity-60">
                <a href="https://rainwinther.itch.io" target="_blank">rainwinther.itch.io</a>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!--

    <DocsDivider class="mb-16"/>

    <DocsHomeBanner/>

    <DocsDivider class="my-16"/>

    <DocsHomeTech />

    <DocsDivider class="my-16"/>

    <DocsHomeSponsors />

    -->

    <DocsDivider class="my-16"/>

    <DocsHomeBanner/>

    <DocsFooter class="mt-16"/>

  </DocsLayoutHome>
</template>

<style scoped lang="scss">
.owd-docs-hero {
  position: relative;
  height: calc(100vh - 72px);
  min-height: 480px;
}

img {
  pointer-events: none;
}
</style>