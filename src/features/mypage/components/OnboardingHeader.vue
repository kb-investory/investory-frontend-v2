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
    <div class="onboarding-header__top">
      <img
        class="onboarding-header__logo"
        src="/assets/logos/investory-logo-dark.png"
        alt="Investory"
      />
      <button type="button" aria-label="뒤로 가기" @click="$emit('back')">
        <ChevronLeft :size="20" :stroke-width="2.2" />
      </button>
    </div>

    <div class="onboarding-header__heading">
      <h1>{{ title }}</h1>
      <span class="onboarding-header__step">{{ step }} / {{ totalSteps }}</span>
    </div>

    <span class="onboarding-header__accent" aria-hidden="true" />
    <span class="onboarding-header__chart" aria-hidden="true" />
  </header>
</template>

<style scoped>
.onboarding-header {
  position: relative;
  z-index: 40;
  display: grid;
  width: 100%;
  min-height: 172px;
  grid-template-rows: 44px 1fr 3px;
  gap: 8px;
  overflow: hidden;
  padding: 10px 20px 20px;
  background:
    radial-gradient(circle at 88% 78%, rgb(24 166 165 / 15%), transparent 34%),
    linear-gradient(145deg, #031a23 0%, #062b34 100%);
  color: #ffffff;
}

.onboarding-header__top,
.onboarding-header__heading {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.onboarding-header__heading {
  align-self: end;
  padding: 0 6px;
}

.onboarding-header__logo {
  display: block;
  width: 146px;
  height: 44px;
  object-fit: contain;
  object-position: left center;
}

.onboarding-header button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 1px solid rgb(92 235 228 / 34%);
  border-radius: 50%;
  background: rgb(0 39 49 / 68%);
  color: #ffffff;
  cursor: pointer;
}

.onboarding-header button:hover {
  border-color: #5cebe4;
  background: rgb(35 216 209 / 12%);
}

.onboarding-header button:focus-visible {
  outline: 2px solid #5cebe4;
  outline-offset: 2px;
}

.onboarding-header h1 {
  margin: 0;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-lg);
  font-weight: 800;
  letter-spacing: -0.6px;
}

.onboarding-header__step {
  padding: 6px 10px;
  border: 1px solid rgb(92 235 228 / 42%);
  border-radius: var(--radius-pill);
  background: rgb(0 39 49 / 70%);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.onboarding-header__accent {
  position: relative;
  z-index: 2;
  width: 48px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #23d8d1 0 68%, rgb(35 216 209 / 28%) 68%);
}

.onboarding-header__chart {
  position: absolute;
  right: -18px;
  bottom: -50px;
  width: 170px;
  height: 128px;
  border: 1px solid rgb(35 216 209 / 9%);
  border-radius: 50%;
}

.onboarding-header__chart::before,
.onboarding-header__chart::after {
  position: absolute;
  content: '';
}

.onboarding-header__chart::before {
  inset: 22px;
  border: 1px solid rgb(35 216 209 / 10%);
  border-radius: 50%;
}

.onboarding-header__chart::after {
  right: 18px;
  bottom: 58px;
  width: 116px;
  height: 38px;
  border-top: 4px solid rgb(35 216 209 / 28%);
  border-right: 4px solid rgb(35 216 209 / 28%);
  transform: skewY(-22deg) rotate(-8deg);
}
</style>
