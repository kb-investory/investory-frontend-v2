import tendencyData from '@/mocks/data/tendency.json'

export async function getTendencyAnalysis() {
  return {
    summary: tendencyData.summary,
    tendencies: tendencyData.tendencies,
  }
}

export async function getPrinciples() {
  return tendencyData.principles
}

export async function getSuggestedPrinciples() {
  return tendencyData.suggestedPrinciples
}

export async function savePrinciples(principles) {
  tendencyData.principles = principles
  return true
}

// Store compatibility aliases
export const getLatestTendencyAnalysis = getTendencyAnalysis
export const getUserPrinciples = getPrinciples
export const getRecommendedPrinciples = getSuggestedPrinciples
export const saveUserPrinciples = savePrinciples
