<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  label: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  results: {
    type: Array,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'selection',
  },
})

defineEmits(['select'])

const RESULT_ICONS = Object.freeze({
  PORTFOLIO_RISK_ALLOCATION: 'chart-pie',
  BUY_JUDGMENT_BASIS: 'search',
  INVESTMENT_HORIZON: 'calendar-range',
  LOSS_RESPONSE: 'shield-check',
  PROFIT_RESPONSE: 'trending-up',
  PRINCIPLE_FULFILLMENT: 'refresh-cw',
})

function getResultIcon(dimensionCode) {
  return RESULT_ICONS[dimensionCode] || 'target'
}
</script>

<template>
  <section class="group-card" :class="`group-card--${variant}`">
    <header class="group-card__header">
      <span class="group-card__icon">
        <AppIcon :name="icon" :size="17" />
      </span>
      <div>
        <p class="group-card__label">{{ label }}</p>
        <h2 class="group-card__summary">{{ summary }}</h2>
      </div>
    </header>

    <div class="group-card__results">
      <button
        v-for="result in results"
        :key="result.dimension.code"
        type="button"
        class="result-card"
        :class="`result-card--${result.dimension.tone}`"
        :aria-label="`${result.dimension.name} ${result.type.name} 상세 보기`"
        @click="$emit('select', result)"
      >
        <span class="result-card__content">
          <span class="result-card__icon">
            <AppIcon :name="getResultIcon(result.dimension.code)" :size="16" />
          </span>
          <span class="result-card__labels">
            <span class="result-card__dimension">{{ result.dimension.name }}</span>
            <strong class="result-card__type">{{ result.type.name }}</strong>
          </span>
        </span>
        <AppIcon name="chevron-right" :size="15" class="result-card__arrow" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.group-card {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 12px;
  padding: 13px 10px 11px;
  border: 1px solid #dfe7e7;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 3px 12px rgba(24, 39, 45, 0.035);
}

.group-card__header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.group-card__header > div {
  display: contents;
}

.group-card__icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #0b8f8b;
  color: #ffffff;
}

.group-card--behavior .group-card__icon {
  background: #18272d;
  color: #53e0d7;
}

.group-card__label,
.group-card__summary {
  margin: 0;
}

.group-card__label {
  color: #74746f;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
}

.group-card__summary {
  grid-column: 1 / -1;
  color: #181817;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
  letter-spacing: -0.035em;
}

.group-card__results {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

.result-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  align-items: center;
  gap: 5px;
  min-height: 48px;
  padding: 7px 6px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.result-card__content {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.result-card__icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: currentColor;
}

.result-card__labels {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.result-card:hover,
.result-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(24, 39, 45, 0.1);
  outline: none;
}

.result-card__dimension {
  display: block;
  color: currentColor;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  word-break: keep-all;
}

.result-card__type {
  display: block;
  color: currentColor;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.04em;
  word-break: keep-all;
}

.result-card__arrow {
  flex: 0 0 auto;
  opacity: 0.72;
}

.result-card--amber {
  border-color: #087c79;
  background: #14918c;
  color: #ffffff;
}

.result-card--blue {
  border-color: #286b79;
  background: #347c8c;
  color: #ffffff;
}

.result-card--green {
  border-color: #347263;
  background: #438373;
  color: #ffffff;
}

.result-card--violet {
  border-color: #3f626c;
  background: #52737c;
  color: #ffffff;
}

.result-card--red {
  border-color: #276f70;
  background: #378283;
  color: #ffffff;
}

.result-card--emerald {
  border-color: #14766f;
  background: #238a82;
  color: #ffffff;
}

.result-card--orange {
  border-color: #376d6b;
  background: #497e7b;
  color: #ffffff;
}

.result-card--indigo {
  border-color: #344f5d;
  background: #456472;
  color: #ffffff;
}
</style>
