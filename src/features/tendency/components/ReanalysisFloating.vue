<script setup>
import RecommendationFloating from '@/features/tendency/components/RecommendationFloating.vue'

defineProps({
  collapsed: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['analyze', 'toggle'])
</script>

<template>
  <RecommendationFloating
    :collapsed="collapsed"
    eyebrow="새 분석 필요"
    message="최근 분석 후 90일이 지났어요"
    cta-label="투자성향 다시 분석하기"
    aria-label="투자성향 재분석 안내"
    tone="reanalysis"
    @navigate="$emit('analyze')"
    @toggle="$emit('toggle')"
  />
</template>
