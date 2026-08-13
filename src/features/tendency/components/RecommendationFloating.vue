<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  count: {
    type: Number,
    default: 0,
  },
  collapsed: {
    type: Boolean,
    default: true,
  },
  eyebrow: {
    type: String,
    default: '새 추천',
  },
  message: {
    type: String,
    default: '',
  },
  ctaLabel: {
    type: String,
    default: '추천 원칙 선택하기',
  },
  ariaLabel: {
    type: String,
    default: '새 추천 투자원칙 안내',
  },
  tone: {
    type: String,
    default: 'recommendation',
    validator: (value) => ['recommendation', 'reanalysis'].includes(value),
  },
})

defineEmits(['navigate', 'toggle'])
</script>

<template>
  <aside
    class="recommendation-floating"
    :class="[
      { 'recommendation-floating--collapsed': collapsed },
      `recommendation-floating--${tone}`,
    ]"
    :aria-label="ariaLabel"
  >
    <img
      class="recommendation-floating__expanded-art"
      src="/assets/images/recommendation-scroll-expanded.png"
      alt=""
      aria-hidden="true"
    />

    <button
      type="button"
      class="recommendation-floating__collapsed-button"
      :aria-hidden="!collapsed"
      :tabindex="collapsed ? 0 : -1"
      :aria-label="`${ariaLabel} 펼치기`"
      @click="$emit('toggle')"
    >
      <img src="/assets/images/recommendation-scroll-collapsed.png" alt="" />
    </button>

    <button
      type="button"
      class="recommendation-floating__body"
      :tabindex="collapsed ? -1 : 0"
      @click="$emit('navigate')"
    >
      <span>{{ eyebrow }}</span>
      <strong>{{ message || `성향 기반 원칙 ${count}개가 준비됐어요` }}</strong>
      <small>{{ ctaLabel }} <AppIcon name="arrow-right" :size="12" /></small>
    </button>

    <button
      type="button"
      class="recommendation-floating__fold"
      :tabindex="collapsed ? -1 : 0"
      :aria-label="`${ariaLabel} 접기`"
      @click="$emit('toggle')"
    >
      <span>닫기</span>
      <AppIcon name="x" :size="9" />
    </button>
  </aside>
</template>

<style scoped>
.recommendation-floating {
  position: relative;
  display: flex;
  width: 220px;
  min-height: 144px;
  align-self: center;
  align-items: center;
  overflow: visible;
  background: transparent;
  color: #ffffff;
  transition:
    width 0.34s cubic-bezier(0.22, 0.8, 0.3, 1),
    min-height 0.34s cubic-bezier(0.22, 0.8, 0.3, 1);
}

.recommendation-floating--collapsed {
  width: 64px;
  min-height: 92px;
  align-self: flex-end;
}

.recommendation-floating__expanded-art {
  position: absolute;
  z-index: 0;
  top: -19px;
  left: 0;
  width: 100%;
  height: auto;
  pointer-events: none;
  opacity: 1;
  transform: scaleX(1);
  transform-origin: center;
  transition:
    opacity 0.16s ease 0.08s,
    transform 0.34s cubic-bezier(0.22, 0.8, 0.3, 1);
}

.recommendation-floating--collapsed .recommendation-floating__expanded-art {
  opacity: 0;
  transform: scaleX(0.22);
  transition-delay: 0s;
}

.recommendation-floating__collapsed-button {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: block;
  width: 64px;
  height: 92px;
  overflow: visible;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: scaleX(0.72);
  transition:
    opacity 0.14s ease,
    transform 0.3s cubic-bezier(0.22, 0.8, 0.3, 1);
}

.recommendation-floating--collapsed .recommendation-floating__collapsed-button {
  opacity: 1;
  pointer-events: auto;
  transform: scaleX(1);
  transition-delay: 0.1s;
}

.recommendation-floating__collapsed-button img {
  display: block;
  width: 64px;
  height: 92px;
  object-fit: contain;
}

.recommendation-floating--reanalysis::after {
  position: absolute;
  z-index: 1;
  top: 51px;
  left: 42px;
  width: 136px;
  height: 72px;
  border-radius: 3px;
  background: rgba(10, 145, 153, 0.72);
  content: '';
  mix-blend-mode: color;
  pointer-events: none;
}

.recommendation-floating--reanalysis.recommendation-floating--collapsed::after {
  display: none;
}

.recommendation-floating--reanalysis .recommendation-floating__collapsed-button::after {
  position: absolute;
  z-index: 1;
  top: 18px;
  left: 29px;
  width: 30px;
  height: 62px;
  border-radius: 2px;
  background: rgba(10, 145, 153, 0.78);
  content: '';
  mix-blend-mode: color;
  pointer-events: none;
}

.recommendation-floating__body {
  position: absolute;
  z-index: 2;
  top: 55px;
  left: 50px;
  display: grid;
  width: 121px;
  justify-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 1;
  text-align: center;
  transform: translateX(0);
  transition:
    opacity 0.15s ease 0.16s,
    transform 0.28s ease 0.08s;
}

.recommendation-floating__body span {
  color: #f1cd72;
  font-size: 7px;
  font-weight: 800;
}

.recommendation-floating__body strong {
  overflow: hidden;
  max-width: 121px;
  font-size: 9px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-floating__body small {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: max-content;
  padding: 3px 7px;
  border: 1px solid rgba(242, 205, 114, 0.72);
  border-radius: 999px;
  background: rgba(246, 213, 128, 0.14);
  color: #ffffff;
  font-size: 7px;
  font-weight: 700;
}

.recommendation-floating__fold {
  position: absolute;
  z-index: 3;
  top: 43px;
  right: 24px;
  display: inline-flex;
  width: auto;
  height: 18px;
  gap: 1px;
  padding: 0 3px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #f1cd72;
  cursor: pointer;
  font-size: 7px;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0, 33, 20, 0.75);
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.15s ease 0.16s,
    transform 0.28s ease 0.08s;
}

.recommendation-floating--collapsed .recommendation-floating__body,
.recommendation-floating--collapsed .recommendation-floating__fold {
  opacity: 0;
  pointer-events: none;
  transform: translateX(var(--floating-content-shift, 18px));
  transition-delay: 0s;
}

.recommendation-floating__body:focus-visible,
.recommendation-floating__fold:focus-visible,
.recommendation-floating__collapsed-button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .recommendation-floating,
  .recommendation-floating__expanded-art,
  .recommendation-floating__collapsed-button,
  .recommendation-floating__body,
  .recommendation-floating__fold {
    transition: none;
  }
}
</style>
