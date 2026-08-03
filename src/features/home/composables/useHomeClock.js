import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const SECOND_IN_MILLISECONDS = 1000
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function getDayRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

  return { start, end }
}

export function useHomeClock() {
  const now = ref(new Date())
  let timerId

  const dateLabel = computed(() => {
    const date = now.value

    return `${date.getFullYear()}. ${padNumber(date.getMonth() + 1)}. ${padNumber(date.getDate())} · ${WEEKDAYS[date.getDay()]}`
  })

  const currentTime = computed(
    () => `${padNumber(now.value.getHours())}:${padNumber(now.value.getMinutes())}`,
  )

  const remainingTime = computed(() => {
    const { end } = getDayRange(now.value)
    const remainingSeconds = Math.max(
      0,
      Math.ceil((end.getTime() - now.value.getTime()) / SECOND_IN_MILLISECONDS),
    )
    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.floor((remainingSeconds % 3600) / 60)
    const seconds = remainingSeconds % 60

    return `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`
  })

  const dayProgressPercent = computed(() => {
    const { start, end } = getDayRange(now.value)
    const elapsed = now.value.getTime() - start.getTime()
    const duration = end.getTime() - start.getTime()

    return Math.min(100, Math.max(0, (elapsed / duration) * 100))
  })

  function updateClock() {
    now.value = new Date()
  }

  onMounted(() => {
    updateClock()
    timerId = window.setInterval(updateClock, SECOND_IN_MILLISECONDS)
  })

  onBeforeUnmount(() => window.clearInterval(timerId))

  return {
    dateLabel,
    currentTime,
    remainingTime,
    dayProgressPercent,
  }
}
