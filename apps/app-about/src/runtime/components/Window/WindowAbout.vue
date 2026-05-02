<script setup lang="ts">
import { useRuntimeConfig } from 'nuxt/app'

const runtimeConfig = useRuntimeConfig()
</script>

<template>
  <Window :content="{ centered: true }">
    <div class="container">
      <h2
        class="text-2xl font-semibold mb-1"
        v-text="runtimeConfig.public.desktop.about.title"
      />
      <a
        :href="runtimeConfig.public.desktop.about.href" target="_blank"
        v-text="runtimeConfig.public.desktop.about.subtitle"
      />

      <div
        class="version my-4 opacity-30"
        v-text="runtimeConfig.public.desktop.about.versionText"
      />

      <div class="powered-by opacity-50">
        <ul>
          <li
            v-for="icon of runtimeConfig.public.desktop.about.icons"
            :key="icon.name"
          >
            <a v-bind="typeof icon.link === 'string' ? { href: icon.link } : icon.link">
              <Icon
                :title="icon.title"
                :name="icon.name"
                :size="icon.size"
                :style="icon.style"
              />
            </a>
          </li>
        </ul>
      </div>
    </div>
  </Window>
</template>

<style scoped lang="scss">
.container {
  margin: 0 auto;
  text-align: center;

  a {
    font-size: 14px;
    opacity: 0.75;
  }

  .version {
    font-size: 18px;
  }

  .powered-by {
    margin-top: 12px;

    ul {
      display: flex;
      margin: 0 auto;
      max-width: min-content;
      line-height: 23px;
      text-align: right;
      text-transform: uppercase;
      list-style-type: none;

      li {
        margin: 0 8px;
      }
    }
  }
}
</style>
