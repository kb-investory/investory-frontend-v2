<script setup>
import { computed } from 'vue'
import { ArrowRight, Moon } from '@lucide/vue'

import RunningMonkey from './RunningMonkey.vue'

const props = defineProps({
  today: {
    type: Object,
    required: true,
  },
})

defineEmits(['open-transactions'])

const titleParts = computed(() => {
  const highlightedText = '기록으로 이어가요'
  const title = props.today.title ?? ''

  if (!title.includes(highlightedText)) {
    return { lead: title, highlight: '' }
  }

  return {
    lead: title.replace(highlightedText, '').trim(),
    highlight: highlightedText,
  }
})
</script>

<template>
  <section class="today-record" aria-labelledby="today-record-title">
    <div class="today-record__intro">
      <div class="today-record__heading">
        <p class="today-record__eyebrow">TODAY · {{ today.totalTrades }} TRADES</p>
        <h1 id="today-record-title" class="today-record__title">
          <span>{{ titleParts.lead }}</span>
          <em v-if="titleParts.highlight">{{ titleParts.highlight }}</em>
        </h1>
        <p class="today-record__description">
          {{ today.stockCount }}개 종목 · 아직 근거 {{ today.missingReasons }}건이 남아 있어요
        </p>
      </div>

      <svg class="today-record__graph" viewBox="0 0 210 128" aria-hidden="true">
        <g class="today-record__graph-grid">
          <path d="M18 28H202M18 59H202M18 90H202M52 10V116M94 10V116M136 10V116M178 10V116" />
        </g>
        <path
          class="today-record__graph-area"
          d="M14 108 51 91 75 96 108 66 135 75 171 42 203 17V118H14Z"
        />
        <path
          class="today-record__graph-line"
          d="M14 108 51 91 75 96 108 66 135 75 171 42 203 17"
        />
      </svg>
    </div>

    <dl class="today-record__metrics">
      <div class="today-record__metric">
        <dd>{{ today.totalTrades }}건</dd>
        <dt>전체</dt>
      </div>
      <div class="today-record__metric today-record__metric--buy">
        <dd>{{ today.buyTrades }}건</dd>
        <dt>매수</dt>
      </div>
      <div class="today-record__metric today-record__metric--sell">
        <dd>{{ today.sellTrades }}건</dd>
        <dt>매도</dt>
      </div>
      <div class="today-record__metric today-record__metric--stocks">
        <dd>{{ today.stockCount }}개</dd>
        <dt>종목</dt>
      </div>
    </dl>

    <div class="today-record__deadline-card">
      <div class="today-record__deadline">
        <div class="today-record__deadline-heading">
          <span>오늘 일지 마감까지</span>
          <strong>{{ today.remainingTime }}</strong>
        </div>

        <div class="today-record__timeline">
          <div class="today-record__track">
            <span
              class="today-record__elapsed"
              :style="{ width: `${today.dayProgressPercent}%` }"
            />
            <span class="today-record__monkey" :style="{ left: `${today.dayProgressPercent}%` }">
              <RunningMonkey :size="38" />
            </span>
            <span class="today-record__moon" aria-hidden="true">
              <Moon :size="22" :stroke-width="1.8" />
            </span>
          </div>
          <div class="today-record__timeline-labels">
            <span>현재 {{ today.currentTime }}</span>
            <span>자정 24:00 · 일지 마감</span>
          </div>
        </div>
      </div>

      <button type="button" class="today-record__button" @click="$emit('open-transactions')">
        <span>거래 내역 확인하기</span>
        <span class="today-record__button-meta">
          근거 {{ today.missingReasons }}건
          <ArrowRight :size="18" :stroke-width="2" />
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.today-record {
  position: relative;
  display: flex;
  min-height: 408px;
  flex-direction: column;
  gap: 0;
  padding-bottom: 16px;
  background: #ffffff;
}

.today-record__intro {
  position: relative;
  overflow: hidden;
  min-height: 210px;
  padding: 24px 24px 76px;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 70%, rgba(16, 198, 193, 0.2), transparent 40%),
    linear-gradient(180deg, #031f28 0%, #031f28 12%, #052f3a 100%);
}

.today-record__intro::after {
  position: absolute;
  right: -50px;
  bottom: -112px;
  width: 250px;
  height: 250px;
  border: 1px solid rgba(39, 211, 205, 0.1);
  border-radius: 50%;
  box-shadow:
    0 0 0 24px rgba(39, 211, 205, 0.035),
    0 0 0 52px rgba(39, 211, 205, 0.025);
  content: '';
}

.today-record__heading {
  position: relative;
  z-index: 2;
  max-width: 270px;
}

.today-record__eyebrow,
.today-record__title,
.today-record__description {
  margin: 0;
}

.today-record__eyebrow {
  margin-bottom: 10px;
  color: #41ded7;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  letter-spacing: 0.7px;
}

.today-record__title {
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: clamp(28px, 8vw, 34px);
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: -1.2px;
}

.today-record__title span,
.today-record__title em {
  display: block;
  font-style: normal;
}

.today-record__title em {
  color: #36ddd5;
}

.today-record__description {
  margin-top: 4px;
  color: #c0d1d5;
  font-size: 14px;
  line-height: 1.4;
}

.today-record__graph {
  position: absolute;
  right: -8px;
  bottom: 20px;
  z-index: 1;
  width: 210px;
  opacity: 0.72;
}

.today-record__graph-grid {
  fill: none;
  stroke: rgba(70, 226, 218, 0.08);
  stroke-width: 1;
}

.today-record__graph-area {
  fill: rgba(18, 189, 184, 0.08);
}

.today-record__graph-line {
  fill: none;
  filter: drop-shadow(0 0 7px rgba(57, 230, 220, 0.75));
  stroke: #3ce1d8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.today-record__metrics {
  position: relative;
  z-index: 3;
  display: grid;
  min-height: 86px;
  grid-template-columns: repeat(4, 1fr);
  margin: -52px 16px 0;
  border: 1px solid #b8e7e4;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(1, 52, 62, 0.15);
}

.today-record__metric {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1px;
}

.today-record__metric + .today-record__metric::before {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 0;
  width: 1px;
  background: #e7efef;
  content: '';
}

.today-record__metric dt,
.today-record__metric dd {
  margin: 0;
}

.today-record__metric dd {
  color: #263a43;
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 800;
}

.today-record__metric dt {
  color: #718087;
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.today-record__metric--buy dd {
  color: #f20d35;
}

.today-record__metric--sell dd {
  color: #0b63ce;
}

.today-record__metric--stocks dd {
  color: #087f7c;
}

.today-record__deadline {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.today-record__deadline-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 12px 16px 0;
  padding: 18px 16px 14px;
  border: 1px solid rgba(36, 217, 209, 0.24);
  border-radius: 22px;
  background:
    radial-gradient(circle at 72% 0%, rgba(20, 190, 184, 0.2), transparent 32%),
    linear-gradient(150deg, #082d37, #03202a);
  box-shadow: 0 12px 24px rgba(2, 34, 42, 0.2);
}

.today-record__deadline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #d0dfe2;
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.today-record__deadline-heading strong {
  color: #77f3ed;
  font-family: var(--font-mono);
  font-size: 22px;
  letter-spacing: 0.3px;
}

.today-record__timeline {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.today-record__track {
  position: relative;
  height: 30px;
}

.today-record__track::before,
.today-record__elapsed {
  position: absolute;
  top: 12px;
  left: 0;
  height: 6px;
  border-radius: 999px;
}

.today-record__track::before {
  width: 100%;
  background: rgba(204, 234, 234, 0.26);
  content: '';
}

.today-record__elapsed {
  max-width: 100%;
  background: linear-gradient(90deg, #0b8f8b, #62f0e9);
  box-shadow: 0 0 10px rgba(69, 232, 224, 0.45);
}

.today-record__track::after {
  position: absolute;
  top: 10px;
  right: 0;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #d9e7e9;
  content: '';
}

.today-record__monkey {
  position: absolute;
  top: -3px;
  z-index: 2;
  transform: translateX(-50%);
  transition: left 1s linear;
  will-change: left;
}

@media (prefers-reduced-motion: reduce) {
  .today-record__monkey {
    transition: none;
  }
}

.today-record__moon {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 1;
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  color: #dffaf8;
  background: rgba(6, 39, 49, 0.94);
  border-radius: 50%;
}

.today-record__timeline-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #aabfc4;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.today-record__button {
  display: flex;
  width: 100%;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  border: 0;
  border: 1px solid rgba(78, 224, 217, 0.24);
  border-radius: 14px;
  color: #ffffff;
  background: rgba(8, 91, 101, 0.58);
  cursor: pointer;
  font-weight: 700;
}

.today-record__button > span:first-child {
  font-size: var(--font-size-body);
  line-height: 1.35;
}

.today-record__button-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #74e7e1;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.today-record__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
