<script setup>
import StockLogo from '@/shared/components/StockLogo.vue'

defineProps({
  stock: {
    type: Object,
    required: true,
  },
  size: {
    type: Number,
    default: 44,
  },
})
</script>

<template>
  <StockLogo :stock="stock" :size="size" />
</template>
