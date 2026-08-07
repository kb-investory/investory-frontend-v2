<script setup>
import { ChevronLeft } from '@lucide/vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  step: {
    type: Number,
    required: true,
  },
  totalSteps: {
    type: Number,
    default: 3,
  },
})

defineEmits(['back'])
</script>

<template>
  <header class="onboarding-header">
    <button type="button" aria-label="뒤로 가기" @click="$emit('back')">
      <ChevronLeft :size="22" :stroke-width="2.2" />
    </button>
    <h1>{{ title }}</h1>
    <span class="onboarding-header__step">{{ step }} / {{ totalSteps }}</span>
  </header>
</template>

<style scoped>
.onboarding-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: grid;
  width: 100%;
  height: 54px;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: #ffffff;
}

.onboarding-header button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  padding: 0;
  border: 1px solid #e1e8e8;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
}

.onboarding-header button:focus-visible {
  border-radius: 8px;
  outline: 3px solid var(--brand-teal-soft);
}

.onboarding-header h1 {
  margin: 0;
  color: var(--color-heading);
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
  text-align: center;
}

.onboarding-header__step {
  justify-self: end;
  padding: 5px 8px;
  border-radius: var(--radius-pill);
  background: var(--slate-strong);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
</style>
