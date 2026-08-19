<script setup>
import { computed } from 'vue'
import { CircleCheck } from '@lucide/vue'

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
    :disabled="broker.active === false"
    :aria-pressed="selected"
    :aria-label="`${broker.brokerName} 선택`"
    @click="$emit('select', broker)"
  >
    <span class="broker-card__mark" aria-hidden="true">{{ brokerMark }}</span>
    <span class="broker-card__name">{{ broker.brokerName }}</span>
    <CircleCheck v-if="selected" class="broker-card__check" :size="20" aria-hidden="true" />
  </button>
</template>

<style scoped>
.broker-card {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 58px;
  grid-template-columns: 40px 1fr 24px;
  align-items: center;
  gap: 11px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 11px;
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
  border-color: #159b97;
  background: #f1fbfa;
  color: var(--color-heading);
}

.broker-card:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.broker-card__mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: var(--slate-strong);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.broker-card--selected .broker-card__mark {
  background: #159b97;
  color: #ffffff;
}

.broker-card__name {
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-body);
  font-weight: 700;
  line-height: 1.4;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broker-card__check {
  color: #168c89;
}
</style>
