<script setup>
import { Clock3, History, SquarePen, X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  trade: {
    type: Object,
    default: null,
  },
  modelValue: {
    type: String,
    default: '',
  },
  history: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'update:modelValue', 'retry', 'open-stock-history'])
const textareaRef = ref(null)
let previousBodyOverflow = ''

const previousTrades = computed(() => {
  if (!props.trade) return []

  const currentTradedAt = new Date(props.trade.tradedAt).getTime()
  return props.history
    .filter(
      (historyTrade) =>
        Number(historyTrade.tradeId) !== Number(props.trade.tradeId) &&
        new Date(historyTrade.tradedAt).getTime() < currentTradedAt,
    )
    .sort((a, b) => new Date(b.tradedAt) - new Date(a.tradedAt))
    .slice(0, 3)
})

function formatPrice(value) {
  return `${Number(value).toLocaleString('ko-KR')}원`
}

function formatHistoryDate(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function handleKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

function restoreBodyScroll() {
  document.body.style.overflow = previousBodyOverflow
  window.removeEventListener('keydown', handleKeydown)
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeydown)
      await nextTick()
      textareaRef.value?.focus()
      return
    }

    restoreBodyScroll()
  },
)

onBeforeUnmount(restoreBodyScroll)
</script>

<template>
  <Teleport to="body">
    <Transition name="trade-note-sheet">
      <div v-if="isOpen && trade" class="trade-note-sheet__overlay" @click.self="emit('close')">
        <section
          class="trade-note-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-note-sheet-title"
        >
          <span class="trade-note-sheet__handle" aria-hidden="true" />

          <header class="trade-note-sheet__header">
            <div>
              <span
                class="trade-note-sheet__side"
                :class="`trade-note-sheet__side--${trade.tradeSide.toLowerCase()}`"
              >
                {{ trade.tradeSide === 'BUY' ? '매수' : '매도' }}
              </span>
              <h2 id="trade-note-sheet-title">{{ trade.securityName }} 판단 근거</h2>
              <p>{{ trade.quantity }}주 · 주당 {{ formatPrice(trade.unitPrice) }}</p>
            </div>
            <button type="button" aria-label="판단 근거 입력 닫기" @click="emit('close')">
              <X :size="20" aria-hidden="true" />
            </button>
          </header>

          <div class="trade-note-sheet__scroll">
            <section class="trade-note-sheet__history" aria-labelledby="previous-rationale-title">
              <header>
                <div>
                  <History :size="17" aria-hidden="true" />
                  <h3 id="previous-rationale-title">이 종목의 이전 판단 근거</h3>
                </div>
                <span>최근 3건</span>
              </header>

              <p class="trade-note-sheet__history-guide">
                과거 기록은 참고용이에요. 오늘 상황에 맞는 이유를 새로 확인해 주세요.
              </p>

              <p v-if="loading" class="trade-note-sheet__state">
                이전 거래 기록을 불러오고 있어요.
              </p>

              <div v-else-if="error" class="trade-note-sheet__state trade-note-sheet__state--error">
                <span>{{ error }}</span>
                <button type="button" @click="emit('retry')">다시 시도</button>
              </div>

              <div v-else-if="previousTrades.length" class="trade-note-sheet__history-list">
                <article v-for="historyTrade in previousTrades" :key="historyTrade.tradeId">
                  <header>
                    <time :datetime="historyTrade.tradedAt">
                      <Clock3 :size="13" aria-hidden="true" />
                      {{ formatHistoryDate(historyTrade.tradedAt) }}
                    </time>
                    <span
                      :class="`trade-note-sheet__history-side--${historyTrade.tradeSide.toLowerCase()}`"
                    >
                      {{ historyTrade.tradeSide === 'BUY' ? '매수' : '매도' }}
                    </span>
                    <small>
                      {{ historyTrade.quantity }}주 · {{ formatPrice(historyTrade.unitPrice) }}
                    </small>
                  </header>
                  <p v-if="historyTrade.note?.rationaleText">
                    {{ historyTrade.note.rationaleText }}
                  </p>
                  <p v-else class="trade-note-sheet__empty-note">
                    당시 판단 근거를 남기지 않았어요.
                  </p>
                </article>
              </div>

              <p v-else class="trade-note-sheet__state">이 종목은 이번이 첫 거래예요.</p>

              <button
                v-if="trade.securityCode && !loading && !error"
                type="button"
                class="trade-note-sheet__more"
                @click="emit('open-stock-history')"
              >
                {{ trade.securityName }} 전체 거래 일지 보기
              </button>
            </section>
          </div>

          <footer class="trade-note-sheet__footer">
            <section class="trade-note-sheet__editor" aria-labelledby="today-rationale-title">
              <label id="today-rationale-title" for="trade-rationale">
                <SquarePen :size="16" aria-hidden="true" />
                이번 거래의 판단 근거
              </label>
              <textarea
                id="trade-rationale"
                ref="textareaRef"
                :value="modelValue"
                rows="3"
                maxlength="120"
                placeholder="이 거래를 결정한 이유와 당시 판단 기준을 남겨보세요."
                @input="emit('update:modelValue', $event.target.value)"
              />
              <span>{{ modelValue.length }} / 120</span>
            </section>
            <button type="button" class="trade-note-sheet__complete" @click="emit('close')">
              입력 완료
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.trade-note-sheet__overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(24 39 45 / 44%);
}

.trade-note-sheet {
  display: flex;
  width: min(100%, 430px);
  max-height: min(88dvh, 720px);
  flex-direction: column;
  padding: 10px 18px max(16px, env(safe-area-inset-bottom));
  border-radius: 24px 24px 0 0;
  background: #ffffff;
  box-shadow: 0 -12px 36px rgb(24 39 45 / 18%);
}

.trade-note-sheet__handle {
  width: 38px;
  height: 4px;
  flex: 0 0 auto;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: #d5dfdf;
}

.trade-note-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid #edf1f1;
}

.trade-note-sheet__header > div {
  min-width: 0;
}

.trade-note-sheet__header h2,
.trade-note-sheet__header p {
  margin: 0;
}

.trade-note-sheet__header h2 {
  margin-top: 5px;
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: var(--font-size-title-sm);
  line-height: 1.3;
}

.trade-note-sheet__header p {
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
}

.trade-note-sheet__header > button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f3f6f6;
  color: var(--text-secondary);
  cursor: pointer;
}

.trade-note-sheet__side {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.trade-note-sheet__side--buy {
  color: #d94a4a;
  background: #fff0f0;
}

.trade-note-sheet__side--sell {
  color: #326cc4;
  background: #edf4ff;
}

.trade-note-sheet__scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 1px;
}

.trade-note-sheet__editor {
  position: relative;
}

.trade-note-sheet__editor label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--slate-strong);
  font-size: var(--font-size-body);
  font-weight: 800;
}

.trade-note-sheet__editor textarea {
  width: 100%;
  min-height: 86px;
  resize: none;
  padding: 13px 14px 30px;
  border: 1px solid #cfe1e1;
  border-radius: 13px;
  background: #f8fbfb;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-body);
  line-height: 1.55;
  outline: 0;
}

.trade-note-sheet__editor textarea:focus {
  border-color: var(--brand-teal-deep);
  box-shadow: 0 0 0 3px rgb(11 143 139 / 12%);
}

.trade-note-sheet__editor > span {
  position: absolute;
  right: 12px;
  bottom: 10px;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
}

.trade-note-sheet__history {
  margin-top: 0;
}

.trade-note-sheet__history > header,
.trade-note-sheet__history > header > div {
  display: flex;
  align-items: center;
}

.trade-note-sheet__history > header {
  justify-content: space-between;
  gap: 10px;
}

.trade-note-sheet__history > header > div {
  gap: 6px;
}

.trade-note-sheet__history h3 {
  margin: 0;
  color: var(--slate-strong);
  font-size: var(--font-size-body);
}

.trade-note-sheet__history > header > span {
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
}

.trade-note-sheet__history-guide {
  margin: 7px 0 10px;
  padding: 9px 10px;
  border-radius: 9px;
  color: var(--text-secondary);
  background: #f2f8f7;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.trade-note-sheet__history-list {
  display: grid;
  gap: 9px;
}

.trade-note-sheet__history-list article {
  padding: 11px 12px;
  border: 1px solid #e2e9e9;
  border-radius: 11px;
  background: #ffffff;
}

.trade-note-sheet__history-list article > header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-caption);
}

.trade-note-sheet__history-list time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.trade-note-sheet__history-list article > header > span {
  font-weight: 800;
}

.trade-note-sheet__history-side--buy {
  color: #d94a4a;
}

.trade-note-sheet__history-side--sell {
  color: #326cc4;
}

.trade-note-sheet__history-list small {
  overflow: hidden;
  color: var(--text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-note-sheet__history-list article > p {
  margin: 7px 0 0;
  color: var(--slate-strong);
  font-size: var(--font-size-caption);
  line-height: 1.5;
}

.trade-note-sheet__history-list article > .trade-note-sheet__empty-note {
  color: var(--text-tertiary);
}

.trade-note-sheet__state {
  margin: 0;
  padding: 20px 12px;
  border: 1px dashed #d8e3e3;
  border-radius: 11px;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  text-align: center;
}

.trade-note-sheet__state--error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #b84a4a;
  text-align: left;
}

.trade-note-sheet__state--error button,
.trade-note-sheet__more {
  border: 0;
  background: transparent;
  color: var(--brand-teal-deep);
  cursor: pointer;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.trade-note-sheet__more {
  width: 100%;
  margin-top: 10px;
  padding: 9px 4px;
}

.trade-note-sheet__footer {
  flex: 0 0 auto;
  padding-top: 12px;
  border-top: 1px solid #edf1f1;
  background: #ffffff;
}

.trade-note-sheet__complete {
  width: 100%;
  height: 48px;
  margin-top: 10px;
  border: 0;
  border-radius: 13px;
  background: var(--brand-teal-deep);
  color: #ffffff;
  cursor: pointer;
  font-size: var(--font-size-body);
  font-weight: 800;
}

.trade-note-sheet button:focus-visible {
  outline: 2px solid rgb(11 143 139 / 36%);
  outline-offset: 2px;
}

.trade-note-sheet-enter-active,
.trade-note-sheet-leave-active {
  transition: opacity 180ms ease;
}

.trade-note-sheet-enter-active .trade-note-sheet,
.trade-note-sheet-leave-active .trade-note-sheet {
  transition: transform 180ms ease;
}

.trade-note-sheet-enter-from,
.trade-note-sheet-leave-to {
  opacity: 0;
}

.trade-note-sheet-enter-from .trade-note-sheet,
.trade-note-sheet-leave-to .trade-note-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .trade-note-sheet-enter-active,
  .trade-note-sheet-leave-active,
  .trade-note-sheet-enter-active .trade-note-sheet,
  .trade-note-sheet-leave-active .trade-note-sheet {
    transition: none;
  }
}
</style>
