import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useNovaTrayClock() {
  const date = ref(new Date())
  const { locale } = useI18n()

  let minuteTimeout: ReturnType<typeof setTimeout> | undefined

  onMounted(() => {
    function scheduleNextMinute() {
      const now = new Date()
      const msToNext =
        (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
      minuteTimeout = setTimeout(() => {
        date.value = new Date()
        scheduleNextMinute()
      }, msToNext)
    }
    scheduleNextMinute()
  })

  onUnmounted(() => {
    if (minuteTimeout) clearTimeout(minuteTimeout)
  })

  const time = computed(() => {
    const d = date.value
    let hours = d.getHours()
    let minutes = d.getMinutes().toString().padStart(2, '0')
    let period = ''

    if (locale.value !== 'it') {
      period = hours >= 12 ? ' PM' : ' AM'
      if (hours > 12) hours -= 12
      else if (hours === 0) hours = 12
    }

    return `${hours}:${minutes}${period}`
  })

  const dateLabel = computed(() => {
    return date.value.toLocaleDateString(locale.value, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  })

  return { time, dateLabel }
}
