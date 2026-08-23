<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import { describeExcludedParticipants } from '@/features/simulation/utils/participantName'
import {
  buildSimulationOutcomeModel,
  SIMULATION_OUTCOME_SCENARIOS,
} from '@/features/simulation/utils/simulationOutcome'
import { buildSimulationResultMock } from '@/features/simulation/utils/simulationResultMocks'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import InfoBanner from '@/shared/components/feedback/InfoBanner.vue'
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
const route = useRoute()
const router = useRouter()
const copiedReferenceId = ref(null)
let copyFeedbackTimer = null

const mockScenarioId = computed(() => route.query.mock ?? route.params.mockId ?? null)
const mockScenario = computed(() => buildSimulationResultMock(mockScenarioId.value))
const isMockPreview = computed(() => Boolean(mockScenario.value))
const displayedLatestResult = computed(() => mockScenario.value?.latestResult ?? props.latestResult)
const displayedReport = computed(() => mockScenario.value?.report ?? props.report)
const exclusionNotice = computed(() =>
  describeExcludedParticipants(displayedLatestResult.value?.excludedParticipants),
)

onBeforeUnmount(() => {
  if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer)
})

function getReferenceId(reference, index) {
  return reference.referenceId ?? `${reference.title ?? 'reference'}-${index}`
}

async function copyReference(reference, index) {
  const copyText = [reference.title, reference.description].filter(Boolean).join('\n')

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(copyText)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = copyText
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('클립보드 복사에 실패했습니다.')
    }

    const referenceId = getReferenceId(reference, index)
    copiedReferenceId.value = referenceId
    if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = window.setTimeout(() => {
      if (copiedReferenceId.value === referenceId) copiedReferenceId.value = null
    }, 1800)
  } catch {
    copiedReferenceId.value = null
  }
}

const outcome = computed(() =>
  buildSimulationOutcomeModel({
    latestResult: displayedLatestResult.value,
    report: displayedReport.value,
  }),
)

const hasExistingPrinciples = computed(() => {
  const report = displayedReport.value ?? displayedLatestResult.value?.report
  if (Array.isArray(report?.principleEvaluations)) {
    return report.principleEvaluations.length > 0
  }

  if (Array.isArray(report?.decisionReviews)) {
    return report.decisionReviews.length > 0
  }

  const configuredPrinciples =
    displayedLatestResult.value?.ruleSchema?.principles ?? displayedLatestResult.value?.principles
  return Array.isArray(configuredPrinciples) && configuredPrinciples.length > 0
})

const principleActionLabel = computed(() =>
  hasExistingPrinciples.value ? '원칙 수정하러가기' : '원칙 등록하러가기',
)

const scenarioMeta = computed(() => {
  const violatedCount = outcome.value.reviewSummary.violatedCount
  const disciplineRate = Math.round(outcome.value.reviewSummary.disciplineRate)
  const winnerName = outcome.value.winner?.fullName ?? '비교 전략'

  const scenarios = {
    [SIMULATION_OUTCOME_SCENARIOS.ACTUAL_DISCIPLINED]: {
      tone: 'celebrate',
      eyebrow: '원칙으로 만든 1위',
      eyebrowIcon: 'sparkles',
      title: '이번 1위는 우연보다 원칙에 가까워요',
      description:
        '수익률도 앞섰고, 확인 가능한 거래에서 원칙 위반이 없었어요. 지금의 투자 기준을 그대로 이어가도 좋습니다.',
      closingTitle: '잘한 투자는 반복할 수 있어야 해요',
      closingDescription: '이번에 지킨 기준을 다음 거래에서도 같은 방식으로 적용해보세요.',
      primaryLabel: principleActionLabel.value,
    },
    [SIMULATION_OUTCOME_SCENARIOS.ACTUAL_LUCKY]: {
      tone: 'caution',
      eyebrow: '수익과 원칙은 따로 보기',
      eyebrowIcon: 'triangle-alert',
      title: `1위였지만, 원칙을 ${violatedCount}번 놓쳤어요`,
      description: `이번 수익에는 운이 따랐을 수 있어요. 확인된 거래의 원칙 준수율은 ${disciplineRate}%였습니다.`,
      closingTitle: '수익보다 먼저, 반복 가능한 기준을 남겨요',
      closingDescription: '놓친 원칙부터 보완하면 다음 결과를 운에 덜 맡길 수 있어요.',
      primaryLabel: principleActionLabel.value,
    },
    [SIMULATION_OUTCOME_SCENARIOS.PERSONAL_BOT_AHEAD]: {
      tone: 'coach',
      eyebrow: '나와 원칙 봇의 차이',
      eyebrowIcon: 'arrow-left-right',
      title: '원칙 봇이 더 잘한 순간이 있었어요',
      description:
        '실제 거래와 원칙 봇의 선택이 달랐던 시점을 모았습니다. 수익률 차이보다 어떤 기준에서 판단이 갈렸는지 확인해보세요.',
      closingTitle: '다음 회차에는 이 원칙을 더 단단하게',
      closingDescription: '차이를 만든 기준 하나부터 실제 거래에 적용해보세요.',
      primaryLabel: principleActionLabel.value,
    },
    [SIMULATION_OUTCOME_SCENARIOS.FAMOUS_STRATEGY_AHEAD]: {
      tone: 'reference',
      eyebrow: `${winnerName} 1위`,
      eyebrowIcon: 'medal',
      title: '내 원칙에 없던\n기준을 참고해보세요',
      description:
        '유명 전략의 수익률을 그대로 따라가기보다, 내 원칙이 아직 다루지 않는 판단 기준만 골라서 검토해보세요.',
      closingTitle: '좋은 전략은 복사보다 해석이 먼저예요',
      closingDescription: '추천 기준 중 내 투자 방식과 맞는 것만 원칙으로 가져오세요.',
      primaryLabel: principleActionLabel.value,
    },
    [SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK]: {
      tone: 'luck',
      eyebrow: '시장 운의 영향',
      eyebrowIcon: 'paw-print',
      title: '이 기간엔 아무렇게나 사도 벌었습니다',
      description:
        '무작위 매매가 1위였습니다. 이번 회차 수익률로는 원칙의 좋고 나쁨을 판단하지 마세요.',
      closingTitle: '이번 결과는 평가보다 보류가 맞아요',
      closingDescription:
        '시장 운의 영향을 줄이려면 다른 기간에서도 같은 원칙을 다시 확인해보세요.',
      primaryLabel: '다른 기간으로 다시 하기',
    },
    [SIMULATION_OUTCOME_SCENARIOS.UNKNOWN]: {
      tone: 'neutral',
      eyebrow: '시뮬레이션 결과',
      eyebrowIcon: 'bar-chart',
      title: '결과를 한 번 더 살펴볼까요?',
      description: '참가자별 수익률과 원칙 평가를 바탕으로 다음 거래 기준을 정리해보세요.',
      closingTitle: '결과는 다음 원칙을 위한 재료예요',
      closingDescription: '이번 회차에서 확인한 내용을 내 투자 기준에 반영해보세요.',
      primaryLabel: principleActionLabel.value,
    },
  }

  return scenarios[outcome.value.scenario] ?? scenarios[SIMULATION_OUTCOME_SCENARIOS.UNKNOWN]
})

const resultPeriod = computed(() => {
  const start =
    displayedLatestResult.value?.periodStart ??
    displayedLatestResult.value?.startDate ??
    displayedReport.value?.periodStart ??
    displayedReport.value?.startDate
  const end =
    displayedLatestResult.value?.periodEnd ??
    displayedLatestResult.value?.endDate ??
    displayedReport.value?.periodEnd ??
    displayedReport.value?.endDate

  if (!start && !end) return ''
  if (!start) return formatDate(end)
  if (!end) return formatDate(start)
  return `${formatDate(start)} – ${formatDate(end)}`
})

const keyFacts = computed(() => {
  const winnerReturn = outcome.value.winner?.cumulativeReturnPercent
  const summary = outcome.value.reviewSummary

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.ACTUAL_DISCIPLINED) {
    return [
      { label: '실제 수익률', value: formatPercent(winnerReturn), accent: true },
      { label: '원칙 위반', value: '0건' },
    ]
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.ACTUAL_LUCKY) {
    return [
      { label: '실제 수익률', value: formatPercent(winnerReturn), accent: true },
      { label: '원칙 준수율', value: `${Math.round(summary.disciplineRate)}%` },
      { label: '놓친 원칙', value: `${summary.violatedCount}건`, warning: true },
    ]
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.PERSONAL_BOT_AHEAD) {
    return [
      {
        label: '봇과 수익률 차이',
        value: formatPoint(
          (outcome.value.personalBot?.cumulativeReturnPercent ?? 0) -
            (outcome.value.actualParticipant?.cumulativeReturnPercent ?? 0),
        ),
        accent: true,
      },
      {
        label: '판단이 달랐던 순간',
        value: `${outcome.value.divergenceReview?.momentCount ?? outcome.value.divergenceMoments.length}번`,
      },
    ]
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.FAMOUS_STRATEGY_AHEAD) {
    return [
      { label: '1위 수익률', value: formatPercent(winnerReturn), accent: true },
      {
        label: '내 원칙에 없는 영역',
        value: `${outcome.value.referenceReview?.missingSectionCount ?? 0}개`,
      },
    ]
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK) {
    return [
      {
        label: '무작위 수익 확률',
        value: formatPercent(outcome.value.marketLuck?.profitableRunPercent),
      },
      { label: '무작위 실험', value: `${outcome.value.marketLuck?.runCount ?? 0}회` },
    ]
  }

  return [{ label: '1위 수익률', value: formatPercent(winnerReturn), accent: true }]
})

const rankingRange = computed(() => {
  const returns = outcome.value.ranking.map((participant) => participant.cumulativeReturnPercent)
  return {
    minimum: Math.min(...returns, 0),
    maximum: Math.max(...returns, 0),
  }
})

const missedPrinciples = computed(() => {
  const byId = new Map()

  outcome.value.improvementPrinciples.forEach((principle) => {
    byId.set(
      principle.principleSetItemId ?? principle.evaluationId ?? principle.principleText,
      principle,
    )
  })

  outcome.value.violationDecisions.forEach((decision) => {
    const key = decision.matchedPrinciple?.principleSetItemId ?? decision.principleText
    if (!byId.has(key)) {
      byId.set(key, {
        principleSetItemId: key,
        principleText: decision.principleText,
        conclusion: decision.reason,
        statistics: { violatedCount: 1 },
      })
    }
  })

  return [...byId.values()]
})

const principleNumberMap = computed(() => {
  const numbers = new Map()

  function registerPrinciple(principle) {
    const principleText =
      typeof principle === 'string'
        ? principle
        : (principle?.principleText ?? principle?.title ?? principle?.violatedPrinciple)
    if (principleText && !numbers.has(principleText)) {
      numbers.set(principleText, numbers.size + 1)
    }
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.ACTUAL_DISCIPLINED) {
    outcome.value.positivePrinciples.forEach(registerPrinciple)
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.ACTUAL_LUCKY) {
    missedPrinciples.value.forEach(registerPrinciple)
  }

  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.PERSONAL_BOT_AHEAD) {
    outcome.value.principleImpacts.forEach(registerPrinciple)
    outcome.value.divergenceMoments.forEach((moment) => {
      moment.violatedPrinciples?.forEach(registerPrinciple)
    })
  }

  return numbers
})

const referenceSections = computed(
  () => outcome.value.referenceReview?.missingSections?.slice(0, 4) ?? [],
)

const actualLuckPosition = computed(() => {
  const percentile = Number(outcome.value.marketLuck?.actualUserPercentile)
  if (!Number.isFinite(percentile)) return 50
  return Math.min(Math.max(percentile, 4), 96)
})

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatTradeDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatPercent(value, digits = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '–'
  return `${number > 0 ? '+' : ''}${number.toFixed(digits)}%`
}

function formatPoint(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '–'
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%p`
}

function getPrincipleNumber(principle) {
  const principleText =
    typeof principle === 'string'
      ? principle
      : (principle?.principleText ?? principle?.title ?? principle?.violatedPrinciple)
  return principleNumberMap.value.get(principleText) ?? 1
}

function rankingBarWidth(returnPercent) {
  const { minimum, maximum } = rankingRange.value
  const span = maximum - minimum
  if (span <= 0) return '62%'
  return `${24 + ((Number(returnPercent) - minimum) / span) * 76}%`
}

function handlePrimaryAction() {
  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK) {
    emit('restart')
    return
  }
  router.push('/tendency/principles/edit')
}

function handleSecondaryAction() {
  if (outcome.value.scenario === SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK) {
    router.push('/tendency/principles/edit')
    return
  }
  emit('restart')
}
</script>

<template>
  <main class="result-story" :class="`result-story--${scenarioMeta.tone}`">
    <section class="result-hero">
      <div class="result-hero__glow" aria-hidden="true"></div>

      <div class="result-hero__topline">
        <span class="result-hero__eyebrow">
          <AppIcon :name="scenarioMeta.eyebrowIcon" :size="15" />
          {{ scenarioMeta.eyebrow }}
        </span>
        <span v-if="resultPeriod" class="result-hero__period">{{ resultPeriod }}</span>
      </div>

      <div class="winner-portrait">
        <span class="winner-portrait__ring">
          <SimulationParticipantAvatar
            :variant-type="outcome.winner?.variantType ?? 'ACTUAL_USER'"
            :size="76"
          />
        </span>
        <span class="winner-portrait__rank">
          <AppIcon name="trophy" :size="15" />
          1위
        </span>
      </div>

      <h1>{{ scenarioMeta.title }}</h1>
      <p class="result-hero__description">{{ scenarioMeta.description }}</p>

      <div class="result-facts" :class="{ 'result-facts--three': keyFacts.length === 3 }">
        <div v-for="fact in keyFacts" :key="fact.label" class="result-fact">
          <span>{{ fact.label }}</span>
          <strong :class="{ 'is-accent': fact.accent, 'is-warning': fact.warning }">
            {{ fact.value }}
          </strong>
        </div>
      </div>
    </section>

    <InfoBanner
      v-if="exclusionNotice"
      title="일부 참가자가 이번엔 빠졌어요"
      :description="exclusionNotice"
    />

    <div v-if="reportLoading && !isMockPreview" class="report-status" role="status">
      <AppIcon name="loader-circle" :size="18" class="spin" />
      <span>거래 근거를 정리하고 있어요.</span>
    </div>
    <div
      v-else-if="reportError && !isMockPreview"
      class="report-status report-status--error"
      role="alert"
    >
      <AppIcon name="triangle-alert" :size="18" />
      <span>상세 분석을 불러오지 못했어요. 순위 결과는 그대로 확인할 수 있습니다.</span>
    </div>

    <section class="result-section ranking-section" aria-labelledby="ranking-title">
      <div class="section-heading section-heading--compact">
        <div>
          <span class="section-heading__kicker">수익률 기준</span>
          <h2 id="ranking-title">이번 회차 순위</h2>
        </div>
        <span class="section-heading__hint">같은 기간 · 같은 시작금</span>
      </div>

      <ol class="ranking-list">
        <li
          v-for="participant in outcome.ranking"
          :key="participant.variantId"
          class="ranking-row"
          :class="{ 'ranking-row--winner': participant.rank === 1 }"
        >
          <span class="ranking-row__rank">{{ participant.rank }}</span>
          <SimulationParticipantAvatar :variant-type="participant.variantType" :size="34" />
          <div class="ranking-row__body">
            <div class="ranking-row__label">
              <strong>{{ participant.fullName }}</strong>
              <span>{{ participant.tradeCount }}회 거래</span>
            </div>
            <span class="ranking-row__track">
              <span
                class="ranking-row__bar"
                :style="{
                  width: rankingBarWidth(participant.cumulativeReturnPercent),
                  backgroundColor: participant.color,
                }"
              ></span>
            </span>
          </div>
          <strong
            class="ranking-row__return"
            :class="{
              'is-positive': participant.cumulativeReturnPercent > 0,
              'is-negative': participant.cumulativeReturnPercent < 0,
            }"
          >
            {{ formatPercent(participant.cumulativeReturnPercent) }}
          </strong>
        </li>
      </ol>
    </section>

    <template v-if="outcome.scenario === SIMULATION_OUTCOME_SCENARIOS.ACTUAL_DISCIPLINED">
      <section class="result-section evidence-section" aria-labelledby="discipline-title">
        <div class="section-heading">
          <span class="section-icon"><AppIcon name="shield-check" :size="21" /></span>
          <div>
            <span class="section-heading__kicker">1위를 만든 이유</span>
            <h2 id="discipline-title">잘한 선택을 기억해두세요</h2>
          </div>
        </div>

        <div v-if="outcome.positivePrinciples.length" class="principle-stack">
          <article
            v-for="principle in outcome.positivePrinciples.slice(0, 3)"
            :key="principle.evaluationId ?? principle.principleText"
            class="principle-card principle-card--positive"
          >
            <span class="principle-card__status">
              <AppIcon name="circle-check" :size="16" />
              잘 지킨 원칙
            </span>
            <div class="principle-title-line">
              <span class="principle-index-badge"> 원칙 {{ getPrincipleNumber(principle) }} </span>
              <h3>{{ principle.principleText }}</h3>
            </div>
            <p>{{ principle.conclusion }}</p>
          </article>
        </div>
        <div v-else class="empty-evidence">
          <AppIcon name="circle-check" :size="24" />
          <div>
            <strong>확인 가능한 거래에서 원칙 위반이 없었어요</strong>
            <p>이번 투자 방식은 결과와 실행이 모두 안정적이었습니다.</p>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="outcome.scenario === SIMULATION_OUTCOME_SCENARIOS.ACTUAL_LUCKY">
      <section class="result-section evidence-section" aria-labelledby="violation-title">
        <div class="section-heading">
          <span class="section-icon"><AppIcon name="triangle-alert" :size="21" /></span>
          <div>
            <span class="section-heading__kicker">원칙 준수 점검</span>
            <h2 id="violation-title">수익 뒤에 가려진 원칙 위반</h2>
          </div>
        </div>

        <div class="discipline-meter">
          <div class="discipline-meter__copy">
            <span>확인된 거래의 원칙 준수율</span>
            <strong>{{ Math.round(outcome.reviewSummary.disciplineRate) }}%</strong>
          </div>
          <span class="discipline-meter__track">
            <span
              :style="{ width: `${Math.min(outcome.reviewSummary.disciplineRate, 100)}%` }"
            ></span>
          </span>
          <p>
            평가된 {{ outcome.reviewSummary.assessedTradeCount }}건 중
            {{ outcome.reviewSummary.violatedCount }}건에서 원칙을 놓쳤어요.
          </p>
        </div>

        <div class="principle-stack">
          <article
            v-for="principle in missedPrinciples.slice(0, 3)"
            :key="principle.evaluationId ?? principle.principleSetItemId ?? principle.principleText"
            class="principle-card principle-card--warning"
          >
            <span class="principle-card__status">
              {{ principle.statistics?.violatedCount ?? 1 }}번 놓침
            </span>
            <div class="principle-title-line">
              <span class="principle-index-badge principle-index-badge--warning">
                원칙 {{ getPrincipleNumber(principle) }}
              </span>
              <h3>{{ principle.principleText }}</h3>
            </div>
            <p>{{ principle.conclusion }}</p>
          </article>
        </div>

        <details v-if="outcome.violationDecisions.length" class="trade-details">
          <summary>
            <span>못 지킨 거래 상세</span>
            <span>{{ outcome.violationDecisions.length }}건</span>
          </summary>
          <div class="trade-details__list">
            <article
              v-for="(decision, index) in outcome.violationDecisions.slice(0, 5)"
              :key="decision.tradeId ?? `${decision.date}-${index}`"
              class="trade-evidence"
            >
              <StockLogo :stock="decision" :size="38" />
              <div>
                <div class="trade-evidence__topline">
                  <strong>{{ decision.securityName ?? '거래 종목' }}</strong>
                  <span>{{ formatTradeDate(decision.date ?? decision.tradedAt) }}</span>
                </div>
                <p>{{ decision.reason }}</p>
              </div>
            </article>
          </div>
        </details>
      </section>
    </template>

    <template v-else-if="outcome.scenario === SIMULATION_OUTCOME_SCENARIOS.PERSONAL_BOT_AHEAD">
      <section class="result-section evidence-section" aria-labelledby="difference-title">
        <div class="section-heading">
          <span class="section-icon"><AppIcon name="arrow-left-right" :size="21" /></span>
          <div>
            <span class="section-heading__kicker">투자봇이 앞선 이유</span>
            <h2 id="difference-title">어떤 원칙에서 벗어났을까요?</h2>
          </div>
        </div>

        <div v-if="outcome.principleImpacts.length" class="principle-impact-panel">
          <div class="principle-impact-panel__topline">
            <div>
              <span class="principle-impact-panel__kicker">
                <AppIcon name="triangle-alert" :size="14" />
                실제 거래에서 확인된 이탈
              </span>
              <strong>투자봇이 더 나았던 거래의 원칙</strong>
            </div>
            <span class="principle-impact-panel__count">
              {{ outcome.principleImpacts.length }}개
            </span>
          </div>

          <div class="principle-impact-list">
            <article
              v-for="impact in outcome.principleImpacts.slice(0, 3)"
              :key="impact.principleSetItemId ?? impact.principleText"
              class="principle-impact"
            >
              <div class="principle-impact__meta">
                <span>
                  <AppIcon name="circle-alert" :size="13" />
                  {{ impact.violationCount }}번 이탈
                </span>
                <span v-if="impact.botBetterCount">
                  봇이 더 나았던 거래 {{ impact.botBetterCount }}건
                </span>
              </div>
              <div class="principle-title-line">
                <span class="principle-index-badge"> 원칙 {{ getPrincipleNumber(impact) }} </span>
                <h3>{{ impact.principleText }}</h3>
              </div>
              <p>{{ impact.reason }}</p>
            </article>
          </div>

          <p class="principle-impact-panel__note">
            단순히 봇과 선택이 달랐던 거래가 아니라, 원칙 위반이 확인된 경우만 모았어요.
          </p>
        </div>
      </section>
    </template>

    <template v-else-if="outcome.scenario === SIMULATION_OUTCOME_SCENARIOS.FAMOUS_STRATEGY_AHEAD">
      <section class="result-section evidence-section" aria-labelledby="reference-title">
        <div class="section-heading">
          <span class="section-icon"><AppIcon name="notebook" :size="21" /></span>
          <div>
            <span class="section-heading__kicker">참고할 전략 기준</span>
            <h2 id="reference-title">
              {{ outcome.referenceReview?.strategyName ?? outcome.winner?.fullName }}의 기준
            </h2>
          </div>
        </div>

        <div class="reference-banner">
          <SimulationParticipantAvatar variant-type="FAMOUS_STRATEGY" :size="52" />
          <div>
            <span>내 원칙에 없던 판단 영역</span>
            <div class="section-chips">
              <span v-for="section in referenceSections" :key="section.section">
                {{ section.sectionLabel }}
              </span>
            </div>
          </div>
        </div>

        <div class="reference-list">
          <article
            v-for="(reference, index) in outcome.referenceReview?.references?.slice(0, 3) ?? []"
            :key="reference.referenceId ?? index"
            class="reference-card"
          >
            <div class="reference-card__topline">
              <span class="principle-index-badge principle-index-badge--reference">
                추천 원칙 {{ index + 1 }}
              </span>
            </div>
            <div>
              <div class="principle-title-line reference-card__title-line">
                <h3>{{ reference.title }}</h3>
                <button
                  type="button"
                  class="reference-card__copy"
                  :class="{
                    'reference-card__copy--copied':
                      copiedReferenceId === getReferenceId(reference, index),
                  }"
                  :aria-label="
                    copiedReferenceId === getReferenceId(reference, index)
                      ? '복사되었습니다'
                      : `${reference.title} 원칙 복사하기`
                  "
                  :title="
                    copiedReferenceId === getReferenceId(reference, index)
                      ? '복사되었습니다'
                      : '클립보드에 복사하기'
                  "
                  @click="copyReference(reference, index)"
                >
                  <AppIcon
                    :name="
                      copiedReferenceId === getReferenceId(reference, index) ? 'check' : 'copy'
                    "
                    :size="14"
                  />
                  <span v-if="copiedReferenceId === getReferenceId(reference, index)">
                    복사되었습니다
                  </span>
                </button>
              </div>
              <p>{{ reference.description }}</p>
              <span class="reference-card__note">
                <AppIcon name="circle-help" :size="14" />
                참고용 기준 · 수익률만으로 우수성을 판단하지 않아요
              </span>
            </div>
          </article>
        </div>

        <p v-if="outcome.referenceReview?.disclaimer" class="section-disclaimer">
          {{ outcome.referenceReview.disclaimer }}
        </p>
      </section>
    </template>

    <template v-else-if="outcome.scenario === SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK">
      <section class="result-section evidence-section" aria-labelledby="luck-title">
        <div class="section-heading">
          <span class="section-icon"><AppIcon name="activity" :size="21" /></span>
          <div>
            <span class="section-heading__kicker">무작위 매매 분포</span>
            <h2 id="luck-title">시장 운이 얼마나 컸을까요?</h2>
          </div>
        </div>

        <div class="luck-visual">
          <div class="luck-visual__header">
            <span>무작위 매매 {{ outcome.marketLuck?.runCount ?? 0 }}회</span>
            <strong
              >수익 확률 {{ formatPercent(outcome.marketLuck?.profitableRunPercent, 1) }}</strong
            >
          </div>
          <div class="luck-scale">
            <span class="luck-scale__line"></span>
            <span class="luck-scale__median" aria-hidden="true"></span>
            <span class="luck-scale__actual" :style="{ left: `${actualLuckPosition}%` }">
              <SimulationParticipantAvatar variant-type="ACTUAL_USER" :size="30" />
              <span>실제 나</span>
            </span>
          </div>
          <div class="luck-scale__labels">
            <span>낮은 결과</span>
            <span>무작위 중앙값 {{ formatPercent(outcome.marketLuck?.medianReturnPercent) }}</span>
            <span>높은 결과</span>
          </div>
        </div>

        <div class="market-luck-callout">
          <SimulationParticipantAvatar variant-type="RANDOM_BOT" :size="50" />
          <div>
            <strong>원숭이의 1위는 원칙의 패배가 아니에요</strong>
            <p>
              {{
                outcome.marketLuck?.periodSummary ??
                '특정 기간의 시장 방향이 결과를 크게 좌우했을 수 있어요.'
              }}
            </p>
          </div>
        </div>

        <p class="section-disclaimer">
          {{
            outcome.marketLuck?.disclaimer ??
            '무작위 분포 비교는 실력 검증이 아니라 결과의 우연성 참고 지표입니다.'
          }}
        </p>
      </section>
    </template>

    <!-- 승자 유형이 위 5개 시나리오 중 어디에도 명확히 안 잡히는 경우 —
         이전에는 이 케이스에 대한 분기가 없어서 순위 다음이 곧바로
         closing-card로 넘어가며 빈 공간처럼 보였다. -->
    <template v-else>
      <section class="result-section evidence-section" aria-labelledby="unknown-title">
        <div class="section-heading">
          <span class="section-icon"><AppIcon name="bar-chart" :size="21" /></span>
          <div>
            <span class="section-heading__kicker">참고 사항</span>
            <h2 id="unknown-title">뚜렷한 패턴은 안 보여요</h2>
          </div>
        </div>
        <div class="empty-evidence">
          <AppIcon name="bar-chart" :size="24" />
          <div>
            <strong>위 순위와 수치를 참고해서 다음 원칙을 정리해보세요</strong>
            <p>이번 회차는 특정 시나리오 하나로 딱 떨어지진 않았어요. 결과 자체는 유효하니 참가자별 수익률을 비교해보시면 좋아요.</p>
          </div>
        </div>
      </section>
    </template>

    <section class="closing-card">
      <span class="closing-card__icon"><AppIcon name="flag" :size="20" /></span>
      <div>
        <h2>{{ scenarioMeta.closingTitle }}</h2>
        <p>{{ scenarioMeta.closingDescription }}</p>
      </div>
    </section>

    <div class="result-actions" role="group" aria-label="결과 후속 메뉴">
      <BaseButton full-width @click="handlePrimaryAction">
        {{ scenarioMeta.primaryLabel }}
        <template #iconRight><AppIcon name="arrow-right" :size="18" /></template>
      </BaseButton>
      <BaseButton variant="ghost" full-width @click="handleSecondaryAction">
        {{
          outcome.scenario === SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK
            ? principleActionLabel
            : '다시 시뮬레이션'
        }}
      </BaseButton>
    </div>
  </main>
</template>

<style scoped>
.result-story {
  --result-accent: #0b8f8b;
  --result-accent-dark: #075f5c;
  --result-soft: #e9f7f5;
  --result-soft-strong: #d8f0ed;
  --result-ink: #20343c;
  --result-muted: #687b82;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));
  color: var(--result-ink);
}

.result-story--celebrate {
  --result-accent: #0b8f72;
  --result-accent-dark: #08614f;
  --result-soft: #e9f8f0;
  --result-soft-strong: #d6f0e2;
}

.result-story--caution {
  --result-accent: #cf6c37;
  --result-accent-dark: #8f4321;
  --result-soft: #fff4eb;
  --result-soft-strong: #ffe4d1;
}

.result-story--coach {
  --result-accent: #087f7c;
  --result-accent-dark: #075c5a;
  --result-soft: #e8f7f6;
  --result-soft-strong: #d2efed;
}

.result-story--reference {
  --result-accent: #6670ba;
  --result-accent-dark: #444b87;
  --result-soft: #f0f1fb;
  --result-soft-strong: #e2e5f7;
}

.result-story--luck {
  --result-accent: #bd8421;
  --result-accent-dark: #7b5310;
  --result-soft: #fff7df;
  --result-soft-strong: #f9e8b8;
}

.result-story--neutral {
  --result-accent: #506871;
  --result-accent-dark: #304850;
  --result-soft: #f2f5f5;
  --result-soft-strong: #e5ebec;
}

.result-hero {
  position: relative;
  overflow: hidden;
  padding: 24px 20px 22px;
  border: 1px solid color-mix(in srgb, var(--result-accent) 18%, white);
  border-radius: 24px;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.96) 8%, transparent 56%), var(--result-soft);
  box-shadow: 0 12px 32px rgba(28, 49, 57, 0.07);
  text-align: center;
}

.result-hero__glow {
  position: absolute;
  top: -76px;
  right: -56px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--result-accent) 16%, transparent);
  filter: blur(4px);
}

.result-hero__topline {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.result-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--result-accent-dark);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.result-hero__period {
  color: var(--result-muted);
  font-size: 11px;
  font-weight: 600;
}

.winner-portrait {
  position: relative;
  z-index: 1;
  display: inline-flex;
  justify-content: center;
  margin-bottom: 18px;
}

.winner-portrait__ring {
  display: grid;
  width: 92px;
  height: 92px;
  place-items: center;
  border: 5px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  background: var(--result-soft-strong);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--result-accent) 22%, transparent);
}

.winner-portrait__rank {
  position: absolute;
  right: -12px;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 9px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  background: var(--result-accent-dark);
  font-size: 11px;
  font-weight: 800;
}

.result-hero h1 {
  position: relative;
  z-index: 1;
  max-width: 310px;
  margin: 0 auto;
  color: #172b33;
  font-size: clamp(25px, 7vw, 31px);
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: -0.04em;
  white-space: pre-line;
  word-break: keep-all;
}

.result-hero__description {
  position: relative;
  z-index: 1;
  max-width: 330px;
  margin: 12px auto 0;
  color: #576c74;
  font-size: 15px;
  line-height: 1.65;
  word-break: keep-all;
}

.result-facts {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
}

.result-facts--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.result-fact {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 14px 8px;
}

.result-fact + .result-fact {
  border-left: 1px solid color-mix(in srgb, var(--result-accent) 13%, white);
}

.result-fact span {
  overflow: hidden;
  color: var(--result-muted);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-fact strong {
  color: #263c44;
  font-size: 17px;
  font-weight: 850;
}

.result-fact strong.is-accent {
  color: var(--result-accent-dark);
}

.result-fact strong.is-warning {
  color: #c6533c;
}

.report-status {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
  border-radius: 12px;
  color: #47616a;
  background: #f2f6f6;
  font-size: 13px;
  font-weight: 650;
}

.report-status--error {
  color: #9d3d31;
  background: #fff0ed;
}

.result-section {
  padding: 20px;
  border: 1px solid #e7ecec;
  border-radius: 20px;
  background: #ffffff;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;
}

.section-heading--compact {
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-heading__kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--result-accent);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.section-heading h2 {
  margin: 0;
  color: #20343c;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.section-heading__hint {
  color: #8a989d;
  font-size: 11px;
  font-weight: 600;
}

.section-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  color: var(--result-accent-dark);
  background: var(--result-soft);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ranking-row {
  display: grid;
  grid-template-columns: 18px 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 9px 8px;
  border-radius: 12px;
}

.ranking-row--winner {
  background: var(--result-soft);
}

.ranking-row__rank {
  color: #89969a;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.ranking-row--winner .ranking-row__rank {
  color: var(--result-accent-dark);
}

.ranking-row__body {
  min-width: 0;
}

.ranking-row__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.ranking-row__label strong {
  overflow: hidden;
  color: #2c424a;
  font-size: 13px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-row__label span {
  flex: 0 0 auto;
  color: #95a0a4;
  font-size: 10px;
}

.ranking-row__track {
  display: block;
  height: 4px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f1;
}

.ranking-row__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  opacity: 0.78;
}

.ranking-row__return {
  min-width: 57px;
  color: #43575e;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.ranking-row__return.is-positive {
  color: #e05f50;
}

.ranking-row__return.is-negative {
  color: #3978bf;
}

.principle-stack,
.reference-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.principle-card {
  padding: 16px;
  border: 1px solid #e8eded;
  border-radius: 15px;
  background: #fbfcfc;
}

.principle-card--positive {
  border-color: #d6ece2;
  background: #f3fbf7;
}

.principle-card--warning {
  border-color: #f1ddd0;
  background: #fff9f4;
}

.principle-card__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  color: var(--result-accent-dark);
  font-size: 11px;
  font-weight: 800;
}

.principle-title-line {
  display: block;
  line-height: 1.45;
}

.principle-title-line h3 {
  display: inline;
}

.principle-index-badge {
  display: inline-flex;
  align-items: center;
  margin-right: 7px;
  padding: 4px 7px;
  border: 1px solid color-mix(in srgb, var(--result-accent) 18%, white);
  border-radius: 7px;
  color: var(--result-accent-dark);
  background: var(--result-soft);
  font-size: 10px;
  font-weight: 850;
  line-height: 1.2;
  vertical-align: 0.08em;
  white-space: nowrap;
}

.principle-index-badge--warning {
  border-color: #f1d7c8;
  color: #a65a38;
  background: #fff0e6;
}

.principle-index-badge--reference {
  border-color: #d9dced;
  color: #59629b;
  background: #f1f2fb;
}

.principle-card h3,
.reference-card h3 {
  margin: 0;
  color: #263b43;
  font-size: 15px;
  font-weight: 780;
  line-height: 1.45;
  word-break: keep-all;
}

.principle-card p,
.reference-card p {
  margin: 7px 0 0;
  color: #66787e;
  font-size: 13px;
  line-height: 1.55;
  word-break: keep-all;
}

.empty-evidence {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 17px;
  border-radius: 15px;
  color: var(--result-accent-dark);
  background: var(--result-soft);
}

.empty-evidence strong {
  display: block;
  color: #29433f;
  font-size: 14px;
}

.empty-evidence p {
  margin: 5px 0 0;
  color: #607672;
  font-size: 12px;
  line-height: 1.5;
}

.discipline-meter {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 15px;
  background: var(--result-soft);
}

.discipline-meter__copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.discipline-meter__copy span {
  color: #735749;
  font-size: 12px;
  font-weight: 700;
}

.discipline-meter__copy strong {
  color: var(--result-accent-dark);
  font-size: 24px;
  font-weight: 850;
}

.discipline-meter__track {
  display: block;
  height: 8px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
}

.discipline-meter__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--result-accent);
}

.discipline-meter p {
  margin: 9px 0 0;
  color: #7f6c61;
  font-size: 11px;
}

.trade-details {
  margin-top: 12px;
  border: 1px solid #e5eaea;
  border-radius: 14px;
  background: #ffffff;
}

.trade-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  color: #40555d;
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
  list-style: none;
}

.trade-details summary::-webkit-details-marker {
  display: none;
}

.trade-details summary span:last-child {
  color: var(--result-accent-dark);
}

.trade-details__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 16px 16px;
}

.trade-evidence {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #edf0f0;
}

.trade-evidence__topline {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.trade-evidence__topline strong {
  color: #344a52;
  font-size: 13px;
}

.trade-evidence__topline span {
  color: #96a1a5;
  font-size: 11px;
}

.trade-evidence p {
  margin: 5px 0 0;
  color: #738187;
  font-size: 12px;
  line-height: 1.45;
}

.principle-impact-panel {
  margin-bottom: 14px;
  padding: 4px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--result-accent) 18%, white);
  border-bottom: 1px solid color-mix(in srgb, var(--result-accent) 18%, white);
}

.principle-impact-panel__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--result-accent) 12%, white);
}

.principle-impact-panel__topline strong {
  display: block;
  margin-top: 6px;
  color: var(--result-ink);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.principle-impact-panel__kicker {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--result-accent-dark);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.principle-impact-panel__count {
  flex: 0 0 auto;
  padding-top: 2px;
  color: var(--result-accent-dark);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.principle-impact-list {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.principle-impact {
  padding: 14px 0;
}

.principle-impact + .principle-impact {
  border-top: 1px solid color-mix(in srgb, var(--result-accent) 12%, white);
}

.principle-impact__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--result-accent-dark);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.principle-impact__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.principle-impact h3 {
  margin: 0;
  color: #35454a;
  font-size: 13px;
  font-weight: 780;
  line-height: 1.5;
  letter-spacing: -0.02em;
  word-break: keep-all;
}

.principle-impact .principle-title-line {
  margin-top: 7px;
}

.principle-impact p {
  margin: 5px 0 0;
  color: var(--result-muted);
  font-size: 11px;
  line-height: 1.5;
  word-break: keep-all;
}

.principle-impact-panel__note {
  margin: 0;
  padding: 11px 0 2px;
  border-top: 1px solid color-mix(in srgb, var(--result-accent) 12%, white);
  color: var(--result-muted);
  font-size: 10px;
  line-height: 1.45;
  letter-spacing: 0.01em;
  word-break: keep-all;
}

.reference-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 16px;
  background: var(--result-soft);
}

.reference-banner > div {
  min-width: 0;
}

.reference-banner > div > span {
  color: #59637f;
  font-size: 11px;
  font-weight: 700;
}

.section-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.section-chips span {
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--result-accent-dark);
  background: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  font-weight: 700;
}

.reference-card {
  display: block;
  padding: 16px;
  border: 1px solid #e3e5f1;
  border-radius: 15px;
  background: #fafaff;
}

.reference-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.reference-card__copy {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid #e1e4f0;
  border-radius: 9px;
  color: #727a99;
  background: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 10px;
  font-weight: 750;
  margin-left: 6px;
  vertical-align: 0.08em;
  transition: 0.15s ease;
}

.reference-card__title-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.reference-card__title-line h3 {
  display: block;
  min-width: 0;
  flex: 1;
}

.reference-card__title-line .reference-card__copy {
  flex: 0 0 auto;
  margin-left: 0;
}

.reference-card__copy:hover {
  border-color: var(--result-accent);
  color: var(--result-accent-dark);
}

.reference-card__copy--copied {
  border-color: #cce6d9;
  color: #18754e;
  background: #f0fbf5;
}

.reference-card > div:last-child {
  margin-top: 11px;
}

.reference-card__note {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  color: #8389a0;
  font-size: 10px;
  line-height: 1.4;
}

.section-disclaimer {
  margin: 13px 2px 0;
  color: #899599;
  font-size: 10px;
  line-height: 1.55;
}

.luck-visual {
  padding: 16px;
  border-radius: 16px;
  background: var(--result-soft);
}

.luck-visual__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  color: #796636;
  font-size: 11px;
}

.luck-visual__header strong {
  color: var(--result-accent-dark);
  font-size: 14px;
}

.luck-scale {
  position: relative;
  height: 54px;
  margin-top: 13px;
}

.luck-scale__line {
  position: absolute;
  top: 22px;
  right: 0;
  left: 0;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f0c9bc, #f3dc98 48%, #bfdfc9);
}

.luck-scale__median {
  position: absolute;
  top: 17px;
  left: 50%;
  width: 2px;
  height: 18px;
  border-radius: 1px;
  background: rgba(71, 70, 60, 0.42);
}

.luck-scale__actual {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transform: translateX(-50%);
}

.luck-scale__actual :deep(.simulation-participant-avatar) {
  border: 2px solid #ffffff;
  box-shadow: 0 2px 7px rgba(73, 60, 22, 0.2);
}

.luck-scale__actual span {
  padding: 2px 5px;
  border-radius: 999px;
  color: #ffffff;
  background: var(--result-accent-dark);
  font-size: 8px;
  font-weight: 800;
  white-space: nowrap;
}

.luck-scale__labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: #9b8a5d;
  font-size: 8px;
}

.market-luck-callout {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 15px;
  border: 1px solid #f0dfac;
  border-radius: 15px;
  background: #fffaf0;
}

.market-luck-callout strong {
  color: #5f512f;
  font-size: 13px;
}

.market-luck-callout p {
  margin: 5px 0 0;
  color: #81734d;
  font-size: 11px;
  line-height: 1.5;
}

.closing-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  border-radius: 18px;
  color: #ffffff;
  background: var(--result-accent-dark);
}

.closing-card__icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.14);
}

.closing-card h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}

.closing-card p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
  line-height: 1.5;
}

.result-actions {
  position: fixed;
  z-index: 90;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  display: flex;
  width: min(350px, calc(100vw - 24px));
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  transform: translateX(-50%);
  border: 1px solid rgba(215, 225, 225, 0.96);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 32px rgba(31, 52, 60, 0.18);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.result-actions::before {
  position: absolute;
  top: 0;
  left: 50%;
  width: 32px;
  height: 3px;
  border-radius: 999px;
  background: rgba(104, 123, 130, 0.24);
  content: '';
  transform: translate(-50%, -7px);
}

.result-actions .base-button--ghost {
  color: var(--result-muted);
}

.result-actions .base-button--ghost:hover {
  color: var(--result-ink);
}

.result-actions :deep(.base-button) {
  position: relative;
}

.result-actions :deep(.base-button--primary) {
  background: var(--result-accent-dark);
}

.result-actions :deep(.base-button--secondary) {
  color: var(--result-accent-dark);
  background: var(--result-soft);
}

@media (max-width: 380px) {
  .result-actions {
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    width: calc(100vw - 16px);
    padding: 10px;
    border-radius: 18px;
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 380px) {
  .result-hero {
    padding-right: 16px;
    padding-left: 16px;
  }

  .result-hero__topline {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .result-facts--three {
    grid-template-columns: repeat(3, minmax(72px, 1fr));
  }

  .result-section {
    padding: 17px 15px;
  }

  .section-heading__hint,
  .ranking-row__label span {
    display: none;
  }

  .ranking-row {
    grid-template-columns: 16px 32px minmax(0, 1fr) auto;
    gap: 7px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
