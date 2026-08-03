<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

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
      <AppIcon name="chevron-left" :size="22" />
    </button>
    <h1>{{ title }}</h1>
    <span class="onboarding-header__step">{{ step }} / {{ totalSteps }}</span>
  </header>
</template>

<style scoped>
.onboarding-header {
  display: grid;
  width: 100%;
  height: 53px;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.onboarding-header button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
}

.onboarding-header button:focus-visible {
  border-radius: 8px;
  outline: 3px solid var(--color-primary-soft);
}

.onboarding-header h1 {
  margin: 0;
  font-size: 16px;
  text-align: center;
}

.onboarding-header__step {
  justify-self: end;
  padding: 5px 8px;
  border-radius: 4px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
</style>
