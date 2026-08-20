<script setup>
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'

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
</script>

<template>
  <PrimaryTabHeader :title="title" flat-bottom>
    <template #right>
      <span class="onboarding-header__step">{{ step }} / {{ totalSteps }}</span>
    </template>
  </PrimaryTabHeader>
</template>

<style scoped>
.onboarding-header__step {
  display: grid;
  min-width: 54px;
  height: 34px;
  place-items: center;
  padding: 0 9px;
  border: 1px solid rgb(92 235 228 / 42%);
  border-radius: var(--radius-pill);
  background: rgb(0 39 49 / 76%);
  box-shadow: 0 0 18px rgb(15 207 200 / 12%);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
</style>
