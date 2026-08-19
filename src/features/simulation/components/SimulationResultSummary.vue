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
const selectedEvidenceSecurityKey = ref(null)
const proposalToConfirm = ref(null)
const applyingProposalId = ref(null)
const appliedProposalIds = ref(new Set())
const proposalError = ref('')

const REPORT_CHAPTERS = [
  { number: '01', title: '성과 비교', icon: 'bar-chart' },
  { number: '02', title: '원칙 복기', icon: 'activity' },
  { number: '03', title: '근거 검증', icon: 'circle-check' },
  { number: '04', title: '인사이트', icon: 'sparkles' },
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

function compactRecommendedAction(action) {
  const text = String(action ?? '').trim()

  if (/추가 매수.*(않|보류).*(기존.*보유|유지)/.test(text)) {
    return '기존 보유 유지'
  }

  return text
}

function formatOutcomePercent(value) {
  if (value == null) return '-'
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  const formatted = number.toFixed(2).replace(/\.?0+$/, '')
  return `${number > 0 ? '+' : ''}${formatted}%`
}

function getPrincipleRecommendedAction(decision) {
  if (decision.matchedPrinciple?.expectedAction) {
    return compactRecommendedAction(decision.matchedPrinciple.expectedAction)
  }

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
  const outcomeReturn =
    decision.marketOutcome?.fiveTradingDays?.returnPercent ??
    decision.outcome?.priceReturnPercent ??
    decision.subsequentReturnPercent
  if (outcomeReturn == null) {
    return '사후 성과와 관계없이, 결정 당시 확인할 수 있었던 원칙을 기준으로 복기했어요.'
  }

  return `5거래일 뒤 수익률은 ${formatPercent(outcomeReturn)}였지만, 사후 수익과 별개로 당시 원칙을 기준으로 판단했어요.`
}

const principleJudgmentMeta = {
  FOLLOWED: {
    label: '원칙 준수',
    verdictLabel: '원칙을 지킨 결정',
    tone: 'followed',
    icon: 'circle-check',
    comparisonLabel: '원칙과 일치',
  },
  VIOLATED: {
    label: '원칙 위반',
    verdictLabel: '원칙을 어긴 결정',
    tone: 'violated',
    icon: 'triangle-alert',
    comparisonLabel: '원칙과 불일치',
  },
  DECISION_DIFFERENCE: {
    label: '판단 차이',
    verdictLabel: '원칙봇과 다른 결정',
    tone: 'difference',
    icon: 'arrow-left-right',
    comparisonLabel: '판단이 달랐어요',
  },
  NOT_APPLICABLE: {
    label: '적용 원칙 없음',
    verdictLabel: '원칙 적용 대상 아님',
    tone: 'unassessed',
    icon: 'minus',
    comparisonLabel: '평가 제외',
  },
  INSUFFICIENT_DATA: {
    label: '판정 자료 부족',
    verdictLabel: '아직 판단할 수 없음',
    tone: 'unassessed',
    icon: 'circle-help',
    comparisonLabel: '평가 보류',
  },
}

const reviewCaseMeta = {
  GOOD_PROCESS_GOOD_OUTCOME: {
    label: '좋은 과정 · 좋은 결과',
    description: '원칙을 지켰고 가격 결과도 유리했어요.',
    tone: 'good',
  },
  GOOD_PROCESS_BAD_OUTCOME: {
    label: '좋은 과정 · 아쉬운 결과',
    description: '결과는 불리했지만 원칙에 맞는 과정이었어요.',
    tone: 'steady',
  },
  BAD_PROCESS_LUCKY_OUTCOME: {
    label: '어긋난 과정 · 운 좋은 결과',
    description: '수익이 났어도 원칙 위반은 별도로 복기해야 해요.',
    tone: 'lucky',
  },
  BAD_PROCESS_BAD_OUTCOME: {
    label: '어긋난 과정 · 나쁜 결과',
    description: '원칙 위반과 불리한 결과가 함께 나타났어요.',
    tone: 'bad',
  },
  UNASSESSED: {
    label: '과정·결과 평가 보류',
    description: '원칙 또는 가격 데이터가 부족해 결합 판정을 보류했어요.',
    tone: 'unassessed',
  },
}

function getPrincipleReviewMeta(decision) {
  const principleReview = decision.principleReview ?? {}
  const v12Meta = principleJudgmentMeta[decision.principleJudgment]
  if (v12Meta) {
    const matchedTitle = decision.matchedPrinciple?.title
    const conclusion =
      decision.principleJudgment === 'FOLLOWED'
        ? matchedTitle
          ? `'${matchedTitle}' 원칙을 지킨 결정이었어요.`
          : '적용 가능한 원칙을 지킨 결정이었어요.'
        : decision.principleJudgment === 'VIOLATED'
          ? matchedTitle
            ? `'${matchedTitle}' 원칙을 어긴 결정이었어요.`
            : '명시적인 원칙을 어긴 결정이었어요.'
          : decision.principleJudgment === 'DECISION_DIFFERENCE'
            ? '원칙 위반은 아니지만 원칙봇과 다른 결정을 내렸어요.'
            : '연결된 원칙과 데이터가 부족해 이번 결정은 평가하지 않았어요.'

    return {
      statusLabel: v12Meta.label,
      verdictLabel: v12Meta.verdictLabel,
      conclusion,
      comparisonLabel: v12Meta.comparisonLabel,
      reminder:
        decision.matchedPrinciple?.expectedAction ||
        (decision.principleJudgment === 'DECISION_DIFFERENCE'
          ? '다음에는 원칙봇과 다른 선택을 한 이유를 근거에 함께 남겨보세요.'
          : '다음 거래에서도 적용 가능한 원칙을 먼저 확인해 보세요.'),
      tone: v12Meta.tone,
      icon: v12Meta.icon,
    }
  }

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
      tone: 'violated',
      icon: 'triangle-alert',
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
    tone: 'difference',
    icon: 'arrow-left-right',
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
  (props.report?.decisionReviews ?? props.report?.keyTradeReviews ?? []).map((decision) => {
    const security = getReportTrade(decision)
    const relatedEvidence = evidenceReviewByTradeId.value.get(String(decision.tradeId))
    const principleReview = decision.principleReview ?? {}
    const reviewMeta = getPrincipleReviewMeta(decision)
    const fiveDayOutcome = decision.marketOutcome?.fiveTradingDays ?? decision.outcome
    const twentyDayOutcome = decision.marketOutcome?.twentyTradingDays
    const outcomeReturn = fiveDayOutcome?.returnPercent ?? fiveDayOutcome?.priceReturnPercent
    const twentyDayReturn =
      twentyDayOutcome?.returnPercent ?? twentyDayOutcome?.priceReturnPercent ?? null
    const actualBasis =
      decision.decisionReason ||
      security.decisionReason ||
      relatedEvidence?.basis ||
      '이 거래에 직접 기록된 매매 근거가 없습니다.'
    const judgmentExplanation =
      decision.judgmentReason ||
      principleReview.violationReason ||
      decision.principleFeedback ||
      '원칙봇과 행동이 달랐지만 원칙 위반으로 확정할 근거는 충분하지 않았습니다.'
    const recommendedGuidance =
      decision.matchedPrinciple?.expectedAction ||
      principleReview.recommendedAction ||
      reviewMeta.reminder
    const reviewCase = reviewCaseMeta[decision.reviewCase] ?? reviewCaseMeta.UNASSESSED
    const principleSectionLabel =
      {
        FOLLOWED: '지킨 원칙',
        VIOLATED: '위반한 원칙',
        DECISION_DIFFERENCE: '판단 차이',
        NOT_APPLICABLE: '적용 원칙 없음',
        INSUFFICIENT_DATA: '판정 정보',
      }[decision.principleJudgment] ??
      (principleReview.status === 'VIOLATION_PATTERN_DETECTED' ? '위반한 원칙' : '판단 차이')
    const comparisonActionLabel = decision.matchedPrinciple
      ? '원칙상 기대 행동'
      : decision.principleJudgment === 'DECISION_DIFFERENCE'
        ? '원칙봇 행동'
        : '비교 행동'
    const principleSourceLabel =
      {
        USER_PRINCIPLE: '내가 작성한 원칙',
        DIRECT: '내가 작성한 원칙',
        TENDENCY_ANALYSIS: '투자성향 기반 원칙',
        SIMULATION_PROPOSAL: '시뮬레이션에서 제안된 원칙',
      }[decision.matchedPrinciple?.source] ?? decision.matchedPrinciple?.source

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
      tone: reviewMeta.tone,
      judgmentIcon: reviewMeta.icon,
      principleSectionLabel,
      comparisonActionLabel,
      principleSourceLabel,
      result:
        outcomeReturn == null ? '후속 데이터 부족' : `5거래일 후 ${formatPercent(outcomeReturn)}`,
      outcomeSummary:
        fiveDayOutcome?.summary ||
        (outcomeReturn == null
          ? '후속 데이터가 부족합니다.'
          : `5거래일 후 ${formatPercent(outcomeReturn)}`),
      twentyDayOutcomeSummary: twentyDayOutcome?.summary ?? '20거래일 결과가 없습니다.',
      fiveDayReturnLabel: formatOutcomePercent(outcomeReturn),
      twentyDayReturnLabel: formatOutcomePercent(twentyDayReturn),
      recommendedAction: getPrincipleRecommendedAction(decision),
      conclusion:
        decision.principleJudgment != null || principleReview.status != null
          ? reviewMeta.conclusion
          : getPrincipleDecisionConclusion(decision),
      verdictLabel: reviewMeta.verdictLabel,
      comparisonLabel: reviewMeta.comparisonLabel,
      outcomeContext: getDecisionOutcomeContext(decision),
      actualBasis,
      judgmentExplanation,
      matchedPrinciple: decision.matchedPrinciple ?? null,
      violatedPrinciple: decision.matchedPrinciple?.title ?? principleReview.violatedPrinciple,
      principleTargetRule:
        decision.matchedPrinciple?.executionRule?.targetRule ?? principleReview.targetRule,
      recommendedGuidance,
      reminder: reviewMeta.reminder,
      reviewCase,
      thesis: normalizeThesisOutcome(decision.thesisOutcome, props.report?.generationMetadata),
      distinctNarrative: getDistinctNarrative(decision.narrative, actualBasis, judgmentExplanation),
    }
  }),
)

const principleReviewSummary = computed(() => {
  const summary = props.report?.principleReviewSummary
  if (summary) return summary

  const counts = emotionalDecisions.value.reduce(
    (result, decision) => {
      const legacyStatus = decision.principleReview?.status
      if (decision.principleJudgment === 'FOLLOWED') result.followedCount += 1
      else if (
        decision.principleJudgment === 'VIOLATED' ||
        legacyStatus === 'VIOLATION_PATTERN_DETECTED'
      ) {
        result.violatedCount += 1
      } else if (
        decision.principleJudgment === 'DECISION_DIFFERENCE' ||
        legacyStatus === 'DECISION_DIFFERENCE'
      ) {
        result.decisionDifferenceCount += 1
      } else result.unassessedCount += 1
      return result
    },
    { followedCount: 0, violatedCount: 0, decisionDifferenceCount: 0, unassessedCount: 0 },
  )

  return {
    ...counts,
    assessedTradeCount: counts.followedCount + counts.violatedCount,
    totalTradeCount: emotionalDecisions.value.length,
  }
})

const principleSummaryItems = computed(() => [
  {
    key: 'followed',
    label: '원칙 준수',
    value: principleReviewSummary.value.followedCount ?? 0,
    tone: 'followed',
  },
  {
    key: 'violated',
    label: '원칙 위반',
    value: principleReviewSummary.value.violatedCount ?? 0,
    tone: 'violated',
  },
  {
    key: 'difference',
    label: '판단 차이',
    value: principleReviewSummary.value.decisionDifferenceCount ?? 0,
    tone: 'difference',
  },
  {
    key: 'unassessed',
    label: '평가 보류',
    value: principleReviewSummary.value.unassessedCount ?? 0,
    tone: 'unassessed',
  },
])

const evidenceBasisMeta = {
  FUNDAMENTAL: { label: '기업·실적', tone: 'fundamental' },
  TECHNICAL: { label: '가격·차트', tone: 'technical' },
  EVENT: { label: '뉴스·공시', tone: 'event' },
  EMOTION: { label: '감정·기대', tone: 'emotion' },
  OTHER: { label: '기타 근거', tone: 'other' },
  UNKNOWN: { label: '미분류', tone: 'unknown' },
}

const evidenceSourceMeta = {
  DATABASE: 'DB 기록 유형',
  DETERMINISTIC_KEYWORD_FALLBACK: '키워드 보조 분류',
  NOT_CLASSIFIED: '분류되지 않음',
}

const verifiabilityMeta = {
  VERIFIABLE: { label: '검증 가능', tone: 'verifiable' },
  AMBIGUOUS: { label: '조건이 모호함', tone: 'ambiguous' },
  UNVERIFIABLE: { label: '검증 어려움', tone: 'unverifiable' },
}

const webVerdictMeta = {
  PENDING: { label: '웹 확인 중', tone: 'pending', icon: 'loader-circle' },
  NOT_SELECTED: { label: '검색 대상 아님', tone: 'neutral', icon: 'minus' },
  CONFIRMED: { label: '근거 확인', tone: 'confirmed', icon: 'circle-check' },
  PARTIAL: { label: '일부 확인', tone: 'partial', icon: 'circle-help' },
  CONTRADICTED: { label: '근거와 상충', tone: 'contradicted', icon: 'triangle-alert' },
  UNCONFIRMED: { label: '확인 불가', tone: 'neutral', icon: 'circle-help' },
}

const evidenceReviews = computed(() =>
  (props.report?.evidenceReviews ?? []).map((review) => {
    const security = getReportTrade(review)
    const basisMeta = evidenceBasisMeta[review.basisType] ?? evidenceBasisMeta.UNKNOWN
    const verdictMeta = webVerdictMeta[review.webVerdict] ?? webVerdictMeta.UNCONFIRMED
    const verifiability = verifiabilityMeta[review.verifiability] ?? verifiabilityMeta.UNVERIFIABLE

    return {
      ...review,
      security,
      stock: getSecurityDisplayName(security),
      date: review.tradedAt?.slice(5, 10).replace('-', '.') ?? '',
      actionLabel: getTradeSideLabel(review.action),
      basisMeta,
      verdictMeta,
      verifiabilityMeta: verifiability,
      basisSourceLabel: evidenceSourceMeta[review.basisTypeSource] ?? '분류 출처 없음',
      fiveDayOutcomeSummary:
        review.marketOutcome?.fiveTradingDays?.summary ?? '5거래일 가격 결과 없음',
      twentyDayOutcomeSummary:
        review.marketOutcome?.twentyTradingDays?.summary ?? '20거래일 가격 결과 없음',
      sources: review.sources ?? [],
    }
  }),
)

function getSecurityEvidenceKey(group) {
  return group ? String(group.securityId ?? group.securityCode ?? group.securityName) : ''
}

const securityEvidenceReviews = computed(() => props.report?.securityEvidenceReviews ?? [])

function getGroupEvidenceReviews(group) {
  const referencedTradeIds = new Set(
    (group?.evidenceReviews ?? []).map((review) =>
      String(typeof review === 'object' ? review.tradeId : review),
    ),
  )

  return evidenceReviews.value.filter(
    (review) =>
      referencedTradeIds.has(String(review.tradeId)) ||
      String(review.securityId) === String(group?.securityId),
  )
}

const securityEvidenceCards = computed(() => {
  const groups = securityEvidenceReviews.value.map((group) => ({ ...group }))
  const groupByKey = new Map(groups.map((group) => [getSecurityEvidenceKey(group), group]))

  evidenceReviews.value.forEach((evidence) => {
    const key = getSecurityEvidenceKey(evidence)
    const existing = groupByKey.get(key)

    if (existing) {
      const evidenceIds = new Set(existing.evidenceReviews ?? [])
      evidenceIds.add(evidence.tradeId)
      existing.evidenceReviews = [...evidenceIds]
      return
    }

    const fallbackGroup = {
      securityId: evidence.securityId,
      securityCode: evidence.security?.securityCode ?? evidence.securityCode,
      securityName: evidence.stock,
      priceSeries: [],
      chartAnnotations: [],
      evidenceReviews: [evidence.tradeId],
    }
    groups.push(fallbackGroup)
    groupByKey.set(key, fallbackGroup)
  })

  return groups.map((group) => {
    const relatedEvidence = getGroupEvidenceReviews(group)
    const searchableEvidence = relatedEvidence.filter(
      (review) => review.webVerdict !== 'NOT_SELECTED',
    )
    const completedCount = searchableEvidence.filter(
      (review) => review.webVerdict !== 'PENDING',
    ).length
    const annotationTradeCount = (group.chartAnnotations ?? []).filter((annotation) =>
      ['BUY', 'ADD', 'SELL', 'REDUCE'].includes(annotation.type),
    ).length
    const tradeCount = annotationTradeCount || relatedEvidence.length
    const reviewStatusLabel =
      searchableEvidence.length === 0
        ? '검색 대상 아님'
        : searchableEvidence.some((review) => review.webVerdict === 'PENDING')
          ? '확인 중'
          : `${completedCount}/${searchableEvidence.length} 확인`

    return {
      ...group,
      evidenceCount: relatedEvidence.length,
      completedCount,
      tradeCount,
      reviewStatusLabel,
    }
  })
})

const selectedSecurityEvidence = computed(() => {
  return securityEvidenceCards.value.find(
    (group) => getSecurityEvidenceKey(group) === selectedEvidenceSecurityKey.value,
  )
})

function toggleEvidenceSecurity(group) {
  const key = getSecurityEvidenceKey(group)
  selectedEvidenceSecurityKey.value = selectedEvidenceSecurityKey.value === key ? null : key
}

const annotationMeta = {
  BUY: { label: '매수', graphLabel: '매수', color: '#0b8f8b', icon: 'plus' },
  ADD: { label: '추가 매수', graphLabel: '추매', color: '#0b8f8b', icon: 'plus' },
  SELL: { label: '매도', graphLabel: '매도', color: '#e06a58', icon: 'minus' },
  REDUCE: { label: '비중 축소', graphLabel: '축소', color: '#e06a58', icon: 'minus' },
  OUTCOME_CHECKPOINT: {
    label: '가격 평가',
    graphLabel: '평가',
    color: '#7b83d5',
    icon: 'flag',
  },
  EVIDENCE_EVENT: {
    label: '근거 자료',
    graphLabel: '근거',
    color: '#d09b27',
    icon: 'search',
  },
}

const evidencePriceChart = computed(() => {
  const series = selectedSecurityEvidence.value?.priceSeries ?? []
  if (!series.length) return { points: '', annotations: [], minPrice: 0, maxPrice: 0 }

  const prices = series.map((item) => Number(item.closePrice ?? item.price ?? 0))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice === minPrice ? 1 : maxPrice - minPrice
  const pointAt = (index, price) => ({
    x: series.length === 1 ? 150 : (index / (series.length - 1)) * 300,
    y: 106 - ((price - minPrice) / range) * 86,
  })
  const points = series
    .map((item, index) => {
      const point = pointAt(index, prices[index])
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    })
    .join(' ')
  const annotations = (selectedSecurityEvidence.value?.chartAnnotations ?? []).map((annotation) => {
    let index = series.findIndex((item) => item.date === annotation.date)
    if (index < 0) {
      const annotationTime = new Date(`${annotation.date}T00:00:00Z`).getTime()
      index = series.reduce((nearestIndex, item, itemIndex) => {
        const nearestDistance = Math.abs(
          new Date(`${series[nearestIndex].date}T00:00:00Z`).getTime() - annotationTime,
        )
        const itemDistance = Math.abs(new Date(`${item.date}T00:00:00Z`).getTime() - annotationTime)
        return itemDistance < nearestDistance ? itemIndex : nearestIndex
      }, 0)
    }
    const point = pointAt(index, prices[index])
    const meta = annotationMeta[annotation.type] ?? annotationMeta.OUTCOME_CHECKPOINT
    const graphLabel =
      annotation.type === 'OUTCOME_CHECKPOINT'
        ? annotation.label?.match(/20\s*일/) != null
          ? '20일'
          : annotation.label?.match(/5\s*일/) != null
            ? '5일'
            : meta.graphLabel
        : meta.graphLabel
    const labelWidth = Math.max(28, graphLabel.length * 8 + 12)
    const labelX = Math.min(300 - labelWidth, Math.max(0, point.x - labelWidth / 2))
    const labelY = point.y < 28 ? point.y + 9 : point.y - 20

    return {
      ...annotation,
      ...point,
      meta,
      graphLabel,
      labelWidth,
      labelX,
      labelY,
    }
  })

  return { points, annotations, minPrice, maxPrice }
})

const principleEvaluationMeta = {
  KEEP: { label: '현재 원칙 유지', shortLabel: '유지', tone: 'keep', icon: 'circle-check' },
  STRENGTHEN: {
    label: '원칙 강화 필요',
    shortLabel: '강화',
    tone: 'strengthen',
    icon: 'shield-check',
  },
  REVISE: {
    label: '원칙 재검토 필요',
    shortLabel: '재검토',
    tone: 'revise',
    icon: 'refresh-cw',
  },
  REVIEW: {
    label: '사용자 검토 필요',
    shortLabel: '검토',
    tone: 'review',
    icon: 'circle-help',
  },
  INSUFFICIENT_DATA: {
    label: '평가 데이터 부족',
    shortLabel: '데이터 부족',
    tone: 'insufficient',
    icon: 'circle-help',
  },
}

const principleEvaluations = computed(() =>
  (props.report?.principleEvaluations ?? []).map((evaluation) => ({
    ...evaluation,
    meta: principleEvaluationMeta[evaluation.verdict] ?? principleEvaluationMeta.INSUFFICIENT_DATA,
  })),
)

const principleEvaluationSummary = computed(() => {
  if (props.report?.principleEvaluationSummary) return props.report.principleEvaluationSummary

  return principleEvaluations.value.reduce(
    (summary, evaluation) => {
      summary.totalCount += 1
      if (evaluation.verdict === 'KEEP') summary.keepCount += 1
      if (evaluation.verdict === 'STRENGTHEN') summary.strengthenCount += 1
      if (evaluation.verdict === 'REVISE') summary.reviseCount += 1
      if (evaluation.verdict === 'REVIEW') summary.reviewCount += 1
      if (evaluation.verdict === 'INSUFFICIENT_DATA') summary.insufficientDataCount += 1
      return summary
    },
    {
      totalCount: 0,
      keepCount: 0,
      strengthenCount: 0,
      reviseCount: 0,
      reviewCount: 0,
      insufficientDataCount: 0,
    },
  )
})

const principleEvaluationSummaryItems = computed(() => [
  { label: '유지', count: principleEvaluationSummary.value.keepCount ?? 0, tone: 'keep' },
  {
    label: '강화',
    count: principleEvaluationSummary.value.strengthenCount ?? 0,
    tone: 'strengthen',
  },
  {
    label: '재검토',
    count:
      (principleEvaluationSummary.value.reviseCount ?? 0) +
      (principleEvaluationSummary.value.reviewCount ?? 0),
    tone: 'review',
  },
  {
    label: '데이터 부족',
    count: principleEvaluationSummary.value.insufficientDataCount ?? 0,
    tone: 'insufficient',
  },
])

const referencePrinciples = computed(() => props.report?.referencePrinciples ?? [])

function hasEvaluationOutcomes(evaluation) {
  const outcomes = evaluation.outcomes
  return (
    outcomes &&
    [
      outcomes.followed5dAveragePercent,
      outcomes.followed20dAveragePercent,
      outcomes.violated5dAveragePercent,
      outcomes.violated20dAveragePercent,
    ].some((value) => value != null)
  )
}

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
              <h2>원칙 준수 복기</h2>
              <p>전체 실제 거래를 당시 원칙과 가격 결과로 나눠 살펴봤어요.</p>
            </div>
          </div>

          <div class="principle-review-overview">
            <div class="principle-review-overview__heading">
              <span>전체 거래 {{ principleReviewSummary.totalTradeCount ?? 0 }}건</span>
              <strong>
                원칙 판단 {{ principleReviewSummary.assessedTradeCount ?? 0 }}건 완료
              </strong>
            </div>
            <div class="principle-review-counts">
              <div v-for="item in principleSummaryItems" :key="item.key" :class="`is-${item.tone}`">
                <strong>{{ item.value }}</strong>
                <span>{{ item.label }}</span>
              </div>
            </div>
            <p>
              원칙봇과 행동이 달라도 명시적인 사용자 원칙이나 실행 규칙 위반이 없으면
              <b>판단 차이</b>로 분리합니다.
            </p>
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
              <button
                type="button"
                class="decision-summary"
                :aria-expanded="expandedDecisionKey === getDecisionKey(decision, index)"
                @click="toggleDecision(decision, index)"
              >
                <span class="decision-summary__top">
                  <span class="decision-date">{{ decision.date }}</span>
                  <span class="emotion-tag" :class="`is-${decision.tone}`">
                    {{ decision.tag }}
                  </span>
                  <span class="decision-result">{{ decision.result }}</span>
                </span>
                <span class="decision-summary__main">
                  <StockLogo :stock="decision.security" :size="36" />
                  <span class="decision-summary__identity">
                    <strong>{{ decision.stock }}</strong>
                    <small>{{ decision.actualAction }} · {{ decision.patternLabel }}</small>
                  </span>
                  <AppIcon name="chevron-down" :size="17" class="decision-summary__chevron" />
                </span>
              </button>

              <Transition name="decision-detail">
                <div
                  v-if="expandedDecisionKey === getDecisionKey(decision, index)"
                  class="decision-detail"
                >
                  <div class="decision-status-line" :class="`is-${decision.tone}`">
                    <span>
                      <AppIcon :name="decision.judgmentIcon" :size="16" />
                      {{ decision.verdictLabel }}
                    </span>
                  </div>

                  <section
                    v-if="decision.matchedPrinciple"
                    class="matched-principle-card"
                    :class="`is-${decision.tone}`"
                  >
                    <div class="matched-principle-card__heading">
                      <span>{{ decision.principleSectionLabel }}</span>
                      <small v-if="decision.principleSourceLabel">
                        {{ decision.principleSourceLabel }}
                      </small>
                    </div>
                    <blockquote>
                      {{
                        decision.matchedPrinciple.principleText || decision.matchedPrinciple.title
                      }}
                    </blockquote>
                    <div class="matched-principle-card__reason">
                      <span>이렇게 판단했어요</span>
                      <p>{{ decision.judgmentExplanation }}</p>
                    </div>
                  </section>

                  <section v-else class="unmatched-principle-card">
                    <span>{{ decision.principleSectionLabel }}</span>
                    <p>{{ decision.judgmentExplanation }}</p>
                  </section>

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
                      <small>{{ decision.comparisonActionLabel }}</small>
                      <strong>{{ decision.recommendedAction }}</strong>
                    </div>
                  </div>

                  <section class="decision-outcome-card">
                    <div class="decision-outcome-card__heading">
                      <span>사후 가격 결과</span>
                      <small>원칙 판정과 별도</small>
                    </div>
                    <div class="decision-outcome-values">
                      <div>
                        <span>5거래일</span>
                        <strong>{{ decision.fiveDayReturnLabel }}</strong>
                      </div>
                      <div>
                        <span>20거래일</span>
                        <strong>{{ decision.twentyDayReturnLabel }}</strong>
                      </div>
                    </div>
                    <div class="decision-outcome-card__interpretation">
                      <span :class="`is-${decision.reviewCase.tone}`">
                        {{ decision.reviewCase.label }}
                      </span>
                      <p>{{ decision.reviewCase.description }}</p>
                    </div>
                  </section>

                  <button type="button" class="decision-to-thesis" @click="goToChapter(2)">
                    내가 적은 투자 근거가 맞았는지는 03 근거 검증에서 확인
                    <AppIcon name="arrow-right" :size="14" />
                  </button>
                </div>
              </Transition>
            </article>
          </div>
          <p v-if="!emotionalDecisions.length" class="chapter-empty">
            원칙을 복기할 실제 거래가 없습니다.
          </p>
        </section>

        <section v-else-if="activeChapter === 2" key="evidence" class="report-section">
          <div class="section-heading">
            <span class="section-number">03</span>
            <div>
              <h2>근거 검증</h2>
              <p>기록한 사실과 이후 가격 결과를 서로 섞지 않고 확인했어요.</p>
            </div>
          </div>

          <section v-if="securityEvidenceCards.length" class="security-evidence-section">
            <div class="security-evidence-section__heading">
              <div>
                <strong>종목별 근거 흐름</strong>
                <span>종목을 누르면 거래·근거·가격 평가 시점을 함께 볼 수 있어요.</span>
              </div>
              <small>{{ securityEvidenceCards.length }}개 종목</small>
            </div>

            <div class="security-evidence-accordions" aria-label="종목별 근거 검증 목록">
              <article
                v-for="group in securityEvidenceCards"
                :key="getSecurityEvidenceKey(group)"
                class="security-evidence-accordion"
                :class="{
                  'is-active':
                    getSecurityEvidenceKey(group) ===
                    getSecurityEvidenceKey(selectedSecurityEvidence),
                }"
              >
                <button
                  type="button"
                  class="security-evidence-card"
                  :aria-expanded="
                    getSecurityEvidenceKey(group) ===
                    getSecurityEvidenceKey(selectedSecurityEvidence)
                  "
                  @click="toggleEvidenceSecurity(group)"
                >
                  <StockLogo :stock="group" :size="36" />
                  <span class="security-evidence-card__identity">
                    <strong>{{ group.securityName || group.securityCode }}</strong>
                    <small>
                      {{ group.securityCode }} · 근거 {{ group.evidenceCount }}건 · 거래
                      {{ group.tradeCount }}건
                    </small>
                  </span>
                  <span class="security-evidence-card__progress">{{
                    group.reviewStatusLabel
                  }}</span>
                  <AppIcon
                    name="chevron-down"
                    :size="17"
                    :class="{
                      'is-open':
                        getSecurityEvidenceKey(group) ===
                        getSecurityEvidenceKey(selectedSecurityEvidence),
                    }"
                  />
                </button>

                <Transition name="decision-detail">
                  <div
                    v-if="
                      getSecurityEvidenceKey(group) ===
                      getSecurityEvidenceKey(selectedSecurityEvidence)
                    "
                    class="security-evidence-detail"
                  >
                    <section v-if="group.priceSeries?.length" class="security-evidence-chart">
                      <div class="security-evidence-chart__heading">
                        <div>
                          <span>가격과 주요 시점</span>
                          <strong>{{ group.securityName }}</strong>
                        </div>
                        <small>일별 종가 기준</small>
                      </div>

                      <div class="security-price-plot">
                        <span class="security-price-plot__max">
                          {{ Math.round(evidencePriceChart.maxPrice).toLocaleString() }}원
                        </span>
                        <svg
                          viewBox="0 0 300 120"
                          role="img"
                          aria-label="종목 가격과 거래 근거 이벤트"
                        >
                          <line
                            v-for="y in [20, 63, 106]"
                            :key="y"
                            x1="0"
                            :y1="y"
                            x2="300"
                            :y2="y"
                          />
                          <polyline :points="evidencePriceChart.points" />
                          <g
                            v-for="(annotation, index) in evidencePriceChart.annotations"
                            :key="`${annotation.type}-${annotation.date}-${index}`"
                          >
                            <line
                              :x1="annotation.x"
                              :y1="annotation.y"
                              :x2="annotation.x"
                              y2="112"
                              :stroke="annotation.meta.color"
                            />
                            <circle
                              :cx="annotation.x"
                              :cy="annotation.y"
                              r="5"
                              :fill="annotation.meta.color"
                            />
                            <rect
                              :x="annotation.labelX"
                              :y="annotation.labelY"
                              :width="annotation.labelWidth"
                              height="14"
                              rx="7"
                              :fill="annotation.meta.color"
                            />
                            <text
                              :x="annotation.labelX + annotation.labelWidth / 2"
                              :y="annotation.labelY + 9.5"
                              text-anchor="middle"
                            >
                              {{ annotation.graphLabel }}
                            </text>
                            <title>
                              {{ annotation.meta.label }} · {{ annotation.date }} ·
                              {{ annotation.label }}
                            </title>
                          </g>
                        </svg>
                        <span class="security-price-plot__min">
                          {{ Math.round(evidencePriceChart.minPrice).toLocaleString() }}원
                        </span>
                      </div>

                      <div class="chart-annotation-list">
                        <div
                          v-for="(annotation, index) in evidencePriceChart.annotations"
                          :key="`legend-${annotation.type}-${annotation.date}-${index}`"
                          class="chart-annotation-event"
                        >
                          <span
                            class="chart-annotation-event__icon"
                            :style="{
                              background: `${annotation.meta.color}18`,
                              color: annotation.meta.color,
                            }"
                          >
                            <AppIcon :name="annotation.meta.icon" :size="14" />
                          </span>
                          <span class="chart-annotation-event__type">
                            <b>{{ annotation.meta.label }}</b>
                            <small>{{ annotation.date.slice(5).replace('-', '.') }}</small>
                          </span>
                          <strong>{{ annotation.label }}</strong>
                        </div>
                      </div>
                    </section>

                    <div v-else class="security-price-unavailable">
                      <AppIcon name="chart-pie" :size="18" />
                      <span>이 종목은 가격 그래프 데이터가 아직 없어요.</span>
                    </div>

                    <section class="security-evidence-basis-section">
                      <div class="security-evidence-basis-section__heading">
                        <strong>내가 적은 근거</strong>
                        <span>{{ getGroupEvidenceReviews(group).length }}건</span>
                      </div>

                      <article
                        v-for="(evidence, index) in getGroupEvidenceReviews(group)"
                        :key="`group-evidence-${getDecisionKey(evidence, index)}`"
                        class="security-evidence-basis"
                      >
                        <div class="security-evidence-basis__meta">
                          <span>{{ evidence.actionLabel }} · {{ evidence.date }}</span>
                          <span
                            class="evidence-verdict-badge"
                            :class="`is-${evidence.verdictMeta.tone}`"
                          >
                            {{ evidence.verdictMeta.label }}
                          </span>
                        </div>
                        <p class="security-evidence-basis__text">{{ evidence.basis }}</p>
                        <div class="security-evidence-judgment">
                          <span>판정 설명</span>
                          <p>{{ evidence.webSummary || '아직 판정 설명이 없습니다.' }}</p>
                        </div>
                        <ul v-if="evidence.sources.length" class="security-evidence-sources">
                          <li v-for="source in evidence.sources" :key="source.url || source.title">
                            <a
                              v-if="getSafeSourceUrl(source.url)"
                              :href="getSafeSourceUrl(source.url)"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {{ source.title }} · {{ source.publisher }}
                              <AppIcon name="arrow-up-right" :size="11" />
                            </a>
                            <span v-else>{{ source.title }} · {{ source.publisher }}</span>
                          </li>
                        </ul>
                      </article>
                    </section>

                    <div class="evidence-separation-note">
                      <AppIcon name="circle-help" :size="16" />
                      <p>
                        <strong>근거 사실 판정과 수익률은 별개예요.</strong>
                        검색 자료에는 주가 수익률을 섞지 않았어요.
                      </p>
                    </div>
                  </div>
                </Transition>
              </article>
            </div>
          </section>

          <p v-if="!securityEvidenceCards.length" class="chapter-empty">
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
        </section>

        <section v-else key="principles" class="report-section principle-section">
          <div class="section-heading">
            <span class="section-number">05</span>
            <div>
              <h2>다음 원칙</h2>
              <p>시뮬레이션에 사용한 원칙을 하나씩 평가했어요.</p>
            </div>
          </div>

          <div v-if="principleEvaluations.length" class="principle-evaluation-overview">
            <div class="principle-evaluation-overview__title">
              <span><AppIcon name="notebook" :size="18" /></span>
              <div>
                <small>전체 평가</small>
                <strong
                  >{{ principleEvaluationSummary.totalCount ?? 0 }}개의 원칙을 살펴봤어요</strong
                >
              </div>
            </div>
            <div class="principle-evaluation-counts">
              <div
                v-for="item in principleEvaluationSummaryItems"
                :key="item.label"
                :class="`is-${item.tone}`"
              >
                <strong>{{ item.count }}</strong>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>

          <div v-if="principleEvaluations.length" class="principle-evaluation-list">
            <article
              v-for="evaluation in principleEvaluations"
              :key="evaluation.evaluationId"
              :class="['principle-evaluation-card', `is-${evaluation.meta.tone}`]"
            >
              <div class="principle-evaluation-card__heading">
                <span class="principle-evaluation-verdict">
                  <AppIcon :name="evaluation.meta.icon" :size="15" />
                  {{ evaluation.meta.label }}
                </span>
                <strong>{{ evaluation.principleText }}</strong>
                <p>{{ evaluation.evaluationReason }}</p>
              </div>

              <div v-if="evaluation.statistics" class="principle-evaluation-stats">
                <div>
                  <small>적용 거래</small>
                  <strong>{{ evaluation.statistics.applicableCount ?? 0 }}건</strong>
                </div>
                <div>
                  <small>원칙 준수</small>
                  <strong>{{ evaluation.statistics.followedCount ?? 0 }}건</strong>
                </div>
                <div>
                  <small>원칙 위반</small>
                  <strong>{{ evaluation.statistics.violatedCount ?? 0 }}건</strong>
                </div>
                <div v-if="evaluation.statistics.violationRatePercent != null">
                  <small>위반 비율</small>
                  <strong>{{ evaluation.statistics.violationRatePercent }}%</strong>
                </div>
              </div>

              <div v-if="hasEvaluationOutcomes(evaluation)" class="principle-evaluation-outcomes">
                <div class="principle-evaluation-outcomes__heading">
                  <strong>거래 후 결과</strong>
                  <small>매수·매도 방향을 맞춰 계산했어요</small>
                </div>
                <div class="principle-evaluation-outcomes__grid">
                  <div>
                    <span>원칙을 지킨 거래</span>
                    <p>
                      <small>5일</small>
                      <strong>{{
                        formatOutcomePercent(evaluation.outcomes.followed5dAveragePercent)
                      }}</strong>
                      <small>20일</small>
                      <strong>{{
                        formatOutcomePercent(evaluation.outcomes.followed20dAveragePercent)
                      }}</strong>
                    </p>
                  </div>
                  <div>
                    <span>원칙을 어긴 거래</span>
                    <p>
                      <small>5일</small>
                      <strong>{{
                        formatOutcomePercent(evaluation.outcomes.violated5dAveragePercent)
                      }}</strong>
                      <small>20일</small>
                      <strong>{{
                        formatOutcomePercent(evaluation.outcomes.violated20dAveragePercent)
                      }}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="evaluation.suggestion" class="principle-evaluation-suggestion">
                <span>강화될 원칙</span>
                <strong>{{ evaluation.suggestion.description }}</strong>
                <button
                  type="button"
                  :disabled="appliedProposalIds.has(evaluation.suggestion.recommendationId)"
                  @click="openProposalConfirmation(evaluation.suggestion)"
                >
                  <AppIcon
                    :name="
                      appliedProposalIds.has(evaluation.suggestion.recommendationId)
                        ? 'circle-check'
                        : 'shield-check'
                    "
                    :size="15"
                  />
                  {{
                    appliedProposalIds.has(evaluation.suggestion.recommendationId)
                      ? '적용 완료'
                      : '이 원칙으로 강화'
                  }}
                </button>
              </div>
            </article>
          </div>

          <div v-else class="proposal-empty principle-evaluation-empty">
            <AppIcon name="circle-help" :size="20" />
            <strong>평가할 원칙이 없어요</strong>
            <p>시뮬레이션에 사용된 원칙이 생기면 이곳에서 결과를 확인할 수 있어요.</p>
          </div>

          <section v-if="referencePrinciples.length" class="reference-principles">
            <div class="reference-principles__heading">
              <div>
                <AppIcon name="sparkles" :size="17" />
                <strong>비교 전략 참고</strong>
              </div>
              <p>내 원칙에 없는 비교 전략의 기준을 참고용으로 보여드려요.</p>
            </div>
            <article
              v-for="reference in referencePrinciples"
              :key="reference.referenceId"
              class="reference-principle-card"
            >
              <small>{{ reference.recommendationOrigin?.botName || '비교 전략 봇' }}</small>
              <strong>{{ reference.title }}</strong>
              <p>{{ reference.description }}</p>
              <div v-if="reference.comparisonEvidence" class="reference-principle-card__evidence">
                비교봇이 {{ reference.comparisonEvidence.botAppliedTradeCount ?? 0 }}건의 거래에
                적용한 기준이에요.
              </div>
              <em>{{ reference.disclaimer }}</em>
            </article>
          </section>
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
        <small>
          {{ proposalToConfirm.proposalType === 'DISCOVERY' ? '추가할 원칙' : '강화할 원칙' }}
        </small>
        <h3 id="proposal-modal-title">
          {{ proposalToConfirm.description || proposalToConfirm.title }}
        </h3>
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
            {{
              applyingProposalId != null
                ? '적용 중...'
                : proposalToConfirm.proposalType === 'DISCOVERY'
                  ? '원칙 추가'
                  : '원칙 강화'
            }}
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

.principle-review-overview {
  padding: 14px;
  border: 1px solid #d9e8e7;
  border-radius: 16px;
  background: linear-gradient(145deg, #f8fcfb, #fff);
}

.principle-review-overview__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #73868b;
  font-size: var(--font-size-caption);
}

.principle-review-overview__heading strong {
  color: #31565a;
}

.principle-review-counts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 12px;
}

.principle-review-counts > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 9px 4px;
  border-radius: 10px;
  background: #f1f5f5;
}

.principle-review-counts strong {
  color: #496067;
  font-size: 18px;
}

.principle-review-counts span {
  color: #77888d;
  font-size: 9px;
  white-space: nowrap;
}

.principle-review-counts .is-followed {
  background: #eaf7f3;
}

.principle-review-counts .is-followed strong {
  color: #087f7c;
}

.principle-review-counts .is-violated {
  background: #fff0ed;
}

.principle-review-counts .is-violated strong {
  color: #c65f50;
}

.principle-review-counts .is-difference {
  background: #eef2fb;
}

.principle-review-counts .is-difference strong {
  color: #6673bb;
}

.principle-review-overview > p {
  margin: 10px 0 0;
  color: #718388;
  font-size: 10px;
  line-height: 1.5;
}

.principle-review-overview > p b {
  color: #526d73;
}

.emotion-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.emotion-card--followed.is-expanded {
  border-color: #96d5cf;
}

.emotion-card--violated.is-expanded {
  border-color: #efb6ac;
}

.emotion-card--difference.is-expanded {
  border-color: #bec2eb;
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
  grid-template-columns: 36px minmax(0, 1fr) 17px;
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

.decision-status-line {
  display: flex;
  align-items: center;
  padding: 12px 2px 10px;
  font-size: 10px;
  font-weight: 850;
}

.decision-status-line > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.decision-status-line.is-followed {
  color: #087f7c;
}

.decision-status-line.is-violated {
  color: #cc5949;
}

.decision-status-line.is-difference {
  color: #626bc0;
}

.decision-status-line.is-unassessed {
  color: #73858a;
}

.matched-principle-card,
.unmatched-principle-card {
  padding: 14px;
  border: 1px solid #dfe8e9;
  border-left-width: 3px;
  border-radius: 12px;
  background: #f8fafa;
}

.matched-principle-card.is-followed {
  border-color: #b7ded9;
  background: #f2faf8;
}

.matched-principle-card.is-violated {
  border-color: #efc4bc;
  background: #fff8f6;
}

.matched-principle-card.is-difference {
  border-color: #cfd1ee;
  background: #f8f8fd;
}

.matched-principle-card__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.matched-principle-card__heading > span,
.unmatched-principle-card > span {
  color: #50666b;
  font-size: 10px;
  font-weight: 850;
}

.matched-principle-card__heading > small {
  color: #8a989d;
  font-size: 8px;
}

.matched-principle-card blockquote {
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: 9px;
  background: rgb(255 255 255 / 72%);
  color: #293f44;
  font-size: var(--font-size-body);
  font-style: normal;
  font-weight: 800;
  line-height: 1.6;
}

.matched-principle-card__reason {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #d5e0e1;
}

.matched-principle-card__reason > span {
  color: #74878c;
  font-size: 9px;
  font-weight: 800;
}

.matched-principle-card__reason > p,
.unmatched-principle-card > p {
  margin: 4px 0 0;
  color: #64777c;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.decision-action-compare {
  display: grid;
  grid-template-columns: 1fr 28px 1fr;
  align-items: center;
  gap: 8px;
  padding: 16px 2px;
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
  color: #839397;
}

.decision-outcome-card {
  padding: 14px;
  border: 1px solid #e0e7e8;
  border-radius: 12px;
  background: #fbfcfc;
}

.decision-outcome-card__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.decision-outcome-card__heading > span {
  color: #445c62;
  font-size: 10px;
  font-weight: 850;
}

.decision-outcome-card__heading > small {
  color: #929fa3;
  font-size: 8px;
}

.decision-outcome-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.decision-outcome-values > div {
  padding: 10px;
  border-radius: 9px;
  background: #f2f5f5;
}

.decision-outcome-values span {
  display: block;
  color: #839297;
  font-size: 9px;
}

.decision-outcome-values strong {
  display: block;
  margin-top: 4px;
  color: #334e54;
  font-size: var(--font-size-caption);
}

.decision-outcome-card__interpretation {
  margin-top: 10px;
}

.decision-outcome-card__interpretation > span {
  display: inline-flex;
  padding: 3px 7px;
  border-radius: 999px;
  background: #edf2f2;
  color: #667a7f;
  font-size: 9px;
  font-weight: 800;
}

.decision-outcome-card__interpretation > span.is-good,
.decision-outcome-card__interpretation > span.is-steady {
  background: #e9f7f4;
  color: #087f7c;
}

.decision-outcome-card__interpretation > span.is-lucky,
.decision-outcome-card__interpretation > span.is-bad {
  background: #fff0ed;
  color: #c65a49;
}

.decision-outcome-card__interpretation > p {
  margin: 6px 0 0;
  color: #718287;
  font-size: 10px;
  line-height: 1.45;
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

.security-evidence-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.security-evidence-section__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.security-evidence-section__heading > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.security-evidence-section__heading strong {
  color: #345359;
  font-size: var(--font-size-body);
}

.security-evidence-section__heading span,
.security-evidence-section__heading small {
  color: #829398;
  font-size: 9px;
  line-height: 1.45;
}

.security-evidence-section__heading small {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: #edf5f5;
  color: #527278;
  font-weight: 750;
}

.security-evidence-accordions {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.security-evidence-accordion {
  overflow: hidden;
  border: 1px solid #dce6e7;
  border-radius: 14px;
  background: #fff;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.security-evidence-accordion.is-active {
  border-color: #9bcfcb;
  box-shadow: 0 10px 24px rgb(44 76 80 / 7%);
}

.security-evidence-card {
  display: grid;
  width: 100%;
  grid-template-columns: 36px minmax(0, 1fr) auto 17px;
  align-items: center;
  gap: 9px;
  padding: 13px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.security-evidence-card:hover {
  background: #fbfcfc;
}

.security-evidence-card:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: -3px;
}

.security-evidence-accordion.is-active .security-evidence-card {
  background: #f4faf9;
}

.security-evidence-card__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.security-evidence-card__identity strong {
  overflow: hidden;
  color: #2f4a50;
  font-size: var(--font-size-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.security-evidence-card__identity small {
  overflow: hidden;
  color: #87979c;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.security-evidence-card__progress {
  padding: 4px 7px;
  border-radius: 999px;
  background: #eaf7f4;
  color: #087f7c;
  font-size: 8px;
  font-weight: 800;
  white-space: nowrap;
}

.security-evidence-card > .app-icon {
  color: #8b9a9f;
  transition: transform 0.2s ease;
}

.security-evidence-card > .app-icon.is-open {
  color: #0b8f8b;
  transform: rotate(180deg);
}

.security-evidence-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-top: 1px solid #e7eeee;
}

.security-evidence-chart {
  overflow: hidden;
  border: 1px solid #d9e5e5;
  border-radius: 13px;
  background: #fff;
}

.security-evidence-chart__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 14px 14px 4px;
}

.security-evidence-chart__heading > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.security-evidence-chart__heading span,
.security-evidence-chart__heading small {
  color: #87969b;
  font-size: 9px;
}

.security-evidence-chart__heading strong {
  color: #2f5055;
  font-size: var(--font-size-body);
}

.security-price-plot {
  position: relative;
  padding: 2px 34px 0;
}

.security-price-plot svg {
  display: block;
  width: 100%;
  overflow: visible;
}

.security-price-plot svg > line {
  stroke: #edf1f2;
  stroke-width: 1;
}

.security-price-plot polyline {
  fill: none;
  stroke: #0b8f8b;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
}

.security-price-plot g line {
  opacity: 0.24;
  stroke-dasharray: 3 3;
}

.security-price-plot g circle {
  stroke: #fff;
  stroke-width: 2;
}

.security-price-plot g rect {
  opacity: 0.96;
}

.security-price-plot g text {
  fill: #fff;
  font-size: 7px;
  font-weight: 800;
}

.security-price-plot__max,
.security-price-plot__min {
  position: absolute;
  left: 5px;
  color: #8a999e;
  font-size: 8px;
}

.security-price-plot__max {
  top: 14px;
}

.security-price-plot__min {
  bottom: 14px;
}

.chart-annotation-list {
  display: grid;
  gap: 0;
  padding: 4px 12px 10px;
  border-top: 1px solid #edf1f2;
}

.chart-annotation-event {
  display: grid;
  grid-template-columns: 28px 62px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #eef2f2;
}

.chart-annotation-event:last-child {
  border-bottom: 0;
}

.chart-annotation-event__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
}

.chart-annotation-event__type {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.chart-annotation-event__type b {
  color: #476268;
  font-size: 9px;
}

.chart-annotation-event__type small {
  color: #98a4a8;
  font-size: 8px;
}

.chart-annotation-event > strong {
  overflow: hidden;
  color: #65787d;
  font-size: 9px;
  font-weight: 650;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.security-price-unavailable {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border: 1px dashed #cedbdc;
  border-radius: 12px;
  background: #fafcfc;
  color: #7a8d92;
}

.security-price-unavailable span {
  font-size: 9px;
}

.security-evidence-basis-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.security-evidence-basis-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.security-evidence-basis-section__heading strong {
  color: #38565c;
  font-size: var(--font-size-caption);
}

.security-evidence-basis-section__heading span {
  color: #87979c;
  font-size: 9px;
}

.security-evidence-basis {
  padding: 13px;
  border: 1px solid #e0e8e9;
  border-radius: 12px;
  background: #fbfcfc;
}

.security-evidence-basis__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.security-evidence-basis__meta > span:first-child {
  color: #7c8e93;
  font-size: 9px;
  font-weight: 750;
}

.evidence-verdict-badge {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: #e9f7f2;
  color: #087f7c;
  font-size: 8px;
  font-weight: 850;
}

.evidence-verdict-badge.is-partial {
  background: #fff7e8;
  color: #98701c;
}

.evidence-verdict-badge.is-contradicted {
  background: #fff0ed;
  color: #c45d4c;
}

.evidence-verdict-badge.is-neutral,
.evidence-verdict-badge.is-pending {
  background: #eef2f2;
  color: #718287;
}

.security-evidence-basis__text {
  margin: 9px 0 0;
  color: #324e54;
  font-size: var(--font-size-body);
  font-weight: 750;
  line-height: 1.55;
}

.security-evidence-judgment {
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px dashed #d8e1e2;
}

.security-evidence-judgment > span {
  color: #71858a;
  font-size: 9px;
  font-weight: 800;
}

.security-evidence-judgment > p {
  margin: 5px 0 0;
  color: #66797e;
  font-size: var(--font-size-caption);
  line-height: 1.6;
}

.security-evidence-sources {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}

.security-evidence-sources a,
.security-evidence-sources span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #4e7478;
  font-size: 8px;
  line-height: 1.45;
  text-decoration: none;
}

.evidence-separation-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 11px;
  border-radius: 10px;
  background: #f1f7f8;
  color: #587078;
}

.evidence-separation-note p {
  margin: 0;
  font-size: 9px;
  line-height: 1.5;
}

.evidence-separation-note strong {
  display: block;
  color: #365b60;
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

.emotion-tag.is-followed {
  background: #e8f7f4;
  color: #087f7c;
}

.emotion-tag.is-violated {
  background: #fff0ed;
  color: #cc5949;
}

.emotion-tag.is-difference {
  background: #f0f1ff;
  color: #626bc0;
}

.emotion-tag.is-unassessed {
  background: #eef2f2;
  color: #728489;
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
.proposal-facts {
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

.proposal-card__title strong {
  display: block;
  color: #31484f;
  font-size: var(--font-size-caption);
}

.proposal-card__title p,
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

.proposal-principle-change {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: 7px;
  margin-top: 11px;
}

.proposal-principle-change > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border-radius: 9px;
  background: #f4f6f7;
}

.proposal-principle-change > div.is-proposed {
  background: #eef8f6;
}

.proposal-principle-change small {
  color: #89979c;
  font-size: 9px;
  font-weight: 750;
}

.proposal-principle-change p,
.proposal-principle-change strong {
  margin: 0;
  color: #3d545b;
  font-size: var(--font-size-caption);
  line-height: 1.5;
}

.proposal-principle-change strong {
  color: #176f6d;
}

.proposal-principle-change > .app-icon {
  align-self: center;
  justify-self: center;
  color: #9ba8ac;
  transform: rotate(90deg);
}

.proposal-facts--reinforcement {
  margin-top: 9px;
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

.principle-evaluation-overview {
  margin-bottom: 14px;
  padding: 15px;
  border: 1px solid #dce8e9;
  border-radius: 16px;
  background: linear-gradient(135deg, #f7fbfb 0%, #f8f8fc 100%);
}

.principle-evaluation-overview__title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.principle-evaluation-overview__title > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 11px;
  background: #e2f3f1;
  color: #087f7c;
}

.principle-evaluation-overview__title div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.principle-evaluation-overview__title small {
  color: #839298;
  font-size: 10px;
}

.principle-evaluation-overview__title strong {
  color: #31484f;
  font-size: var(--font-size-caption);
}

.principle-evaluation-counts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-top: 13px;
}

.principle-evaluation-counts > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 3px;
  border-radius: 10px;
  background: #eef3f4;
  color: #6f7f84;
}

.principle-evaluation-counts strong {
  font-size: var(--font-size-body);
}

.principle-evaluation-counts span {
  overflow: hidden;
  max-width: 100%;
  font-size: 9px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.principle-evaluation-counts .is-keep {
  background: #e6f6f3;
  color: #087f7c;
}

.principle-evaluation-counts .is-strengthen {
  background: #fff0eb;
  color: #cf5b41;
}

.principle-evaluation-counts .is-review {
  background: #fff6df;
  color: #a46b11;
}

.principle-evaluation-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.principle-evaluation-card {
  overflow: hidden;
  border: 1px solid #dfe7e9;
  border-radius: 16px;
  background: #fff;
}

.principle-evaluation-card__heading {
  padding: 15px;
  border-top: 3px solid #a9b6ba;
}

.principle-evaluation-card.is-keep .principle-evaluation-card__heading {
  border-top-color: #2aa39e;
}

.principle-evaluation-card.is-strengthen .principle-evaluation-card__heading {
  border-top-color: #ed765c;
}

.principle-evaluation-card.is-revise .principle-evaluation-card__heading,
.principle-evaluation-card.is-review .principle-evaluation-card__heading {
  border-top-color: #d39a37;
}

.principle-evaluation-verdict {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 9px;
  padding: 4px 7px;
  border-radius: 999px;
  background: #eff3f4;
  color: #63777d;
  font-size: 10px;
  font-weight: 800;
}

.is-keep .principle-evaluation-verdict {
  background: #e5f6f3;
  color: #087f7c;
}

.is-strengthen .principle-evaluation-verdict {
  background: #fff0eb;
  color: #cf5b41;
}

.is-revise .principle-evaluation-verdict,
.is-review .principle-evaluation-verdict {
  background: #fff6df;
  color: #a46b11;
}

.principle-evaluation-card__heading > strong {
  display: block;
  color: #263d45;
  font-size: var(--font-size-body);
  line-height: 1.45;
}

.principle-evaluation-card__heading > p {
  margin: 8px 0 0;
  color: #71848a;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.principle-evaluation-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid #e7edef;
  background: #f8fafb;
}

.principle-evaluation-stats > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 11px 3px;
}

.principle-evaluation-stats small {
  color: #8a999e;
  font-size: 9px;
}

.principle-evaluation-stats strong {
  color: #40565d;
  font-size: var(--font-size-caption);
}

.principle-evaluation-outcomes {
  padding: 13px 15px;
  border-top: 1px solid #e7edef;
}

.principle-evaluation-outcomes__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
}

.principle-evaluation-outcomes__heading strong {
  color: #40565d;
  font-size: var(--font-size-caption);
}

.principle-evaluation-outcomes__heading small {
  color: #92a0a4;
  font-size: 9px;
}

.principle-evaluation-outcomes__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.principle-evaluation-outcomes__grid > div {
  padding: 10px;
  border-radius: 10px;
  background: #f4f7f8;
}

.principle-evaluation-outcomes__grid > div:first-child {
  background: #edf8f6;
}

.principle-evaluation-outcomes__grid span {
  color: #64777d;
  font-size: 10px;
  font-weight: 750;
}

.principle-evaluation-outcomes__grid p {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  align-items: baseline;
  gap: 4px;
  margin: 7px 0 0;
}

.principle-evaluation-outcomes__grid small {
  color: #92a0a4;
  font-size: 8px;
}

.principle-evaluation-outcomes__grid strong {
  color: #344c53;
  font-size: var(--font-size-caption);
}

.principle-evaluation-suggestion {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 13px 15px 15px;
  border-top: 1px solid #cfe7e4;
  background: #f0faf8;
}

.principle-evaluation-suggestion > span {
  color: #087f7c;
  font-size: 10px;
  font-weight: 800;
}

.principle-evaluation-suggestion > strong {
  color: #28514f;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.principle-evaluation-suggestion > button {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 3px;
  border: 1px solid #77bbb6;
  border-radius: 10px;
  background: #fff;
  color: #087f7c;
  font: inherit;
  font-size: var(--font-size-caption);
  font-weight: 800;
  cursor: pointer;
}

.principle-evaluation-suggestion > button:disabled {
  border-color: #cfdedc;
  color: #718a89;
  cursor: default;
}

.principle-evaluation-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 24px 16px;
  color: #7a8c91;
  text-align: center;
}

.principle-evaluation-empty strong {
  color: #40565d;
  font-size: var(--font-size-caption);
}

.principle-evaluation-empty p {
  margin: 0;
  font-size: var(--font-size-caption);
  line-height: 1.5;
}

.reference-principles {
  margin-top: 19px;
  padding-top: 17px;
  border-top: 1px solid #e3eaec;
}

.reference-principles__heading > div {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #5862a6;
  font-size: var(--font-size-caption);
}

.reference-principles__heading > p {
  margin: 5px 0 11px;
  color: #839298;
  font-size: var(--font-size-caption);
}

.reference-principle-card {
  padding: 14px;
  border: 1px solid #dcdef0;
  border-radius: 14px;
  background: #f8f8fd;
}

.reference-principle-card + .reference-principle-card {
  margin-top: 8px;
}

.reference-principle-card > small {
  color: #737bbb;
  font-size: 9px;
  font-weight: 800;
}

.reference-principle-card > strong {
  display: block;
  margin-top: 6px;
  color: #3f486f;
  font-size: var(--font-size-caption);
}

.reference-principle-card > p {
  margin: 5px 0 0;
  color: #6f7894;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.reference-principle-card__evidence {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: #fff;
  color: #626c8c;
  font-size: 10px;
}

.reference-principle-card > em {
  display: block;
  margin-top: 9px;
  color: #9299ad;
  font-size: 9px;
  font-style: normal;
  line-height: 1.45;
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

.proposal-modal__panel > small {
  color: #0b8f8b;
  font-size: 10px;
  font-weight: 800;
}

.proposal-modal__panel h3 {
  margin: 10px 0 18px;
  color: #29464c;
  font-size: var(--font-size-body);
  line-height: 1.55;
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
