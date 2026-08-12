<script setup>
import { ChevronRight, NotebookPen, ScanSearch } from '@lucide/vue'
import { RouterLink } from 'vue-router'

defineProps({
  journalTo: {
    type: Object,
    required: true,
  },
  tendencyTo: {
    type: Object,
    required: true,
  },
  journalStatus: {
    type: String,
    required: true,
  },
  tendencyProgress: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <section class="quick-actions" aria-label="기록 바로가기">
    <RouterLink class="quick-action quick-action--journal" :to="journalTo">
      <div class="quick-action__top">
        <span class="quick-action__icon"><NotebookPen :size="18" :stroke-width="1.9" /></span>
        <span class="quick-action__status">{{ journalStatus }}</span>
      </div>
      <strong>오늘의 일지 작성</strong>
      <p>거래와 판단 근거를<br />한 편으로 정리해요</p>
      <ChevronRight class="quick-action__arrow" :size="20" :stroke-width="2" />
    </RouterLink>

    <RouterLink class="quick-action quick-action--tendency" :to="tendencyTo">
      <div class="quick-action__top">
        <span class="quick-action__icon"><ScanSearch :size="18" :stroke-width="1.9" /></span>
        <span class="quick-action__status">{{ tendencyProgress }}</span>
      </div>
      <strong>투자 패턴 점검</strong>
      <p>쌓인 기록에서 반복되는<br />습관을 확인해요</p>
      <ChevronRight class="quick-action__arrow" :size="20" :stroke-width="2" />
    </RouterLink>
  </section>
</template>

<style scoped>
.quick-actions {
  display: grid;
  min-height: 136px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quick-action {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px;
  border: 1px solid;
  border-radius: 20px;
  color: #181817;
}

.quick-action--journal {
  border-color: #bfe4e2;
  background: #f3faf9;
  box-shadow: 0 9px 20px rgba(11, 143, 139, 0.08);
}

.quick-action--tendency {
  border-color: #c7ddf8;
  background: #f3f7fd;
  box-shadow: 0 9px 20px rgba(11, 99, 206, 0.08);
}

.quick-action__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.quick-action__icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #087f7c;
  background: #e8f7f6;
}

.quick-action--tendency .quick-action__icon {
  color: #0b63ce;
  background: #edf5ff;
}

.quick-action__status {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.quick-action--tendency .quick-action__status {
  color: #0b63ce;
}

.quick-action strong {
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
}

.quick-action p {
  margin: 0;
  color: #66777d;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.quick-action__arrow {
  position: absolute;
  right: 10px;
  bottom: 12px;
  color: #6e8086;
}

.quick-action:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
