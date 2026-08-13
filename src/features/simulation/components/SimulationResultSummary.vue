<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import { getSecurityDisplayName } from '@/features/simulation/utils/securityDisplayName'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import StockLogo from '@/shared/components/StockLogo.vue'

const props = defineProps({
  latestResult: {
    type: Object,
    default: null,
  },
  report: {
    type: Object,
    default: null,
  },
  reportLoading: {
    type: Boolean,
    default: false,
  },
  reportError: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['restart'])
const router = useRouter()
const selectedMetric = ref('return')
const selectedPrinciples = ref(['long', 'diversify', 'stopLoss'])

const simulatedTradeById = computed(
  () =>
    new Map(
      (props.latestResult?.simulatedTrades ?? []).map((trade) => [
        String(trade.simulatedTradeId),
        trade,
      ]),
    ),
)

function getReportTrade(reportItem) {
  return simulatedTradeById.value.get(String(reportItem.tradeId)) ?? reportItem
}

function getTradeSideLabel(tradeSide) {
  return (
    {
      BUY: '매수',
      SELL: '매도',
      ADD: '추가 매수',
      REDUCE: '비중 축소',
    }[tradeSide] ?? tradeSide
  )
}

const participantMeta = {
  ACTUAL_USER: { shortName: '내 투자', color: '#f07a62', volatility: 12.8 },
  PERSONAL_BOT: { shortName: '원칙 봇', color: '#0b8f8b', volatility: 7.4 },
  FAMOUS_STRATEGY: { shortName: '유명 투자자', color: '#7b83d5', volatility: 9.6 },
  RANDOM_BOT: { shortName: '원숭이', color: '#d5a43d', volatility: 18.2 },
}

const metrics = [
  { key: 'return', label: '누적 수익률' },
  { key: 'volatility', label: '변동성' },
  { key: 'mdd', label: '최대 손실' },
]

const emotionalDecisions = computed(() =>
  (props.report?.decisionReviews ?? []).map((decision) => {
    const security = getReportTrade(decision)

    return {
      ...decision,
      security,
      date: decision.tradedAt?.slice(5, 10).replace('-', '.') ?? '',
      stock: getSecurityDisplayName(security),
      action: decision.actionSummary,
      tag: decision.emotionLabel,
      tone:
        {
          FEAR_SELL: 'fear',
          GREED_BUY: 'greed',
          HASTE_SELL: 'haste',
        }[decision.emotionTag] ?? 'fear',
      result: `이후 ${formatPercent(decision.subsequentReturnPercent)}`,
      principle: decision.principleFeedback,
    }
  }),
)

const evidenceTrades = computed(() =>
  (props.report?.evidenceReviews ?? []).map((review) => {
    const trade = getReportTrade(review)
    const hasSecurityFields = trade.securityName?.trim() || trade.securityCode?.trim()

    return {
      ...review,
      security: trade,
      action: hasSecurityFields
        ? `${getSecurityDisplayName(trade)} ${getTradeSideLabel(trade.tradeSide)}`
        : review.action,
      score: review.confidenceScore,
      label: review.confidenceLabel,
      tone: review.confidenceScore >= 70 ? 'high' : review.confidenceScore >= 40 ? 'medium' : 'low',
    }
  }),
)

const principleMeta = {
  LONG_TERM: { id: 'long', icon: 'history' },
  DIVERSIFICATION: { id: 'diversify', icon: 'chart-pie' },
  STOP_LOSS: { id: 'stopLoss', icon: 'shield-check' },
}

const recommendations = computed(() =>
  (props.report?.recommendedPrinciples ?? []).map((item) => ({
    ...item,
    id: principleMeta[item.principleType]?.id ?? String(item.recommendationId),
    icon: principleMeta[item.principleType]?.icon ?? 'target',
  })),
)

const improvementMeta = {
  EMOTIONAL_TRADING: 'refresh-cw',
  JOURNAL: 'notebook',
  ASSET_ALLOCATION: 'scale',
}

const improvementItems = computed(() =>
  (props.report?.improvementActions ?? []).map((item) => ({
    ...item,
    icon: improvementMeta[item.category] ?? 'settings',
    detail: item.action,
  })),
)

const participants = computed(() =>
  (props.latestResult?.participantSummary ?? []).map((participant) => {
    const vId = Number(participant.variantId ?? participant.simulationVariantId ?? 0)
    const variantType =
      participant.variantType ||
      ([1, 1001].includes(vId)
        ? 'ACTUAL_USER'
        : [2, 1002].includes(vId)
          ? 'PERSONAL_BOT'
          : [3, 1003].includes(vId)
            ? 'FAMOUS_STRATEGY'
            : 'RANDOM_BOT')

    const returnVal =
      participant.cumulativeReturnPercent ??
      (typeof participant.cumulativeReturn === 'number'
        ? Math.abs(participant.cumulativeReturn) <= 2 && participant.cumulativeReturn !== 0
          ? participant.cumulativeReturn * 100
          : participant.cumulativeReturn
        : (participant.cumulative_return ?? 0))

    return {
      ...participant,
      ...participantMeta[variantType],
      variantType,
      variantId: participant.variantId ?? participant.simulationVariantId ?? vId,
      cumulativeReturnPercent: Number(returnVal) || 0,
      volatility:
        participant.volatilityPercent ??
        participant.volatility ??
        participantMeta[variantType]?.volatility ??
        0,
      mddPercent: participant.mddPercent ?? participant.mdd_percent ?? 0,
    }
  }),
)

const winner = computed(
  () =>
    [...participants.value].sort(
      (a, b) => b.cumulativeReturnPercent - a.cumulativeReturnPercent,
    )[0] ?? null,
)

const actualParticipant = computed(() =>
  participants.value.find((item) => item.variantType === 'ACTUAL_USER'),
)
const personalBot = computed(() =>
  participants.value.find((item) => item.variantType === 'PERSONAL_BOT'),
)

const actualReturn = computed(
  () =>
    props.report?.learningInsights?.actualReturnPercent ??
    actualParticipant.value?.cumulativeReturnPercent ??
    0,
)

const benchmarkStatus = computed(() => props.latestResult?.benchmarkData?.status ?? '')

const marketBenchmarks = computed(() => {
  const marketOrder = { KOSPI: 0, KOSDAQ: 1 }

  return (props.latestResult?.benchmarks ?? [])
    .map((benchmark) => {
      const market = String(benchmark.benchmark ?? '').startsWith('KOSDAQ') ? 'KOSDAQ' : 'KOSPI'
      const returnPercent = Number(benchmark.returnPercent) || 0
      const isFallback =
        String(benchmark.benchmark ?? '').includes('EQUAL_WEIGHT') ||
        String(benchmark.method ?? '').includes('동일가중')

      return {
        ...benchmark,
        market,
        returnPercent,
        isFallback,
        sourceLabel: isFallback
          ? '대체 벤치마크'
          : benchmarkStatus.value === 'PARTIAL'
            ? '일부 시장 데이터 보완'
            : '실제 시장지수',
        gapFromActual: actualReturn.value - returnPercent,
      }
    })
    .sort((a, b) => marketOrder[a.market] - marketOrder[b.market])
})

const benchmarkScale = computed(() =>
  Math.max(
    1,
    ...marketBenchmarks.value.map((benchmark) => Math.abs(benchmark.returnPercent)),
    Math.abs(actualReturn.value),
  ),
)

function getBenchmarkBarStyle(returnPercent) {
  const width = Math.min((Math.abs(returnPercent) / benchmarkScale.value) * 50, 50)
  return {
    left: returnPercent >= 0 ? '50%' : `${50 - width}%`,
    width: `${width}%`,
  }
}

function getMarketComparisonText(gap) {
  if (Math.abs(gap) < 0.05) return '내 투자와 같은 수준'
  return gap > 0
    ? `내 투자가 ${Math.abs(gap).toFixed(1)}%p 높아요`
    : `시장이 ${Math.abs(gap).toFixed(1)}%p 높아요`
}
const principleReturn = computed(
  () =>
    props.report?.learningInsights?.principleReturnPercent ??
    personalBot.value?.cumulativeReturnPercent ??
    0,
)

const principleGap = computed(
  () =>
    props.report?.learningInsights?.returnImprovementPercentPoint ??
    principleReturn.value - actualReturn.value,
)
const learningInsights = computed(() => props.report?.learningInsights ?? {})

const mistakePatternText = computed(() => {
  const insights = props.report?.learningInsights
  if (insights?.primaryMistakePattern) return insights.primaryMistakePattern
  if (insights?.primaryMistakePatternLines?.length) {
    return insights.primaryMistakePatternLines.join(' ')
  }
  return '상승 뒤에는 쫓아 사고, 하락 때는 너무 빨리 매도합니다.'
})

const maxReturnForGap = computed(() =>
  Math.max(Math.abs(actualReturn.value), Math.abs(principleReturn.value), 1),
)
const actualWidthPercent = computed(() =>
  Math.min(Math.max((Math.abs(actualReturn.value) / maxReturnForGap.value) * 100, 15), 100),
)
const principleWidthPercent = computed(() =>
  Math.min(Math.max((Math.abs(principleReturn.value) / maxReturnForGap.value) * 100, 15), 100),
)

const resultPeriod = computed(() => {
  const run = props.latestResult?.simulationRun
  return run ? `${formatDate(run.periodStart)} — ${formatDate(run.periodEnd)}` : ''
})

const chartDates = computed(() => [
  ...new Set(
    (props.latestResult?.dailyPerformance ?? [])
      .map((item) => item.snapshotDate || item.performanceDate)
      .filter(Boolean),
  ),
])

function isSameVariant(item, participant) {
  const itemVId = Number(item.simulationVariantId || item.variantId || 0)
  const partVId = Number(participant.variantId || 0)
  if (itemVId && partVId && (itemVId === partVId || itemVId % 1000 === partVId % 1000)) {
    return true
  }
  if (item.variantType && participant.variantType && item.variantType === participant.variantType) {
    return true
  }
  return false
}

const allReturnValues = computed(() => {
  const rows = props.latestResult?.dailyPerformance ?? []
  const vals = rows
    .map((item) => Number(item.cumulativeReturnPercent))
    .filter((v) => Number.isFinite(v))
  return vals.length ? vals : [0]
})

const yMin = computed(() => {
  const minVal = Math.min(...allReturnValues.value, 0)
  return Math.floor(minVal - 2)
})

const yMax = computed(() => {
  const maxVal = Math.max(...allReturnValues.value, 5)
  return Math.ceil(maxVal + 2)
})

const returnSeries = computed(() => {
  const rows = props.latestResult?.dailyPerformance ?? []
  const min = yMin.value
  const max = yMax.value

  return participants.value.map((participant) => {
    const values = chartDates.value.map((date) => {
      const snapshot = rows.find(
        (item) =>
          isSameVariant(item, participant) && (item.snapshotDate || item.performanceDate) === date,
      )
      return snapshot?.cumulativeReturnPercent ?? 0
    })
    return { ...participant, values, points: makeLinePoints(values, min, max) }
  })
})

const barSeries = computed(() =>
  participants.value.map((participant) => {
    const rawValue =
      selectedMetric.value === 'volatility'
        ? participant.volatility
        : Math.abs(participant.mddPercent ?? 0)
    const max = selectedMetric.value === 'volatility' ? 20 : 10
    return { ...participant, rawValue, width: Math.min((rawValue / max) * 100, 100) }
  }),
)

function makeLinePoints(values, min = -5, max = 20) {
  if (!Array.isArray(values) || !values.length) return ''
  const range = max === min ? 1 : max - min
  const width = 300
  const height = 118
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x.toFixed(1)},${Math.max(0, Math.min(height, y)).toFixed(1)}`
    })
    .join(' ')
}

function formatDate(date) {
  return date?.replaceAll('-', '.').slice(2) ?? ''
}

function formatPercent(value, absolute = false) {
  const number = Number(value ?? 0)
  const prefix = !absolute && number > 0 ? '+' : ''
  return `${prefix}${Math.abs(number).toFixed(1)}%`
}

function formatSignedPercent(value) {
  const number = Number(value ?? 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`
}

function togglePrinciple(id) {
  selectedPrinciples.value = selectedPrinciples.value.includes(id)
    ? selectedPrinciples.value.filter((item) => item !== id)
    : [...selectedPrinciples.value, id]
}

function goToPrinciplesEdit() {
  router.push('/tendency/principles/edit')
}
</script>

<template>
  <div class="result-report">
    <header class="report-intro">
      <div>
        <span class="eyebrow">SIMULATION REPORT</span>
        <h1>투자 결과를<br />원칙으로 바꿔볼게요</h1>
        <p>{{ resultPeriod }} · 동일 자금 기준</p>
      </div>
      <div class="winner-chip">
        <SimulationParticipantAvatar v-if="winner" :variant-type="winner.variantType" :size="32" />
        <div>
          <span>이번 1위</span>
          <strong>{{ winner?.shortName ?? '원칙 봇' }}</strong>
        </div>
      </div>
    </header>

    <div v-if="reportLoading" class="report-status" role="status">
      <AppIcon name="loader-circle" :size="18" class="report-status__spinner" />
      <div>
        <strong>복기 리포트를 만들고 있어요</strong>
        <span>성과 결과는 먼저 확인할 수 있습니다.</span>
      </div>
    </div>
    <div v-else-if="reportError" class="report-status report-status--error" role="alert">
      <AppIcon name="circle-alert" :size="18" />
      <div>
        <strong>복기 리포트를 불러오지 못했어요</strong>
        <span>성과 결과는 정상적으로 확인할 수 있습니다.</span>
      </div>
    </div>

    <section class="report-section performance-section">
      <div class="section-heading">
        <span class="section-number">01</span>
        <div>
          <h2>성과 비교</h2>
          <p>같은 시장에서 네 가지 선택은 어떻게 달랐을까요?</p>
        </div>
      </div>

      <div class="metric-tabs" role="tablist" aria-label="성과 지표">
        <button
          v-for="metric in metrics"
          :key="metric.key"
          type="button"
          role="tab"
          :aria-selected="selectedMetric === metric.key"
          :class="{ active: selectedMetric === metric.key }"
          @click="selectedMetric = metric.key"
        >
          {{ metric.label }}
        </button>
      </div>

      <div class="chart-card">
        <template v-if="selectedMetric === 'return'">
          <div class="line-chart">
            <div class="y-labels" aria-hidden="true">
              <span>{{ yMax }}%</span>
              <span>{{ Math.round((yMax * 2 + yMin) / 3) }}%</span>
              <span>{{ Math.round((yMax + yMin * 2) / 3) }}%</span>
              <span>{{ yMin }}%</span>
            </div>
            <svg viewBox="0 0 300 118" role="img" aria-label="참가자별 누적 수익률 선 그래프">
              <line v-for="y in [0, 47, 94, 118]" :key="y" x1="0" :y1="y" x2="300" :y2="y" />
              <polyline
                v-for="series in returnSeries"
                :key="series.variantId"
                :points="series.points"
                :stroke="series.color"
              />
            </svg>
          </div>
          <div class="x-labels">
            <span v-for="date in chartDates" :key="date">{{ formatDate(date).slice(3) }}</span>
          </div>
        </template>

        <div v-else class="bar-chart" role="img" :aria-label="`${selectedMetric} 비교 막대 그래프`">
          <div v-for="participant in barSeries" :key="participant.variantId" class="bar-row">
            <span>{{ participant.shortName }}</span>
            <div class="bar-track">
              <i :style="{ width: `${participant.width}%`, background: participant.color }"></i>
            </div>
            <strong>{{ formatPercent(participant.rawValue, true) }}</strong>
          </div>
        </div>

        <div class="chart-legend">
          <div v-for="participant in participants" :key="participant.variantId">
            <i :style="{ background: participant.color }"></i>
            <span>{{ participant.shortName }}</span>
          </div>
        </div>
      </div>

      <div class="score-grid">
        <div v-for="participant in participants" :key="participant.variantId" class="score-card">
          <div class="score-card__top">
            <SimulationParticipantAvatar :variant-type="participant.variantType" :size="24" />
            <span>{{ participant.shortName }}</span>
          </div>
          <strong :style="{ color: participant.color }">
            {{ formatPercent(participant.cumulativeReturnPercent) }}
          </strong>
          <div>
            <span>변동성 {{ formatPercent(participant.volatility, true) }}</span>
            <span>MDD {{ formatPercent(participant.mddPercent) }}</span>
          </div>
        </div>
      </div>

      <div class="market-benchmark-panel">
        <div class="market-benchmark-panel__heading">
          <div>
            <span>시장 벤치마크</span>
            <h3>KOSPI·KOSDAQ과 비교</h3>
          </div>
          <span class="actual-return-chip">내 투자 {{ formatSignedPercent(actualReturn) }}</span>
        </div>

        <div v-if="marketBenchmarks.length" class="market-benchmark-list">
          <article
            v-for="benchmark in marketBenchmarks"
            :key="benchmark.benchmark"
            class="market-benchmark-card"
            :title="benchmark.method"
          >
            <div class="market-benchmark-card__top">
              <div>
                <strong>{{ benchmark.market }}</strong>
                <small>{{ benchmark.method }}</small>
              </div>
              <span :class="{ 'is-fallback': benchmark.isFallback }">
                {{ benchmark.sourceLabel }}
              </span>
            </div>

            <div class="market-benchmark-card__value">
              <strong
                :class="{
                  positive: benchmark.returnPercent > 0,
                  negative: benchmark.returnPercent < 0,
                }"
              >
                {{ formatSignedPercent(benchmark.returnPercent) }}
              </strong>
              <span>{{ getMarketComparisonText(benchmark.gapFromActual) }}</span>
            </div>

            <div class="benchmark-return-track" aria-hidden="true">
              <i></i>
              <b
                :class="{ negative: benchmark.returnPercent < 0 }"
                :style="getBenchmarkBarStyle(benchmark.returnPercent)"
              ></b>
            </div>

            <small v-if="benchmark.securityCount" class="benchmark-security-count">
              투자 가능 종목 {{ benchmark.securityCount }}개 기준
            </small>
          </article>
        </div>

        <p v-else class="market-benchmark-empty">시장 벤치마크 데이터가 없습니다.</p>
      </div>
    </section>

    <section class="report-section">
      <div class="section-heading">
        <span class="section-number">02</span>
        <div>
          <h2>감정적 결정 복기</h2>
          <p>결과보다, 결정이 흔들린 순간을 살펴봤어요.</p>
        </div>
      </div>

      <div class="emotion-timeline">
        <article
          v-for="decision in emotionalDecisions"
          :key="decision.date"
          class="emotion-card"
          :class="`emotion-card--${decision.tone}`"
        >
          <div class="timeline-marker"></div>
          <div class="emotion-card__top">
            <span class="decision-date">{{ decision.date }}</span>
            <span class="emotion-tag">{{ decision.tag }}</span>
            <span class="decision-result">{{ decision.result }}</span>
          </div>
          <h3>
            <StockLogo :stock="decision.security" :size="28" />
            <span>{{ decision.stock }} · {{ decision.action }}</span>
          </h3>
          <div class="bot-coach">
            <AppIcon name="bot" :size="16" />
            <p><strong>원칙대로라면</strong> {{ decision.principle }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="report-section">
      <div class="section-heading">
        <span class="section-number">03</span>
        <div>
          <h2>근거 검증</h2>
          <p>행동과 근거, 결과가 서로 연결되어 있었을까요?</p>
        </div>
      </div>

      <div class="evidence-list">
        <article v-for="trade in evidenceTrades" :key="trade.action" class="evidence-card">
          <div class="confidence-row">
            <span>근거 신뢰도</span>
            <strong :class="`confidence--${trade.tone}`"
              >{{ trade.score }}점 · {{ trade.label }}</strong
            >
          </div>
          <div class="confidence-track">
            <i :class="`confidence--${trade.tone}`" :style="{ width: `${trade.score}%` }"></i>
          </div>
          <div class="evidence-flow">
            <div>
              <small>행동</small>
              <span class="evidence-action">
                <StockLogo :stock="trade.security" :size="24" />
                <strong>{{ trade.action }}</strong>
              </span>
            </div>
            <AppIcon name="arrow-right" :size="14" />
            <div>
              <small>근거</small><strong>{{ trade.basis }}</strong>
            </div>
            <AppIcon name="arrow-right" :size="14" />
            <div>
              <small>결과</small><strong>{{ trade.result }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="report-section">
      <div class="section-heading">
        <span class="section-number">04</span>
        <div>
          <h2>학습 인사이트</h2>
          <p>다음 투자를 바꿀 두 가지 핵심이에요.</p>
        </div>
      </div>

      <div class="insight-hero">
        <div class="insight-icon"><AppIcon name="triangle-alert" :size="20" /></div>
        <span>가장 큰 실수 패턴</span>
        <h3>{{ mistakePatternText }}</h3>
        <p>{{ learningInsights.summary }}</p>
      </div>

      <div class="gap-card">
        <div>
          <span>원칙을 지켰다면</span>
          <strong>평균 수익률이 {{ principleGap.toFixed(1) }}%p 더 높았어요</strong>
        </div>
        <div class="gap-visual">
          <div>
            <span>내 투자</span>
            <i :style="{ width: `${actualWidthPercent}%` }"></i>
            <b>{{ formatPercent(actualReturn) }}</b>
          </div>
          <div>
            <span>원칙 봇</span>
            <i :style="{ width: `${principleWidthPercent}%` }"></i>
            <b>{{ formatPercent(principleReturn) }}</b>
          </div>
        </div>
      </div>
    </section>

    <section class="report-section principle-section">
      <div class="section-heading">
        <span class="section-number">05</span>
        <div>
          <h2>다음 원칙 추천</h2>
          <p>적용할 원칙을 고르고 나만의 기준으로 다듬어 보세요.</p>
        </div>
      </div>

      <div class="recommendation-list">
        <button
          v-for="item in recommendations"
          :key="item.id"
          type="button"
          class="recommendation-card"
          :class="{ selected: selectedPrinciples.includes(item.id) }"
          :aria-pressed="selectedPrinciples.includes(item.id)"
          @click="togglePrinciple(item.id)"
        >
          <span class="recommendation-icon"><AppIcon :name="item.icon" :size="18" /></span>
          <span class="recommendation-copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.description }}</small>
          </span>
          <span class="check"><AppIcon name="check" :size="14" /></span>
        </button>
      </div>

      <div class="improvement-box">
        <div class="improvement-title">
          <AppIcon name="settings" :size="17" />
          <strong>함께 수정하면 좋은 요소</strong>
        </div>
        <div v-for="item in improvementItems" :key="item.title" class="improvement-row">
          <AppIcon :name="item.icon" :size="16" />
          <p>
            <strong>{{ item.title }}</strong
            ><span>{{ item.detail }}</span>
          </p>
        </div>
      </div>
    </section>

    <div class="action-buttons">
      <BaseButton variant="primary" full-width @click="goToPrinciplesEdit">
        선택한 원칙으로 수정하기
        <AppIcon name="arrow-right" :size="17" />
      </BaseButton>
      <BaseButton variant="ghost" full-width @click="emit('restart')">
        <AppIcon name="rotate-ccw" :size="16" />
        다시 시뮬레이션하기
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.result-report {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0;
  padding-bottom: 140px;
  color: #263a43;
}

.report-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 2px 26px;
}

.eyebrow,
.section-number {
  font-size: var(--font-size-caption);
  font-weight: 800;
  color: #0b8f8b;
  letter-spacing: 0.09em;
}

.report-intro h1 {
  margin: 7px 0 8px;
  font-size: var(--font-size-title-md);
  line-height: 1.28;
  letter-spacing: -0.04em;
}

.report-intro p,
.section-heading p {
  margin: 0;
  color: #7c8d94;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.report-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid #cfe8e6;
  border-radius: 14px;
  background: #f2fbfa;
  color: #315158;
}

.report-status > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.report-status strong {
  font-size: var(--font-size-body);
}

.report-status span {
  color: #66777d;
  font-size: var(--font-size-caption);
}

.report-status--error {
  border-color: #f0d6d0;
  background: #fff7f5;
  color: #a54a39;
}

.report-status__spinner {
  flex: 0 0 auto;
  animation: report-spin 1s linear infinite;
}

@keyframes report-spin {
  to {
    transform: rotate(360deg);
  }
}

.winner-chip {
  display: flex;
  min-width: 105px;
  align-items: center;
  gap: 7px;
  padding: 9px;
  border: 1px solid #cce8e6;
  border-radius: 13px;
  background: #f2fbfa;
}

.winner-chip div {
  display: flex;
  flex-direction: column;
}

.winner-chip span {
  color: #7c8d94;
  font-size: var(--font-size-caption);
}

.winner-chip strong {
  font-size: var(--font-size-caption);
}

.report-section {
  padding: 24px 0;
  border-top: 1px solid #e8edef;
}

.section-heading {
  display: grid;
  grid-template-columns: 27px 1fr;
  gap: 4px;
  margin-bottom: 16px;
}

.section-number {
  padding-top: 3px;
}

.section-heading h2 {
  margin: 0 0 3px;
  font-size: var(--font-size-body);
  letter-spacing: -0.03em;
}

.metric-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #f0f4f5;
}

.metric-tabs button {
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #708087;
  font: inherit;
  font-size: var(--font-size-caption);
  font-weight: 700;
  cursor: pointer;
}

.metric-tabs button.active {
  background: #fff;
  color: #263a43;
  box-shadow: 0 2px 8px rgb(38 58 67 / 8%);
}

.chart-card {
  margin-top: 10px;
  padding: 16px 12px 12px;
  border: 1px solid #e2e9eb;
  border-radius: 16px;
  background: #fff;
}

.line-chart {
  display: grid;
  grid-template-columns: 28px 1fr;
  height: 132px;
}

.y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 10px;
  color: #a1adb2;
  font-size: var(--font-size-caption);
}

.line-chart svg {
  width: 100%;
  height: 118px;
  overflow: visible;
}

.line-chart line {
  stroke: #edf1f2;
  stroke-width: 1;
}

.line-chart polyline {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.3;
  vector-effect: non-scaling-stroke;
}

.x-labels {
  display: flex;
  justify-content: space-between;
  padding-left: 28px;
  color: #a1adb2;
  font-size: var(--font-size-caption);
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 13px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #edf1f2;
}

.chart-legend div {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #607178;
  font-size: var(--font-size-caption);
}

.chart-legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.bar-chart {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  justify-content: center;
  gap: 17px;
}

.bar-row {
  display: grid;
  grid-template-columns: 58px 1fr 36px;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-caption);
}

.bar-row > span {
  color: #607178;
}

.bar-row strong {
  text-align: right;
  font-size: var(--font-size-caption);
}

.bar-track {
  height: 8px;
  overflow: hidden;
  border-radius: 10px;
  background: #edf1f2;
}

.bar-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.35s ease;
}

.score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.score-card {
  padding: 12px;
  border-radius: 13px;
  background: #f7f9fa;
}

.score-card__top {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.score-card > strong {
  display: block;
  margin-bottom: 4px;
  font-size: var(--font-size-body);
}

.score-card > div:last-child {
  display: flex;
  justify-content: space-between;
  color: #8a989e;
  font-size: var(--font-size-caption);
}

.market-benchmark-panel {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #dfe8ea;
  border-radius: 16px;
  background: linear-gradient(145deg, #f7fbfb 0%, #f7f9fc 100%);
}

.market-benchmark-panel__heading,
.market-benchmark-card__top,
.market-benchmark-card__value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.market-benchmark-panel__heading > div,
.market-benchmark-card__top > div {
  display: flex;
  flex-direction: column;
}

.market-benchmark-panel__heading > div > span {
  color: #0b8f8b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.market-benchmark-panel__heading h3 {
  margin: 2px 0 0;
  font-size: var(--font-size-body);
}

.actual-return-chip {
  padding: 6px 8px;
  border-radius: 999px;
  background: #fff;
  color: #df6a55;
  font-size: var(--font-size-caption);
  font-weight: 800;
  box-shadow: 0 2px 8px rgb(38 58 67 / 7%);
}

.market-benchmark-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.market-benchmark-card {
  padding: 12px;
  border: 1px solid #e3eaec;
  border-radius: 13px;
  background: #fff;
}

.market-benchmark-card__top strong {
  font-size: var(--font-size-caption);
  letter-spacing: 0.03em;
}

.market-benchmark-card__top small {
  margin-top: 2px;
  color: #839198;
  font-size: 10px;
}

.market-benchmark-card__top > span {
  padding: 4px 7px;
  border-radius: 999px;
  background: #e9f7f5;
  color: #087f7c;
  font-size: 10px;
  font-weight: 800;
}

.market-benchmark-card__top > span.is-fallback {
  background: #fff5dc;
  color: #9a6b00;
}

.market-benchmark-card__value {
  margin-top: 10px;
}

.market-benchmark-card__value > strong {
  color: #53646b;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.market-benchmark-card__value > strong.positive {
  color: #d85d53;
}

.market-benchmark-card__value > strong.negative {
  color: #3978c5;
}

.market-benchmark-card__value > span {
  color: #65767d;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.benchmark-return-track {
  position: relative;
  height: 7px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f2;
}

.benchmark-return-track > i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: #aebbc0;
  z-index: 1;
}

.benchmark-return-track > b {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: #df6a5e;
}

.benchmark-return-track > b.negative {
  background: #4b82c5;
}

.benchmark-security-count {
  display: block;
  margin-top: 7px;
  color: #89979d;
  font-size: 10px;
}

.market-benchmark-empty {
  margin: 12px 0 0;
  padding: 14px;
  border-radius: 12px;
  background: #fff;
  color: #839198;
  text-align: center;
  font-size: var(--font-size-caption);
}

.emotion-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 16px;
}

.emotion-timeline::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 4px;
  width: 1px;
  background: #dce5e7;
  content: '';
}

.emotion-card {
  position: relative;
  padding: 13px;
  border: 1px solid #e4eaec;
  border-radius: 14px;
  background: #fff;
}

.timeline-marker {
  position: absolute;
  top: 18px;
  left: -16px;
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #f07a62;
  box-shadow: 0 0 0 1px #f07a62;
}

.emotion-card--greed .timeline-marker {
  background: #d5a43d;
  box-shadow: 0 0 0 1px #d5a43d;
}

.emotion-card--haste .timeline-marker {
  background: #7b83d5;
  box-shadow: 0 0 0 1px #7b83d5;
}

.emotion-card__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.decision-date {
  color: #8a989e;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.emotion-tag {
  padding: 3px 6px;
  border-radius: 6px;
  background: #fff0ed;
  color: #cf5a44;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.emotion-card--greed .emotion-tag {
  background: #fff8e6;
  color: #9c721b;
}

.emotion-card--haste .emotion-tag {
  background: #f0f1ff;
  color: #626bc0;
}

.decision-result {
  margin-left: auto;
  color: #7b8790;
  font-size: var(--font-size-caption);
}

.emotion-card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 9px 0;
  font-size: var(--font-size-body);
}

.emotion-card h3 span {
  min-width: 0;
}

.bot-coach {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px;
  border-radius: 10px;
  background: #eff9f8;
  color: #35726f;
}

.bot-coach p {
  margin: 0;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.evidence-card {
  padding: 13px;
  border: 1px solid #e4eaec;
  border-radius: 14px;
  background: #fff;
}

.confidence-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-caption);
}

.confidence-row > span {
  color: #87959b;
}

.confidence--low {
  color: #dd654f;
}

.confidence--medium {
  color: #bd8a22;
}

.confidence--high {
  color: #0b8f8b;
}

.confidence-track {
  height: 5px;
  margin: 7px 0 13px;
  overflow: hidden;
  border-radius: 10px;
  background: #edf1f2;
}

.confidence-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: currentcolor;
}

.evidence-flow {
  display: grid;
  grid-template-columns: 1fr 14px 1fr 14px 0.8fr;
  align-items: center;
  gap: 5px;
}

.evidence-flow > div {
  min-height: 50px;
  padding: 8px;
  border-radius: 9px;
  background: #f6f8f9;
}

.evidence-flow small {
  display: block;
  margin-bottom: 4px;
  color: #96a2a7;
  font-size: var(--font-size-caption);
}

.evidence-flow strong {
  display: block;
  font-size: var(--font-size-caption);
  line-height: 1.35;
}

.evidence-action {
  display: flex;
  align-items: center;
  gap: 6px;
}

.evidence-action strong {
  min-width: 0;
}

.evidence-flow > .app-icon {
  color: #a7b2b6;
}

.insight-hero {
  padding: 18px;
  border-radius: 17px;
  background: #263a43;
  color: #fff;
}

.insight-icon {
  display: inline-flex;
  padding: 7px;
  border-radius: 9px;
  background: rgb(255 255 255 / 10%);
  color: #ffc473;
}

.insight-hero > span {
  display: block;
  margin-top: 13px;
  color: #a9bdc5;
  font-size: var(--font-size-caption);
}

.insight-hero h3 {
  margin: 4px 0 8px;
  font-size: var(--font-size-body);
  line-height: 1.45;
  letter-spacing: -0.025em;
}

.insight-hero p {
  margin: 0;
  color: #bfd0d6;
  font-size: var(--font-size-caption);
}

.gap-card {
  margin-top: 10px;
  padding: 15px;
  border-radius: 15px;
  background: #eff9f8;
}

.gap-card > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gap-card span {
  color: #6e858b;
  font-size: var(--font-size-caption);
}

.gap-card > div > strong {
  color: #087f7c;
  font-size: var(--font-size-body);
}

.gap-visual {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 13px;
}

.gap-visual div {
  display: grid;
  grid-template-columns: 44px 1fr 38px;
  align-items: center;
  gap: 6px;
}

.gap-visual i {
  display: block;
  height: 7px;
  border-radius: 8px;
  background: #86c9c5;
}

.gap-visual b {
  font-size: var(--font-size-caption);
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-card {
  display: grid;
  grid-template-columns: 36px 1fr 22px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid #e1e8ea;
  border-radius: 14px;
  background: #fff;
  color: #263a43;
  text-align: left;
  cursor: pointer;
}

.recommendation-card.selected {
  border-color: #8bcac7;
  background: #f4fbfa;
}

.recommendation-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f0f4f5;
  color: #60757d;
}

.selected .recommendation-icon {
  background: #dff3f1;
  color: #087f7c;
}

.recommendation-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recommendation-copy strong {
  font-size: var(--font-size-caption);
}

.recommendation-copy small {
  color: #809096;
  font-size: var(--font-size-caption);
  line-height: 1.35;
}

.check {
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd7da;
  border-radius: 50%;
  color: transparent;
}

.selected .check {
  border-color: #0b8f8b;
  background: #0b8f8b;
  color: #fff;
}

.improvement-box {
  margin-top: 13px;
  padding: 14px;
  border-radius: 14px;
  background: #f5f7f8;
}

.improvement-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dfe6e8;
  font-size: var(--font-size-caption);
}

.improvement-row {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 8px;
  padding-top: 11px;
  color: #64777e;
}

.improvement-row p {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

.improvement-row strong {
  color: #40545c;
  font-size: var(--font-size-caption);
}

.improvement-row span {
  font-size: var(--font-size-caption);
}

.action-buttons {
  position: fixed;
  z-index: 30;
  bottom: 12px;
  left: 50%;
  display: flex;
  width: min(calc(100% - 40px), 350px);
  flex-direction: column;
  gap: 2px;
  padding: 9px;
  border: 1px solid rgb(220 230 233 / 90%);
  border-radius: 16px;
  background: rgb(255 255 255 / 95%);
  box-shadow: 0 8px 24px rgb(38 58 67 / 15%);
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.action-buttons :deep(.base-button--ghost) {
  height: 34px;
  font-size: var(--font-size-caption);
}
</style>
