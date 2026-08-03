<script setup>
import { computed, ref } from 'vue'
import { usePortfolioStore } from '@/modules/portfolio/stores/portfolioStore'

const portfolioStore = usePortfolioStore()

// 탭 상태: 'stock' = 종목별, 'group' = 그룹별
const viewMode = ref('stock')

const holdings = computed(() => portfolioStore.portfolios || [])
const analysis = computed(() => portfolioStore.analysis?.analysis || null)

// 차트 색상 팔레트
const CHART_COLORS = ['#2B6878', '#5BAFC8', '#9FD4E2', '#D0EDF5']

// 섹터별 그룹화 (종목별 도넛 차트 및 그룹별 막대 차트 공용)
const sectorGroups = computed(() => {
  const map = {}
  holdings.value.forEach((h) => {
    if (!map[h.sector]) {
      map[h.sector] = { name: h.sector, weight: 0, amount: 0, stocks: [] }
    }
    map[h.sector].weight += h.weight
    map[h.sector].amount += h.amount
    map[h.sector].stocks.push(h.name)
  })
  return Object.values(map).sort((a, b) => b.weight - a.weight)
})

// SVG 도넛 차트 계산
const R = 32
const CX = 50
const CY = 50
const CIRC = 2 * Math.PI * R // ≈ 201.06
const GAP_LEN = (2 / 360) * CIRC // 2도 간격

const donutSegments = computed(() => {
  let cumulative = 0
  return sectorGroups.value.map((group, i) => {
    const segLen = (group.weight / 100) * CIRC
    const dashLen = Math.max(0, segLen - GAP_LEN)
    const dashOffset = CIRC * 0.25 - (cumulative / 100) * CIRC
    cumulative += group.weight
    return {
      ...group,
      color: CHART_COLORS[i % CHART_COLORS.length],
      dasharray: `${dashLen} ${CIRC - dashLen}`,
      dashoffset: dashOffset,
    }
  })
})

// 포맷 함수들
function formatReturn(value) {
  if (value == null) return '-'
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

function riskLevel(value) {
  if (value == null) return '-'
  if (value < 5) return '낮음'
  if (value < 15) return '중간'
  return '높음'
}

function riskClass(value) {
  if (value == null) return ''
  if (value < 5) return 'risk-low' // 낮음: 초록
  if (value < 15) return 'risk-mid' // 중간: 노랑
  return 'risk-high' // 높음: 빨강
}
</script>

<template>
  <section class="asset-composition">
    <!-- 섹션 헤더: 제목 + 탭 버튼 -->
    <div class="section-header">
      <h3 class="section-title">자산 구성</h3>
      <div class="tab-group" role="tablist">
        <button
          id="tab-btn-stock"
          role="tab"
          class="tab-btn"
          :class="{ active: viewMode === 'stock' }"
          :aria-selected="viewMode === 'stock'"
          @click="viewMode = 'stock'"
        >
          종목별
        </button>
        <button
          id="tab-btn-group"
          role="tab"
          class="tab-btn"
          :class="{ active: viewMode === 'group' }"
          :aria-selected="viewMode === 'group'"
          @click="viewMode = 'group'"
        >
          그룹별
        </button>
      </div>
    </div>

    <!-- 차트 영역 -->
    <Transition name="chart-fade" mode="out-in">
      <!-- 종목별: 도넛 차트 + 섹터 범례 -->
      <div v-if="viewMode === 'stock'" key="stock" class="chart-view">
        <div class="donut-wrapper">
          <svg viewBox="0 0 100 100" class="donut-svg" aria-hidden="true">
            <circle
              v-for="(seg, i) in donutSegments"
              :key="i"
              :r="R"
              :cx="CX"
              :cy="CY"
              fill="none"
              :stroke="seg.color"
              stroke-width="18"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              stroke-linecap="butt"
            />
          </svg>
          <div class="donut-center">
            <span class="donut-count">{{ holdings.length }}</span>
          </div>
        </div>

        <ul class="legend-list">
          <li v-for="(seg, i) in donutSegments" :key="i" class="legend-item">
            <span class="legend-dot" :style="{ backgroundColor: seg.color }"></span>
            <div class="legend-text">
              <span class="legend-name">{{ seg.name }}</span>
              <span class="legend-stocks">{{ seg.stocks.join(', ') }}</span>
            </div>
            <span class="legend-weight">{{ Math.round(seg.weight) }}%</span>
          </li>
        </ul>
      </div>

      <!-- 그룹별: 단일 통합 가로 막대 차트 + 하단 상세 리스트 -->
      <div v-else key="group" class="chart-view chart-single-bar-view">
        <!-- 하나의 통합된 가로 막대 트랙 -->
        <div class="single-bar-track">
          <div
            v-for="(group, i) in sectorGroups"
            :key="group.name"
            class="single-bar-segment"
            :style="{
              width: `${group.weight}%`,
              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
            }"
            :title="`${group.name}: ${Math.round(group.weight)}%`"
          ></div>
        </div>

        <!-- 그룹별 상세 범례 및 정보 리스트 -->
        <ul class="single-bar-legend">
          <li v-for="(group, i) in sectorGroups" :key="group.name" class="legend-item">
            <span
              class="legend-dot"
              :style="{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }"
            ></span>
            <div class="legend-text">
              <span class="legend-name">{{ group.name }}</span>
              <span class="legend-stocks">{{ group.stocks.join(', ') }}</span>
            </div>
            <div class="legend-right-group">
              <span class="bar-amount">{{ group.amount.toLocaleString('ko-KR') }}원</span>
              <span class="legend-weight">{{ Math.round(group.weight) }}%</span>
            </div>
          </li>
        </ul>
      </div>
    </Transition>

    <!-- 자산 통계 카드 -->
    <div class="stats-card">
      <div class="stats-header-row">
        <div class="stats-left">
          <span class="title-bar"></span>
          <span class="stats-main-label">전체 자산</span>
          <span class="stats-badge">계 {{ holdings.length }}</span>
        </div>
        <div class="stats-right">
          <span class="stats-rate negative">현재 -8.35%</span>
          <span class="stats-plan">· 연 계획 통합</span>
        </div>
      </div>

      <div v-if="analysis" class="stats-grid">
        <div class="stats-col-header">
          <span class="stats-col-label">포트폴리오</span>
          <span class="stats-period">일별</span>
          <span class="stats-period">6개월</span>
          <span class="stats-period">12개월</span>
        </div>
        <div class="stats-data-row">
          <span class="stats-row-label">예상 수익률</span>
          <span class="stats-val" :class="analysis.dailyReturn >= 0 ? 'positive' : 'negative'">
            {{ formatReturn(analysis.dailyReturn) }}
          </span>
          <span class="stats-val" :class="analysis.halfYearReturn >= 0 ? 'positive' : 'negative'">
            {{ formatReturn(analysis.halfYearReturn) }}
          </span>
          <span class="stats-val" :class="analysis.yearReturn >= 0 ? 'positive' : 'negative'">
            {{ formatReturn(analysis.yearReturn) }}
          </span>
        </div>
        <div class="stats-data-row">
          <span class="stats-row-label">위험도</span>
          <span class="stats-val risk-val">
            <span class="risk-tag" :class="riskClass(analysis.dailyRisk)">{{
              riskLevel(analysis.dailyRisk)
            }}</span>
            <span class="risk-num">{{ analysis.dailyRisk }}%</span>
          </span>
          <span class="stats-val risk-val">
            <span class="risk-tag" :class="riskClass(analysis.halfYearRisk)">{{
              riskLevel(analysis.halfYearRisk)
            }}</span>
            <span class="risk-num">{{ analysis.halfYearRisk }}%</span>
          </span>
          <span class="stats-val risk-val">
            <span class="risk-tag" :class="riskClass(analysis.yearRisk)">{{
              riskLevel(analysis.yearRisk)
            }}</span>
            <span class="risk-num">{{ analysis.yearRisk }}%</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Section Layout ─────────────────────────────────────── */
.asset-composition {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  color: #111111;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

/* ── Tab Buttons ────────────────────────────────────────── */
.tab-group {
  display: flex;
  background: #f0f0ee;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.tab-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #71716a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #fef08a; /* 연한 노란색으로 변경 */
  color: #111111;
  font-weight: 700;
}

/* ── Transition ─────────────────────────────────────────── */
.chart-fade-enter-active,
.chart-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.chart-fade-enter-from,
.chart-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* ── Chart View Container (높이 고정으로 통계 표 밀림 방지) ── */
.chart-view {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8f8f8;
  border-radius: 14px;
  padding: 20px 16px;
  margin-bottom: 12px;
  height: 200px;
  box-sizing: border-box;
}

/* ── Donut Chart ────────────────────────────────────────── */
.donut-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-count {
  color: #111111;
  font-size: 22px;
  font-weight: 800;
}

/* ── Donut & Single Bar Legend (내용이 길어지면 내부 스크롤 처리) ── */
.legend-list,
.single-bar-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  max-height: 140px;
  overflow-y: auto;
  padding-right: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.legend-name {
  color: #111111;
  font-size: 13px;
  font-weight: 700;
}

.legend-stocks {
  color: #999998;
  font-size: 11px;
  font-weight: 400;
}

.legend-weight {
  color: #111111;
  font-size: 14px;
  font-weight: 800;
  min-width: 36px;
  text-align: right;
}

.legend-right-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-amount {
  color: #555554;
  font-size: 12px;
  font-weight: 500;
}

/* ── Single Stacked Bar Chart View ──────────────────────── */
.chart-single-bar-view {
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 16px;
}

.single-bar-track {
  display: flex;
  width: 100%;
  height: 10px;
  background: #e5e5e2;
  border-radius: 5px;
  overflow: hidden;
  flex-shrink: 0;
}

.single-bar-segment {
  height: 100%;
  transition: width 0.5s ease;
}

/* ── Stats Card ─────────────────────────────────────────── */
.stats-card {
  background: #f8f8f8;
  border-radius: 14px;
  padding: 16px;
}

.stats-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e5;
  margin-bottom: 12px;
}

.stats-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-bar {
  width: 4px;
  height: 16px;
  background-color: #facc15;
  border-radius: 2px;
  flex-shrink: 0;
}

.stats-main-label {
  color: #111111;
  font-size: 14px;
  font-weight: 700;
}

.stats-badge {
  background: #e5e5e2;
  color: #555554;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}

.stats-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-rate {
  font-size: 12px;
  font-weight: 700;
}

.stats-plan {
  color: #999998;
  font-size: 11px;
}

/* ── Stats Grid ─────────────────────────────────────────── */
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-col-header {
  display: grid;
  grid-template-columns: 1fr 56px 56px 56px;
  gap: 4px;
  align-items: center;
  padding: 6px 8px;
  background-color: #efefec;
  border-radius: 8px;
  margin-bottom: 4px;
}

.stats-col-label {
  color: #333330;
  font-size: 12px;
  font-weight: 700;
}

.stats-period {
  color: #666660;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.stats-data-row {
  display: grid;
  grid-template-columns: 1fr 56px 56px 56px;
  gap: 4px;
  align-items: center;
  padding: 2px 8px;
}

.stats-row-label {
  color: #333330;
  font-size: 13px;
  font-weight: 600;
}

.stats-val {
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

/* ── Return / Risk Colors ───────────────────────────────── */
.positive {
  color: #dc2626;
}

.negative {
  color: #2563eb;
}

.risk-val {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.risk-tag {
  font-size: 11px;
  font-weight: 700;
}

.risk-low {
  color: #16a34a;
}

.risk-mid {
  color: #ca8a04;
}

.risk-high {
  color: #dc2626;
}

.risk-num {
  color: #888880;
  font-size: 11px;
  font-weight: 500;
}
</style>
