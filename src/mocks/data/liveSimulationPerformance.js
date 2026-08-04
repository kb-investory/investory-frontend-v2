const INITIAL_CAPITAL = 5_000_000

const snapshotDates = [
  '2026-03-01',
  '2026-03-08',
  '2026-03-15',
  '2026-03-22',
  '2026-03-29',
  '2026-04-05',
  '2026-04-12',
  '2026-04-19',
  '2026-04-26',
  '2026-05-03',
  '2026-05-10',
  '2026-05-17',
  '2026-05-24',
  '2026-05-31',
  '2026-06-07',
  '2026-06-14',
  '2026-06-21',
  '2026-06-28',
  '2026-07-05',
  '2026-07-12',
  '2026-07-19',
  '2026-07-29',
]

const returnPathByVariant = {
  // 꾸준히 오르기보다 중반 선두 이후 조정을 거쳐 최종 3위로 마무리한다.
  1: [0, 0.8, 1.9, 2.7, 1.4, 0.2, -1, 0.5, 2.4, 3.8, 5.1, 4.2, 2.8, 4.6, 6.4, 7.2, 5.8, 6.9, 8.2, 6.7, 5.9, 5],
  // 초반 부진과 역전을 거쳐 후반에 다시 치고 올라오는 최종 우승 경로다.
  2: [0, 0.3, 1.2, 2, 3.4, 4.8, 3.1, 1.2, -0.4, 1.8, 4.6, 6.9, 5.5, 7.8, 9.6, 8.1, 10.8, 12.2, 11.4, 14.1, 15.6, 17],
  // 여러 차례 선두권을 오가지만 마지막에는 2위로 수렴한다.
  3: [0, 1.1, 0.4, 1.6, 2.8, 3.7, 4.9, 4, 5.3, 4.4, 3.6, 5.2, 6.5, 5.7, 7, 8.4, 7.3, 9.1, 8.5, 7.6, 8.8, 8],
  // 초반 깜짝 선두와 급락·반등을 반복하는 변동성 높은 경로다.
  4: [0, -0.6, 1.7, 3.2, 4.6, 2.9, 5.7, 3.6, 1.1, -1.8, 0.7, 4.1, 2, -2.7, -4.5, -1.2, 2.6, 0.4, -3.8, -1.7, 0.9, -2],
}

const cashBaseByVariant = {
  1: 3_350_000,
  2: 2_950_000,
  3: 3_150_000,
  4: 2_850_000,
}

function buildSnapshots(simulationVariantId, returns) {
  let peakReturn = 0

  return snapshotDates.map((snapshotDate, index) => {
    const cumulativeReturnPercent = returns[index]
    peakReturn = Math.max(peakReturn, cumulativeReturnPercent)
    const mddPercent = Math.min(0, cumulativeReturnPercent - peakReturn)
    const cashWave = Math.round(Math.sin(index * 1.7 + simulationVariantId) * 180_000)

    return {
      snapshotDate,
      simulationVariantId,
      cash: index === 0 ? INITIAL_CAPITAL : cashBaseByVariant[simulationVariantId] + cashWave,
      totalEquity: Math.round(INITIAL_CAPITAL * (1 + cumulativeReturnPercent / 100)),
      cumulativeReturnPercent,
      mddPercent: Number(mddPercent.toFixed(1)),
    }
  })
}

export const liveDailyPerformance = Object.entries(returnPathByVariant).flatMap(
  ([variantId, returns]) => buildSnapshots(Number(variantId), returns),
)

export const liveSimulatedTrades = [
  {
    simulatedTradeId: 2001,
    simulationVariantId: 4,
    securityId: 404,
    tradeSide: 'BUY',
    tradedAt: '2026-03-08T09:00:00',
    quantity: 14,
    unitPrice: 31200,
    decisionReason: '[무작위 진입] 원숭이 봇이 첫 종목을 선택해 초반 변동성이 시작됐습니다.',
  },
  {
    simulatedTradeId: 2002,
    simulationVariantId: 2,
    securityId: 101,
    tradeSide: 'BUY',
    tradedAt: '2026-03-22T09:00:00',
    quantity: 10,
    unitPrice: 70000,
    decisionReason: '[추세 진입] 팩터 점수와 거래량 조건이 동시에 기준을 통과했습니다.',
  },
  {
    simulatedTradeId: 2003,
    simulationVariantId: 3,
    securityId: 303,
    tradeSide: 'BUY',
    tradedAt: '2026-04-05T09:00:00',
    quantity: 8,
    unitPrice: 88500,
    decisionReason: '[가치 신호] 저평가 구간 진입을 확인해 유명 전략 봇이 비중을 확대했습니다.',
  },
  {
    simulatedTradeId: 2004,
    simulationVariantId: 1,
    securityId: 202,
    tradeSide: 'SELL',
    tradedAt: '2026-04-12T09:00:00',
    quantity: 5,
    unitPrice: 79800,
    decisionReason: '[손실 제한] 실제 나 포트폴리오에서 하락 종목의 비중을 일부 축소했습니다.',
  },
  {
    simulatedTradeId: 2005,
    simulationVariantId: 4,
    securityId: 404,
    tradeSide: 'SELL',
    tradedAt: '2026-04-26T09:00:00',
    quantity: 10,
    unitPrice: 34900,
    decisionReason: '[변동성 청산] 초반 선두였던 원숭이 봇이 수익 종목을 무작위 청산했습니다.',
  },
  {
    simulatedTradeId: 2006,
    simulationVariantId: 2,
    securityId: 505,
    tradeSide: 'BUY',
    tradedAt: '2026-05-10T09:00:00',
    quantity: 7,
    unitPrice: 94200,
    decisionReason: '[재진입] 조정 이후 모멘텀 회복을 확인해 개인 투자봇이 다시 진입했습니다.',
  },
  {
    simulatedTradeId: 2007,
    simulationVariantId: 1,
    securityId: 202,
    tradeSide: 'BUY',
    tradedAt: '2026-05-24T09:00:00',
    quantity: 6,
    unitPrice: 81500,
    decisionReason: '[반등 추격] 실제 나 포트폴리오가 단기 반등 구간에서 재매수했습니다.',
  },
  {
    simulatedTradeId: 2008,
    simulationVariantId: 3,
    securityId: 303,
    tradeSide: 'SELL',
    tradedAt: '2026-06-07T09:00:00',
    quantity: 4,
    unitPrice: 101000,
    decisionReason: '[리밸런싱] 유명 전략 봇이 목표 비중을 초과한 종목을 일부 정리했습니다.',
  },
  {
    simulatedTradeId: 2009,
    simulationVariantId: 4,
    securityId: 606,
    tradeSide: 'BUY',
    tradedAt: '2026-06-21T09:00:00',
    quantity: 12,
    unitPrice: 27600,
    decisionReason: '[무작위 재도전] 원숭이 봇의 두 번째 반등 구간이 시작됐습니다.',
  },
  {
    simulatedTradeId: 2010,
    simulationVariantId: 2,
    securityId: 505,
    tradeSide: 'BUY',
    tradedAt: '2026-07-05T09:00:00',
    quantity: 6,
    unitPrice: 96000,
    decisionReason: '[선두 추격] 개인 투자봇이 추세 재확인을 거쳐 마지막 비중을 추가했습니다.',
  },
  {
    simulatedTradeId: 2011,
    simulationVariantId: 2,
    securityId: 101,
    tradeSide: 'SELL',
    tradedAt: '2026-07-19T09:00:00',
    quantity: 5,
    unitPrice: 109000,
    decisionReason: '[수익 확정] 목표 수익 구간에서 절반을 매도해 최종 선두를 지켰습니다.',
  },
]
