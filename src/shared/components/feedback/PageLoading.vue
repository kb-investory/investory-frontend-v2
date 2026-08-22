<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

import RunningMonkey from '@/shared/components/RunningMonkey.vue'

const props = defineProps({
  active: {
    type: Boolean,
    required: true,
  },
  text: {
    type: String,
    default: '투자 인사이트를 준비하고 있어요',
  },
  slowText: {
    type: String,
    default: '조금만 기다려 주세요',
  },
})

const SHOW_DELAY_MS = 200
const MIN_VISIBLE_MS = 500
const SLOW_TEXT_DELAY_MS = 5000

const visible = ref(false)
const isSlow = ref(false)

let showTimer = null
let hideTimer = null
let slowTimer = null
let shownAt = 0

function clearTimers() {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  clearTimeout(slowTimer)
}

watch(
  () => props.active,
  (active) => {
    clearTimers()

    if (active) {
      isSlow.value = false
      showTimer = setTimeout(() => {
        visible.value = true
        shownAt = Date.now()
        slowTimer = setTimeout(() => {
          isSlow.value = true
        }, SLOW_TEXT_DELAY_MS)
      }, SHOW_DELAY_MS)
      return
    }

    if (visible.value) {
      const remaining = Math.max(MIN_VISIBLE_MS - (Date.now() - shownAt), 0)
      hideTimer = setTimeout(() => {
        visible.value = false
      }, remaining)
    }
  },
  { immediate: true },
)

onBeforeUnmount(clearTimers)
</script>

<template>
  <Transition name="page-loading-fade">
    <div v-if="visible" class="page-loading" role="status" aria-live="polite">
      <RunningMonkey :size="96" />
      <span class="page-loading__track">
        <span class="page-loading__sweep" />
      </span>
      <p class="page-loading__text">{{ isSlow ? slowText : text }}</p>
    </div>
  </Transition>
</template>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 240px;
  padding: 40px 20px;
}

.page-loading__track {
  position: relative;
  width: 64px;
  height: 3px;
  overflow: hidden;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
}

.page-loading__sweep {
  position: absolute;
  inset: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--brand-teal), transparent);
  animation: page-loading-sweep 1.2s ease-in-out infinite;
}

.page-loading__text {
  margin: 0;
  font-size: var(--font-size-caption);
  color: var(--color-text-muted);
}

.page-loading-fade-enter-active,
.page-loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-loading-fade-enter-from,
.page-loading-fade-leave-to {
  opacity: 0;
}

@keyframes page-loading-sweep {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(250%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-loading__sweep {
    animation: none;
    opacity: 0.6;
  }

  .page-loading-fade-enter-active,
  .page-loading-fade-leave-active {
    transition: none;
  }
}
</style>
