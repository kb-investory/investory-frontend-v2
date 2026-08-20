<script setup>
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'
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

const emit = defineEmits(['back'])
</script>

<template>
  <PrimaryTabHeader :title="title" :show-logo="false" flat-bottom>
    <template #left>
      <button
        type="button"
        class="onboarding-header__back"
        aria-label="이전 단계로 이동"
        @click="emit('back')"
      >
        <AppIcon name="chevron-left" :size="22" />
      </button>
    </template>

    <template #right>
      <span class="onboarding-header__step">{{ step }} / {{ totalSteps }}</span>
    </template>
  </PrimaryTabHeader>
</template>

<style scoped>
.onboarding-header__back {
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.onboarding-header__back:hover {
  border-color: rgb(86 235 229 / 72%) !important;
  background: #075863 !important;
  box-shadow: 0 0 20px rgb(22 201 196 / 22%) !important;
  transform: translateY(-1px);
}

.onboarding-header__back:active {
  transform: scale(0.96);
}

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
