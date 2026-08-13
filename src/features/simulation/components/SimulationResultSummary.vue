<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'

import {
  acceptSimulationPrincipleProposal,
  isSimulationReportEnrichmentPending,
} from '@/features/simulation/api/simulationApi'
import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import { getSecurityDisplayName } from '@/features/simulation/utils/securityDisplayName'
import { queryKeys } from '@/shared/api/queryKeys'
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
const queryClient = useQueryClient()
const selectedMetric = ref('return')
const activeChapter = ref(0)
const slideDirection = ref('next')
const touchStart = ref(null)
const expandedDecisionKey = ref(null)
const expandedThesisKey = ref(null)
const proposalToConfirm = ref(null)
const applyingProposalId = ref(null)
const appliedProposalIds = ref(new Set())
const proposalError = ref('')

const REPORT_CHAPTERS = [
  { number: '01', title: '성과 비교', icon: 'bar-chart' },
  { number: '02', title: '감정 복기', icon: 'activity' },
  { number: '03', title: '근거 검증', icon: 'circle-check' },
  { number: '04', title: '학습 인사이트', icon: 'sparkles' },
  { number: '05', title: '다음 원칙', icon: 'target' },
]

const chapterTransitionName = computed(() => `chapter-slide-${slideDirection.value}`)

function goToChapter(index) {
  const nextIndex = Math.min(Math.max(index, 0), REPORT_CHAPTERS.length - 1)
  if (nextIndex === activeChapter.value) return

  slideDirection.value = nextIndex > activeChapter.value ? 'next' : 'prev'
  activeChapter.value = nextIndex
}

function handleTouchStart(event) {
  const touch = event.touches[0]
  touchStart.value = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function handleTouchEnd(event) {
  if (!touchStart.value) return

  const touch = event.changedTouches[0]
  const deltaX = touch.clientX - touchStart.value.x
  const deltaY = touch.clientY - touchStart.value.y
  touchStart.value = null

  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return
  goToChapter(activeChapter.value + (deltaX < 0 ? 1 : -1))
}

function getDecisionKey(decision, index) {
  return decision.tradeId != null ? String(decision.tradeId) : `${decision.date}-${index}`
}

function toggleDecision(decision, index) {
  const key = getDecisionKey(decision, index)
  expandedDecisionKey.value = expandedDecisionKey.value === key ? null : key
}

function toggleThesis(decision, index) {
  const key = getDecisionKey(decision, index)
  expandedThesisKey.value = expandedThesisKey.value === key ? null : key
}

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
  const simulatedTrade = simulatedTradeById.value.get(String(reportItem.tradeId))
  if (!simulatedTrade) return reportItem

  return {
    ...simulatedTrade,
    ...reportItem,
    securityCode: reportItem.securityCode ?? simulatedTrade.securityCode,
  }
}

function getTradeSideLabel(tradeSide) {
  return (
    {
      BUY: '매수',
      SELL: '매도',
      ADD: '추가 매수',
      REDUCE: '비중 축소',
      HOLD: '보유',
      WAIT: '대기',
      NOT_COMPARED: '비교 안 됨',
    }[tradeSide] ?? tradeSide
  )
}

function normalizeDecisionAction(action) {
  return { ADD: 'BUY', REDUCE: 'SELL', WAIT: 'HOLD' }[action] ?? action
}

function getPrincipleRecommendedAction(decision) {
  const actualAction = normalizeDecisionAction(decision.action)
  const principleAction = normalizeDecisionAction(decision.principleBotAction)

  if (actualAction === 'BUY' && principleAction === 'HOLD') return '추가 매수 보류'
  if (actualAction === 'SELL' && principleAction === 'HOLD') return '매도 보류'
  return getTradeSideLabel(principleAction)
}

function getPrincipleDecisionConclusion(decision) {
  const actualAction = normalizeDecisionAction(decision.action)
  const principleAction = normalizeDecisionAction(decision.principleBotAction)
  const conclusionMatrix = {
    BUY_BUY: '실제 매수 판단이 원칙에서 정한 선택과 일치했어요.',
    BUY_SELL: '매수하지 않고 매도하는 것이 원칙에 맞았어요.',
    BUY_HOLD: '추가 매수를 보류하고 기존 보유분만 유지하는 것이 원칙에 맞아요.',
    SELL_BUY: '매도하지 않고 매수하는 것이 원칙에 맞았어요.',
    SELL_SELL: '실제 매도 판단이 원칙에서 정한 선택과 일치했어요.',
    SELL_HOLD: '매도하지 않고 기존 보유분을 유지하는 것이 원칙에 맞아요.',
    HOLD_BUY: '보유만 이어가기보다 매수하는 것이 원칙에 맞았어요.',
    HOLD_SELL: '보유를 이어가지 않고 매도하는 것이 원칙에 맞았어요.',
    HOLD_HOLD: '실제 보유 판단이 원칙에서 정한 선택과 일치했어요.',
  }

  return (
    conclusionMatrix[`${actualAction}_${principleAction}`] ??
    `실제 행동보다 '${getTradeSideLabel(principleAction)}'을 선택하는 것이 원칙에 맞아요.`
  )
}

function getDistinctNarrative(narrative, ...comparisonTexts) {
  const normalizeText = (text) =>
    String(text ?? '')
      .replace(/\s+/g, '')
      .trim()
  const normalizedNarrative = normalizeText(narrative)
  if (!normalizedNarrative) return null

  const isDuplicate = comparisonTexts.some((text) => {
    const normalizedText = normalizeText(text)
    return (
      normalizedText &&
      (normalizedText.includes(normalizedNarrative) || normalizedNarrative.includes(normalizedText))
    )
  })
  return isDuplicate ? null : narrative
}

function getDecisionOutcomeContext(decision) {
  const outcomeReturn = decision.outcome?.priceReturnPercent ?? decision.subsequentReturnPercent
  if (outcomeReturn == null) {
    return '사후 성과와 관계없이, 결정 당시 확인할 수 있었던 원칙을 기준으로 복기했어요.'
  }

  return `5거래일 뒤 수익률은 ${formatPercent(outcomeReturn)}였지만, 사후 수익과 별개로 당시 원칙을 기준으로 판단했어요.`
}

function getPrincipleReviewMeta(decision) {
  const principleReview = decision.principleReview ?? {}
  const isViolation = principleReview.status === 'VIOLATION_PATTERN_DETECTED'

  if (isViolation) {
    return {
      statusLabel: '원칙 위반 패턴',
      verdictLabel: '원칙 위반 결론',
      conclusion: principleReview.violatedPrinciple
        ? `'${principleReview.violatedPrinciple}' 원칙을 어긴 결정이었어요.`
        : '원칙 위반 패턴이 발견된 결정이었어요.',
      comparisonLabel: '원칙과 불일치',
      reminder:
        principleReview.recommendedAction ||
        '다음 거래에서는 주문 전에 해당 원칙을 먼저 확인해 주세요.',
    }
  }

  return {
    statusLabel: '원칙봇과 다른 결정',
    verdictLabel: '의사결정 차이',
    conclusion: '원칙 위반으로 확정되지는 않았지만, 원칙봇과 다른 결정을 내렸어요.',
    comparisonLabel: '판단이 달랐어요',
    reminder:
      principleReview.recommendedAction ||
      '다음 거래에서는 실행 전에 원칙봇의 판단과 다른 이유를 한 번 더 확인해 주세요.',
  }
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

const emotionLabelMap = {
  RULE_DIVERGENCE: '원칙봇과 다른 결정',
  EARLY_SELL: '조기 매도 가능성',
  MISTIMED_BUY: '매수 시점 재검토',
  FOMO_BUY: '추격매수',
  CONCENTRATED_BUY: '집중매수',
  DELAYED_STOP_LOSS: '손절 지연',
}

const thesisVerdictMeta = {
  REALIZED: { label: '근거가 현실화됐어요', tone: 'realized', icon: 'circle-check' },
  PARTIALLY_REALIZED: { label: '일부만 현실화됐어요', tone: 'partial', icon: 'circle-help' },
  NOT_REALIZED: {
    label: '근거가 현실화되지 않았어요',
    tone: 'not-realized',
    icon: 'triangle-alert',
  },
  UNCONFIRMED: { label: '근거를 확인하고 있어요', tone: 'pending', icon: 'loader-circle' },
}

function normalizeThesisOutcome(thesisOutcome, generationMetadata = {}) {
  const thesis = thesisOutcome ?? {
    verdict: 'UNCONFIRMED',
    verificationStatus: 'WEB_SEARCH_NOT_RUN',
    summary: '백그라운드에서 투자 근거의 현실화 여부를 확인하고 있어요.',
    claimResults: [],
    sourceCount: 0,
  }
  const meta = thesisVerdictMeta[thesis.verdict] ?? thesisVerdictMeta.UNCONFIRMED
  const isUnrecorded = thesis.verificationStatus === 'NO_RECORDED_RATIONALE'
  const isTerminalFailure = ['NOT_CONFIGURED', 'PARTIAL', 'FAILED'].includes(
    generationMetadata.thesisVerificationStatus,
  )
  const isPending =
    !isUnrecorded &&
    !isTerminalFailure &&
    thesis.verdict === 'UNCONFIRMED' &&
    thesis.verificationStatus === 'WEB_SEARCH_NOT_RUN'
  const terminalFailureLabel =
    generationMetadata.thesisVerificationStatus === 'NOT_CONFIGURED'
      ? '웹 검증이 설정되지 않았어요'
      : '이번 근거는 검증하지 못했어요'

  return {
    ...thesis,
    ...meta,
    isPending,
    isUnrecorded,
    displayLabel: isUnrecorded
      ? '기록된 투자 근거가 없어요'
      : isPending
        ? meta.label
        : isTerminalFailure && thesis.verdict === 'UNCONFIRMED'
          ? terminalFailureLabel
          : thesis.verdictLabel || meta.label,
    claims: thesis.claimResults ?? [],
  }
}

function getSafeSourceUrl(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null
  } catch {
    return null
  }
}

const evidenceReviewByTradeId = computed(
  () =>
    new Map(
      (props.report?.evidenceReviews ?? [])
        .filter((review) => review.tradeId != null)
        .map((review) => [String(review.tradeId), review]),
    ),
)

const emotionalDecisions = computed(() =>
  (props.report?.keyTradeReviews ?? props.report?.decisionReviews ?? []).map((decision) => {
    const security = getReportTrade(decision)
    const relatedEvidence = evidenceReviewByTradeId.value.get(String(decision.tradeId))
    const principleReview = decision.principleReview ?? {}
    const reviewMeta = getPrincipleReviewMeta(decision)
    const outcomeReturn = decision.outcome?.priceReturnPercent ?? decision.subsequentReturnPercent
    const actualBasis =
      decision.decisionReason ||
      security.decisionReason ||
      relatedEvidence?.basis ||
      '이 거래에 직접 기록된 매매 근거가 없습니다.'
    const judgmentExplanation =
      principleReview.violationReason ||
      decision.principleFeedback ||
      '원칙봇과 행동이 달랐지만 원칙 위반으로 확정할 근거는 충분하지 않았습니다.'
    const recommendedGuidance =
      principleReview.recommendedAction || '이 결정에 대한 권장 행동이 제공되지 않았습니다.'

    return {
      ...decision,
      security,
      date: decision.tradedAt?.slice(5, 10).replace('-', '.') ?? '',
      stock: getSecurityDisplayName(security),
      action: getTradeSideLabel(decision.actionSummary || decision.action),
      actualAction: getTradeSideLabel(decision.action),
      principleBotAction: getTradeSideLabel(decision.principleBotAction),
      tradeDetail:
        decision.trade?.quantity != null && decision.trade?.unitPrice != null
          ? `${decision.trade.quantity.toLocaleString()}주 · 주당 ${formatCurrency(decision.trade.unitPrice)}`
          : null,
      tradeCostDetail:
        decision.trade?.notionalAmount != null
          ? `체결금액 ${formatCurrency(decision.trade.notionalAmount)} · 거래비용 ${formatCurrency(decision.trade.transactionCostAmount)}`
          : null,
      tag: reviewMeta.statusLabel,
      patternLabel:
        decision.emotionLabel || emotionLabelMap[decision.emotionTag] || '핵심 거래 복기',
      tone:
        {
          FEAR_SELL: 'fear',
          GREED_BUY: 'greed',
          HASTE_SELL: 'haste',
        }[decision.emotionTag] ?? 'fear',
      result:
        outcomeReturn == null ? '후속 데이터 부족' : `5거래일 후 ${formatPercent(outcomeReturn)}`,
      outcomeSummary:
        decision.outcome?.summary ||
        (outcomeReturn == null
          ? '후속 데이터가 부족합니다.'
          : `5거래일 후 ${formatPercent(outcomeReturn)}`),
      recommendedAction: getPrincipleRecommendedAction(decision),
      conclusion:
        principleReview.status != null
          ? reviewMeta.conclusion
          : getPrincipleDecisionConclusion(decision),
      verdictLabel: reviewMeta.verdictLabel,
      comparisonLabel: reviewMeta.comparisonLabel,
      outcomeContext: getDecisionOutcomeContext(decision),
      actualBasis,
      judgmentExplanation,
      violatedPrinciple: principleReview.violatedPrinciple,
      principleTargetRule: principleReview.targetRule,
      recommendedGuidance,
      reminder: reviewMeta.reminder,
      thesis: normalizeThesisOutcome(decision.thesisOutcome, props.report?.generationMetadata),
      distinctNarrative: getDistinctNarrative(decision.narrative, actualBasis, judgmentExplanation),
    }
  }),
)

const proposalIconMap = {
  ENTRY_DISCIPLINE: 'shield-check',
  LOSS_CONTROL: 'activity',
  POSITION_SIZING: 'chart-pie',
  EVIDENCE_DISCIPLINE: 'search',
}

function normalizeProposal(item) {
  const evidenceCount = item.evidence?.count ?? item.evidence?.assessedTradeCount ?? 0
  return {
    ...item,
    icon: proposalIconMap[item.principleType] ?? 'target',
    sourceLabel:
      item.proposalSource === 'OPENAI_WEB_SEARCH'
        ? '웹 검색 근거 검증 제안'
        : item.proposalSource === 'OPENAI_VALIDATED'
          ? 'AI 제안 · 서버 검증 완료'
          : '분석 규칙 기반 제안',
    changeLabel: item.changeType === 'THRESHOLD_ADJUSTMENT' ? '기준 조정' : '실행력 강화',
    evidenceLabel:
      item.recommendationCode === 'THESIS_VALIDATION'
        ? `근거 검증 거래 ${evidenceCount}건`
        : `반복 패턴 ${evidenceCount}회`,
  }
}

const principleDiscoveries = computed(() =>
  (
    props.report?.principleDiscoveries ??
    props.report?.recommendedPrinciples?.filter((item) => item.proposalType === 'DISCOVERY') ??
    []
  ).map(normalizeProposal),
)

const principleReinforcements = computed(() =>
  (
    props.report?.principleReinforcements ??
    props.report?.recommendedPrinciples?.filter((item) => item.proposalType === 'REINFORCEMENT') ??
    []
  ).map(normalizeProposal),
)

const improvementMeta = {
  EMOTIONAL_TRADING: 'refresh-cw',
  JOURNAL: 'notebook',
  ASSET_ALLOCATION: 'scale',
  EVIDENCE_DISCIPLINE: 'search',
}

const improvementItems = computed(() =>
  (props.report?.improvementActions ?? []).map((item) => ({
    ...item,
    icon: improvementMeta[item.category] ?? 'settings',
    detail: item.action,
    sourceLabel: item.judgmentSource === 'OPENAI_WEB_SEARCH' ? '웹 검색 검증' : '규칙 엔진 분석',
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

const learningInsights = computed(() => props.report?.learningInsights ?? {})
const hasMistakePattern = computed(() => {
  const pattern =
    learningInsights.value.primaryMistakePattern?.trim() ||
    learningInsights.value.primaryMistakePatternLines?.join(' ').trim()
  return Boolean(pattern && !/(없습니다|없어요|발견되지|확인되지)/.test(pattern))
})
const returnComparison = computed(() => {
  const gap = principleReturn.value - actualReturn.value
  const difference = Math.abs(gap).toFixed(1)

  if (Math.abs(gap) < 0.05) {
    return {
      eyebrow: '이번 결과에서는',
      headline: '내 투자와 원칙봇의 수익률이 비슷했어요',
      description: '수익률이 비슷해도 어떤 판단이 원칙에 맞았는지는 따로 복기해요.',
      leader: 'same',
    }
  }

  if (gap > 0) {
    return {
      eyebrow: '원칙을 지켰다면',
      headline: `원칙봇 수익률이 ${difference}%p 높았어요`,
      description: '이번 결과에서는 원칙을 따른 판단이 더 나은 수익률로 이어졌어요.',
      leader: 'principle',
    }
  }

  return {
    eyebrow: '이번 결과에서는',
    headline: `내 투자 수익률이 ${difference}%p 높았어요`,
    description: '결과가 좋았더라도 당시 판단 과정이 원칙에 맞았는지는 별개로 복기해요.',
    leader: 'actual',
  }
})
const thesisOutcomeSummary = computed(() => learningInsights.value.thesisOutcomeSummary ?? null)
const reportEnrichmentStatus = computed(() => {
  const metadata = props.report?.generationMetadata ?? {}
  if (isSimulationReportEnrichmentPending(props.report)) {
    return { tone: 'pending', label: '투자 근거를 웹에서 검증하고 있어요' }
  }
  if (metadata.thesisVerificationStatus === 'COMPLETED') {
    return { tone: 'completed', label: '투자 근거 웹 검증이 완료됐어요' }
  }
  if (metadata.thesisVerificationStatus === 'PARTIAL') {
    return { tone: 'partial', label: '확인 가능한 투자 근거만 검증했어요' }
  }
  return null
})
const reportProvenance = computed(() => {
  const metadata = props.report?.generationMetadata ?? {}
  const narrativeSource =
    {
      OPENAI: 'OpenAI 설명',
      TEMPLATE_FALLBACK: '템플릿 설명',
      NOT_REQUESTED: '설명 미요청',
    }[metadata.narrativeSource] ?? '설명 출처 미확인'
  const thesisSource =
    metadata.thesisVerificationSource === 'OPENAI_WEB_SEARCH'
      ? '웹 검색 근거 검증'
      : '웹 검색 검증 없음'

  return {
    version: props.report?.reportVersion,
    judgment: metadata.judgmentSource === 'DETERMINISTIC_RULE_ENGINE' ? '규칙 엔진 판정' : null,
    narrative: narrativeSource,
    thesis: thesisSource,
  }
})

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
  const run = props.latestResult?.simulationRun ?? props.latestResult
  return run?.periodStart && run?.periodEnd
    ? `${formatDate(run.periodStart)} — ${formatDate(run.periodEnd)}`
    : ''
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

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

function formatPercent(value, absolute = false) {
  const number = Number(value ?? 0)
  const displayValue = absolute ? Math.abs(number) : number
  const prefix = !absolute && displayValue > 0 ? '+' : ''
  return `${prefix}${displayValue.toFixed(1)}%`
}

function formatSignedPercent(value) {
  const number = Number(value ?? 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`
}

function formatProposalValue(proposal, value) {
  if (value == null || Number.isNaN(Number(value))) return '설정 없음'
  if (typeof value === 'boolean') return value ? '사용' : '사용 안 함'

  const percentageRules = new Set([
    'entry.max_5day_return',
    'exit.stop_loss_rate',
    'portfolio.max_single_position_weight',
  ])
  if (percentageRules.has(proposal.targetRule)) {
    return `${(Number(value) * 100).toFixed(0)}%`
  }

  return String(value)
}

const simulationId = computed(
  () =>
    props.latestResult?.simulationRunId ??
    props.latestResult?.simulationRun?.simulationRunId ??
    null,
)

function openProposalConfirmation(proposal) {
  proposalError.value = ''
  proposalToConfirm.value = proposal
}

async function acceptProposal() {
  const proposal = proposalToConfirm.value
  if (!proposal || !simulationId.value) {
    proposalError.value = '시뮬레이션 정보를 찾지 못했어요. 결과를 다시 불러와 주세요.'
    return
  }

  applyingProposalId.value = proposal.recommendationId
  proposalError.value = ''

  try {
    await acceptSimulationPrincipleProposal(simulationId.value, proposal.recommendationId)
    appliedProposalIds.value = new Set([...appliedProposalIds.value, proposal.recommendationId])
    proposalToConfirm.value = null
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tendency.principles() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.overview() }),
    ])
  } catch (error) {
    proposalError.value =
      error?.status === 404 || error?.status === 409
        ? '최신 리포트를 다시 불러온 뒤 적용해 주세요.'
        : '원칙을 적용하지 못했어요. 잠시 후 다시 시도해 주세요.'
  } finally {
    applyingProposalId.value = null
  }
}

function goToPrinciplesEdit() {
  router.push('/tendency/principles/edit')
}
</script>

<template>
  <div
    class="result-report"
    :class="{ 'result-report--final': activeChapter === REPORT_CHAPTERS.length - 1 }"
  >
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
    <div
      v-else-if="reportEnrichmentStatus"
      class="report-enrichment-status"
      :class="`report-enrichment-status--${reportEnrichmentStatus.tone}`"
      role="status"
    >
      <AppIcon
        :name="reportEnrichmentStatus.tone === 'pending' ? 'loader-circle' : 'circle-check'"
        :size="15"
        :class="{ 'report-status__spinner': reportEnrichmentStatus.tone === 'pending' }"
      />
      <span>{{ reportEnrichmentStatus.label }}</span>
    </div>

    <nav class="chapter-tabs" aria-label="리포트 챕터">
      <button
        v-for="(chapter, index) in REPORT_CHAPTERS"
        :key="chapter.number"
        type="button"
        :class="{ active: activeChapter === index, complete: activeChapter > index }"
        :aria-current="activeChapter === index ? 'step' : undefined"
        :aria-label="`${chapter.number}. ${chapter.title}`"
        @click="goToChapter(index)"
      >
        <span>
          <AppIcon :name="chapter.icon" :size="14" />
          {{ chapter.number }}
        </span>
        <small>{{ chapter.title }}</small>
      </button>
    </nav>

    <div
      class="chapter-carousel"
      :data-chapter="activeChapter + 1"
      tabindex="0"
      aria-label="시뮬레이션 리포트"
      @keydown.left.prevent="goToChapter(activeChapter - 1)"
      @keydown.right.prevent="goToChapter(activeChapter + 1)"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <Transition :name="chapterTransitionName" mode="out-in">
        <section
          v-if="activeChapter === 0"
          key="performance"
          class="report-section performance-section"
        >
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

            <div
              v-else
              class="bar-chart"
              role="img"
              :aria-label="`${selectedMetric} 비교 막대 그래프`"
            >
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
            <div
              v-for="participant in participants"
              :key="participant.variantId"
              class="score-card"
            >
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
              <span class="actual-return-chip"
                >내 투자 {{ formatSignedPercent(actualReturn) }}</span
              >
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

        <section v-else-if="activeChapter === 1" key="emotion" class="report-section">
          <div class="section-heading">
            <span class="section-number">02</span>
            <div>
              <h2>감정적 결정 복기</h2>
              <p>결과보다, 결정이 흔들린 순간을 살펴봤어요.</p>
            </div>
          </div>

          <div class="emotion-timeline">
            <article
              v-for="(decision, index) in emotionalDecisions"
              :key="getDecisionKey(decision, index)"
              class="emotion-card"
              :class="[
                `emotion-card--${decision.tone}`,
                { 'is-expanded': expandedDecisionKey === getDecisionKey(decision, index) },
              ]"
            >
              <div class="timeline-marker"></div>
              <button
                type="button"
                class="decision-summary"
                :aria-expanded="expandedDecisionKey === getDecisionKey(decision, index)"
                @click="toggleDecision(decision, index)"
              >
                <span class="decision-summary__top">
                  <span class="decision-date">{{ decision.date }}</span>
                  <span class="emotion-tag">{{ decision.tag }}</span>
                  <span class="decision-result">{{ decision.result }}</span>
                </span>
                <span class="decision-summary__main">
                  <StockLogo :stock="decision.security" :size="36" />
                  <span class="decision-summary__identity">
                    <strong>{{ decision.stock }}</strong>
                    <small>{{ decision.actualAction }} · {{ decision.patternLabel }}</small>
                  </span>
                  <span class="decision-summary__verdict">
                    <small>원칙상</small>
                    <strong>{{ decision.recommendedAction }}</strong>
                  </span>
                  <AppIcon name="chevron-down" :size="17" class="decision-summary__chevron" />
                </span>
              </button>

              <Transition name="decision-detail">
                <div
                  v-if="expandedDecisionKey === getDecisionKey(decision, index)"
                  class="decision-detail"
                >
                  <div class="decision-core-verdict">
                    <div class="decision-core-verdict__label">
                      <AppIcon name="circle-check" :size="16" />
                      <span>{{ decision.verdictLabel }}</span>
                    </div>
                    <h3>{{ decision.conclusion }}</h3>
                    <p>{{ decision.recommendedGuidance }}</p>
                  </div>
                  <div class="decision-action-compare">
                    <div class="decision-action-compare__actual">
                      <small>실제 행동</small>
                      <strong>{{ decision.actualAction }}</strong>
                      <span v-if="decision.tradeDetail">{{ decision.tradeDetail }}</span>
                    </div>
                    <div class="decision-action-compare__divider">
                      <AppIcon name="link-2-off" :size="17" />
                    </div>
                    <div class="decision-action-compare__principle">
                      <small>원칙봇 판단</small>
                      <strong>{{ decision.recommendedAction }}</strong>
                    </div>
                  </div>
                  <dl class="decision-key-facts">
                    <div>
                      <dt>{{ decision.violatedPrinciple ? '확인된 원칙' : '판단 차이' }}</dt>
                      <dd>
                        <strong v-if="decision.violatedPrinciple">{{
                          decision.violatedPrinciple
                        }}</strong>
                        {{ decision.judgmentExplanation }}
                      </dd>
                    </div>
                    <div>
                      <dt>거래 정보</dt>
                      <dd>
                        {{ decision.tradeCostDetail || decision.tradeDetail || '거래 상세 없음' }}
                      </dd>
                    </div>
                    <div>
                      <dt>5거래일 뒤</dt>
                      <dd>
                        <strong>{{ decision.outcomeSummary }}</strong>
                      </dd>
                    </div>
                  </dl>
                  <button type="button" class="decision-to-thesis" @click="goToChapter(2)">
                    내가 적은 투자 근거가 맞았는지는 03 근거 검증에서 확인
                    <AppIcon name="arrow-right" :size="14" />
                  </button>
                </div>
              </Transition>
            </article>
          </div>
          <p v-if="!emotionalDecisions.length" class="chapter-empty">
            실제 나와 원칙봇이 유의미하게 달랐던 결정이 발견되지 않았습니다.
          </p>
        </section>

        <section v-else-if="activeChapter === 2" key="evidence" class="report-section">
          <div class="section-heading">
            <span class="section-number">03</span>
            <div>
              <h2>근거 검증</h2>
              <p>당시 믿었던 근거가 이후 실제로 확인됐는지 살펴봤어요.</p>
            </div>
          </div>

          <div class="thesis-review-list">
            <article
              v-for="(decision, index) in emotionalDecisions"
              :key="`thesis-${getDecisionKey(decision, index)}`"
              class="thesis-trade-card"
              :class="`thesis-trade-card--${decision.thesis.tone}`"
            >
              <button
                type="button"
                class="thesis-trade-summary"
                :aria-expanded="expandedThesisKey === getDecisionKey(decision, index)"
                @click="toggleThesis(decision, index)"
              >
                <StockLogo :stock="decision.security" :size="34" />
                <span class="thesis-trade-summary__identity">
                  <strong>{{ decision.stock }}</strong>
                  <small>{{ decision.actualAction }} · {{ decision.date }}</small>
                </span>
                <span class="thesis-trade-summary__verdict" :class="`is-${decision.thesis.tone}`">
                  {{ decision.thesis.displayLabel }}
                </span>
                <AppIcon
                  name="chevron-down"
                  :size="16"
                  :class="{ 'is-open': expandedThesisKey === getDecisionKey(decision, index) }"
                />
                <span class="thesis-trade-summary__reason">{{ decision.actualBasis }}</span>
              </button>

              <Transition name="decision-detail">
                <div
                  v-if="expandedThesisKey === getDecisionKey(decision, index)"
                  class="thesis-trade-detail"
                >
                  <div class="thesis-recorded-reason">
                    <span><AppIcon name="notebook" :size="14" /> 당시 내가 적은 근거</span>
                    <p>{{ decision.actualBasis }}</p>
                  </div>
                  <div class="thesis-verdict-line">
                    <AppIcon
                      :name="decision.thesis.icon"
                      :size="18"
                      :class="{ 'report-status__spinner': decision.thesis.isPending }"
                    />
                    <div>
                      <small>사후 확인 결과</small>
                      <strong>{{ decision.thesis.displayLabel }}</strong>
                      <p>{{ decision.thesis.summary }}</p>
                    </div>
                  </div>
                  <div
                    v-if="decision.thesis.claims.length"
                    class="thesis-claims thesis-claims--flat"
                  >
                    <details
                      v-for="(claim, claimIndex) in decision.thesis.claims"
                      :key="`${decision.tradeId}-claim-${claimIndex}`"
                    >
                      <summary>
                        <span>{{ claim.claim }}</span>
                        <strong>{{
                          thesisVerdictMeta[claim.status]?.label ?? claim.status
                        }}</strong>
                      </summary>
                      <p>{{ claim.evidence }}</p>
                      <ul v-if="claim.sources?.length">
                        <li v-for="source in claim.sources" :key="source.url || source.title">
                          <a
                            v-if="getSafeSourceUrl(source.url)"
                            :href="getSafeSourceUrl(source.url)"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {{ source.title }} · {{ source.publisher }}
                            <template v-if="source.publishedAt">
                              · {{ source.publishedAt }}</template
                            >
                            <AppIcon name="arrow-up-right" :size="12" />
                          </a>
                          <span v-else>
                            {{ source.title }} · {{ source.publisher }}
                            <template v-if="source.publishedAt">
                              · {{ source.publishedAt }}</template
                            >
                          </span>
                        </li>
                      </ul>
                    </details>
                  </div>
                  <div class="thesis-trade-meta">
                    <span>{{ decision.outcomeSummary }}</span>
                    <span v-if="decision.thesis.checkedUntil">
                      {{ decision.thesis.checkedUntil }} 기준
                    </span>
                    <span v-if="decision.thesis.sourceCount">
                      출처 {{ decision.thesis.sourceCount }}개
                    </span>
                  </div>
                </div>
              </Transition>
            </article>
          </div>
          <p v-if="!emotionalDecisions.length" class="chapter-empty">
            검증할 실제 매매 기록이 없습니다.
          </p>
        </section>

        <section v-else-if="activeChapter === 3" key="insight" class="report-section">
          <div class="section-heading">
            <span class="section-number">04</span>
            <div>
              <h2>학습 인사이트</h2>
              <p>다음 투자를 바꿀 두 가지 핵심이에요.</p>
            </div>
          </div>

          <div class="monkey-insight-card" :class="{ 'is-clear': !hasMistakePattern }">
            <div class="monkey-insight-card__copy">
              <span class="monkey-insight-card__eyebrow">
                <AppIcon :name="hasMistakePattern ? 'triangle-alert' : 'circle-check'" :size="15" />
                원숭이의 복기 한마디
              </span>
              <h3>
                {{
                  hasMistakePattern ? mistakePatternText : '이번에는 반복된 실수 패턴이 없었어요'
                }}
              </h3>
              <p>
                {{
                  learningInsights.narrative ||
                  learningInsights.summary ||
                  '잘한 점은 남기고, 다음 투자에서도 같은 판단 과정을 이어가 보세요.'
                }}
              </p>
            </div>
            <div class="monkey-insight-card__coach">
              <SimulationParticipantAvatar variant-type="RANDOM_BOT" :size="70" />
              <span>차분히 복기해봐요</span>
            </div>
          </div>

          <div v-if="thesisOutcomeSummary" class="thesis-summary-card">
            <div>
              <AppIcon name="search" :size="18" />
              <span>투자 근거 현실화 결과</span>
              <strong>{{ thesisOutcomeSummary.assessedTradeCount }}건 검증</strong>
            </div>
            <div class="thesis-summary-card__counts">
              <span
                ><b>{{ thesisOutcomeSummary.realizedTradeCount }}</b> 실현</span
              >
              <span
                ><b>{{ thesisOutcomeSummary.partiallyRealizedTradeCount }}</b> 일부 실현</span
              >
              <span
                ><b>{{ thesisOutcomeSummary.notRealizedTradeCount }}</b> 미실현</span
              >
            </div>
            <p>{{ learningInsights.thesisNarrative }}</p>
          </div>

          <div class="return-comparison-card">
            <div class="return-comparison-card__heading">
              <span>{{ returnComparison.eyebrow }}</span>
              <strong>{{ returnComparison.headline }}</strong>
              <p>{{ returnComparison.description }}</p>
            </div>
            <div class="return-comparison-bars">
              <div :class="{ 'is-leading': returnComparison.leader === 'actual' }">
                <span>내 투자</span>
                <i :style="{ width: `${actualWidthPercent}%` }"></i>
                <b>{{ formatPercent(actualReturn) }}</b>
              </div>
              <div :class="{ 'is-leading': returnComparison.leader === 'principle' }">
                <span>원칙 봇</span>
                <i :style="{ width: `${principleWidthPercent}%` }"></i>
                <b>{{ formatPercent(principleReturn) }}</b>
              </div>
            </div>
          </div>

          <div class="report-provenance">
            <span v-if="reportProvenance.version">{{ reportProvenance.version }}</span>
            <span v-if="reportProvenance.judgment">{{ reportProvenance.judgment }}</span>
            <span>{{ reportProvenance.narrative }}</span>
            <span>{{ reportProvenance.thesis }}</span>
          </div>
        </section>

        <section v-else key="principles" class="report-section principle-section">
          <div class="section-heading">
            <span class="section-number">05</span>
            <div>
              <h2>원칙 진화</h2>
              <p>반복된 행동에서 새 원칙을 발굴하고 기존 원칙을 강화했어요.</p>
            </div>
          </div>

          <div class="proposal-counts">
            <span>새 원칙 {{ principleDiscoveries.length }}개</span>
            <span>강화 제안 {{ principleReinforcements.length }}개</span>
          </div>

          <section class="proposal-group">
            <div class="proposal-group__heading">
              <div><AppIcon name="sparkles" :size="16" /><strong>원칙 발굴</strong></div>
              <small>현재 원칙에 없던 새 실행 기준</small>
            </div>
            <div class="proposal-list">
              <article
                v-for="proposal in principleDiscoveries"
                :key="proposal.recommendationId"
                class="proposal-card proposal-card--discovery"
              >
                <div class="proposal-card__meta">
                  <span>새 원칙</span>
                  <small>{{ proposal.sourceLabel }}</small>
                </div>
                <div class="proposal-card__title">
                  <span><AppIcon :name="proposal.icon" :size="18" /></span>
                  <div>
                    <strong>{{ proposal.title }}</strong>
                    <p>{{ proposal.description }}</p>
                  </div>
                </div>
                <div class="proposal-facts">
                  <span>{{ proposal.evidenceLabel }}</span>
                  <span>{{ proposal.targetRule }}</span>
                  <strong>{{ formatProposalValue(proposal, proposal.proposedValue) }}</strong>
                </div>
                <p v-if="proposal.narrative" class="proposal-narrative">{{ proposal.narrative }}</p>
                <button
                  type="button"
                  :disabled="appliedProposalIds.has(proposal.recommendationId)"
                  @click="openProposalConfirmation(proposal)"
                >
                  <AppIcon
                    :name="
                      appliedProposalIds.has(proposal.recommendationId) ? 'circle-check' : 'plus'
                    "
                    :size="15"
                  />
                  {{
                    appliedProposalIds.has(proposal.recommendationId)
                      ? '적용 완료'
                      : '새 원칙으로 추가'
                  }}
                </button>
              </article>
            </div>
            <p v-if="!principleDiscoveries.length" class="proposal-empty">
              새로 추가할 만큼 반복적인 행동 패턴이 발견되지 않았습니다.
            </p>
          </section>

          <section class="proposal-group">
            <div class="proposal-group__heading">
              <div><AppIcon name="shield-check" :size="16" /><strong>원칙 강화</strong></div>
              <small>기존 원칙을 행동 패턴에 맞게 보완</small>
            </div>
            <div class="proposal-list">
              <article
                v-for="proposal in principleReinforcements"
                :key="proposal.recommendationId"
                class="proposal-card proposal-card--reinforcement"
              >
                <div class="proposal-card__meta">
                  <span>{{ proposal.changeLabel }}</span>
                  <small>{{ proposal.sourceLabel }}</small>
                </div>
                <strong class="source-principle">
                  {{ proposal.sourcePrincipleText || proposal.title }}
                </strong>
                <div class="proposal-change">
                  <div>
                    <small>현재 기준</small>
                    <strong>{{ formatProposalValue(proposal, proposal.currentValue) }}</strong>
                  </div>
                  <AppIcon name="arrow-right" :size="17" />
                  <div>
                    <small>강화 기준</small>
                    <strong>{{ formatProposalValue(proposal, proposal.proposedValue) }}</strong>
                  </div>
                </div>
                <p class="proposal-description">{{ proposal.description }}</p>
                <div class="proposal-facts">
                  <span>{{ proposal.evidenceLabel }}</span>
                  <span>{{ proposal.targetRule }}</span>
                </div>
                <button
                  type="button"
                  :disabled="appliedProposalIds.has(proposal.recommendationId)"
                  @click="openProposalConfirmation(proposal)"
                >
                  <AppIcon
                    :name="
                      appliedProposalIds.has(proposal.recommendationId)
                        ? 'circle-check'
                        : 'shield-check'
                    "
                    :size="15"
                  />
                  {{
                    appliedProposalIds.has(proposal.recommendationId)
                      ? '적용 완료'
                      : '이 기준으로 강화'
                  }}
                </button>
              </article>
            </div>
            <p v-if="!principleReinforcements.length" class="proposal-empty">
              강화가 필요한 반복 위반이나 기준 공백이 발견되지 않았습니다.
            </p>
          </section>

          <div class="improvement-box">
            <div class="improvement-title">
              <AppIcon name="settings" :size="17" />
              <strong>함께 수정하면 좋은 요소</strong>
            </div>
            <div v-for="item in improvementItems" :key="item.title" class="improvement-row">
              <AppIcon :name="item.icon" :size="16" />
              <p>
                <strong>{{ item.title }}</strong
                ><small>{{ item.sourceLabel }}</small
                ><span>{{ item.detail }}</span>
                <span v-if="item.narrative">{{ item.narrative }}</span>
              </p>
            </div>
          </div>
        </section>
      </Transition>
    </div>

    <nav class="chapter-controls" aria-label="챕터 이동">
      <button
        type="button"
        :disabled="activeChapter === 0"
        aria-label="이전 챕터"
        @click="goToChapter(activeChapter - 1)"
      >
        <AppIcon name="chevron-left" :size="18" />
        이전
      </button>
      <div>
        <span>{{ REPORT_CHAPTERS[activeChapter].number }}</span>
        <i
          v-for="(_, index) in REPORT_CHAPTERS"
          :key="index"
          :class="{ active: index === activeChapter }"
        ></i>
        <span>{{ REPORT_CHAPTERS.at(-1).number }}</span>
      </div>
      <button
        type="button"
        :disabled="activeChapter === REPORT_CHAPTERS.length - 1"
        aria-label="다음 챕터"
        @click="goToChapter(activeChapter + 1)"
      >
        다음
        <AppIcon name="chevron-right" :size="18" />
      </button>
    </nav>

    <div v-if="activeChapter === REPORT_CHAPTERS.length - 1" class="action-buttons">
      <BaseButton variant="primary" full-width @click="goToPrinciplesEdit">
        내 원칙 관리하기
        <AppIcon name="arrow-right" :size="17" />
      </BaseButton>
      <BaseButton variant="ghost" full-width @click="emit('restart')">
        <AppIcon name="rotate-ccw" :size="16" />
        다시 시뮬레이션하기
      </BaseButton>
    </div>

    <div
      v-if="proposalToConfirm"
      class="proposal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      @click.self="proposalToConfirm = null"
    >
      <div class="proposal-modal__panel">
        <span class="proposal-modal__icon">
          <AppIcon :name="proposalToConfirm.icon" :size="20" />
        </span>
        <small>
          {{ proposalToConfirm.proposalType === 'DISCOVERY' ? '새 원칙 추가' : '기존 원칙 강화' }}
        </small>
        <h3 id="proposal-modal-title">{{ proposalToConfirm.title }}</h3>
        <p>{{ proposalToConfirm.description }}</p>
        <div class="proposal-modal__value">
          <template v-if="proposalToConfirm.proposalType === 'REINFORCEMENT'">
            <span>{{
              formatProposalValue(proposalToConfirm, proposalToConfirm.currentValue)
            }}</span>
            <AppIcon name="arrow-right" :size="16" />
          </template>
          <strong>{{
            formatProposalValue(proposalToConfirm, proposalToConfirm.proposedValue)
          }}</strong>
        </div>
        <p v-if="proposalError" class="proposal-modal__error">{{ proposalError }}</p>
        <div class="proposal-modal__actions">
          <BaseButton
            variant="ghost"
            :disabled="applyingProposalId != null"
            @click="proposalToConfirm = null"
          >
            취소
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="applyingProposalId != null"
            @click="acceptProposal"
          >
            {{ applyingProposalId != null ? '적용 중...' : '확인하고 적용' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-report {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0;
  padding-bottom: 32px;
  color: #263a43;
}

.result-report--final {
  padding-bottom: 140px;
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

.report-enrichment-status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 16px 10px;
  padding: 9px 11px;
  border: 1px solid #d8e8e6;
  border-radius: 10px;
  background: #f3faf9;
  color: #28716f;
  font-size: var(--font-size-caption);
  font-weight: 750;
}

.report-enrichment-status--partial {
  border-color: #eadfbd;
  background: #fffaf0;
  color: #8b6b22;
}

.chapter-tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(64px, 1fr));
  gap: 6px;
  margin: 2px 0 12px;
  padding: 5px;
  overflow-x: auto;
  border: 1px solid #e0e8ea;
  border-radius: 16px;
  background: #f5f8f8;
  scrollbar-width: none;
}

.chapter-tabs::-webkit-scrollbar {
  display: none;
}

.chapter-tabs button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 5px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #8a999e;
  font: inherit;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.chapter-tabs button > span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.chapter-tabs button small {
  overflow: hidden;
  max-width: 100%;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-tabs button.complete {
  color: #4e7777;
}

.chapter-tabs button.active {
  background: #fff;
  color: #087f7c;
  box-shadow: 0 3px 12px rgb(40 75 78 / 10%);
}

.chapter-tabs button:focus-visible,
.chapter-controls button:focus-visible,
.chapter-carousel:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.chapter-carousel {
  position: relative;
  overflow: hidden;
  border: 1px solid #dfe8ea;
  border-radius: 22px;
  background: radial-gradient(circle at 100% 0%, rgb(11 143 139 / 8%), transparent 165px), #fff;
  box-shadow: 0 12px 30px rgb(50 79 85 / 8%);
  touch-action: pan-y;
}

.chapter-carousel[data-chapter='2'] {
  background: radial-gradient(circle at 100% 0%, rgb(240 122 98 / 9%), transparent 165px), #fff;
}

.chapter-carousel[data-chapter='3'] {
  background: radial-gradient(circle at 100% 0%, rgb(213 164 61 / 10%), transparent 165px), #fff;
}

.chapter-carousel[data-chapter='4'] {
  background: radial-gradient(circle at 100% 0%, rgb(123 131 213 / 9%), transparent 165px), #fff;
}

.chapter-carousel[data-chapter='5'] {
  background: radial-gradient(circle at 100% 0%, rgb(11 143 139 / 10%), transparent 165px), #fff;
}

.chapter-carousel .report-section {
  min-height: 520px;
  padding: 22px 18px 24px;
  border: 0;
}

.chapter-slide-next-enter-active,
.chapter-slide-next-leave-active,
.chapter-slide-prev-enter-active,
.chapter-slide-prev-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.chapter-slide-next-enter-from,
.chapter-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(48px);
}

.chapter-slide-next-leave-to,
.chapter-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-48px);
}

.chapter-controls {
  display: grid;
  grid-template-columns: 88px 1fr 88px;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.chapter-controls button {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid #dce5e7;
  border-radius: 12px;
  background: #fff;
  color: #465e66;
  font: inherit;
  font-size: var(--font-size-caption);
  font-weight: 800;
  cursor: pointer;
}

.chapter-controls button:disabled {
  opacity: 0.35;
  cursor: default;
}

.chapter-controls > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.chapter-controls > div span {
  color: #87969c;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
}

.chapter-controls > div i {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #cfd9dc;
  transition:
    width 0.2s ease,
    background 0.2s ease;
}

.chapter-controls > div i.active {
  width: 18px;
  background: #0b8f8b;
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
  padding: 0;
  overflow: hidden;
  border: 1px solid #e4eaec;
  border-radius: 14px;
  background: #fff;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.emotion-card.is-expanded {
  border-color: #cbdedd;
  box-shadow: 0 10px 24px rgb(42 73 78 / 8%);
}

.decision-summary {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.decision-summary:hover {
  background: #fbfcfc;
}

.decision-summary:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: -3px;
}

.decision-summary__top,
.decision-summary__main {
  display: flex;
  width: 100%;
  align-items: center;
}

.decision-summary__top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px;
}

.decision-summary__main {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto 17px;
  gap: 8px;
}

.decision-summary__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.decision-summary__identity strong {
  overflow: hidden;
  font-size: var(--font-size-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.decision-summary__identity small {
  color: #7e8f95;
  font-size: var(--font-size-caption);
}

.decision-summary__verdict {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.decision-summary__verdict small {
  color: #7c8f92;
  font-size: 9px;
}

.decision-summary__verdict strong {
  color: #087f7c;
  font-size: var(--font-size-caption);
  text-align: right;
}

.decision-summary__chevron {
  color: #89999e;
  transition: transform 0.2s ease;
}

.is-expanded .decision-summary__chevron {
  transform: rotate(180deg);
}

.decision-detail {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 18px 14px;
  border-top: 1px solid #edf1f2;
}

.decision-detail > :first-child {
  margin-top: 0;
}

.decision-core-verdict {
  padding: 16px 2px 14px;
  border-bottom: 1px solid #e9eff0;
}

.decision-core-verdict__label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #087f7c;
  font-size: 10px;
  font-weight: 850;
}

.decision-core-verdict h3 {
  margin: 7px 0 5px;
  color: #294b50;
  font-size: 17px;
  line-height: 1.45;
}

.decision-core-verdict p {
  margin: 0;
  color: #6d7f84;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.decision-action-compare {
  display: grid;
  grid-template-columns: 1fr 28px 1fr;
  align-items: center;
  gap: 8px;
  padding: 14px 2px;
  border-bottom: 1px solid #e9eff0;
}

.decision-action-compare > div:not(.decision-action-compare__divider) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.decision-action-compare__principle {
  text-align: right;
}

.decision-action-compare small,
.decision-action-compare span {
  color: #849399;
  font-size: 9px;
}

.decision-action-compare strong {
  color: #314d53;
  font-size: var(--font-size-body);
}

.decision-action-compare__principle strong {
  color: #087f7c;
}

.decision-action-compare__divider {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: #f3f6f6;
  color: #d66c5c;
}

.decision-key-facts {
  margin: 0;
}

.decision-key-facts > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  padding: 11px 2px;
  border-bottom: 1px solid #edf1f2;
}

.decision-key-facts dt {
  color: #7c8e93;
  font-size: 10px;
  font-weight: 750;
}

.decision-key-facts dd {
  margin: 0;
  color: #61757a;
  font-size: var(--font-size-caption);
  line-height: 1.5;
}

.decision-key-facts dd strong {
  display: block;
  margin-bottom: 2px;
  color: #36565b;
}

.decision-to-thesis {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 2px 0;
  border: 0;
  background: transparent;
  color: #087f7c;
  font: inherit;
  font-size: 10px;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
}

.decision-to-thesis:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 3px;
}

.thesis-review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.thesis-trade-card {
  overflow: hidden;
  border: 1px solid #dde6e7;
  border-radius: 14px;
  background: #fff;
}

.thesis-trade-card--realized {
  border-color: #cfe4df;
}

.thesis-trade-card--partial {
  border-color: #e9dfc6;
}

.thesis-trade-card--not-realized {
  border-color: #edd6d1;
}

.thesis-trade-summary {
  display: grid;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 8px;
  padding: 13px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.thesis-trade-summary:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: -3px;
}

.thesis-trade-summary__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.thesis-trade-summary__identity strong {
  overflow: hidden;
  color: #2f4850;
  font-size: var(--font-size-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thesis-trade-summary__identity small {
  color: #849398;
  font-size: 10px;
}

.thesis-trade-summary__verdict {
  max-width: 128px;
  padding: 4px 7px;
  border-radius: 999px;
  background: #eef7f5;
  color: #087f7c;
  font-size: 9px;
  font-weight: 800;
  text-align: center;
}

.thesis-trade-summary__verdict.is-partial {
  background: #fff7e8;
  color: #9a741f;
}

.thesis-trade-summary__verdict.is-not-realized {
  background: #fff0ed;
  color: #c45d4c;
}

.thesis-trade-summary > .app-icon {
  color: #87979c;
  transition: transform 0.2s ease;
}

.thesis-trade-summary > .app-icon.is-open {
  transform: rotate(180deg);
}

.thesis-trade-summary__reason {
  display: -webkit-box;
  grid-column: 2 / -1;
  overflow: hidden;
  color: #687b80;
  font-size: var(--font-size-caption);
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.thesis-trade-detail {
  padding: 0 14px 14px;
  border-top: 1px solid #edf1f2;
}

.thesis-recorded-reason,
.thesis-verdict-line {
  padding: 13px 0;
  border-bottom: 1px solid #edf1f2;
}

.thesis-recorded-reason > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #526a70;
  font-size: 10px;
  font-weight: 800;
}

.thesis-recorded-reason p,
.thesis-verdict-line p {
  margin: 7px 0 0;
  color: #66797e;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.thesis-verdict-line {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 8px;
  color: #087f7c;
}

.thesis-verdict-line > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thesis-verdict-line small {
  color: #849398;
  font-size: 9px;
}

.thesis-verdict-line strong {
  color: #31565a;
  font-size: var(--font-size-caption);
}

.thesis-claims--flat {
  margin: 0;
}

.thesis-claims--flat details {
  padding: 12px 0;
  border-bottom: 1px solid #edf1f2;
  border-radius: 0;
  background: transparent;
}

.thesis-trade-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  padding-top: 11px;
  color: #7c8e93;
  font-size: 9px;
}

.decision-detail-enter-active,
.decision-detail-leave-active {
  overflow: hidden;
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.decision-detail-enter-from,
.decision-detail-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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

.decision-comparison__mismatch {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  color: #d75e50;
  text-align: center;
}

.decision-comparison__mismatch span {
  display: none;
}

.decision-basis-card,
.decision-outcome,
.thesis-review,
.decision-reminder {
  padding: 12px;
  border: 1px solid #dfe7e9;
  border-radius: 12px;
  background: #fafbfb;
}

.thesis-review {
  border-color: #d8e7e5;
  background: #f7fbfa;
}

.thesis-review--partial {
  border-color: #eadfbd;
  background: #fffaf1;
}

.thesis-review--not-realized {
  border-color: #f0d5cf;
  background: #fff8f6;
}

.thesis-review--pending {
  border-style: dashed;
}

.thesis-review__heading {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  color: #087f7c;
}

.thesis-review__heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.thesis-review__heading small,
.thesis-review__heading > span,
.thesis-review__source-count {
  color: #7d8c91;
  font-size: 9px;
}

.thesis-review__heading strong {
  color: #31575a;
  font-size: var(--font-size-caption);
}

.thesis-review > p {
  margin: 9px 0 0;
  color: #60757a;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.thesis-claims {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 10px;
}

.thesis-claims details {
  padding: 8px 9px;
  border-radius: 9px;
  background: #fff;
}

.thesis-claims summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  color: #456166;
  font-size: 10px;
  cursor: pointer;
}

.thesis-claims summary span {
  min-width: 0;
}

.thesis-claims summary strong {
  flex: none;
  color: #087f7c;
  font-size: 9px;
}

.thesis-claims details > p {
  margin: 7px 0 0;
  color: #66787d;
  font-size: 10px;
  line-height: 1.5;
}

.thesis-claims ul {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 7px 0 0;
  padding: 7px 0 0;
  border-top: 1px dashed #dce5e5;
  list-style: none;
}

.thesis-claims a,
.thesis-claims li > span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #447579;
  font-size: 9px;
  text-decoration: none;
}

.thesis-claims a:hover {
  text-decoration: underline;
}

.thesis-review__source-count {
  display: block;
  margin-top: 9px;
}

.decision-basis-card__heading,
.decision-outcome > div {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #435b63;
}

.decision-basis-card__heading strong,
.decision-outcome > div span {
  font-size: var(--font-size-caption);
  font-weight: 850;
}

.decision-basis-card > p,
.decision-basis-card__judgment p,
.decision-basis-card__narrative p,
.decision-outcome p {
  margin: 8px 0 0;
  color: #65777d;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.decision-basis-card__judgment,
.decision-basis-card__narrative {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #d6e0e2;
}

.decision-basis-card__judgment span,
.decision-basis-card__narrative span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #087f7c;
  font-size: 10px;
  font-weight: 850;
}

.decision-basis-card__judgment > strong {
  display: block;
  margin-top: 7px;
  color: #31555a;
  font-size: var(--font-size-caption);
}

.principle-rule-code {
  display: inline-block;
  margin-top: 7px;
  padding: 3px 6px;
  border-radius: 5px;
  background: #edf4f4;
  color: #718388;
  font-size: 9px;
}

.decision-basis-card__narrative span {
  color: #656dbc;
}

.decision-outcome {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 10px;
}

.decision-outcome > strong {
  color: #087f7c;
  font-size: var(--font-size-body);
}

.decision-outcome > p {
  grid-column: 1 / -1;
}

.decision-reminder {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 8px;
  border-color: #f0d9ad;
  background: #fff9ed;
  color: #a56c12;
}

.decision-reminder p {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  color: #786a52;
  font-size: var(--font-size-caption);
  line-height: 1.5;
}

.decision-reminder strong {
  color: #a56c12;
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

.decision-security,
.evidence-summary,
.evidence-action {
  display: flex;
  min-width: 0;
  align-items: center;
}

.decision-security {
  gap: 9px;
  margin: 11px 0;
}

.decision-security > div,
.evidence-action > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.decision-security strong,
.evidence-action strong {
  overflow: hidden;
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.decision-security span,
.evidence-action small {
  color: #849399;
  font-size: 10px;
}

.decision-verdict {
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #bfe2df;
  border-radius: 12px;
  background: linear-gradient(145deg, #edf9f7, #f5fbfa);
}

.decision-verdict > div {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  color: #087f7c;
}

.decision-verdict > div span {
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.02em;
}

.decision-verdict > strong {
  display: block;
  color: #244b4d;
  font-size: var(--font-size-body);
  line-height: 1.45;
}

.decision-verdict > p {
  margin: 6px 0 0;
  color: #71878a;
  font-size: 10px;
  line-height: 1.5;
}

.decision-verdict > .decision-verdict__guidance {
  margin-top: 4px;
  color: #3f6266;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.decision-comparison {
  display: grid;
  grid-template-columns: 1fr 16px 1fr;
  align-items: center;
  gap: 7px;
}

.decision-comparison > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 10px;
  background: #f6f8f9;
}

.decision-comparison > div:last-child {
  position: relative;
  background: #eff9f8;
}

.decision-comparison small {
  color: #849399;
  font-size: 10px;
}

.decision-comparison strong {
  font-size: var(--font-size-caption);
}

.decision-comparison > div:first-child > span {
  color: #829096;
  font-size: 9px;
}

.decision-comparison__principle > span {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 2px 5px;
  border-radius: 999px;
  background: #0b8f8b;
  color: #fff;
  font-size: 8px;
  font-weight: 800;
}

.decision-comparison > .app-icon {
  color: #9eaaae;
}

.review-details {
  margin-top: 9px;
  border-top: 1px solid #e8edef;
}

.review-details summary {
  padding-top: 9px;
  color: #527075;
  font-size: var(--font-size-caption);
  font-weight: 750;
  cursor: pointer;
}

.review-details p {
  margin: 8px 0 0;
  color: #607178;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.review-details .review-narrative {
  padding: 8px;
  border-radius: 8px;
  background: #f5f8f8;
}

.basis-comparison {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 9px;
}

.basis-comparison > div {
  padding: 10px;
  border-left: 3px solid #cbd5d8;
  border-radius: 8px;
  background: #f6f8f9;
}

.basis-comparison > .basis-comparison__principle {
  border-left-color: #45aaa6;
  background: #eff9f8;
}

.basis-comparison > .basis-comparison__narrative {
  border-left-color: #8a91d2;
  background: #f3f3fb;
}

.basis-comparison span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #566b72;
  font-size: 10px;
  font-weight: 850;
}

.basis-comparison__principle span {
  color: #087f7c;
}

.basis-comparison__narrative span {
  color: #656dbc;
}

.basis-comparison p {
  margin-top: 6px;
  color: #607178;
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

.evidence-summary {
  justify-content: space-between;
  gap: 8px;
  margin-top: 11px;
}

.evidence-action {
  gap: 8px;
}

.basis-type {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: #e8f5f3;
  color: #087f7c;
  font-size: 10px;
  font-weight: 800;
}

.basis-type.empty {
  background: #f0f2f3;
  color: #7d898e;
}

.evidence-brief {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 10px;
}

.evidence-brief > div {
  min-width: 0;
  padding: 9px;
  border-radius: 10px;
  background: #f6f8f9;
}

.evidence-brief small {
  display: block;
  margin-bottom: 4px;
  color: #8b989d;
  font-size: 10px;
}

.evidence-brief p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: var(--font-size-caption);
  font-weight: 700;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.evidence-brief strong {
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.missing-basis-notice {
  margin: 8px 0 0;
  color: #7c898e;
  font-size: 10px;
  line-height: 1.45;
}

.chapter-empty,
.proposal-empty {
  margin: 12px 0 0;
  padding: 18px 14px;
  border: 1px dashed #d8e2e4;
  border-radius: 12px;
  background: #f8fafa;
  color: #7a8a90;
  text-align: center;
  font-size: var(--font-size-caption);
  line-height: 1.5;
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

.monkey-insight-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  gap: 12px;
  align-items: center;
  padding: 18px;
  border: 1px solid #f0ddc1;
  border-radius: 18px;
  background: #fff9ef;
}

.monkey-insight-card.is-clear {
  border-color: #cfe8e5;
  background: #f3fbfa;
}

.monkey-insight-card__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a66a16;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.monkey-insight-card.is-clear .monkey-insight-card__eyebrow {
  color: #087f7c;
}

.monkey-insight-card h3 {
  margin: 8px 0 6px;
  color: #263e45;
  font-size: 18px;
  line-height: 1.42;
  letter-spacing: -0.035em;
}

.monkey-insight-card p {
  margin: 0;
  color: #667a80;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.monkey-insight-card__coach {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.monkey-insight-card__coach span {
  color: #8a7457;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}

.thesis-summary-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid #d9e8e6;
  border-radius: 14px;
  background: #f5fbfa;
}

.thesis-summary-card > div:first-child {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #087f7c;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.thesis-summary-card > div:first-child strong {
  margin-left: auto;
}

.thesis-summary-card__counts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.thesis-summary-card__counts span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border-radius: 9px;
  background: #fff;
  color: #718186;
  font-size: 9px;
  text-align: center;
}

.thesis-summary-card__counts b {
  color: #31585b;
  font-size: var(--font-size-body);
}

.thesis-summary-card > p {
  margin: 0;
  color: #60757a;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.report-provenance {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.report-provenance span {
  padding: 4px 7px;
  border: 1px solid #e0e7e8;
  border-radius: 999px;
  color: #77868b;
  font-size: 9px;
}

.return-comparison-card {
  margin-top: 10px;
  padding: 17px;
  border: 1px solid #d6ebe8;
  border-radius: 17px;
  background: #eff9f8;
}

.return-comparison-card__heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.return-comparison-card__heading > span {
  color: #6e858b;
  font-size: var(--font-size-caption);
}

.return-comparison-card__heading > strong {
  color: #087f7c;
  font-size: 19px;
  line-height: 1.4;
  letter-spacing: -0.035em;
}

.return-comparison-card__heading > p {
  margin: 2px 0 0;
  color: #708388;
  font-size: 11px;
  line-height: 1.5;
}

.return-comparison-bars {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 15px;
}

.return-comparison-bars > div {
  display: grid;
  grid-template-columns: 44px 1fr 38px;
  align-items: center;
  gap: 6px;
}

.return-comparison-bars span {
  color: #6e858b;
  font-size: var(--font-size-caption);
}

.return-comparison-bars i {
  display: block;
  height: 7px;
  border-radius: 8px;
  background: #b5d6d4;
}

.return-comparison-bars .is-leading i {
  background: #2fa9a4;
}

.return-comparison-bars b {
  color: #53676d;
  font-size: var(--font-size-caption);
  text-align: right;
}

.return-comparison-bars .is-leading b {
  color: #087f7c;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proposal-counts {
  display: flex;
  gap: 7px;
  margin-bottom: 17px;
}

.proposal-counts span {
  padding: 5px 8px;
  border-radius: 999px;
  background: #e8f6f4;
  color: #087f7c;
  font-size: 10px;
  font-weight: 800;
}

.proposal-counts span:last-child {
  background: #f0f1fb;
  color: #656dbc;
}

.proposal-group + .proposal-group {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #e6ecee;
}

.proposal-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}

.proposal-group__heading > div {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #2f5359;
  font-size: var(--font-size-caption);
}

.proposal-group__heading > small {
  color: #8a989d;
  font-size: 10px;
}

.proposal-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.proposal-card {
  padding: 13px;
  border: 1px solid #dfe8ea;
  border-radius: 14px;
  background: #fff;
}

.proposal-card--discovery {
  border-color: #cfe8e5;
}

.proposal-card--reinforcement {
  border-color: #dddff2;
}

.proposal-card__meta,
.proposal-facts,
.proposal-change {
  display: flex;
  align-items: center;
}

.proposal-card__meta {
  justify-content: space-between;
  gap: 8px;
}

.proposal-card__meta > span {
  padding: 3px 6px;
  border-radius: 6px;
  background: #e6f6f3;
  color: #087f7c;
  font-size: 10px;
  font-weight: 800;
}

.proposal-card--reinforcement .proposal-card__meta > span {
  background: #efeffb;
  color: #656dbc;
}

.proposal-card__meta small {
  color: #8b999e;
  font-size: 9px;
}

.proposal-card__title {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 9px;
  margin-top: 11px;
}

.proposal-card__title > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  background: #edf8f6;
  color: #087f7c;
}

.proposal-card__title strong,
.source-principle {
  display: block;
  color: #31484f;
  font-size: var(--font-size-caption);
}

.proposal-card__title p,
.proposal-description,
.proposal-narrative {
  margin: 4px 0 0;
  color: #73858b;
  font-size: var(--font-size-caption);
  line-height: 1.48;
}

.proposal-facts {
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 11px;
}

.proposal-facts span,
.proposal-facts strong {
  padding: 4px 6px;
  border-radius: 6px;
  background: #f3f6f7;
  color: #64777d;
  font-size: 9px;
}

.proposal-facts strong {
  background: #e8f6f4;
  color: #087f7c;
}

.proposal-card > button {
  display: flex;
  width: 100%;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 12px;
  border: 1px solid #83c5c1;
  border-radius: 10px;
  background: #f2fbfa;
  color: #087f7c;
  font: inherit;
  font-size: var(--font-size-caption);
  font-weight: 800;
  cursor: pointer;
}

.proposal-card--reinforcement > button {
  border-color: #b8bce1;
  background: #f6f6fd;
  color: #656dbc;
}

.proposal-card > button:disabled {
  border-color: #d7e3e2;
  background: #f5f8f8;
  color: #718a89;
  cursor: default;
}

.source-principle {
  margin-top: 11px;
  line-height: 1.45;
}

.proposal-change {
  display: grid;
  grid-template-columns: 1fr 18px 1fr;
  gap: 7px;
  margin-top: 10px;
}

.proposal-change > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px;
  border-radius: 9px;
  background: #f4f6f7;
}

.proposal-change > div:last-child {
  background: #f0f1fb;
}

.proposal-change small {
  color: #89979c;
  font-size: 9px;
}

.proposal-change strong {
  color: #3d545b;
  font-size: var(--font-size-caption);
}

.proposal-change > .app-icon {
  color: #9ba8ac;
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

.improvement-row small {
  align-self: flex-start;
  padding: 2px 5px;
  border-radius: 999px;
  background: #edf6f5;
  color: #397a78;
  font-size: 8px;
  font-weight: 750;
}

.improvement-row span {
  font-size: var(--font-size-caption);
}

.proposal-modal {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(24 39 44 / 48%);
  backdrop-filter: blur(4px);
}

.proposal-modal__panel {
  width: min(100%, 360px);
  padding: 22px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgb(20 40 47 / 28%);
  text-align: center;
}

.proposal-modal__icon {
  display: grid;
  width: 42px;
  height: 42px;
  margin: 0 auto 10px;
  place-items: center;
  border-radius: 13px;
  background: #e8f6f4;
  color: #087f7c;
}

.proposal-modal__panel > small {
  color: #0b8f8b;
  font-size: 10px;
  font-weight: 800;
}

.proposal-modal__panel h3 {
  margin: 5px 0 7px;
  font-size: var(--font-size-body);
}

.proposal-modal__panel > p {
  margin: 0;
  color: #74868c;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.proposal-modal__value {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 15px 0;
  padding: 12px;
  border-radius: 11px;
  background: #f3f8f8;
}

.proposal-modal__value span {
  color: #87959a;
  text-decoration: line-through;
}

.proposal-modal__value strong {
  color: #087f7c;
}

.proposal-modal__panel > .proposal-modal__error {
  margin-bottom: 10px;
  color: #c65246;
}

.proposal-modal__actions {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 7px;
  margin-top: 15px;
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
