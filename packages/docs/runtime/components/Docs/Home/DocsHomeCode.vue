<script setup lang="ts">
const dummyWindow = {
  title: 'Dummy',
  config: {
    size: {
      width: 360,
      height: 'auto'
    }
  }
}

const {data: post} = await useAsyncData('/stories/demo', () => {
  return queryCollection('stories').path('/stories/demo').first()
})
</script>

<template>
  <div style="background: rgba(255, 255, 255, 0.1);">
    <div class="owd-docs-container">

      <div class="owd-docs-hero grid grid-flow-col gap-4 px-16">
        <div class="flex flex-col place-content-center">

          <ContentRenderer
              style="filter: grayscale(0.6) contrast(4);"
              class="m-3"
              :value="post"
          />

        </div>
        <div class="self-center text-right">

          <Window
              style="position: relative;"
              :window="dummyWindow"
              :content="{padded: true}"
          >
            Hey! I'm a simple window<br/>
            without any controller.
          </Window>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped lang="scss">

</style>