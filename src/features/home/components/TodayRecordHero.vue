<script setup>
import { ArrowRight, Moon, TrendingUp } from '@lucide/vue'

import RunningMonkey from './RunningMonkey.vue'

defineProps({
  today: {
    type: Object,
    required: true,
  },
})

defineEmits(['open-transactions'])
</script>

<template>
  <section class="today-record" aria-labelledby="today-record-title">
    <div class="today-record__heading">
      <div>
        <p class="today-record__eyebrow">TODAY · {{ today.totalTrades }} TRADES</p>
        <h1 id="today-record-title" class="today-record__title">{{ today.title }}</h1>
        <p class="today-record__description">
          {{ today.stockCount }}개 종목 · 아직 근거 {{ today.missingReasons }}건이 남아 있어요
        </p>
      </div>

      <span class="today-record__trend" aria-hidden="true">
        <TrendingUp :size="21" :stroke-width="2" />
      </span>
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

    <div class="today-record__deadline">
      <div class="today-record__deadline-heading">
        <span>오늘 일지 마감까지</span>
        <strong>{{ today.remainingTime }}</strong>
      </div>

      <div class="today-record__timeline">
        <div class="today-record__track">
          <span class="today-record__elapsed" :style="{ width: `${today.dayProgressPercent}%` }" />
          <span class="today-record__monkey" :style="{ left: `${today.dayProgressPercent}%` }">
            <RunningMonkey :size="36" />
          </span>
          <span class="today-record__moon" aria-hidden="true">
            <Moon :size="20" :stroke-width="1.8" />
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
        <ArrowRight :size="16" :stroke-width="2" />
      </span>
    </button>
  </section>
</template>

<style scoped>
.today-record {
  display: flex;
  min-height: 277px;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid #bfe4e2;
  border-radius: 18px;
  background: #f5fbfb;
}

.today-record__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.today-record__eyebrow,
.today-record__title,
.today-record__description {
  margin: 0;
}

.today-record__eyebrow {
  margin-bottom: 3px;
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.7px;
}

.today-record__title {
  color: #181817;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}

.today-record__description {
  margin-top: 4px;
  color: #5d6d73;
  font-size: 11px;
  line-height: 1.4;
}

.today-record__trend {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #f20d35;
  background: #fff0f2;
}

.today-record__metrics {
  display: grid;
  min-height: 46px;
  grid-template-columns: repeat(4, 1fr);
  margin: 0;
  border: 1px solid #d8e9e8;
  border-radius: 12px;
  background: #ffffff;
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
  top: 10px;
  bottom: 10px;
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
  font-size: 12px;
  font-weight: 700;
}

.today-record__metric dt {
  color: #718087;
  font-size: 10px;
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

.today-record__deadline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #5d6d73;
  font-size: 10px;
  font-weight: 600;
}

.today-record__deadline-heading strong {
  color: #263a43;
  font-family: var(--font-mono);
  font-size: 11px;
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
  background: #d8e9e8;
  content: '';
}

.today-record__elapsed {
  max-width: 100%;
  background: #0b8f8b;
}

.today-record__track::after {
  position: absolute;
  top: 10px;
  right: 0;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #263a43;
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
  color: #263a43;
  background: #ffffff;
  border-radius: 50%;
}

.today-record__timeline-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #718087;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
}

.today-record__button {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: #263a43;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.today-record__button-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #bfd0d5;
  font-family: var(--font-mono);
  font-size: 10px;
}

.today-record__button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
