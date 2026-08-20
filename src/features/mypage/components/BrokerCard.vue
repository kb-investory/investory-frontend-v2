<script setup>
import { computed, ref, watch } from 'vue'
import { CircleCheck } from '@lucide/vue'

const brokerLogos = Object.freeze({
  KB: '/assets/brokers/kb-securities.png',
  KB_SEC: '/assets/brokers/kb-securities.png',
  KIWOOM: '/assets/brokers/kiwoom.png',
  MIRAE: '/assets/brokers/mirae-asset.png',
  MIRAE_ASSET: '/assets/brokers/mirae-asset.png',
  TOSS: '/assets/brokers/toss-securities.png',
  TOSS_SEC: '/assets/brokers/toss-securities.png',
})

const brokerLogoNameRules = Object.freeze([
  { keyword: 'KB증권', src: brokerLogos.KB_SEC },
  { keyword: '미래에셋', src: brokerLogos.MIRAE_ASSET },
  { keyword: '키움', src: brokerLogos.KIWOOM },
  { keyword: '토스', src: brokerLogos.TOSS_SEC },
])

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

const logoLoadFailed = ref(false)
const normalizedBrokerCode = computed(() =>
  String(props.broker.brokerCode ?? '')
    .trim()
    .toUpperCase(),
)
const brokerLogo = computed(() => {
  const logoByCode = brokerLogos[normalizedBrokerCode.value]

  if (logoByCode) {
    return logoByCode
  }

  const brokerName = String(props.broker.brokerName ?? '')

  return brokerLogoNameRules.find(({ keyword }) => brokerName.includes(keyword))?.src ?? null
})
const brokerMark = computed(() => {
  const code = normalizedBrokerCode.value

  return (brokerMarks[code] ?? code.slice(0, 2)) || 'BR'
})

watch(brokerLogo, () => {
  logoLoadFailed.value = false
})
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
    <img
      v-if="brokerLogo && !logoLoadFailed"
      class="broker-card__logo"
      :src="brokerLogo"
      alt=""
      aria-hidden="true"
      @error="logoLoadFailed = true"
    />
    <span v-else class="broker-card__mark" aria-hidden="true">{{ brokerMark }}</span>
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

.broker-card__logo {
  width: 40px;
  height: 40px;
  padding: 4px;
  border: 1px solid #e4e9e8;
  border-radius: 10px;
  background: #ffffff;
  object-fit: contain;
}

.broker-card--selected .broker-card__logo {
  border-color: #9edbd8;
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
