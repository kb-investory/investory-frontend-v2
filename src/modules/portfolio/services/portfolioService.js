import {
  accountsMock,
  portfolioAnalysisMock,
  portfolioMock,
  portfolioSummaryMock,
  stockAnalysisMocks,
} from '@/modules/portfolio/mocks/portfolioMock'

export async function getAccounts() {
  return structuredClone(accountsMock)
}

export async function getPortfolioSummary(accountId = 'ALL') {
  const summary = portfolioSummaryMock[accountId] || portfolioSummaryMock.ALL
  return structuredClone(summary)
}

export async function getPortfolioHoldings() {
  return structuredClone(portfolioMock)
}

export async function getPortfolios() {
  const { holdings } = await getPortfolioHoldings()
  return holdings
}

export async function getPortfolioAnalysis() {
  return structuredClone(portfolioAnalysisMock)
}

export async function getStockAnalysis(stockId) {
  return structuredClone(
    stockAnalysisMocks.find((stock) => stock.stockId === Number(stockId)) ?? null,
  )
}
