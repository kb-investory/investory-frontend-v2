<script setup>
import { Bell, RefreshCw } from '@lucide/vue'

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
  notificationCount: {
    type: Number,
    default: 0,
  },
  syncing: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['notification', 'sync'])
</script>

<template>
  <div class="home-header" :class="{ 'home-header--dark': dark }">
    <PrimaryAppHeader :logo-src="logoSrc">
      <template #right>
        <button
          type="button"
          class="home-header__button"
          :class="{ 'home-header__button--syncing': syncing }"
          :aria-label="syncing ? '홈 정보 동기화 중' : '홈 정보 동기화'"
          :disabled="syncing"
          @click="$emit('sync')"
        >
          <RefreshCw :size="18" :stroke-width="1.9" />
        </button>
        <button
          type="button"
          class="home-header__button"
          :aria-label="
            notificationCount ? `읽지 않은 알림 ${notificationCount}개 확인` : '알림 확인'
          "
          @click="$emit('notification')"
        >
          <Bell :size="18" :stroke-width="1.9" />
          <span v-if="notificationCount" class="home-header__badge" aria-hidden="true">
            {{ notificationCount > 9 ? '9+' : notificationCount }}
          </span>
        </button>
      </template>
    </PrimaryAppHeader>
  </div>
</template>

<style scoped>
.home-header {
  position: relative;
  z-index: 40;
  width: 100%;
  margin: 0;
  background: transparent;
}

.home-header :deep(.primary-app-header) {
  position: static;
}

.home-header--dark :deep(.primary-app-header) {
  grid-template-columns: minmax(0, 1fr) 96px;
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

.home-header--dark :deep(.primary-app-header__side--right) {
  width: 96px;
  gap: 8px;
}

.home-header--dark :deep(.primary-app-header button) {
  border-color: rgba(67, 222, 217, 0.34);
  color: #ffffff;
  background: rgba(5, 45, 56, 0.76);
  box-shadow: 0 0 18px rgba(15, 207, 200, 0.12);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.home-header--dark :deep(.primary-app-header button:hover) {
  border-color: rgba(86, 235, 229, 0.72);
  color: #ffffff;
  background: #075863;
  box-shadow: 0 0 20px rgba(22, 201, 196, 0.22);
}

.home-header__button {
  position: relative;
  color: var(--slate-strong);
}

.home-header__button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.home-header__button--syncing svg {
  animation: home-header-sync-spin 0.8s linear infinite;
}

.home-header__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  display: grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 4px;
  border: 2px solid #032832;
  border-radius: 999px;
  background: #2ac9c2;
  color: #032832;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
}

.home-header__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

@keyframes home-header-sync-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
