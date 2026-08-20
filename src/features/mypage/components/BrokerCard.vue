<script setup>
import { CircleCheck } from '@lucide/vue'

import BrokerLogo from '@/shared/components/BrokerLogo.vue'

defineProps({
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
    <BrokerLogo
      class="broker-card__logo"
      :broker-code="broker.brokerCode"
      :broker-name="broker.brokerName"
      :size="40"
    />
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

.broker-card--selected .broker-card__logo {
  box-shadow: 0 0 0 1px #9edbd8;
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
