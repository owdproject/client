<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue'
import {computed} from "@vue/reactivity"
import {useI18n} from "vue-i18n"

const date: Ref<Date> = ref(new Date())
const {locale} = useI18n()

let minuteTimeout: any

onMounted(() => {
  function scheduleNextMinute() {
    const now = new Date()
    const millisecondsToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    minuteTimeout = setTimeout(() => {
      date.value = new Date()
      scheduleNextMinute()
    }, millisecondsToNextMinute)
  }
  scheduleNextMinute()
})

onUnmounted(() => {
  clearTimeout(minuteTimeout)
})

const time = computed(() => {
  if (!date.value) {
    return ''
  }

  let hours = date.value.getHours()
  let minutes: string = date.value.getMinutes().toString()
  let period = 'AM'

  if (locale.value !== 'it') {
    if (hours >= 12) {
      period = 'PM'
      if (hours > 12) hours -= 12
    } else if (hours === 0) {
      hours = 12
    }
  }

  if (minutes.length === 1) minutes = `0${minutes}`

  return locale.value === 'it' ? `${hours}:${minutes}` : `${hours}:${minutes} ${period}`
})
</script>

<template>
  <time class="owd-time" v-text="time" />
</template>