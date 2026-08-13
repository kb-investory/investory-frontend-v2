import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const VALID_POSITIONS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
const SWIPE_THRESHOLD = 24
const SLIDE_DURATION = 280

export function useFloatingCornerSwipe(storageKey, defaultPosition = 'bottom-right') {
  const storedPosition = window.localStorage.getItem(storageKey)
  const position = ref(VALID_POSITIONS.has(storedPosition) ? storedPosition : defaultPosition)
  const elementRef = ref(null)
  const slideOffset = ref({ x: 0, y: 0 })
  const sliding = ref(false)
  let pointerStart = null
  let suppressClick = false
  let slideTimer

  const style = computed(() => ({
    transform: `translate(${slideOffset.value.x}px, ${slideOffset.value.y}px)`,
  }))

  function getNextPosition(deltaX, deltaY) {
    const [currentVertical, currentHorizontal] = position.value.split('-')
    const vertical =
      Math.abs(deltaY) >= SWIPE_THRESHOLD ? (deltaY < 0 ? 'top' : 'bottom') : currentVertical
    const horizontal =
      Math.abs(deltaX) >= SWIPE_THRESHOLD ? (deltaX < 0 ? 'left' : 'right') : currentHorizontal

    return `${vertical}-${horizontal}`
  }

  async function slideTo(nextPosition) {
    if (!VALID_POSITIONS.has(nextPosition) || nextPosition === position.value) return

    const before = elementRef.value?.getBoundingClientRect()
    position.value = nextPosition
    window.localStorage.setItem(storageKey, nextPosition)
    await nextTick()

    const after = elementRef.value?.getBoundingClientRect()
    if (!before || !after) return

    window.clearTimeout(slideTimer)
    sliding.value = false
    slideOffset.value = {
      x: before.left - after.left,
      y: before.top - after.top,
    }
    await nextTick()
    elementRef.value?.getBoundingClientRect()

    window.requestAnimationFrame(() => {
      sliding.value = true
      slideOffset.value = { x: 0, y: 0 }
      slideTimer = window.setTimeout(() => {
        sliding.value = false
      }, SLIDE_DURATION)
    })
  }

  function finishSwipe(event) {
    window.removeEventListener('pointerup', finishSwipe)
    window.removeEventListener('pointercancel', cancelSwipe)
    if (!pointerStart) return

    const deltaX = event.clientX - pointerStart.x
    const deltaY = event.clientY - pointerStart.y
    pointerStart = null

    if (Math.hypot(deltaX, deltaY) < SWIPE_THRESHOLD) return

    suppressClick = true
    void slideTo(getNextPosition(deltaX, deltaY))
    window.setTimeout(() => {
      suppressClick = false
    }, 0)
  }

  function cancelSwipe() {
    pointerStart = null
    window.removeEventListener('pointerup', finishSwipe)
    window.removeEventListener('pointercancel', cancelSwipe)
  }

  function startSwipe(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    pointerStart = { x: event.clientX, y: event.clientY }
    window.addEventListener('pointerup', finishSwipe, { once: true })
    window.addEventListener('pointercancel', cancelSwipe, { once: true })
  }

  function preventClickAfterSwipe(event) {
    if (!suppressClick) return
    event.preventDefault()
    event.stopPropagation()
  }

  onBeforeUnmount(() => {
    cancelSwipe()
    window.clearTimeout(slideTimer)
  })

  return {
    elementRef,
    position,
    sliding,
    style,
    startSwipe,
    preventClickAfterSwipe,
  }
}
