<script setup>
import { computed, ref, watch } from 'vue'

const BRAND_LOGO_URLS = Object.freeze({
  tiger:
    'https://investments.miraeasset.com/tigeretf/common_kr/pc/images/icon/site_tiger-etf_active.svg',
})

const props = defineProps({
  stock: {
    type: Object,
    required: true,
  },
  size: {
    type: Number,
    default: 44,
  },
})

const hasImageError = ref(false)
const securityCode = computed(() => String(props.stock.securityCode ?? '').trim())
const variant = computed(() => props.stock.brandKey ?? props.stock.markVariant ?? 'default')
const logoUrl = computed(() => {
  if (props.stock.logoUrl) {
    return props.stock.logoUrl
  }

  if (BRAND_LOGO_URLS[variant.value]) {
    return BRAND_LOGO_URLS[variant.value]
  }

  if (!/^\d{6}$/.test(securityCode.value)) {
    return ''
  }

  return `https://ssl.pstatic.net/imgstock/fn/real/logo/stock/Stock${securityCode.value}.svg`
})
const fallbackText = computed(() => String(props.stock.securityName ?? '종목').slice(0, 2))

watch(
  () => [securityCode.value, props.stock.logoUrl],
  () => {
    hasImageError.value = false
  },
)
</script>

<template>
  <span
    class="stock-logo"
    :class="`stock-logo--${variant}`"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="logoUrl && !hasImageError"
      :src="logoUrl"
      :alt="`${stock.securityName} 로고`"
      @error="hasImageError = true"
    />
    <span v-else aria-hidden="true">{{ fallbackText }}</span>
  </span>
</template>

<style scoped>
.stock-logo {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e4e9ea;
  border-radius: 12px;
  color: #384f59;
  background: #f7f8fa;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.stock-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stock-logo--samsung-sdi {
  background: #eef8ff;
}

.stock-logo--sk {
  background: #fff7f2;
}

.stock-logo--naver {
  background: #eff9f1;
}

.stock-logo--kakao {
  background: #fff9cf;
}
</style>
