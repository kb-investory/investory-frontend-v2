<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  title: {
    type: String,
    default: '화면 제목',
  },
  showBack: {
    type: Boolean,
    default: true,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['back', 'close'])
</script>

<template>
  <header class="app-bar">
    <button
      v-if="showBack"
      type="button"
      class="app-bar__action"
      aria-label="뒤로가기"
      @click="$emit('back')"
    >
      <AppIcon name="chevron-left" :size="20" />
    </button>
    <div v-else class="app-bar__spacer" />

    <h1 class="app-bar__title">{{ title }}</h1>

    <button
      v-if="showClose"
      type="button"
      class="app-bar__action"
      aria-label="닫기"
      @click="$emit('close')"
    >
      <AppIcon name="x" :size="20" />
    </button>
    <div v-else class="app-bar__spacer" />
  </header>
</template>

<style scoped>
.app-bar {
  display: flex;
  width: 100%;
  height: 60px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #ffffff;
}

.app-bar__action {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #181817;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.app-bar__action:hover {
  background: #f3f6f6;
}

.app-bar__spacer {
  width: 44px;
  height: 44px;
}

.app-bar__title {
  margin: 0;
  color: #181817;
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 700;
  line-height: normal;
  white-space: nowrap;
}
</style>
