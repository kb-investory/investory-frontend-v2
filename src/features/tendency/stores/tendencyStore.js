import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getLatestTendencyAnalysis,
  getRecommendedPrinciples,
  getTendencyAccessStatus,
  getUserPrinciples,
  runTendencyAnalysis,
  saveUserPrinciples,
} from '@/features/tendency/api/tendencyApi'

const APPLIED_RECOMMENDATIONS_KEY = 'investory:applied-recommendations'
const DAY_IN_MS = 24 * 60 * 60 * 1000

function readStoredIds(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function getTodayTimestamp() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mapRecommendationToPrinciple(recommendation, sortOrder, analysisRunId) {
  const recommendationId =
    recommendation.recommendationId ??
    recommendation.principleRecommendationId ??
    recommendation.principleSetItemId ??
    sortOrder
  const content = recommendation.recommendationText ?? recommendation.principleText ?? ''
  const title = recommendation.analysisType?.name ?? recommendation.title ?? '추천 원칙'
  const category = recommendation.analysisType?.code ?? recommendation.ruleJson?.ruleType ?? 'GENERAL'

  return {
    principleId: `recommendation-${recommendationId}`,
    recommendationId,
    title,
    content,
    originalContent: content,
    category,
    ruleJson: recommendation.ruleJson,
    isActive: true,
    isUserModified: false,
    sortOrder: recommendation.sortOrder ?? sortOrder,
    appliedDate: getLocalDateKey(),
    recommendationSource: {
      type: 'TENDENCY_ANALYSIS',
      label: '투자성향 기반 추천',
      analysisRunId,
      tendency: recommendation.analysisType,
    },
  }
}

function normalizePrinciple(principle) {
  const originalContent = principle.originalContent ?? principle.content
  const isUserCreated = principle.recommendationSource?.type === 'USER_CREATED'

  return {
    ...principle,
    originalContent,
    isUserModified:
      isUserCreated ||
      Boolean(principle.isUserModified) ||
      principle.content.trim() !== originalContent.trim(),
  }
}

export const useTendencyStore = defineStore('tendency', () => {
  const analysis = ref(null)
  const history = ref([])
  const principles = ref([])
  const recommendations = ref([])
  const analysisAccess = ref(null)
  const loading = ref(false)
  const analyzing = ref(false)
  const loaded = ref(false)
  const error = ref(null)
  const todayTimestamp = ref(getTodayTimestamp())
  const appliedRecommendationIds = ref(readStoredIds(APPLIED_RECOMMENDATIONS_KEY))

  const selectionResults = computed(
    () =>
      analysis.value?.analysisResults?.filter((result) => result.dimension.group === 'SELECTION') ||
      [],
  )

  const behaviorResults = computed(
    () =>
      analysis.value?.analysisResults?.filter((result) => result.dimension.group === 'BEHAVIOR') ||
      [],
  )

  const activeRecommendations = computed(() =>
    recommendations.value.filter(
      (recommendation) =>
        recommendation.recommendationStatus === 'NEW' &&
        (principles.value.length === 0 ||
          !appliedRecommendationIds.value.includes(recommendation.recommendationId)),
    ),
  )

  const shouldShowRecommendation = computed(
    () =>
      Boolean(analysis.value) && recommendations.value.length > 0 && principles.value.length === 0,
  )

  const shouldShowReanalysis = computed(() => {
    if (!analysis.value?.analyzedDate) return false

    const analyzedDate = new Date(`${analysis.value.analyzedDate}T00:00:00`)

    return todayTimestamp.value - analyzedDate.getTime() >= 90 * DAY_IN_MS
  })
  const analysisAvailableTimestamp = computed(() => {
    if (!analysisAccess.value?.analysisAvailableDate) return null
    return new Date(`${analysisAccess.value.analysisAvailableDate}T00:00:00`).getTime()
  })
  const isAnalysisLocked = computed(
    () =>
      Boolean(analysisAvailableTimestamp.value) &&
      todayTimestamp.value < analysisAvailableTimestamp.value,
  )
  const daysUntilAnalysis = computed(() => {
    if (!isAnalysisLocked.value) return 0
    return Math.ceil((analysisAvailableTimestamp.value - todayTimestamp.value) / DAY_IN_MS)
  })
  const recordedDays = computed(() =>
    Math.max(0, (analysisAccess.value?.minimumRecordDays || 90) - daysUntilAnalysis.value),
  )

  function updateAnalysis(analysisData) {
    analysis.value = analysisData || null
    history.value = [...(analysisData?.history || [])].sort(
      (a, b) => new Date(b.analyzedDate) - new Date(a.analyzedDate),
    )
  }

  async function fetchTendencies({ force = false } = {}) {
    if (loaded.value && !force) return

    loading.value = true
    error.value = null

    try {
      const [analysisData, principleData, recommendationData, accessData] = await Promise.all([
        getLatestTendencyAnalysis(),
        getUserPrinciples(),
        getRecommendedPrinciples(),
        getTendencyAccessStatus(),
      ])

      updateAnalysis(analysisData)
      recommendations.value = recommendationData.recommendations || []
      analysisAccess.value = accessData
      principles.value = (principleData.principles || []).map(normalizePrinciple)
      loaded.value = true
    } catch (fetchError) {
      error.value = fetchError
    } finally {
      loading.value = false
    }
  }

  async function analyzeTendencies() {
    if (analyzing.value || isAnalysisLocked.value) return

    analyzing.value = true
    error.value = null

    try {
      const analysisData = await runTendencyAnalysis()
      updateAnalysis(analysisData)
    } catch (analysisError) {
      error.value = analysisError
    } finally {
      analyzing.value = false
    }
  }

  function refreshAnalysisDate() {
    todayTimestamp.value = getTodayTimestamp()
  }

  function getHistoryById(analysisRunId) {
    return history.value.find((item) => String(item.analysisRunId) === String(analysisRunId))
  }

  async function applyRecommendations(recommendationIds) {
    const selectedRecommendations = recommendations.value.filter((recommendation) =>
      recommendationIds.includes(recommendation.recommendationId),
    )

    if (!selectedRecommendations.length) return

    const nextPrinciples = [
      ...principles.value,
      ...selectedRecommendations.map((recommendation, index) =>
        mapRecommendationToPrinciple(
          recommendation,
          principles.value.length + index + 1,
          analysis.value?.analysisRunId,
        ),
      ),
    ]

    const response = await saveUserPrinciples({
      analysisRunId: analysis.value?.analysisRunId,
      principles: nextPrinciples,
    })

    principles.value = response.principles
    appliedRecommendationIds.value = [
      ...new Set([...appliedRecommendationIds.value, ...recommendationIds]),
    ]
    window.localStorage.setItem(
      APPLIED_RECOMMENDATIONS_KEY,
      JSON.stringify(appliedRecommendationIds.value),
    )
  }

  async function savePrincipleEdits(nextPrinciples) {
    const today = getLocalDateKey()
    const normalizedPrinciples = nextPrinciples.map((principle, index) => {
      const originalContent = principle.originalContent ?? principle.content
      const isUserCreated = principle.recommendationSource?.type === 'USER_CREATED'
      const isUserModified = isUserCreated || principle.content.trim() !== originalContent.trim()

      return {
        ...principle,
        originalContent,
        isUserModified,
        modifiedDate: isUserModified ? principle.modifiedDate || today : undefined,
        sortOrder: index + 1,
      }
    })
    const response = await saveUserPrinciples({
      analysisRunId: analysis.value?.analysisRunId,
      principles: normalizedPrinciples,
    })

    principles.value = response.principles
    appliedRecommendationIds.value = recommendations.value
      .filter((recommendation) =>
        normalizedPrinciples.some(
          (principle) =>
            String(principle.principleId) === `recommendation-${recommendation.recommendationId}`,
        ),
      )
      .map((recommendation) => recommendation.recommendationId)
    window.localStorage.setItem(
      APPLIED_RECOMMENDATIONS_KEY,
      JSON.stringify(appliedRecommendationIds.value),
    )
  }

  return {
    analysis,
    history,
    principles,
    recommendations,
    analysisAccess,
    loading,
    analyzing,
    error,
    selectionResults,
    behaviorResults,
    activeRecommendations,
    shouldShowRecommendation,
    shouldShowReanalysis,
    isAnalysisLocked,
    daysUntilAnalysis,
    recordedDays,
    fetchTendencies,
    analyzeTendencies,
    refreshAnalysisDate,
    getHistoryById,
    applyRecommendations,
    savePrincipleEdits,
  }
})
