<script setup>
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import AppIcon from '@/shared/components/AppIcon.vue'

const router = useRouter()

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
      <div class="journal-placeholder__icon">
        <AppIcon name="search" :size="24" />
      </div>
      <h1>종목별 일지 검색</h1>
      <p>검색 화면은 다음 작업에서 이어서 구현할 예정이에요.</p>
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

.journal-placeholder__icon {
  display: grid;
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  place-items: center;
  border-radius: 16px;
  color: var(--brand-teal-deep);
  background: var(--brand-teal-soft);
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
