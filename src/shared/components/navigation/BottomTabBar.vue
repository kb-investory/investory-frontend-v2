<script setup>
import { RouterLink } from 'vue-router'

import AppIcon from '@/shared/components/AppIcon.vue'
import MonkeyImage from '@/shared/components/MonkeyImage.vue'

defineProps({
  items: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <nav class="bottom-tab-bar" aria-label="하단 메뉴">
    <RouterLink
      v-for="item in items"
      :key="item.label"
      class="bottom-tab-bar__item"
      :class="{ 'bottom-tab-bar__item--active': item.active }"
      :to="item.to || '#'"
    >
      <div
        class="bottom-tab-bar__icon-wrapper"
        :class="{ 'bottom-tab-bar__icon-wrapper--monkey': item.isMonkey }"
      >
        <MonkeyImage v-if="item.isMonkey" :size="22" />
        <AppIcon v-else :name="item.icon" :size="18" />
      </div>
      <span class="bottom-tab-bar__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-tab-bar {
  display: flex;
  width: 100%;
  height: 56px;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border: 1px solid #d9e7e8;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.07);
  backdrop-filter: blur(8px);
}

.bottom-tab-bar__item {
  display: flex;
  height: 44px;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 9999px;
  color: #94948e;
  text-decoration: none;
  transition: all 0.15s ease;
}

.bottom-tab-bar__item--active,
.bottom-tab-bar__item.router-link-active {
  background: #e8f7f6;
  color: #087f7c;
}

.bottom-tab-bar__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.bottom-tab-bar__icon-wrapper--monkey {
  width: 22px;
  height: 22px;
}

.bottom-tab-bar__label {
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 500;
  white-space: nowrap;
}

.bottom-tab-bar__item--active .bottom-tab-bar__label,
.bottom-tab-bar__item.router-link-active .bottom-tab-bar__label {
  font-weight: 700;
}
</style>
