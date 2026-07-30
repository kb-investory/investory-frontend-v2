<script setup>
import { computed } from 'vue'

const brokerMarks = Object.freeze({
  KIWOOM: 'KW',
  MIRAE_ASSET: 'MA',
  KIS: 'KI',
  NH_SEC: 'NH',
  SAMSUNG_SEC: 'SS',
  KB_SEC: 'KB',
  SHINHAN_SEC: 'SH',
  HANA_SEC: 'HN',
  TOSS_SEC: 'TS',
  KAKAOPAY_SEC: 'KP',
  DAISHIN_SEC: 'DS',
  YUANTA_SEC: 'YA',
})

const props = defineProps({
  broker: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select'])

const brokerMark = computed(
  () => brokerMarks[props.broker.brokerCode] ?? props.broker.brokerCode.slice(0, 2).toUpperCase(),
)
</script>

<template>
  <button
    class="broker-card"
    :class="{ 'broker-card--selected': selected }"
    type="button"
    :disabled="!broker.active"
    :aria-pressed="selected"
    :aria-label="`${broker.brokerName} 선택`"
    @click="$emit('select', broker)"
  >
    <span class="broker-card__mark" aria-hidden="true">{{ brokerMark }}</span>
    <span class="broker-card__name">{{ broker.brokerName }}</span>
  </button>
</template>

<style scoped>
.broker-card {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 66px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 6px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
  color: var(--color-heading);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.broker-card:hover:not(:disabled) {
  border-color: var(--brand-teal);
  transform: translateY(-1px);
}

.broker-card:focus-visible {
  outline: 3px solid var(--brand-teal-soft);
  outline-offset: 1px;
}

.broker-card--selected {
  border-color: var(--slate-strong);
  background: var(--slate-strong);
  color: #ffffff;
}

.broker-card:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.broker-card__mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: var(--bg-primary);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
}

.broker-card--selected .broker-card__mark {
  background: var(--brand-teal);
  color: var(--slate-strong);
}

.broker-card__name {
  width: 100%;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  line-height: 13px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
