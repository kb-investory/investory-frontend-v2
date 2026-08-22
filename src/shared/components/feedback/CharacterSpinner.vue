<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const CHARACTERS = ['real-me', 'my-bot', 'monkey', 'famous-investor']

const RING_COLOR_BY_TONE = {
  light: 'var(--brand-teal-deep)',
  dark: 'var(--brand-teal-soft)',
  accent: '#ef7b3d',
}

const SHOW_DELAY_MS = 200

const props = defineProps({
  active: {
    type: Boolean,
    required: true,
  },
  tone: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark', 'accent'].includes(value),
  },
  ringColor: {
    type: String,
    default: null,
  },
  size: {
    type: Number,
    default: 44,
  },
  ringSize: {
    type: Number,
    default: 64,
  },
  text: {
    type: String,
    default: '',
  },
})

const character = ref(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
const characterSrc = computed(() => `/assets/images/character-spinner/${character.value}.png`)

const resolvedRingColor = computed(() => props.ringColor ?? RING_COLOR_BY_TONE[props.tone])

const visible = ref(false)
let showTimer = null

watch(
  () => props.active,
  (active) => {
    clearTimeout(showTimer)

    if (active) {
      showTimer = setTimeout(() => {
        visible.value = true
      }, SHOW_DELAY_MS)
      return
    }

    visible.value = false
  },
  { immediate: true },
)

onBeforeUnmount(() => clearTimeout(showTimer))
</script>

<template>
  <div
    v-if="visible"
    class="character-spinner"
    role="status"
    aria-live="polite"
    :style="{ '--character-spinner-ring-color': resolvedRingColor }"
  >
    <span
      class="character-spinner__ring"
      :style="{ width: `${ringSize}px`, height: `${ringSize}px` }"
    >
      <img
        :src="characterSrc"
        alt=""
        aria-hidden="true"
        class="character-spinner__character"
        :style="{ width: `${size}px`, height: `${size}px` }"
      />
    </span>

    <p v-if="text" class="character-spinner__text">{{ text }}</p>
    <span v-else class="sr-only">불러오는 중</span>
  </div>
</template>

<style scoped>
.character-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
}

.character-spinner__ring {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.character-spinner__ring::before,
.character-spinner__ring::after {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  content: '';
}

.character-spinner__ring::before {
  border: 3px solid color-mix(in srgb, var(--character-spinner-ring-color) 20%, transparent);
}

.character-spinner__ring::after {
  border: 3px solid transparent;
  border-top-color: var(--character-spinner-ring-color);
  animation: character-spinner-rotate 0.9s linear infinite;
}

.character-spinner__character {
  position: relative;
  z-index: 1;
  object-fit: contain;
}

.character-spinner__text {
  margin: 0;
  font-size: var(--font-size-caption);
  color: var(--color-text-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@keyframes character-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .character-spinner__ring::after {
    animation: none;
  }
}
</style>
