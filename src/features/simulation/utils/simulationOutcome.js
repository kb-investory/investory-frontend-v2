export const SIMULATION_OUTCOME_SCENARIOS = Object.freeze({
  ACTUAL_DISCIPLINED: 'ACTUAL_DISCIPLINED',
  ACTUAL_LUCKY: 'ACTUAL_LUCKY',
  PERSONAL_BOT_AHEAD: 'PERSONAL_BOT_AHEAD',
  FAMOUS_STRATEGY_AHEAD: 'FAMOUS_STRATEGY_AHEAD',
  MARKET_LUCK: 'MARKET_LUCK',
  UNKNOWN: 'UNKNOWN',
})

const PARTICIPANT_META = Object.freeze({
  ACTUAL_USER: { shortName: '실제 나', color: '#ef6f61' },
  PERSONAL_BOT: { shortName: '원칙 봇', color: '#0b8f8b' },
  FAMOUS_STRATEGY: { shortName: '유명 전략', color: '#6f78c9' },
  RANDOM_BOT: { shortName: '원숭이', color: '#d8a52f' },
})

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function inferVariantType(participant) {
  if (participant?.variantType) return participant.variantType

  const variantId = Number(participant?.variantId ?? participant?.simulationVariantId ?? 0)
  if ([1, 1001].includes(variantId)) return 'ACTUAL_USER'
  if ([2, 1002].includes(variantId)) return 'PERSONAL_BOT'
  if ([3, 1003].includes(variantId)) return 'FAMOUS_STRATEGY'
  return 'RANDOM_BOT'
}

function normalizeReturn(participant) {
  const percent = participant?.cumulativeReturnPercent ?? participant?.cumulative_return
  if (percent != null) return asNumber(percent)

  const cumulativeReturn = participant?.cumulativeReturn
  if (typeof cumulativeReturn !== 'number') return 0
  return Math.abs(cumulativeReturn) <= 2 && cumulativeReturn !== 0
    ? cumulativeReturn * 100
    : cumulativeReturn
}

export function normalizeSimulationParticipants(latestResult, report) {
  const reportRanking = report?.outcome?.ranking ?? []
  const source = reportRanking.length ? reportRanking : (latestResult?.participantSummary ?? [])

  return source
    .map((participant, index) => {
      const variantType = inferVariantType(participant)
      const meta = PARTICIPANT_META[variantType] ?? PARTICIPANT_META.ACTUAL_USER
      const fullName = participant.variantName ?? participant.name ?? meta.shortName

      return {
        ...participant,
        ...meta,
        variantType,
        variantId:
          participant.variantId ?? participant.simulationVariantId ?? `${variantType}-${index}`,
        rank: participant.rank ?? index + 1,
        fullName,
        cumulativeReturnPercent: normalizeReturn(participant),
        mddPercent: participant.mddPercent ?? participant.mdd_percent ?? null,
        tradeCount: participant.tradeCount ?? participant.totalTradesCount ?? 0,
      }
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return b.cumulativeReturnPercent - a.cumulativeReturnPercent
    })
    .map((participant, index) => ({ ...participant, rank: index + 1 }))
}

function getPrincipleReviewSummary(report) {
  if (report?.principleReviewSummary) return report.principleReviewSummary

  const summary = (report?.decisionReviews ?? []).reduce(
    (result, decision) => {
      const judgment = decision.principleJudgment
      if (judgment === 'FOLLOWED') result.followedCount += 1
      else if (judgment === 'VIOLATED') result.violatedCount += 1
      else result.unassessedCount += 1
      return result
    },
    { followedCount: 0, violatedCount: 0, unassessedCount: 0 },
  )

  return {
    ...summary,
    assessedTradeCount: summary.followedCount + summary.violatedCount,
    totalTradeCount: report?.decisionReviews?.length ?? 0,
  }
}

function getScenario({ branch, winnerVariantType, reviewSummary }) {
  if (branch === 'MARKET_LUCK' || winnerVariantType === 'RANDOM_BOT') {
    return SIMULATION_OUTCOME_SCENARIOS.MARKET_LUCK
  }

  if (winnerVariantType === 'ACTUAL_USER') {
    const hasReliableAssessment = (reviewSummary.assessedTradeCount ?? 0) > 0
    const hasViolation = (reviewSummary.violatedCount ?? 0) > 0
    return hasReliableAssessment && !hasViolation
      ? SIMULATION_OUTCOME_SCENARIOS.ACTUAL_DISCIPLINED
      : SIMULATION_OUTCOME_SCENARIOS.ACTUAL_LUCKY
  }

  if (winnerVariantType === 'PERSONAL_BOT' || branch === 'PERSONAL_BOT_AHEAD') {
    return SIMULATION_OUTCOME_SCENARIOS.PERSONAL_BOT_AHEAD
  }

  if (winnerVariantType === 'FAMOUS_STRATEGY' || branch === 'REFERENCE_AHEAD') {
    return SIMULATION_OUTCOME_SCENARIOS.FAMOUS_STRATEGY_AHEAD
  }

  return SIMULATION_OUTCOME_SCENARIOS.UNKNOWN
}

function getViolationDecisions(report) {
  return (report?.decisionReviews ?? [])
    .filter(
      (decision) =>
        decision.principleJudgment === 'VIOLATED' ||
        decision.principleReview?.status === 'VIOLATION_PATTERN_DETECTED',
    )
    .map((decision) => {
      const violatedMatch = decision.principleMatches?.find(
        (match) => match.judgment === 'VIOLATED',
      )
      return {
        ...decision,
        principleText:
          decision.matchedPrinciple?.principleText ??
          decision.matchedPrinciple?.title ??
          violatedMatch?.principleText ??
          decision.principleReview?.violatedPrinciple ??
          '지키지 못한 원칙',
        reason:
          decision.judgmentReason ??
          decision.principleReview?.violationReason ??
          violatedMatch?.reason ??
          decision.principleFeedback ??
          '이 거래에서 원칙 위반이 확인됐어요.',
      }
    })
}

function getImprovementPrinciples(report) {
  const actionableVerdicts = new Set(['STRENGTHEN', 'REVISE', 'CONFIRM_THRESHOLD', 'REVIEW'])
  return (report?.principleEvaluations ?? [])
    .filter((evaluation) => actionableVerdicts.has(evaluation.verdict))
    .map((evaluation) => ({
      ...evaluation,
      conclusion:
        evaluation.suggestion?.description ??
        evaluation.evaluationReason ??
        '다음 회차 전에 이 원칙을 다시 확인해보세요.',
    }))
}

function getPositivePrinciples(report) {
  return (report?.principleEvaluations ?? [])
    .filter(
      (evaluation) =>
        evaluation.verdict === 'KEEP' ||
        evaluation.verdict === 'EARLY_SIGNAL' ||
        (evaluation.statistics?.followedCount ?? 0) > 0,
    )
    .map((evaluation) => ({
      ...evaluation,
      conclusion: evaluation.evaluationReason ?? '이번 회차에서 원칙을 안정적으로 지켰어요.',
    }))
}

function getPrincipleImpacts(report, divergenceMoments) {
  const impacts = new Map()

  function addImpact(principle, details = {}) {
    const principleText =
      principle?.principleText ?? principle?.title ?? principle?.violatedPrinciple
    if (!principleText) return

    const principleId = principle?.principleSetItemId
    const matchingEntry = [...impacts.entries()].find(
      ([, impact]) => impact.principleText === principleText,
    )
    const key = matchingEntry?.[0] ?? String(principleId ?? principleText)
    const current = impacts.get(key) ?? {
      principleSetItemId: principle?.principleSetItemId ?? key,
      principleText,
      violationCount: 0,
      botBetterCount: 0,
      reason: '',
    }

    current.violationCount = Math.max(current.violationCount, asNumber(details.violationCount, 0))
    current.botBetterCount += asNumber(details.botBetterCount, 0)
    if (!current.reason) {
      current.reason =
        details.reason ??
        principle?.evaluationReason ??
        principle?.reason ??
        '이 원칙에서 벗어난 거래가 확인됐어요.'
    }
    impacts.set(key, current)
  }

  divergenceMoments
    .filter((moment) => moment.betterSide === 'PERSONAL_BOT')
    .forEach((moment) => {
      ;(moment.violatedPrinciples ?? []).forEach((principle) => {
        addImpact(principle, {
          violationCount: 1,
          botBetterCount: 1,
          reason: principle.reason,
        })
      })
    })

  ;(report?.principleEvaluations ?? [])
    .filter((evaluation) => asNumber(evaluation.statistics?.violatedCount) > 0)
    .forEach((evaluation) => {
      addImpact(evaluation, {
        violationCount: evaluation.statistics.violatedCount,
        reason: evaluation.evaluationReason,
      })
    })

  ;(report?.decisionReviews ?? [])
    .filter(
      (decision) =>
        decision.principleJudgment === 'VIOLATED' ||
        decision.principleReview?.status === 'VIOLATION_PATTERN_DETECTED',
    )
    .forEach((decision) => {
      const violatedMatch = decision.principleMatches?.find(
        (match) => match.judgment === 'VIOLATED',
      )
      addImpact(decision.matchedPrinciple ?? violatedMatch ?? decision.principleReview, {
        violationCount: 1,
        reason:
          decision.judgmentReason ??
          decision.principleReview?.violationReason ??
          violatedMatch?.reason,
      })
    })

  return [...impacts.values()]
    .filter((impact) => impact.violationCount > 0)
    .sort((a, b) => {
      if (b.botBetterCount !== a.botBetterCount) {
        return b.botBetterCount - a.botBetterCount
      }
      return b.violationCount - a.violationCount
    })
}

export function buildSimulationOutcomeModel({ latestResult, report }) {
  const ranking = normalizeSimulationParticipants(latestResult, report)
  const winnerVariantType =
    report?.outcome?.winnerVariantType ?? ranking[0]?.variantType ?? 'ACTUAL_USER'
  const winner =
    ranking.find((participant) => participant.variantType === winnerVariantType) ??
    ranking[0] ??
    null
  const reviewSummary = getPrincipleReviewSummary(report)
  const assessedCount = asNumber(reviewSummary.assessedTradeCount)
  const followedCount = asNumber(reviewSummary.followedCount)
  const violatedCount = asNumber(reviewSummary.violatedCount)
  const totalTradeCount = asNumber(reviewSummary.totalTradeCount)
  const disciplineRate = assessedCount > 0 ? (followedCount / assessedCount) * 100 : 0
  const coverageRate = totalTradeCount > 0 ? (assessedCount / totalTradeCount) * 100 : 0
  const actualParticipant = ranking.find((participant) => participant.variantType === 'ACTUAL_USER')
  const personalBot = ranking.find((participant) => participant.variantType === 'PERSONAL_BOT')
  const divergenceMoments = report?.divergenceReview?.moments ?? []

  return {
    scenario: getScenario({
      branch: report?.outcome?.branch,
      winnerVariantType,
      reviewSummary,
    }),
    branch: report?.outcome?.branch ?? null,
    ranking,
    winner,
    actualParticipant,
    personalBot,
    reviewSummary: {
      ...reviewSummary,
      assessedTradeCount: assessedCount,
      followedCount,
      violatedCount,
      totalTradeCount,
      disciplineRate,
      coverageRate,
    },
    violationDecisions: getViolationDecisions(report),
    improvementPrinciples: getImprovementPrinciples(report),
    positivePrinciples: getPositivePrinciples(report),
    principleImpacts: getPrincipleImpacts(report, divergenceMoments),
    divergenceReview: report?.divergenceReview ?? null,
    divergenceMoments,
    referenceReview: report?.referenceReview ?? null,
    referencePrinciples: report?.referenceReview?.references ?? report?.referencePrinciples ?? [],
    marketLuck: report?.performanceContext?.luckCheck ?? null,
    reportOutcome: report?.outcome ?? null,
  }
}
