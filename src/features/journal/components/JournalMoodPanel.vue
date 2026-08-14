<script setup>
import { computed, onMounted, ref } from 'vue'

const moodOptions = [
  {
    value: 'ANXIOUS',
    label: '불안',
    color: '#3976d9',
    softColor: '#eaf2ff',
    image: '/assets/images/journal-moods/anxious.webp',
  },
  {
    value: 'CAUTIOUS',
    label: '경계',
    color: '#e0a012',
    softColor: '#fff7dc',
    image: '/assets/images/journal-moods/cautious.webp',
  },
  {
    value: 'CALM',
    label: '차분',
    color: '#139c83',
    softColor: '#e8f8f4',
    image: '/assets/images/journal-moods/calm.webp',
  },
  {
    value: 'CONFIDENT',
    label: '확신',
    color: '#e84a5f',
    softColor: '#fff0f2',
    image: '/assets/images/journal-moods/confident.webp',
  },
]

const props = defineProps({
  modelValue: {
    type: String,
    default: 'CALM',
  },
})

const emit = defineEmits(['update:modelValue'])
const controlRef = ref(null)
const draggingPointerId = ref(null)
const preloadedMoodImages = []

const selectedMood = computed(
  () => moodOptions.find((option) => option.value === props.modelValue) ?? moodOptions[2],
)

onMounted(() => {
  moodOptions.forEach((option) => {
    const image = new Image()
    image.decoding = 'async'
    image.src = option.image
    preloadedMoodImages.push(image)
    void image.decode().catch(() => {})
  })
})

function selectMood(mood) {
  emit('update:modelValue', mood)
}

function selectNearestMood(clientX) {
  const optionElements = controlRef.value?.querySelectorAll('.mood-selector__option')

  if (!optionElements?.length) return

  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  optionElements.forEach((optionElement, index) => {
    const optionRect = optionElement.getBoundingClientRect()
    const distance = Math.abs(clientX - (optionRect.left + optionRect.width / 2))

    if (distance < nearestDistance) {
      nearestIndex = index
      nearestDistance = distance
    }
  })

  const nearestMood = moodOptions[nearestIndex]?.value

  if (nearestMood && nearestMood !== props.modelValue) {
    selectMood(nearestMood)
  }
}

function startMoodDrag(event) {
  draggingPointerId.value = event.pointerId
  event.currentTarget.setPointerCapture?.(event.pointerId)
  selectNearestMood(event.clientX)
}

function moveMoodDrag(event) {
  if (draggingPointerId.value !== event.pointerId) return

  selectNearestMood(event.clientX)
}

function finishMoodDrag(event) {
  if (draggingPointerId.value !== event.pointerId) return

  selectNearestMood(event.clientX)
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  draggingPointerId.value = null
}
</script>

<template>
  <fieldset class="mood-selector">
    <legend class="mood-selector__title">오늘 시장을 보며 느낀 감정 선택</legend>

    <div class="mood-selector__character" aria-live="polite">
      <Transition name="mood-character" mode="out-in">
        <img
          :key="selectedMood.value"
          :src="selectedMood.image"
          :alt="`${selectedMood.label}한 표정의 원숭이`"
          class="mood-selector__character-image"
        />
      </Transition>
    </div>

    <div
      ref="controlRef"
      class="mood-selector__control"
      @pointerdown.prevent="startMoodDrag"
      @pointermove.prevent="moveMoodDrag"
      @pointerup.prevent="finishMoodDrag"
      @pointercancel.prevent="finishMoodDrag"
    >
      <div class="mood-selector__rail" aria-hidden="true" />

      <button
        v-for="option in moodOptions"
        :key="option.value"
        type="button"
        class="mood-selector__option"
        :class="{ 'mood-selector__option--active': modelValue === option.value }"
        :style="{ '--mood-color': option.color, '--mood-soft-color': option.softColor }"
        :aria-pressed="modelValue === option.value"
        @click="selectMood(option.value)"
      >
        <span class="mood-selector__dot" aria-hidden="true" />
        <span class="mood-selector__label">{{ option.label }}</span>
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.mood-selector {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.mood-selector__title {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.mood-selector__character {
  display: grid;
  height: 116px;
  margin: 2px 0 -7px;
  place-items: end center;
  overflow: visible;
}

.mood-selector__character-image {
  display: block;
  width: 112px;
  height: 112px;
  object-fit: contain;
  transform-origin: center bottom;
  animation: mood-float 2.4s ease-in-out infinite;
  filter: drop-shadow(0 5px 5px rgba(31, 41, 55, 0.12));
}

.mood-selector__control {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding-top: 5px;
  cursor: grab;
  touch-action: none;
}

.mood-selector__control:active {
  cursor: grabbing;
}

.mood-selector__rail {
  position: absolute;
  top: 14px;
  right: 12.5%;
  left: 12.5%;
  height: 5px;
  border-radius: 999px;
  background: #24364a;
}

.mood-selector__option {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mood-color);
  cursor: pointer;
  font-family: var(--font-heading);
}

.mood-selector__dot {
  width: 18px;
  height: 18px;
  border: 4px solid #ffffff;
  border-radius: 50%;
  background: var(--mood-soft-color);
  box-shadow: 0 0 0 1px rgba(36, 54, 74, 0.08);
  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.mood-selector__option--active .mood-selector__dot {
  background: var(--mood-color);
  transform: scale(1.28);
  box-shadow:
    0 0 0 3px var(--mood-soft-color),
    0 2px 5px rgba(36, 54, 74, 0.18);
}

.mood-selector__label {
  display: inline-flex;
  min-width: 42px;
  justify-content: center;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: var(--font-size-caption);
  font-weight: 700;
  line-height: 1.3;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.mood-selector__option--active .mood-selector__label {
  background: var(--mood-soft-color);
  color: var(--mood-color);
  font-weight: 800;
}

.mood-selector__option:focus-visible {
  border-radius: 8px;
  outline: 2px solid var(--brand-teal);
  outline-offset: 4px;
}

.mood-character-enter-active,
.mood-character-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.mood-character-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.92);
}

.mood-character-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.96);
}

@keyframes mood-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mood-selector__character-image {
    animation: none;
  }

  .mood-character-enter-active,
  .mood-character-leave-active {
    transition: none;
  }
}
</style>
