<script setup lang="ts">
const menuMiddle = [
  {
    label: 'Documentation',
    items: [
      {
        label: "Introduction",
        url: '/docs/introduction',
      },
      {
        label: "Getting Started",
        url: '/docs/installation',
      },
      {
        label: "Extend Your OS",
        url: 'https://github.com/topics/owd-modules',
        target: '_blank',
      },
    ]
  },
  {
    label: 'Modules',
    items: [
      {
        label: "Apps",
        url: 'https://github.com/topics/owd-apps',
        target: '_blank',
      },
      {
        label: "Themes",
        url: 'https://github.com/topics/owd-themes',
        target: '_blank',
      },
      {
        label: "Plugins",
        url: 'https://github.com/topics/owd-plugins',
        target: '_blank',
      },
    ],
    command: () => {
    }
  },
  {
    label: 'View it on GitHub',
    url: 'https://github.com/owdproject/client',
    target: '_blank',
  },
]
</script>

<template>
  <header class="owd-docs-header">
    <div class="owd-docs-header__inner">

      <div class="owd-docs-container">
        <div class="flex flex-row">
          <div class="flex flex-1 items-center">

            <nuxt-link to="/docs">
              <DocsHeaderLogo/>
            </nuxt-link>

          </div>
          <div class="flex grid justify-end">

            <Menubar class="mx-auto" :model="menuMiddle">
              <template #itemicon="{item}">
                <Icon
                    v-if="item.icon"
                    :name="item.icon"
                    :size="18"
                    class="mr-3"
                />
              </template>
            </Menubar>

          </div>
        </div>
      </div>

    </div>
  </header>
</template>

<style lang="scss">
.owd-docs-header {
  height: 72px;;

  &__inner {
   /*
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    */
    display: grid;
    align-items: center;
    height: 72px;
    z-index: 2;

    /*
    &:before, &:after {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      content: '';
    }
     */

    &:before {
      opacity: 0.8;
      background-color: var(--owd-background-color);
      z-index: 2;
    }

    &:after {
      background-color: transparent;
      backdrop-filter: blur(24px);
      z-index: 1;
    }
  }

  .owd-docs-container {
    position: relative;
    z-index: 3;
  }

  .p-menubar {
    &-item {
      font-weight: 600;
    }
  }

  .p-menubar-submenu {
    margin-top: 12px;
  }
}

.owd-docs-wrapper:not(.owd-docs-wrapper--home) {
  .owd-docs-header {
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 20px;
  }
}
</style>