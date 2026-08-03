export const portfolioMock = {
  amounts: 40820000,
  holdings: [
    {
      id: 1,
      stockId: 1,
      stockCode: '005930',
      name: '삼성전자',
      sector: '반도체',
      holding: 120,
      amount: 10320000,
      weight: 25.28,
      profitLoss: 560000,
      returnRate: 8.4,
    },
    {
      id: 2,
      stockId: 2,
      stockCode: '035420',
      name: 'NAVER',
      sector: '서비스업',
      holding: 45,
      amount: 9720000,
      weight: 23.81,
      profitLoss: -350000,
      returnRate: 4.1,
    },
    {
      id: 3,
      stockId: 3,
      stockCode: '000660',
      name: 'SK하이닉스',
      sector: '전기전자',
      holding: 60,
      amount: 20780000,
      weight: 50.91,
      profitLoss: 220000,
      returnRate: 12.7,
    },
  ],
}

export const portfolioAnalysisMock = {
  analysis: {
    return: 8.92,
    dailyReturn: 0.34,
    halfYearReturn: 9.8,
    yearReturn: 17.6,
    dailyRisk: 1.18,
    halfYearRisk: 12.4,
    yearRisk: 18.9,
  },
}

export const stockAnalysisMocks = [
  {
    stockId: 1,
    name: '삼성전자',
    analysis: {
      return: 8.4,
      amount: 10320000,
      dailyReturn: 0.21,
      halfYearReturn: 8.9,
      yearReturn: 15.2,
      dailyRisk: 1.05,
      halfYearRisk: 10.8,
      yearRisk: 16.4,
    },
  },
  {
    stockId: 2,
    name: 'NAVER',
    analysis: {
      return: 4.1,
      amount: 9720000,
      dailyReturn: -0.12,
      halfYearReturn: 5.6,
      yearReturn: 11.3,
      dailyRisk: 1.42,
      halfYearRisk: 14.6,
      yearRisk: 21.8,
    },
  },
]

export const accountsMock = [
  { id: 'ALL', name: '전체 계좌', isDefault: true },
  { id: 'ACC_01', name: 'KB증권 주식계좌', accountNumber: '123-45-67890' },
  { id: 'ACC_02', name: '한국투자 ISA계좌', accountNumber: '987-65-43210' },
  { id: 'ACC_03', name: 'NH투자 해외주식계좌', accountNumber: '555-12-34567' },
]

export const portfolioSummaryMock = {
  ALL: {
    statusBadge: '현재 상태',
    headline: '손실 종목을 한 번 점검할 때예요',
    totalAmount: 25430000,
    totalProfit: -1960000,
    nextAction: '손실 비중 확인',
  },
  ACC_01: {
    statusBadge: '현재 상태',
    headline: '우량주 중심의 안정적인 수익을 유지하고 있어요',
    totalAmount: 15320000,
    totalProfit: 1250000,
    nextAction: '수익 실현 시점 점검',
  },
  ACC_02: {
    statusBadge: '현재 상태',
    headline: '손실 종목 비중이 높아지고 있어요',
    totalAmount: 10110000,
    totalProfit: -3210000,
    nextAction: '리밸런싱 검토',
  },
  ACC_03: {
    statusBadge: '현재 상태',
    headline: '해외 증시 변동성에 주의가 필요해요',
    totalAmount: 8500000,
    totalProfit: -450000,
    nextAction: '환율 및 종목 확인',
  },
}
