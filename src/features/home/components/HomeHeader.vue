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
})

defineEmits(['notification'])
</script>

<template>
  <div class="home-header">
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
  width: calc(100% + 40px);
  margin: 0 -20px;
  background: #ffffff;
}

.home-header :deep(.primary-app-header) {
  position: static;
}

.home-header__date {
  display: block;
  padding: 0 20px 6px;
  color: #718087;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.home-header__button {
  color: var(--slate-strong);
}

.home-header__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
