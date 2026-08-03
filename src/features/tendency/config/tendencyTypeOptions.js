const createOptions = (items) =>
  items.map(([code, name, description, icon]) => ({ code, name, description, icon }))

export const TENDENCY_TYPE_CONFIG = {
  PORTFOLIO_RISK_ALLOCATION: {
    title: '포트폴리오 성향',
    subtitle: '포트폴리오 위험 배분에 따른 다섯 가지 유형',
    options: createOptions([
      ['LOW_VOLATILITY_DIVERSIFIED', '저변동 분산형', '변동성이 낮은 종목에 고르게 투자해요.', 'shield-check'],
      ['LOW_VOLATILITY_CONCENTRATED', '저변동 집중형', '변동성이 낮은 소수 종목에 집중해요.', 'target'],
      ['HIGH_VOLATILITY_DIVERSIFIED', '고변동 분산형', '변동성이 큰 종목을 여러 개로 나눠 담아요.', 'chart-pie'],
      ['HIGH_VOLATILITY_CONCENTRATED', '고변동 집중형', '변동성이 큰 소수 종목에 집중해요.', 'activity'],
      ['BALANCED_ALLOCATION', '균형배분형', '위험도와 종목 수를 균형 있게 조절해요.', 'scale'],
    ]),
  },
  BUY_JUDGMENT_BASIS: {
    subtitle: '매수 판단 근거에 따른 다섯 가지 유형',
    options: createOptions([
      ['COMPANY_ANALYSIS', '기업분석형', '기업의 실적과 사업 경쟁력을 근거로 판단해요.', 'bar-chart'],
      ['PRICE_FLOW', '가격흐름형', '차트와 거래량의 움직임을 중심으로 판단해요.', 'trending-up'],
      ['EVENT_RESPONSE', '이벤트반응형', '뉴스와 공시 등 주요 이벤트에 빠르게 반응해요.', 'sparkles'],
      ['INTUITION_SOCIAL_SIGNAL', '직관·사회신호형', '직관이나 주변 투자 신호를 참고해 판단해요.', 'users'],
      ['COMPOSITE_JUDGMENT', '복합판단형', '여러 근거를 함께 비교해 매수를 결정해요.', 'chart-pie'],
    ]),
  },
  LOSS_RESPONSE: {
    subtitle: '손실 상황 대응에 따른 네 가지 유형',
    options: createOptions([
      ['STOP_LOSS', '손절형', '손실 기준에 도달하면 빠르게 매도해요.', 'shield-check'],
      ['ADDITIONAL_PURCHASE', '추가매수형', '하락 구간에서 보유 수량을 늘리는 편이에요.', 'plus'],
      ['HOLD', '보유형', '기업의 가치가 유효하면 손실 구간에도 보유해요.', 'lock'],
      ['MIXED_RESPONSE', '혼합대응형', '종목과 상황에 따라 대응 방식을 달리해요.', 'chart-pie'],
    ]),
  },
  PROFIT_RESPONSE: {
    subtitle: '수익 상황 대응에 따른 네 가지 유형',
    options: createOptions([
      ['PROFIT_REALIZATION', '차익실현형', '목표 수익에 도달하면 수익을 확정해요.', 'trending-up'],
      ['ADDITIONAL_PURCHASE', '추가매수형', '상승 흐름이 이어지면 비중을 더 늘려요.', 'plus'],
      ['HOLD', '보유형', '장기 성장 가능성을 보고 보유를 이어가요.', 'lock'],
      ['MIXED_RESPONSE', '혼합대응형', '수익률과 전망을 함께 보고 대응해요.', 'chart-pie'],
    ]),
  },
  INVESTMENT_HORIZON: {
    subtitle: '보유 기간에 따른 네 가지 유형',
    options: createOptions([
      ['SHORT_TERM_ROTATION', '단기회전형', '짧은 기간 안에 매수와 매도를 반복해요.', 'activity'],
      ['MID_TERM_HOLDING', '중기보유형', '수개월 단위의 흐름을 보며 보유해요.', 'calendar-range'],
      ['LONG_TERM_INVESTMENT', '장기투자형', '기업의 장기 성장을 기대하며 오래 보유해요.', 'history'],
      ['MIXED_HORIZON', '혼합기간형', '종목별 목표에 따라 보유 기간을 달리해요.', 'chart-pie'],
    ]),
  },
  PRINCIPLE_FULFILLMENT: {
    subtitle: '투자 원칙 이행 정도에 따른 네 가지 유형',
    options: createOptions([
      ['PRINCIPLE_MATCHED', '원칙일치형', '작성한 투자 원칙과 실제 행동이 일치해요.', 'shield-check'],
      ['SELECTIVE_COMPLIANCE', '선택적준수형', '상황에 따라 일부 원칙을 골라 지켜요.', 'check'],
      ['REPEATED_DEVIATION', '반복이탈형', '같은 원칙에서 반복적으로 벗어나는 편이에요.', 'rotate-ccw'],
      ['DIFFICULT_TO_ASSESS', '판정불가형', '아직 판단하기에 충분한 기록이 부족해요.', 'activity'],
    ]),
  },
}

const TENDENCY_TRAITS = {
  PORTFOLIO_RISK_ALLOCATION: {
    LOW_VOLATILITY_DIVERSIFIED: [
      '안정적인 가격 흐름과 분산 효과를 함께 중요하게 생각해요.',
      '특정 종목의 움직임이 전체 자산에 미치는 영향이 작은 편이에요.',
    ],
    LOW_VOLATILITY_CONCENTRATED: [
      '안정성이 확인된 소수 종목을 선별해 비중을 높여요.',
      '종목 수는 적지만 큰 가격 변동은 피하려는 편이에요.',
    ],
    HIGH_VOLATILITY_DIVERSIFIED: [
      '성장 가능성이 높은 종목을 여러 개로 나누어 보유해요.',
      '높은 변동성을 감수하면서도 한 종목의 집중 위험은 줄여요.',
    ],
    HIGH_VOLATILITY_CONCENTRATED: [
      '높은 성장 가능성이 보이는 소수 종목에 확신을 실어요.',
      '수익 기회가 크지만 종목별 가격 변동의 영향도 큰 편이에요.',
    ],
    BALANCED_ALLOCATION: [
      '안정형 자산과 성장형 자산의 비중을 함께 관리해요.',
      '시장 상황에 맞춰 집중과 분산의 균형을 조절해요.',
    ],
  },
  BUY_JUDGMENT_BASIS: {
    COMPANY_ANALYSIS: [
      '실적, 재무 상태와 사업 경쟁력을 꼼꼼히 확인해요.',
      '가격 움직임보다 기업의 장기적인 가치를 우선해요.',
    ],
    PRICE_FLOW: [
      '추세와 거래량 등 시장 가격의 신호를 빠르게 확인해요.',
      '진입 시점과 매도 시점을 차트 흐름에 맞춰 판단해요.',
    ],
    EVENT_RESPONSE: [
      '실적 발표, 공시와 산업 뉴스에 민감하게 반응해요.',
      '새로운 정보가 가격에 반영되는 속도를 중요하게 생각해요.',
    ],
    INTUITION_SOCIAL_SIGNAL: [
      '경험에서 얻은 직관과 주변 투자 의견을 함께 참고해요.',
      '숫자로 설명하기 어려운 시장 분위기도 판단에 반영해요.',
    ],
    COMPOSITE_JUDGMENT: [
      '기업 정보, 가격 흐름과 시장 이슈를 함께 비교해요.',
      '한 가지 신호보다 여러 근거가 일치하는지를 확인해요.',
    ],
  },
  LOSS_RESPONSE: {
    STOP_LOSS: [
      '미리 정한 손실 한도에 도달하면 매도를 실행해요.',
      '추가 손실을 막는 것을 반등 가능성보다 우선해요.',
    ],
    ADDITIONAL_PURCHASE: [
      '투자 근거가 유지되면 낮아진 가격을 기회로 판단해요.',
      '평균 매입 단가를 낮추기 위해 나누어 추가 매수해요.',
    ],
    HOLD: [
      '단기 하락보다 처음 세운 투자 근거를 다시 확인해요.',
      '기업의 가치가 유효하면 회복을 기다리는 편이에요.',
    ],
    MIXED_RESPONSE: [
      '손실 원인과 종목 전망에 따라 대응 방법을 바꿔요.',
      '손절, 추가 매수와 보유를 한 가지 방식으로 고정하지 않아요.',
    ],
  },
  PROFIT_RESPONSE: {
    PROFIT_REALIZATION: [
      '목표 가격이나 목표 수익률에 도달하면 수익을 확정해요.',
      '한 번에 전량 매도하기보다 나누어 매도하는 편이에요.',
    ],
    ADDITIONAL_PURCHASE: [
      '상승 근거가 강화되면 수익 중인 종목의 비중을 늘려요.',
      '강한 추세가 이어지는 동안 추가 수익 기회를 찾아요.',
    ],
    HOLD: [
      '단기 수익보다 장기적인 성장 가능성을 더 중요하게 봐요.',
      '투자 근거가 유지되면 수익 구간에서도 보유를 이어가요.',
    ],
    MIXED_RESPONSE: [
      '수익률, 목표 가격과 향후 전망을 함께 확인해요.',
      '일부는 매도하고 일부는 보유하는 등 대응을 나누어 실행해요.',
    ],
  },
  INVESTMENT_HORIZON: {
    SHORT_TERM_ROTATION: [
      '짧은 가격 흐름을 활용해 빠르게 수익 기회를 찾아요.',
      '보유 기간보다 매수와 매도 시점을 중요하게 생각해요.',
    ],
    MID_TERM_HOLDING: [
      '분기 실적이나 수개월의 추세 변화를 기다리는 편이에요.',
      '단기 변동과 장기 불확실성 사이에서 보유 기간을 조절해요.',
    ],
    LONG_TERM_INVESTMENT: [
      '기업의 성장 과정이 실제 성과로 이어질 시간을 기다려요.',
      '일시적인 가격 변동보다 장기 투자 근거를 우선해요.',
    ],
    MIXED_HORIZON: [
      '종목별 목표와 매수 이유에 따라 보유 기간을 다르게 정해요.',
      '단기 기회와 장기 성장을 하나의 포트폴리오에서 함께 추구해요.',
    ],
  },
  PRINCIPLE_FULFILLMENT: {
    PRINCIPLE_MATCHED: [
      '진입, 손절과 익절 기준을 실제 거래에서 꾸준히 지켜요.',
      '투자 일지에 기록한 계획과 매매 행동의 차이가 작은 편이에요.',
    ],
    SELECTIVE_COMPLIANCE: [
      '중요하게 생각하는 원칙은 지키지만 일부는 상황에 맞춰 바꿔요.',
      '시장 변화가 크면 기존 계획보다 현재 판단을 우선하기도 해요.',
    ],
    REPEATED_DEVIATION: [
      '같은 상황에서 계획과 다른 매매가 반복되는 편이에요.',
      '감정이나 급한 시장 변화가 원칙 실행에 영향을 주기도 해요.',
    ],
    DIFFICULT_TO_ASSESS: [
      '작성된 투자 원칙이나 비교할 거래 기록이 아직 부족해요.',
      '기록이 더 쌓이면 원칙과 실제 행동의 일치도를 판단할 수 있어요.',
    ],
  },
}

export const getTendencyTypeConfig = (dimensionCode) =>
  TENDENCY_TYPE_CONFIG[dimensionCode] ?? {
    subtitle: '투자 행동에 따른 성향 유형',
    options: [],
  }

export const getTendencyOptionPoints = (option, result) => {
  if (!option) return []

  return [
    option.description,
    ...(TENDENCY_TRAITS[result?.dimension?.code]?.[option.code] ?? [
      `${option.name} 특성이 투자 선택과 매매 기록에 나타날 수 있어요.`,
      '시장 상황에 따라 다른 유형의 특징이 함께 나타날 수도 있어요.',
    ]),
  ]
}

export const TENDENCY_CONFIDENCE = {
  PORTFOLIO_RISK_ALLOCATION: 82,
  BUY_JUDGMENT_BASIS: 86,
  LOSS_RESPONSE: 81,
  PROFIT_RESPONSE: 84,
  INVESTMENT_HORIZON: 78,
  PRINCIPLE_FULFILLMENT: 88,
}
