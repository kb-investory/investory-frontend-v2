<script setup>
import { ref } from 'vue'
import { Frown, Laugh, Meh, Smile } from '@lucide/vue'

const moodOptions = [
  { value: 'ANXIOUS', label: '불안', color: '#e34b4b', icon: Frown },
  { value: 'CAUTIOUS', label: '경계', color: '#e58b2d', icon: Meh },
  { value: 'CALM', label: '차분', color: '#3d9fb6', icon: Smile },
  { value: 'CONFIDENT', label: '확신', color: '#3976d9', icon: Laugh },
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

function selectMood(mood) {
  emit('update:modelValue', mood)
}

function selectNearestMood(clientY) {
  const optionElements = controlRef.value?.querySelectorAll('.mood-selector__option')

  if (!optionElements?.length) return

  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  optionElements.forEach((optionElement, index) => {
    const optionRect = optionElement.getBoundingClientRect()
    const distance = Math.abs(clientY - (optionRect.top + optionRect.height / 2))

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
  selectNearestMood(event.clientY)
}

function moveMoodDrag(event) {
  if (draggingPointerId.value !== event.pointerId) return

  selectNearestMood(event.clientY)
}

function finishMoodDrag(event) {
  if (draggingPointerId.value !== event.pointerId) return

  selectNearestMood(event.clientY)
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  draggingPointerId.value = null
}
</script>

<template>
  <fieldset class="mood-selector">
    <legend class="mood-selector__title">판단의 온도</legend>
    <p class="mood-selector__description">움직이면 표정이 바뀌어요</p>

    <div ref="controlRef" class="mood-selector__control">
      <div class="mood-selector__rail" aria-hidden="true" />

      <button
        v-for="option in moodOptions"
        :key="option.value"
        type="button"
        class="mood-selector__option"
        :class="{ 'mood-selector__option--active': modelValue === option.value }"
        :style="{ '--mood-color': option.color }"
        :aria-pressed="modelValue === option.value"
        @click="selectMood(option.value)"
      >
        <span
          class="mood-selector__handle"
          @click.stop.prevent
          @pointerdown.stop.prevent="startMoodDrag"
          @pointermove.stop.prevent="moveMoodDrag"
          @pointerup.stop.prevent="finishMoodDrag"
          @pointercancel.stop.prevent="finishMoodDrag"
        >
          <component :is="option.icon" :size="16" :stroke-width="1.8" aria-hidden="true" />
        </span>
        <span class="mood-selector__label">
          <component :is="option.icon" :size="12" :stroke-width="1.8" aria-hidden="true" />
          {{ option.label }}
        </span>
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.mood-selector {
  width: 118px;
  min-width: 118px;
  margin: 0;
  padding: 4px 2px;
  border: 0;
}

.mood-selector__title {
  padding: 0;
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 700;
}

.mood-selector__description {
  margin: 2px 0 7px;
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 15px;
}

.mood-selector__control {
  position: relative;
  display: flex;
  height: 118px;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 27px;
}

.mood-selector__rail {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 8px;
  width: 12px;
  border-radius: 6px;
  background: linear-gradient(180deg, #e34b4b 0%, #e58b2d 34%, #4bb7c5 68%, #3976d9 100%);
}

.mood-selector__option {
  position: relative;
  display: flex;
  min-height: 22px;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mood-color);
  cursor: pointer;
  font-family: var(--font-heading);
}

.mood-selector__handle {
  position: absolute;
  top: 50%;
  left: -29px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 3px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: transparent;
  cursor: grab;
  touch-action: none;
  transform: translateY(-50%);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.mood-selector__handle:active {
  cursor: grabbing;
}

.mood-selector__option--active .mood-selector__handle {
  border-color: var(--mood-color);
  background: #ffffff;
  color: var(--mood-color);
  box-shadow: 0 2px 7px rgba(24, 24, 23, 0.14);
}

.mood-selector__label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 9px;
  font-size: 11px;
  font-weight: 600;
  line-height: 15px;
  white-space: nowrap;
}

.mood-selector__option--active .mood-selector__label {
  font-weight: 800;
}

.mood-selector__option:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--brand-teal);
  outline-offset: 3px;
}
</style>
