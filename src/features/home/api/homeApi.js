export async function getAccountsSummary() {
  return {
    summary: {
      accountCount: 2,
      totalMarketValue: 15820000,
      totalUnrealizedPnl: 420000,
    },
    accounts: [
      {
        accountId: 25,
        connectionId: 15,
        brokerId: 1,
        brokerName: '미래에셋증권',
        accountNoMasked: '1234-****-5678',
        accountName: '종합주식계좌',
        accountType: 'STOCK',
        holdingCount: 3,
        totalMarketValue: 8420000,
        totalUnrealizedPnl: 320000,
        lastSyncedAt: '2026-07-29T15:00:03',
      },
      {
        accountId: 26,
        connectionId: 15,
        brokerId: 1,
        brokerName: '미래에셋증권',
        accountNoMasked: '5678-****-1234',
        accountName: 'ISA 계좌',
        accountType: 'ISA',
        holdingCount: 2,
        totalMarketValue: 7400000,
        totalUnrealizedPnl: 100000,
        lastSyncedAt: '2026-07-29T15:00:03',
      },
    ],
  }
}

export async function getHoldings() {
  return [
    {
      asOfDate: '2026-07-29',
      securityId: 101,
      securityName: '삼성전자',
      quantity: 10,
      avgCost: 72000,
      closePrice: 75000,
      valuationAmount: 750000,
      unrealizedPnl: 30000,
      weightPct: 8.91,
    },
    {
      asOfDate: '2026-07-29',
      securityId: 102,
      securityName: 'SK하이닉스',
      quantity: 5,
      avgCost: 190000,
      closePrice: 198000,
      valuationAmount: 990000,
      unrealizedPnl: 40000,
      weightPct: 11.76,
    },
  ]
}
