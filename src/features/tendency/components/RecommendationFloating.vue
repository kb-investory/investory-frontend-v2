<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  count: {
    type: Number,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['navigate', 'toggle'])
</script>

<template>
  <aside
    class="recommendation-floating"
    :class="{ 'recommendation-floating--collapsed': collapsed }"
    aria-label="새 추천 투자원칙 안내"
  >
    <button
      v-if="collapsed"
      type="button"
      class="recommendation-floating__monkey-button"
      aria-label="추천 원칙 안내 펼치기"
      @click="$emit('toggle')"
    >
      <img src="/assets/icons/monkey.png" alt="" />
      <span>click !</span>
    </button>

    <template v-else>
      <div class="recommendation-floating__icon">
        <img src="/assets/icons/monkey.png" alt="" />
      </div>
      <button type="button" class="recommendation-floating__body" @click="$emit('navigate')">
        <span>새 추천</span>
        <strong>성향 기반 원칙 {{ count }}개가 준비됐어요</strong>
        <small>추천 원칙 선택하기 <AppIcon name="arrow-right" :size="12" /></small>
      </button>
      <button
        type="button"
        class="recommendation-floating__fold"
        aria-label="추천 원칙 안내 접기"
        @click="$emit('toggle')"
      >
        <AppIcon name="chevron-right" :size="18" />
      </button>
    </template>
  </aside>
</template>

<style scoped>
.recommendation-floating {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 72px;
  align-items: center;
  gap: 11px;
  padding: 11px 11px 11px 14px;
  overflow: hidden;
  border-radius: 17px;
  background: #0b8f8b;
  box-shadow: 0 10px 24px rgba(5, 100, 97, 0.26);
  color: #ffffff;
  transition:
    width 0.22s ease,
    min-height 0.22s ease,
    padding 0.22s ease,
    border-radius 0.22s ease;
  animation: floating-in 0.25s ease-out;
}

.recommendation-floating--collapsed {
  width: 62px;
  min-height: 68px;
  align-self: flex-end;
  gap: 0;
  padding: 6px;
  border-radius: 17px;
}

.recommendation-floating__icon {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 11px;
}

.recommendation-floating__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.22);
}

.recommendation-floating__body {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.recommendation-floating__body span {
  color: #a9f0ed;
  font-size: 9px;
  font-weight: 700;
}

.recommendation-floating__body strong {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-floating__body small {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
}

.recommendation-floating__fold,
.recommendation-floating__monkey-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.recommendation-floating__fold {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.14);
  color: #d7f7f5;
}

.recommendation-floating__monkey-button {
  flex-direction: column;
  width: 50px;
  height: 56px;
  overflow: hidden;
  padding: 0;
  border-radius: 12px;
  background: transparent;
}

.recommendation-floating__monkey-button img {
  width: 42px;
  height: 42px;
  object-fit: cover;
  transform: scale(1.18);
}

.recommendation-floating__monkey-button span {
  margin-top: -1px;
  color: #ffd66b;
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
}

.recommendation-floating__body:focus-visible,
.recommendation-floating__fold:focus-visible,
.recommendation-floating__monkey-button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

@keyframes floating-in {
  from {
    transform: translateY(16px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
