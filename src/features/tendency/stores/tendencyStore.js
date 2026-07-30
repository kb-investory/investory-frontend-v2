import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  getLatestTendencyAnalysis,
  getRecommendedPrinciples,
  getUserPrinciples,
  saveUserPrinciples as saveUserPrinciplesApi,
} from '@/features/tendency/api/tendencyApi'

export const useTendencyStore = defineStore('tendency', () => {
  const analysis = ref(null)
  const principles = ref([])
  const recommendations = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchTendencies() {
    loading.value = true
    error.value = null
    try {
      analysis.value = await getLatestTendencyAnalysis()
      const pData = await getUserPrinciples()
      principles.value = pData.principles
      const rData = await getRecommendedPrinciples()
      recommendations.value = rData.recommendations
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  async function savePrinciples(newPrinciples) {
    loading.value = true
    try {
      const res = await saveUserPrinciplesApi({
        analysisRunId: analysis.value?.analysisRunId || 1,
        principles: newPrinciples,
      })
      principles.value = res.principles
    } finally {
      loading.value = false
    }
  }

  return {
    analysis,
    principles,
    recommendations,
    tendencies: principles, // Alias for backward compatibility
    loading,
    error,
    fetchTendencies,
    savePrinciples,
  }
})
