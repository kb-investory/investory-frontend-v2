<script setup>
import { Bell, Search } from '@lucide/vue'

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

defineEmits(['search', 'notification'])
</script>

<template>
  <header class="home-header">
    <div class="home-header__identity">
      <img class="home-header__logo" :src="logoSrc" alt="Investory" />
      <time class="home-header__date">{{ dateLabel }}</time>
    </div>

    <div class="home-header__actions">
      <button
        type="button"
        class="home-header__button"
        aria-label="기록 검색"
        @click="$emit('search')"
      >
        <Search :size="18" :stroke-width="1.9" />
      </button>
      <button
        type="button"
        class="home-header__button"
        aria-label="알림 확인"
        @click="$emit('notification')"
      >
        <Bell :size="18" :stroke-width="1.9" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.home-header {
  display: flex;
  min-height: 60px;
  align-items: center;
  justify-content: space-between;
}

.home-header__identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.home-header__logo {
  display: block;
  width: 118px;
  height: 44px;
  border-radius: 8px;
  object-fit: contain;
  object-position: center;
}

.home-header__date {
  color: #718087;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.home-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-header__button {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #dce6e9;
  border-radius: 50%;
  color: #263a43;
  background: #ffffff;
  cursor: pointer;
}

.home-header__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
