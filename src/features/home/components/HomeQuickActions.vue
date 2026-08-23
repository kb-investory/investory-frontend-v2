<script setup>
import { ChevronRight, NotebookPen, ShieldCheck } from '@lucide/vue'
import { RouterLink } from 'vue-router'

defineProps({
  journalTo: {
    type: Object,
    required: true,
  },
  principleTo: {
    type: Object,
    required: true,
  },
  journalStatus: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <section class="quick-actions" aria-label="기록 바로가기">
    <RouterLink class="quick-action quick-action--journal" :to="journalTo">
      <div class="quick-action__top">
        <span class="quick-action__icon"><NotebookPen :size="20" :stroke-width="2.2" /></span>
        <span class="quick-action__status">{{ journalStatus }}</span>
      </div>
      <strong>오늘의 일지 작성</strong>
      <p>거래와 판단 근거를<br />한 편으로 정리해요</p>
      <ChevronRight class="quick-action__arrow" :size="20" :stroke-width="2" />
    </RouterLink>

    <RouterLink class="quick-action quick-action--principle" :to="principleTo">
      <div class="quick-action__top">
        <span class="quick-action__icon"><ShieldCheck :size="20" :stroke-width="2.2" /></span>
        <span class="quick-action__status">원칙 보기</span>
      </div>
      <strong>투자원칙 확인</strong>
      <p>세운 원칙을 확인하고<br />매매 전에 점검해요</p>
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

.quick-action--principle {
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
  color: #ffffff;
  background: linear-gradient(145deg, #12a9a4, #087f7c);
  box-shadow:
    0 6px 12px rgba(8, 127, 124, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.quick-action--principle .quick-action__icon {
  color: #ffffff;
  background: linear-gradient(145deg, #4386e6, #0b63ce);
  box-shadow:
    0 6px 12px rgba(11, 99, 206, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.quick-action__status {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.quick-action--principle .quick-action__status {
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

@media (max-width: 359px) {
  .quick-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
