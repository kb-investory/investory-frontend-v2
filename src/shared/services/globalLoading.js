import { computed, ref } from 'vue'

const pendingOperations = ref(0)

export const isGlobalLoading = computed(() => pendingOperations.value > 0)

export function beginGlobalLoading() {
  pendingOperations.value += 1
  let finished = false

  return () => {
    if (finished) return

    finished = true
    pendingOperations.value = Math.max(pendingOperations.value - 1, 0)
  }
}
