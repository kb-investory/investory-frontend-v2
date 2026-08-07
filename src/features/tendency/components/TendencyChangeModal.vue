<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  historyItem: {
    type: Object,
    required: true,
  },
  analysis: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])
const closeButton = ref(null)
let previousBodyOverflow = ''

const isCurrentAnalysis = computed(
  () => String(props.historyItem.analysisRunId) === String(props.analysis.analysisRunId),
)
const modalTitle = computed(() => {
  if (!props.historyItem.changedCount) return '첫 성향 분석 상세'
  return isCurrentAnalysis.value ? '현재 성향 변화 상세' : '과거 성향 변화 상세'
})
const resultPointLabel = computed(() => (isCurrentAnalysis.value ? '현재' : '당시 결과'))
const changedDimensions = computed(
  () => new Set(props.historyItem.changes.map((change) => change.dimension)),
)
const changeMessage = computed(() =>
  props.historyItem.changedCount
    ? `${props.historyItem.changedCount}개 성향이 바뀌었어요`
    : '첫 성향 분석이 완료됐어요',
)

function formatDate(date) {
  return date?.replaceAll('-', '. ') ?? ''
}

function close() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') close()
}

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="close">
      <section
        class="change-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tendency-change-modal-title"
      >
        <div class="change-modal__handle" />

        <header class="change-modal__header">
          <div>
            <h2 id="tendency-change-modal-title">{{ modalTitle }}</h2>
            <p>{{ formatDate(historyItem.analyzedDate) }} 분석 결과 비교</p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="change-modal__close"
            aria-label="성향 변화 상세 모달 닫기"
            @click="close"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <section class="change-summary">
          <div class="change-summary__icon">
            <AppIcon name="rotate-ccw" :size="17" />
          </div>
          <div>
            <strong>{{ changeMessage }}</strong>
            <p v-if="historyItem.changedCount">
              분석 데이터가 쌓이면서 투자 기준과 행동이 달라진 부분을 찾았어요.
            </p>
            <p v-else>최근 90일 기록을 바탕으로 여섯 가지 성향을 처음 정리했어요.</p>
          </div>
        </section>

        <section v-if="historyItem.changes.length" class="change-list-section">
          <div class="section-heading">
            <h3>판단 기준</h3>
            <span>{{ historyItem.changedCount }}개 변경</span>
          </div>

          <article
            v-for="change in historyItem.changes"
            :key="`${change.dimension}-${change.currentType}`"
            class="change-item"
          >
            <strong>{{ change.dimension }}</strong>
            <div class="change-item__comparison">
              <div>
                <span>이전</span>
                <b>{{ change.previousType }}</b>
              </div>
              <AppIcon name="arrow-right" :size="15" />
              <div class="change-item__current">
                <span>{{ resultPointLabel }}</span>
                <b>{{ change.currentType }}</b>
              </div>
            </div>
            <p>{{ change.reason }}</p>
          </article>
        </section>

        <section v-if="isCurrentAnalysis && historyItem.changedCount" class="current-types">
          <div class="section-heading">
            <h3>현재 6가지 성향</h3>
            <span>변경된 항목은 색으로 표시했어요</span>
          </div>

          <div class="current-types__grid">
            <article
              v-for="result in analysis.analysisResults"
              :key="result.dimension.code"
              :class="{
                'current-type--changed': changedDimensions.has(result.dimension.name),
              }"
            >
              <div>
                <span>{{ result.dimension.name }}</span>
                <small v-if="changedDimensions.has(result.dimension.name)">변경</small>
              </div>
              <strong>{{ result.type.name }}</strong>
            </article>
          </div>
        </section>

        <footer class="change-modal__source">
          <AppIcon name="database" :size="17" />
          <span>최근 90일의 연결 계좌 거래와 투자일지를 이전 분석 결과와 비교했어요.</span>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 500;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(18, 37, 40, 0.5);
  backdrop-filter: blur(4px);
}

.change-modal {
  width: 100%;
  max-width: 390px;
  max-height: min(86dvh, 740px);
  padding: 9px 18px 24px;
  overflow-y: auto;
  border-radius: 23px 23px 0 0;
  background: #fff;
  box-shadow: 0 -12px 40px rgba(11, 24, 28, 0.16);
  animation: modal-in 0.2s ease-out;
}

.change-modal__handle {
  width: 38px;
  height: 4px;
  margin: 0 auto 17px;
  border-radius: 99px;
  background: #d9e1e1;
}

.change-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.change-modal__header h2,
.change-modal__header p,
.change-summary p,
.section-heading h3,
.change-item p {
  margin: 0;
}

.change-modal__header h2 {
  color: #1d2729;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.change-modal__header p {
  margin-top: 5px;
  color: #8a9294;
  font-size: var(--font-size-caption);
}

.change-modal__close {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: #f5f7f7;
  color: #8b9597;
  cursor: pointer;
}

.change-modal__close:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.change-summary {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #bfe4e2;
  border-radius: 11px;
  background: #effafa;
}

.change-summary__icon {
  display: inline-flex;
  width: 29px;
  height: 29px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #d9f3f1;
  color: #0a918c;
}

.change-summary strong {
  color: #244044;
  font-size: var(--font-size-caption);
}

.change-summary p {
  margin-top: 4px;
  color: #758386;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.change-list-section,
.current-types {
  margin-top: 14px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.section-heading h3 {
  color: #314245;
  font-size: var(--font-size-body);
}

.section-heading span {
  color: #0a8c88;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.change-list-section {
  display: grid;
  gap: 9px;
}

.change-item {
  padding: 11px;
  border: 1px solid #e0e6e6;
  border-radius: 11px;
}

.change-item > strong {
  display: block;
  margin-bottom: 7px;
  color: #526164;
  font-size: var(--font-size-caption);
}

.change-item__comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  color: #0a918c;
}

.change-item__comparison > div {
  display: grid;
  gap: 3px;
  padding: 8px;
  border-radius: 8px;
  background: #f6f7f7;
  text-align: center;
}

.change-item__comparison span {
  color: #8a9496;
  font-size: var(--font-size-caption);
}

.change-item__comparison b {
  color: #536165;
  font-size: var(--font-size-caption);
}

.change-item__comparison .change-item__current {
  background: #e8f7f6;
}

.change-item__comparison .change-item__current b {
  color: #087f7c;
}

.change-item p {
  margin-top: 7px;
  color: #8a9395;
  font-size: var(--font-size-caption);
  line-height: 1.45;
  text-align: center;
}

.current-types__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.current-types__grid article {
  display: grid;
  gap: 4px;
  padding: 9px 10px;
  border: 1px solid #e2e8e8;
  border-radius: 9px;
  background: #f8f9f9;
}

.current-types__grid article > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.current-types__grid span {
  overflow: hidden;
  color: #8b9597;
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-types__grid small {
  padding: 2px 4px;
  border-radius: 4px;
  background: #fff;
  color: #0a8c88;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.current-types__grid strong {
  color: #536165;
  font-size: var(--font-size-caption);
}

.current-types__grid .current-type--changed {
  border-color: #bfe3e1;
  background: #eaf8f7;
}

.current-types__grid .current-type--changed strong {
  color: #087f7c;
}

.change-modal__source {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 13px;
  padding: 12px;
  border-radius: 10px;
  background: #f6f7f7;
  color: #879092;
}

.change-modal__source span {
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

@keyframes modal-in {
  from {
    transform: translateY(24px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (min-width: 441px) {
  .modal-backdrop {
    align-items: center;
    padding: 20px;
  }

  .change-modal {
    border-radius: 23px;
  }
}
</style>
