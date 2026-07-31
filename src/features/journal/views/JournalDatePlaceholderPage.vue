<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import AppIcon from '@/shared/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()

const dateLabel = computed(() => {
  const [year, month, day] = String(route.params.date).split('-')
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
})

function goBack() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}
</script>

<template>
  <section class="journal-placeholder">
    <button
      class="journal-placeholder__back"
      type="button"
      aria-label="투자 일지로 돌아가기"
      @click="goBack"
    >
      <AppIcon name="chevron-left" :size="20" />
    </button>

    <div class="journal-placeholder__content">
      <div class="journal-placeholder__date">{{ dateLabel }}</div>
      <h1>선택한 날짜의 투자 일지</h1>
      <p>상세 화면은 다음 작업에서 이어서 구현할 예정이에요.</p>
    </div>
  </section>
</template>

<style scoped>
.journal-placeholder {
  position: relative;
  display: grid;
  min-height: 680px;
  place-items: center;
}

.journal-placeholder__back {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}

.journal-placeholder__content {
  text-align: center;
}

.journal-placeholder__date {
  width: fit-content;
  margin: 0 auto 12px;
  padding: 6px 10px;
  border-radius: 9999px;
  color: var(--brand-teal-deep);
  background: var(--brand-teal-soft);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
}

.journal-placeholder h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 20px;
}

.journal-placeholder p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
