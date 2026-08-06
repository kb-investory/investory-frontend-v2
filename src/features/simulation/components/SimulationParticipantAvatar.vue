<script setup>
import { computed } from 'vue'

const props = defineProps({
  variantType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 24,
  },
})

const avatarByVariantType = {
  ACTUAL_USER: '/assets/icons/ME.png',
  PERSONAL_BOT: '/assets/icons/BOT.png',
  FAMOUS_STRATEGY: '/assets/icons/FinanceGuru.png',
  RANDOM_BOT: '/assets/icons/Monkey-icon.png',
}

const altByVariantType = {
  ACTUAL_USER: '나',
  PERSONAL_BOT: '나의 투자봇',
  FAMOUS_STRATEGY: '유명 투자자',
  RANDOM_BOT: '원숭이',
}

const src = computed(
  () => avatarByVariantType[props.variantType] ?? avatarByVariantType.ACTUAL_USER,
)
const alt = computed(() => altByVariantType[props.variantType] ?? '참가자')
</script>

<template>
  <img
    class="simulation-participant-avatar"
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<style scoped>
.simulation-participant-avatar {
  display: block;
  flex: 0 0 auto;
  object-fit: cover;
  border-radius: 50%;
}
</style>
