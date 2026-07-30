import homeData from '@/mocks/data/home.json'

export async function getSummary() {
  return homeData.summary
}

export async function getHoldings() {
  return homeData.holdings
}

// Store compatibility aliases
export const getAccountsSummary = getSummary
