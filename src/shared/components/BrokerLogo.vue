<script setup>
import { computed, ref, watch } from 'vue'

const BROKER_LOGOS = Object.freeze({
  KB: '/assets/brokers/kb-securities.png',
  KB_SEC: '/assets/brokers/kb-securities.png',
  KIWOOM: '/assets/brokers/kiwoom.png',
  MIRAE: '/assets/brokers/mirae-asset.png',
  MIRAE_ASSET: '/assets/brokers/mirae-asset.png',
  TOSS: '/assets/brokers/toss-securities.png',
  TOSS_SEC: '/assets/brokers/toss-securities.png',
})

const BROKER_LOGO_NAME_RULES = Object.freeze([
  { keyword: 'KB증권', src: BROKER_LOGOS.KB_SEC },
  { keyword: '미래에셋', src: BROKER_LOGOS.MIRAE_ASSET },
  { keyword: '키움', src: BROKER_LOGOS.KIWOOM },
  { keyword: '토스', src: BROKER_LOGOS.TOSS_SEC },
])

const BROKER_MARKS = Object.freeze({
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
  brokerCode: {
    type: String,
    default: '',
  },
  brokerName: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 40,
  },
})

const logoLoadFailed = ref(false)
const normalizedBrokerCode = computed(() => props.brokerCode.trim().toUpperCase())
const brokerLogo = computed(() => {
  const logoByCode = BROKER_LOGOS[normalizedBrokerCode.value]
  if (logoByCode) return logoByCode

  return (
    BROKER_LOGO_NAME_RULES.find(({ keyword }) => props.brokerName.includes(keyword))?.src ?? null
  )
})
const brokerMark = computed(() => {
  const code = normalizedBrokerCode.value
  return BROKER_MARKS[code] || code.slice(0, 2) || props.brokerName.slice(0, 2) || 'BR'
})

watch([brokerLogo, () => props.brokerName], () => {
  logoLoadFailed.value = false
})
</script>

<template>
  <span class="broker-logo" :style="{ '--broker-logo-size': `${size}px` }" aria-hidden="true">
    <img
      v-if="brokerLogo && !logoLoadFailed"
      :src="brokerLogo"
      alt=""
      @error="logoLoadFailed = true"
    />
    <span v-else>{{ brokerMark }}</span>
  </span>
</template>

<style scoped>
.broker-logo {
  display: grid;
  width: var(--broker-logo-size);
  height: var(--broker-logo-size);
  flex: 0 0 var(--broker-logo-size);
  overflow: hidden;
  place-items: center;
  border: 1px solid #e4e9e8;
  border-radius: 24%;
  background: #ffffff;
  color: #ffffff;
}

.broker-logo img {
  width: 100%;
  height: 100%;
  padding: 10%;
  object-fit: contain;
}

.broker-logo > span {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background: #263a43;
  font-family: var(--font-mono);
  font-size: max(10px, calc(var(--broker-logo-size) * 0.3));
  font-weight: 800;
}
</style>
