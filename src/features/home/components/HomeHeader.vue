<script setup>
import { Bell } from '@lucide/vue'

import PrimaryAppHeader from '@/shared/components/navigation/PrimaryAppHeader.vue'

defineProps({
  logoSrc: {
    type: String,
    required: true,
  },
  dateLabel: {
    type: String,
    required: true,
  },
  dark: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['notification'])
</script>

<template>
  <div class="home-header" :class="{ 'home-header--dark': dark }">
    <PrimaryAppHeader :logo-src="logoSrc">
      <template #right>
        <button
          type="button"
          class="home-header__button"
          aria-label="알림 확인"
          @click="$emit('notification')"
        >
          <Bell :size="18" :stroke-width="1.9" />
        </button>
      </template>
    </PrimaryAppHeader>
    <time class="home-header__date">{{ dateLabel }}</time>
  </div>
</template>

<style scoped>
.home-header {
  position: sticky;
  top: 0;
  z-index: 40;
  width: 100%;
  margin: 0;
  background: #ffffff;
}

.home-header--dark {
  background: #031f28;
}

.home-header :deep(.primary-app-header) {
  position: static;
}

.home-header--dark :deep(.primary-app-header) {
  grid-template-columns: minmax(0, 1fr) 44px;
  padding: 0 24px;
  background: transparent;
}

.home-header--dark :deep(.primary-app-header__side--left) {
  display: none;
}

.home-header--dark :deep(.primary-app-header__logo-link) {
  width: 156px;
  justify-self: start;
  padding: 0;
  background: transparent;
}

.home-header--dark :deep(.primary-app-header__logo) {
  width: 150px;
  filter: drop-shadow(0 0 0.7px rgba(255, 255, 255, 0.9))
    drop-shadow(0 0 4px rgba(255, 255, 255, 0.24));
  object-position: left center;
}

.home-header--dark :deep(.primary-app-header button) {
  border-color: rgba(67, 222, 217, 0.34);
  color: #ffffff;
  background: rgba(5, 45, 56, 0.76);
  box-shadow: 0 0 18px rgba(15, 207, 200, 0.12);
}

.home-header__date {
  display: block;
  padding: 0 24px 10px;
  color: #718087;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.home-header--dark .home-header__date {
  color: #b9cbd0;
  background: #031f28;
}

.home-header__button {
  color: var(--slate-strong);
}

.home-header__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
