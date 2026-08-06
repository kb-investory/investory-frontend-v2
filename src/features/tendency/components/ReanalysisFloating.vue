<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  collapsed: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['analyze', 'toggle'])
</script>

<template>
  <aside
    class="reanalysis-floating"
    :class="{ 'reanalysis-floating--collapsed': collapsed }"
    aria-label="투자성향 재분석 안내"
  >
    <button
      v-if="collapsed"
      type="button"
      class="reanalysis-floating__collapsed-button"
      aria-label="투자성향 재분석 안내 펼치기"
      @click="$emit('toggle')"
    >
      <img src="/assets/icons/monkey-surprised.png" alt="" />
      <span>click !</span>
    </button>

    <template v-else>
      <span class="reanalysis-floating__icon">
        <img src="/assets/icons/monkey-surprised.png" alt="" />
      </span>
      <button type="button" class="reanalysis-floating__body" @click="$emit('analyze')">
        <span>새 분석 필요</span>
        <strong>최근 분석 후 90일이 지났어요</strong>
        <small>투자성향 다시 분석하기 <AppIcon name="arrow-right" :size="12" /></small>
      </button>
      <button
        type="button"
        class="reanalysis-floating__fold"
        aria-label="투자성향 재분석 안내 접기"
        @click="$emit('toggle')"
      >
        <AppIcon name="chevron-right" :size="18" />
      </button>
    </template>
  </aside>
</template>

<style scoped>
.reanalysis-floating {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 72px;
  align-items: center;
  gap: 11px;
  padding: 11px 11px 11px 14px;
  overflow: hidden;
  border: 1px solid rgba(245, 196, 102, 0.4);
  border-radius: 17px;
  background: #263b43;
  box-shadow: 0 10px 24px rgba(27, 47, 54, 0.22);
  color: #fff;
  transition:
    width 0.22s ease,
    min-height 0.22s ease,
    padding 0.22s ease;
  animation: reanalysis-floating-in 0.25s ease-out;
}

.reanalysis-floating--collapsed {
  width: 62px;
  min-height: 68px;
  align-self: flex-end;
  gap: 0;
  padding: 6px;
}

.reanalysis-floating__icon,
.reanalysis-floating__collapsed-button {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #263b43;
}

.reanalysis-floating__icon img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.reanalysis-floating__collapsed-button {
  flex-direction: column;
  width: 50px;
  height: 56px;
  cursor: pointer;
}

.reanalysis-floating__collapsed-button img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.reanalysis-floating__collapsed-button span {
  margin-top: -1px;
  color: #ffd66b;
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
}

.reanalysis-floating__body {
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

.reanalysis-floating__body span {
  color: #f7d997;
  font-size: 9px;
  font-weight: 800;
}

.reanalysis-floating__body strong {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reanalysis-floating__body small {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
}

.reanalysis-floating__fold {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.12);
  color: #f9e5b5;
  cursor: pointer;
}

.reanalysis-floating__body:focus-visible,
.reanalysis-floating__fold:focus-visible,
.reanalysis-floating__collapsed-button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

@keyframes reanalysis-floating-in {
  from {
    transform: translateY(12px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
