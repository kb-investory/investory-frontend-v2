<script setup>
import { computed, ref, watch } from 'vue'

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
const logoUrl = computed(
  () => `https://ssl.pstatic.net/imgstock/fn/real/logo/stock/Stock${props.stock.securityCode}.svg`,
)

watch(
  () => props.stock.securityCode,
  () => {
    hasImageError.value = false
  },
)
</script>

<template>
  <span
    class="journal-stock-logo"
    :class="`journal-stock-logo--${stock.brandKey}`"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="!hasImageError"
      :src="logoUrl"
      :alt="`${stock.securityName} 로고`"
      @error="hasImageError = true"
    />
    <span v-else aria-hidden="true">{{ stock.securityName.slice(0, 2) }}</span>
  </span>
</template>

<style scoped>
.journal-stock-logo {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e4e9ea;
  border-radius: 12px;
  color: #384f59;
  background: #f7f8fa;
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 800;
}

.journal-stock-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.journal-stock-logo--samsung-sdi {
  background: #eef8ff;
}

.journal-stock-logo--sk {
  background: #fff7f2;
}

.journal-stock-logo--naver {
  background: #eff9f1;
}

.journal-stock-logo--kakao {
  background: #fff9cf;
}
</style>
