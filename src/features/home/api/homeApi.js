import homeData from '@/mocks/data/home.json'

export async function getSummary() {
  return homeData.summary
}

export async function getHoldings() {
  return homeData.holdings
}

export async function getAccountsSummary() {
  return {
    summary: homeData.summary,
    accounts: homeData.accounts ?? [],
  }
}
