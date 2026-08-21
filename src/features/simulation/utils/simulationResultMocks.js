const PERIOD_START = '2026-03-01'
const PERIOD_END = '2026-07-29'

const PARTICIPANT_NAMES = Object.freeze({
  ACTUAL_USER: '실제 나',
  PERSONAL_BOT: '원칙 봇',
  FAMOUS_STRATEGY: '유명 투자봇',
  RANDOM_BOT: '원숭이',
  UNSUPPORTED: '비교 전략',
})

const PRINCIPLES = Object.freeze({
  LOSS_LIMIT: '매수가 대비 -5% 도달 시 투자 근거를 확인하고 50% 분할 손절하기',
  ENTRY_SPLIT: '1차 30%, 2차 30%, 3차 40% 비율로 나누어 진입하기',
  NO_IMPULSE_BUY: '손실 발생 직후 1시간 동안 추가 매수하지 않기',
  BUY_REASON: '매수 전 투자 근거를 한 문장으로 기록하기',
  DIVERSIFY: '한 종목에 전체 투자금의 30% 이상 집중하지 않기',
})

function createRanking(rows) {
  return rows
    .map(([variantType, cumulativeReturnPercent, mddPercent, tradeCount]) => ({
      variantId: variantType,
      variantType,
      variantName: PARTICIPANT_NAMES[variantType] ?? '비교 전략',
      cumulativeReturnPercent,
      mddPercent,
      tradeCount,
    }))
    .sort((a, b) => b.cumulativeReturnPercent - a.cumulativeReturnPercent)
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }))
}

function createEvaluation({
  principleSetItemId,
  principleText,
  verdict,
  followedCount = 0,
  violatedCount = 0,
  totalCount = followedCount + violatedCount,
  evaluationReason,
  suggestion,
}) {
  return {
    evaluationId: 'mock-evaluation-' + principleSetItemId,
    principleSetItemId,
    principleText,
    verdict,
    evaluationReason,
    statistics: {
      followedCount,
      violatedCount,
      assessedTradeCount: totalCount,
      totalTradeCount: totalCount,
      adherenceRate: totalCount ? (followedCount / totalCount) * 100 : 0,
      evidenceStrength: totalCount >= 5 ? 'HIGH' : 'MEDIUM',
    },
    suggestion: suggestion
      ? {
          title: '다음 회차에 적용하기',
          description: suggestion,
        }
      : undefined,
  }
}

function createDecision({
  tradeId,
  date,
  securityCode,
  securityName,
  principleSetItemId,
  principleText,
  reason,
}) {
  return {
    decisionReviewId: 'mock-decision-' + tradeId,
    tradeId,
    date,
    tradedAt: date,
    securityCode,
    securityName,
    action: 'BUY',
    principleJudgment: 'VIOLATED',
    judgmentReason: reason,
    principleText,
    matchedPrinciple: {
      principleSetItemId,
      principleText,
    },
  }
}

function createSummary({
  followedCount,
  violatedCount,
  assessedTradeCount,
  totalTradeCount,
}) {
  return {
    followedCount,
    violatedCount,
    assessedTradeCount,
    totalTradeCount,
    unassessedCount: Math.max(totalTradeCount - assessedTradeCount, 0),
  }
}

function createMoment({
  date,
  securityCode,
  securityName,
  userActions,
  botActions,
  return5dPercent,
  principleText,
  reason,
}) {
  return {
    date,
    securityCode,
    securityName,
    userActions,
    botActions,
    return5dPercent,
    betterSide: 'PERSONAL_BOT',
    violatedPrinciples: principleText
      ? [
          {
            principleText,
            reason,
          },
        ]
      : [],
  }
}

const SCENARIOS = Object.freeze({
  1: {
    label: '실제 내가 원칙을 지켜 1위한 경우',
    branch: 'ACTUAL_DISCIPLINED',
    winnerVariantType: 'ACTUAL_USER',
    ranking: [
      ['ACTUAL_USER', 18.6, -6.4, 12],
      ['PERSONAL_BOT', 15.1, -7.1, 11],
      ['FAMOUS_STRATEGY', 12.8, -9.8, 15],
      ['RANDOM_BOT', 10.9, -13.5, 18],
    ],
    summary: createSummary({
      followedCount: 8,
      violatedCount: 0,
      assessedTradeCount: 8,
      totalTradeCount: 8,
    }),
    evaluations: [
      createEvaluation({
        principleSetItemId: 'loss-limit',
        principleText: PRINCIPLES.LOSS_LIMIT,
        verdict: 'KEEP',
        followedCount: 3,
        totalCount: 3,
        evaluationReason: '손실 구간에서 정한 기준을 지켜 손실을 크게 키우지 않았어요.',
      }),
      createEvaluation({
        principleSetItemId: 'entry-split',
        principleText: PRINCIPLES.ENTRY_SPLIT,
        verdict: 'KEEP',
        followedCount: 3,
        totalCount: 3,
        evaluationReason: '분할 진입으로 변동성이 큰 구간에도 대응했어요.',
      }),
      createEvaluation({
        principleSetItemId: 'no-impulse-buy',
        principleText: PRINCIPLES.NO_IMPULSE_BUY,
        verdict: 'KEEP',
        followedCount: 2,
        totalCount: 2,
        evaluationReason: '손실 직후 감정적인 추가 매수를 피했어요.',
      }),
    ],
  },
  2: {
    label: '실제 내가 원칙을 어기고 1위한 경우',
    branch: 'ACTUAL_AHEAD_WITH_VIOLATIONS',
    winnerVariantType: 'ACTUAL_USER',
    ranking: [
      ['ACTUAL_USER', 22.4, -16.8, 14],
      ['PERSONAL_BOT', 16.3, -8.3, 11],
      ['FAMOUS_STRATEGY', 14.7, -10.1, 15],
      ['RANDOM_BOT', 11.6, -18.5, 19],
    ],
    summary: createSummary({
      followedCount: 3,
      violatedCount: 5,
      assessedTradeCount: 8,
      totalTradeCount: 14,
    }),
    evaluations: [
      createEvaluation({
        principleSetItemId: 'loss-limit',
        principleText: PRINCIPLES.LOSS_LIMIT,
        verdict: 'STRENGTHEN',
        followedCount: 1,
        violatedCount: 2,
        totalCount: 3,
        evaluationReason: '수익 중인 종목의 힘을 믿고 손절 기준을 두 번 미뤘어요.',
        suggestion: '손절 기준에 도달하면 투자 근거를 다시 확인한 뒤 정한 비율만큼 먼저 줄여보세요.',
      }),
      createEvaluation({
        principleSetItemId: 'no-impulse-buy',
        principleText: PRINCIPLES.NO_IMPULSE_BUY,
        verdict: 'REVIEW',
        followedCount: 1,
        violatedCount: 2,
        totalCount: 3,
        evaluationReason: '손실 직후 추가 매수로 평균 단가를 낮추려 했어요.',
        suggestion: '손실 직후 1시간은 매매를 멈추고, 추가 매수 근거를 일지에 먼저 남겨보세요.',
      }),
      createEvaluation({
        principleSetItemId: 'entry-split',
        principleText: PRINCIPLES.ENTRY_SPLIT,
        verdict: 'KEEP',
        followedCount: 1,
        totalCount: 1,
        evaluationReason: '분할 진입 원칙은 확인 가능한 거래에서 잘 지켰어요.',
      }),
    ],
    decisions: [
      createDecision({
        tradeId: 'mock-violation-1',
        date: '2026-04-17',
        securityCode: '005930',
        securityName: '삼성전자',
        principleSetItemId: 'loss-limit',
        principleText: PRINCIPLES.LOSS_LIMIT,
        reason: '매수가 대비 -5%를 넘었지만 손절을 미루고 보유했어요.',
      }),
      createDecision({
        tradeId: 'mock-violation-2',
        date: '2026-05-22',
        securityCode: '000660',
        securityName: 'SK하이닉스',
        principleSetItemId: 'no-impulse-buy',
        principleText: PRINCIPLES.NO_IMPULSE_BUY,
        reason: '손실 직후 1시간 안에 추가 매수했어요.',
      }),
      createDecision({
        tradeId: 'mock-violation-3',
        date: '2026-06-10',
        securityCode: '035420',
        securityName: 'NAVER',
        principleSetItemId: 'loss-limit',
        principleText: PRINCIPLES.LOSS_LIMIT,
        reason: '손실 제한 기준보다 오래 기다린 뒤 뒤늦게 정리했어요.',
      }),
    ],
  },
  3: {
    label: '원칙 봇이 실제 나보다 앞선 경우',
    branch: 'PERSONAL_BOT_AHEAD',
    winnerVariantType: 'PERSONAL_BOT',
    ranking: [
      ['PERSONAL_BOT', 16.8, -7.2, 11],
      ['ACTUAL_USER', 7.1, -13.4, 14],
      ['FAMOUS_STRATEGY', 6.5, -10.2, 15],
      ['RANDOM_BOT', 3.8, -19.1, 17],
    ],
    summary: createSummary({
      followedCount: 5,
      violatedCount: 2,
      assessedTradeCount: 7,
      totalTradeCount: 12,
    }),
    evaluations: [
      createEvaluation({
        principleSetItemId: 'no-impulse-buy',
        principleText: PRINCIPLES.NO_IMPULSE_BUY,
        verdict: 'STRENGTHEN',
        followedCount: 2,
        violatedCount: 2,
        totalCount: 4,
        evaluationReason: '원칙 봇은 손실 직후의 추가 매수를 기다렸지만, 실제 거래에서는 바로 대응했어요.',
        suggestion: '손실 직후 1시간 대기 원칙을 실제 주문 전 확인 단계로 고정해보세요.',
      }),
      createEvaluation({
        principleSetItemId: 'buy-reason',
        principleText: PRINCIPLES.BUY_REASON,
        verdict: 'KEEP',
        followedCount: 3,
        totalCount: 3,
        evaluationReason: '매수 근거를 남긴 거래는 두 전략의 판단 차이가 작았어요.',
      }),
    ],
    divergenceReview: {
      momentCount: 3,
      summary: '원칙 봇은 급한 반응을 줄이고 정해둔 대기 기준을 지켰어요.',
      moments: [
        createMoment({
          date: '2026-04-09',
          securityCode: '005930',
          securityName: '삼성전자',
          userActions: ['BUY'],
          botActions: ['HOLD'],
          return5dPercent: 4.8,
          principleText: PRINCIPLES.NO_IMPULSE_BUY,
          reason: '손실 직후 한 시간 대기 원칙을 실제 거래에서 놓쳤어요.',
        }),
        createMoment({
          date: '2026-05-18',
          securityCode: '035720',
          securityName: '카카오',
          userActions: ['SELL'],
          botActions: ['HOLD'],
          return5dPercent: 3.2,
          principleText: PRINCIPLES.LOSS_LIMIT,
          reason: '반등 전 손절 기준에 닿았을 때 너무 빠르게 정리했어요.',
        }),
        createMoment({
          date: '2026-06-26',
          securityCode: '000660',
          securityName: 'SK하이닉스',
          userActions: ['ADD'],
          botActions: ['HOLD'],
          return5dPercent: 5.9,
          principleText: PRINCIPLES.ENTRY_SPLIT,
          reason: '추가 진입 전에 정한 분할 비율을 다시 확인하지 않았어요.',
        }),
      ],
    },
  },
  4: {
    label: '유명 투자봇이 1위한 경우',
    branch: 'REFERENCE_AHEAD',
    winnerVariantType: 'FAMOUS_STRATEGY',
    ranking: [
      ['FAMOUS_STRATEGY', 14.3, -8.6, 15],
      ['RANDOM_BOT', 9.1, -16.7, 18],
      ['ACTUAL_USER', 5.8, -11.2, 12],
      ['PERSONAL_BOT', 4.2, -9.5, 11],
    ],
    summary: createSummary({
      followedCount: 4,
      violatedCount: 1,
      assessedTradeCount: 5,
      totalTradeCount: 12,
    }),
    referenceReview: {
      strategyName: '워런 버핏식 장기 투자봇',
      missingSectionCount: 3,
      missingSections: [
        { section: 'VALUATION', sectionLabel: '가치 평가' },
        { section: 'MOAT', sectionLabel: '경쟁 우위' },
        { section: 'PATIENCE', sectionLabel: '기다림의 기준' },
      ],
      disclaimer: '유명 투자봇의 원칙은 참고용이에요. 내 투자 기간과 감당 가능한 위험에 맞는 것만 골라보세요.',
      references: [
        {
          referenceId: 'famous-valuation',
          title: '내가 이해할 수 있는 사업인지 먼저 확인하기',
          description: '가격보다 사업의 구조와 장기적으로 돈을 벌 수 있는 이유를 먼저 설명할 수 있어야 해요.',
        },
        {
          referenceId: 'famous-moat',
          title: '오래 유지될 경쟁 우위가 있는지 살펴보기',
          description: '브랜드, 비용 구조, 네트워크 효과처럼 시간이 지나도 쉽게 사라지지 않는 강점을 점검해보세요.',
        },
        {
          referenceId: 'famous-patience',
          title: '좋은 기업이라면 충분히 기다릴 기간 정하기',
          description: '단기 가격 변동에 반응하기보다, 투자 근거가 바뀌었을 때만 매매하는 기준을 세워보세요.',
        },
      ],
    },
  },
  5: {
    label: '원숭이가 1위한 경우',
    branch: 'MARKET_LUCK',
    winnerVariantType: 'RANDOM_BOT',
    ranking: [
      ['RANDOM_BOT', 19.9, -14.1, 18],
      ['ACTUAL_USER', 13.0, -10.5, 12],
      ['FAMOUS_STRATEGY', 10.4, -9.2, 15],
      ['PERSONAL_BOT', 8.6, -7.8, 11],
    ],
    summary: createSummary({
      followedCount: 4,
      violatedCount: 1,
      assessedTradeCount: 5,
      totalTradeCount: 12,
    }),
    luckCheck: {
      runCount: 500,
      profitableRunPercent: 57.2,
      medianReturnPercent: 8.4,
      actualUserPercentile: 71.4,
      periodSummary: '상승 흐름이 강했던 기간이라 매수 시점만 맞아도 여러 전략이 수익을 냈어요.',
      disclaimer: '무작위 매매가 1위였다는 사실은 원칙이 나쁘다는 뜻도, 좋다는 뜻도 아니에요. 다른 기간에서 다시 확인해보세요.',
    },
  },
  6: {
    label: '판단 근거가 부족한 경우',
    branch: 'UNKNOWN',
    winnerVariantType: 'UNSUPPORTED',
    ranking: [
      ['ACTUAL_USER', 4.2, -5.1, 4],
      ['PERSONAL_BOT', 3.8, -4.8, 4],
      ['FAMOUS_STRATEGY', 3.6, -6.2, 5],
      ['RANDOM_BOT', 2.9, -8.4, 6],
    ],
    summary: createSummary({
      followedCount: 0,
      violatedCount: 0,
      assessedTradeCount: 0,
      totalTradeCount: 4,
    }),
  },
})

function createEvidence(ranking, summary) {
  const topReturn = ranking[0]?.cumulativeReturnPercent ?? 0
  const actual = ranking.find((participant) => participant.variantType === 'ACTUAL_USER')

  return {
    rankingConfidence: ranking.length >= 4 ? 'HIGH' : 'MEDIUM',
    topReturnPercent: topReturn,
    actualUserReturnPercent: actual?.cumulativeReturnPercent ?? null,
    assessedTradeCount: summary.assessedTradeCount,
    totalTradeCount: summary.totalTradeCount,
  }
}

export const SIMULATION_RESULT_MOCK_SCENARIOS = Object.freeze(
  Object.entries(SCENARIOS).map(([id, scenario]) => ({
    id,
    label: scenario.label,
  })),
)

export function buildSimulationResultMock(mockId) {
  const scenario = SCENARIOS[String(mockId)]
  if (!scenario) return null

  const ranking = createRanking(scenario.ranking)
  const summary = scenario.summary

  return {
    mockId: String(mockId),
    label: scenario.label,
    latestResult: {
      simulationRunId: 'mock-simulation-' + mockId,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      participantSummary: ranking,
      simulatedTrades: [],
      persistenceStatus: 'COMPLETED',
    },
    report: {
      reportVersion: 'MOCK_SCENARIO_V1',
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      outcome: {
        branch: scenario.branch,
        headline: scenario.label,
        detail: scenario.label,
        focusSection: scenario.branch,
        winnerVariantType: scenario.winnerVariantType,
        ranking,
        evidence: createEvidence(ranking, summary),
        judgmentSource: 'MOCK_SCENARIO',
      },
      principleReviewSummary: summary,
      principleEvaluations: scenario.evaluations ?? [],
      decisionReviews: scenario.decisions ?? [],
      divergenceReview: scenario.divergenceReview ?? null,
      referenceReview: scenario.referenceReview ?? null,
      performanceContext: {
        luckCheck: scenario.luckCheck ?? null,
      },
      generationMetadata: {
        source: 'LOCAL_MOCK',
        scenarioId: String(mockId),
      },
    },
  }
}
