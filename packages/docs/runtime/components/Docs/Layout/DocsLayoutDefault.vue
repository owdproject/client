<script setup lang="ts">
import {demoDesktopProps} from "../../../consts/constsDesktop";
import {useRoute, useAsyncData} from "nuxt/app"

const route = useRoute()

const {data: post} = await useAsyncData(route.path, () => {
  return queryCollection('content').path(route.path).first()
})

const menuTopItems = [
  {
    icon: "lucide:rocket",
    label: "Get Started",
    to: "/docs/introduction"
  }
]

const menuMainItems = [
  {
    icon: "lucide:info",
    label: "Introduction",
    to: "/docs/introduction"
  },
  {
    icon: "lucide:rocket",
    label: "Installation",
    to: "/docs/installation"
  },
  {
    icon: "lucide:app-window",
    label: "Desktop",
    to: "/docs/wip"
  },
  {
    icon: "lucide:code",
    label: "Applications",
    to: "/docs/wip"
  },
  {
    icon: "lucide:paint-roller",
    label: "Theming",
    to: "/docs/wip"
  },
  {
    icon: "lucide:cog",
    label: "Modules",
    to: "/docs/wip"
  },
]

const menuLearnItems = [
  {
    icon: "simple-icons:vuedotjs",
    label: "Vue.js",
    href: "https://vuejs.org"
  },
  {
    icon: "simple-icons:nuxt",
    label: "Nuxt.js",
    href: "https://nuxt.com"
  },
  {
    icon: "simple-icons:tailwindcss",
    label: "TailwindCSS",
    href: "https://tailwindcss.com"
  },
  {
    icon: "simple-icons:primevue",
    label: "PrimeVue",
    href: "https://primevue.org"
  },
]

const sidebarTopItems = [
  {
    icon: "lucide:sparkles",
    label: "Become a sponsor",
    href: "https://github.com/owdproject"
  },
  {
    icon: "lucide:key",
    label: "Get a license",
    href: "mailto:licensing@owdproject.org"
  },
]
</script>

<template>
  <div class="owd-docs-wrapper">
    <Desktop v-bind="demoDesktopProps">

      <DocsHeader/>

      <div class="owd-docs-container">

        <div class="grid grid-cols-12">

          <aside class="col-span-2 pt-6">

            <nuxt-link v-for="item of menuTopItems" :to="item.to">
              <div>
                <Button label="Primary">
                  <Icon :name="item.icon" :size="12" />
                </Button>

                {{item.label}}
              </div>
            </nuxt-link>

            <Divider />

            <nuxt-link
                v-for="item of menuMainItems"
                :to="item.to"
            >
              <div>
                <Button label="Primary" variant="outlined">
                  <Icon :name="item.icon" :size="12" />
                </Button>

                {{item.label}}
              </div>
            </nuxt-link>

            <Divider />

            <a
                v-for="item of menuLearnItems"
                :href="item.href" target="_blank"
            >
              <div>
                <Button label="Primary" variant="outlined">
                  <Icon :name="item.icon" :size="12" />
                </Button>

                {{item.label}}
              </div>
            </a>

            <slot name="menu" />

          </aside>

          <main class="owd-docs-content col-span-8 flex-grow p-y-4 pl-12">
            <slot v-if="post" :post="post" />
          </main>

          <aside class="col-span-2 pt-6">

            <slot name="sidebar" />

            <Divider />

            <a
                v-for="item of sidebarTopItems"
                :href="item.href"
            >
              <div>
                <Button label="Primary">
                  <Icon :name="item.icon" :size="12" />
                </Button>

                {{item.label}}
              </div>
            </a>

            <Divider />

            <div class="flex gap-3">
              <a href="https://github.com/owdproject" target="_blank">
                <Icon name="simple-icons:github" style="vertical-align: 1px;" />
              </a>

              <a href="https://discord.gg/zPNaN2HAaA" target="_blank">
                <Icon name="simple-icons:discord" :size="18" />
              </a>

              <a href="https://bluesky.app/profile/owdproject" target="_blank">
                <Icon name="simple-icons:bluesky" :size="16" />
              </a>

              <a href="https://x.com/owdproject" target="_blank">
                <Icon name="simple-icons:x" :size="15" />
              </a>
            </div>

          </aside>

        </div>

      </div>

    </Desktop>
  </div>
</template>

<style scoped lang="scss">
a {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 8px;

  .p-button {
    min-width: 24px;
    height: 24px;
    margin-right: 5px;
    padding: 0;
    vertical-align: middle;
  }
}
</style>