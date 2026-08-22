<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  getTendencyOptionPoints,
  getTendencyTypeConfig,
  TENDENCY_CONFIDENCE,
} from '@/features/tendency/config/tendencyTypeOptions'
import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  result: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])
const modalRoot = ref(null)
const selectedTypeCode = ref(props.result.type.code)
let previousBodyOverflow = ''

const typeConfig = computed(() => getTendencyTypeConfig(props.result.dimension.code))
const typeOptions = computed(() => {
  if (typeConfig.value.options.length) {
    const options = typeConfig.value.options
    const current = options.find((option) => option.code === props.result.type.code)

    if (!current) return options

    return [current, ...options.filter((option) => option.code !== current.code)]
  }

  return [
    {
      code: props.result.type.code,
      name: props.result.type.name,
      description: props.result.type.description,
      icon: 'chart-pie',
    },
  ]
})
const selectedOption = computed(
  () =>
    typeOptions.value.find((option) => option.code === selectedTypeCode.value) ??
    typeOptions.value[0],
)
const selectedPoints = computed(() => getTendencyOptionPoints(selectedOption.value, props.result))
const confidence = computed(() => TENDENCY_CONFIDENCE[props.result.dimension.code] ?? 80)
const isCurrentOptionSelected = computed(
  () => selectedOption.value?.code === props.result.type.code,
)

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
  modalRoot.value?.focus({ preventScroll: true })
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
        ref="modalRoot"
        class="detail-modal"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="`tendency-modal-${result.dimension.code}`"
      >
        <header class="detail-modal__header">
          <div>
            <h2 :id="`tendency-modal-${result.dimension.code}`">
              {{ typeConfig.title ?? `${result.dimension.name} 성향` }}
            </h2>
            <p>{{ typeConfig.subtitle }}</p>
          </div>
          <button
            type="button"
            class="detail-modal__close"
            aria-label="성향 상세 모달 닫기"
            @click="close"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <p class="detail-modal__guide">유형을 눌러 특징과 판단 근거를 확인하세요</p>

        <div
          class="type-options"
          :class="`type-options--${typeOptions.length}`"
          role="tablist"
          :aria-label="`${result.dimension.name} 유형`"
        >
          <button
            v-for="option in typeOptions"
            :key="option.code"
            type="button"
            class="type-option"
            :class="{
              'type-option--mine': option.code === result.type.code,
              'type-option--selected': option.code === selectedTypeCode,
            }"
            :aria-selected="option.code === selectedTypeCode"
            role="tab"
            @click="selectedTypeCode = option.code"
          >
            <small v-if="option.code === result.type.code" class="type-option__mine">
              내 성향
            </small>
            <AppIcon :name="option.icon" :size="16" />
            <span class="type-option__name">{{ option.name }}</span>
          </button>
        </div>

        <section class="type-description">
          <div class="type-description__header">
            <strong>{{ selectedOption.name }}의 특징을 확인해요</strong>
            <span v-if="isCurrentOptionSelected">내 성향</span>
          </div>
          <ul>
            <li v-for="point in selectedPoints" :key="point">{{ point }}</li>
          </ul>
        </section>

        <section v-if="isCurrentOptionSelected" class="current-result">
          <header class="current-result__header">
            <div>
              <span>내 성향</span>
              <h3>{{ result.type.name }}</h3>
            </div>
            <div class="confidence">
              <strong>{{ confidence }}%</strong>
              <span>일치도</span>
            </div>
          </header>

          <div class="current-result__divider" />

          <h4>판단 근거 데이터</h4>
          <dl v-if="result.type.rationale.items.length" class="evidence-list">
            <div
              v-for="item in result.type.rationale.items"
              :key="item.label"
              class="evidence-list__item"
            >
              <dt>
                <span>{{ item.label }}</span>
                <small>{{ item.description }}</small>
              </dt>
              <dd>{{ item.value }}{{ item.unit }}</dd>
            </div>
          </dl>
          <p v-else class="evidence-list__empty">
            이 결과는 예전 방식으로 계산됐어요. 다시 분석하면 최신 근거를 볼 수 있어요.
          </p>
        </section>

        <footer v-if="isCurrentOptionSelected" class="detail-modal__source">
          <AppIcon name="database" :size="17" />
          <span>연결 계좌의 최근 90일 거래와 투자일지 기록을 함께 분석했어요.</span>
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

.detail-modal {
  width: 100%;
  max-width: 390px;
  max-height: min(80dvh, 680px);
  padding: 23px 22px 26px;
  overflow-y: auto;
  border-radius: 23px 23px 0 0;
  background: #fff;
  box-shadow: 0 -12px 40px rgba(11, 24, 28, 0.16);
  animation: modal-in 0.2s ease-out;
}

.detail-modal:focus {
  outline: none;
}

.detail-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detail-modal__header h2,
.detail-modal__header p,
.detail-modal__guide,
.type-description ul,
.current-result h3,
.current-result h4,
.evidence-list {
  margin: 0;
}

.detail-modal__header h2 {
  color: #1d2729;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 800;
  letter-spacing: -0.045em;
}

.detail-modal__header p {
  margin-top: 6px;
  color: #8a9294;
  font-size: var(--font-size-caption);
}

.detail-modal__close {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: #f7f8f8;
  color: #8b9597;
  cursor: pointer;
}

.detail-modal__close:focus-visible,
.type-option:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.detail-modal__guide {
  margin-top: 20px;
  color: #667477;
  font-size: var(--font-size-caption);
}

.type-options {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 7px;
  margin-top: 11px;
  padding: 1px 1px 6px;
}

.type-options--4 .type-option {
  grid-column: span 3;
}

.type-options--5 .type-option {
  grid-column: span 2;
}

.type-options--5 .type-option:nth-child(n + 4) {
  grid-column: span 3;
}

.type-option {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 62px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 6px;
  border: 1px solid #dce4e5;
  border-radius: 10px;
  background: #f9fafa;
  color: #6e7b7e;
  cursor: pointer;
}

.type-option__name {
  display: block;
  max-width: 100%;
  overflow: hidden;
  font-size: var(--font-size-caption);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-option--mine {
  border-color: #9dd5d2;
  background: #eef9f8;
  color: #087f7c;
}

.type-option--selected {
  border-color: #0b8f8b;
  background: #0b8f8b;
  color: #fff;
}

.type-option__mine {
  position: absolute;
  top: 4px;
  right: 5px;
  color: #0a8c88;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.type-option--selected .type-option__mine {
  color: rgba(255, 255, 255, 0.82);
}

.type-description {
  min-height: 128px;
  margin-top: 6px;
  padding: 15px 13px;
  border: 1px solid #dce5e5;
  border-radius: 14px;
  background: #fff;
}

.type-description__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.type-description__header strong {
  color: #263638;
  font-size: var(--font-size-caption);
}

.type-description__header span {
  padding: 4px 7px;
  border-radius: 6px;
  background: #e7f7f6;
  color: #0a8985;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.type-description ul {
  display: grid;
  gap: 8px;
  margin-top: 11px;
  padding: 0;
  list-style: none;
}

.type-description li {
  position: relative;
  padding-left: 12px;
  color: #68777a;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.type-description li::before {
  position: absolute;
  top: 5px;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10aaa4;
  content: '';
}

.current-result {
  min-height: 235px;
  margin-top: 12px;
  padding: 16px 14px 18px;
  border: 1px solid #bfe2e0;
  border-radius: 14px;
  background: #f4fbfb;
}

.current-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-result__header > div:first-child {
  display: grid;
  gap: 6px;
}

.current-result__header span {
  color: #0b8f8b;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.current-result h3 {
  color: #1f2b2d;
  font-size: var(--font-size-title-md);
  letter-spacing: -0.035em;
}

.confidence {
  display: grid;
  min-width: 57px;
  gap: 1px;
  padding: 8px;
  border-radius: 8px;
  background: #fff;
  text-align: center;
}

.confidence strong {
  color: #0a8d89;
  font-size: var(--font-size-body);
}

.confidence span {
  color: #929b9d;
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.current-result__divider {
  height: 1px;
  margin: 12px 0 13px;
  background: #cfe5e4;
}

.current-result h4 {
  color: #344548;
  font-size: var(--font-size-body);
}

.evidence-list {
  display: grid;
  gap: 18px;
  margin-top: 15px;
}

.evidence-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.evidence-list__item dt {
  display: grid;
  min-width: 0;
  gap: 4px;
  margin: 0;
  color: #59676a;
  font-size: var(--font-size-caption);
}

.evidence-list__item small {
  overflow: hidden;
  color: #9aa2a4;
  font-size: var(--font-size-caption);
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evidence-list__item dd {
  flex: 0 0 auto;
  margin: 0;
  color: #263537;
  font-size: var(--font-size-body);
  font-weight: 800;
}

.evidence-list__empty {
  margin: 15px 0 0;
  color: #9aa2a4;
  font-size: var(--font-size-caption);
}

.detail-modal__source {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 13px;
  border-radius: 10px;
  background: #f6f7f7;
  color: #879092;
}

.detail-modal__source span {
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

  .detail-modal {
    border-radius: 23px;
  }
}
</style>
