<script setup>
import { Bell } from '@lucide/vue'

import PrimaryAppHeader from '@/shared/components/navigation/PrimaryAppHeader.vue'

defineProps({
  logoSrc: {
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
  padding: 0 20px;
  background: transparent;
}

.home-header--dark :deep(.primary-app-header__side--left) {
  display: none;
}

.home-header--dark :deep(.primary-app-header__logo-link) {
  width: 154px;
  justify-self: start;
  padding: 0;
  background: transparent;
}

.home-header--dark :deep(.primary-app-header__logo) {
  width: 146px;
  filter: drop-shadow(0 0 5px rgba(45, 225, 217, 0.16));
  object-position: left center;
}

.home-header--dark :deep(.primary-app-header button) {
  border-color: rgba(67, 222, 217, 0.34);
  color: #ffffff;
  background: rgba(5, 45, 56, 0.76);
  box-shadow: 0 0 18px rgba(15, 207, 200, 0.12);
}

.home-header__button {
  color: var(--slate-strong);
}

.home-header__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
