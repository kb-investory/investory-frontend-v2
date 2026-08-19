import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { queryClient } from '@/app/providers/queryClient'
import {
  getLatestTendencyAnalysis,
  getRecommendedPrinciples,
  getTendencyAccessStatus,
  getUserPrinciples,
  runTendencyAnalysis,
  saveUserPrinciples,
} from '@/features/tendency/api/tendencyApi'
import { queryKeys } from '@/shared/api/queryKeys'

const APPLIED_RECOMMENDATIONS_KEY = 'investory:applied-recommendations'
const DAY_IN_MS = 24 * 60 * 60 * 1000
const TENDENCY_STALE_TIME = 5 * 60 * 1000
const RECOMMENDATION_POLL_INTERVAL_MS = 2000
const RECOMMENDATION_POLL_MAX_ATTEMPTS = 30

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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 분석 완료 후 추천 원칙은 백엔드에서 이벤트 리스너로 비동기 생성되기 때문에,
// 분석 응답을 받자마자 조회하면 아직 추천이 안 만들어져 있을 수 있다. 서버가
// analysisRunId별 생성 상태(generationStatus: REQUESTED/SUCCESS/FAILED)를
// 내려주므로, REQUESTED인 동안만 재시도하고 SUCCESS/FAILED가 되면 즉시 멈춘다.
async function fetchFreshRecommendations(analysisRunId) {
  if (analysisRunId == null) return getRecommendedPrinciples()

  let recommendationData = await getRecommendedPrinciples(analysisRunId)

  for (
    let attempt = 1;
    attempt < RECOMMENDATION_POLL_MAX_ATTEMPTS && recommendationData.generationStatus === 'REQUESTED';
    attempt += 1
  ) {
    await wait(RECOMMENDATION_POLL_INTERVAL_MS)
    recommendationData = await getRecommendedPrinciples(analysisRunId)
  }

  return recommendationData
}

function mapRecommendationToPrinciple(recommendation, sortOrder, analysisRunId) {
  const recommendationId =
    recommendation.recommendationId ??
    recommendation.principleRecommendationId ??
    recommendation.principleSetItemId ??
    sortOrder
  const content = recommendation.recommendationText ?? recommendation.principleText ?? ''
  const title = recommendation.analysisType?.name ?? recommendation.title ?? '추천 원칙'
  const category =
    recommendation.analysisType?.code ?? recommendation.ruleJson?.ruleType ?? 'GENERAL'

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
  const recommendationId = principle.recommendationId ?? principle.principleRecommendationId ?? null

  return {
    ...principle,
    recommendationId,
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
  const recommendationGenerationStatus = ref(null)
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
        ['NEW', 'SUGGESTED'].includes(recommendation.recommendationStatus) &&
        !principles.value.some(
          (principle) =>
            principle.recommendationId != null &&
            String(principle.recommendationId) === String(recommendation.recommendationId),
        ) &&
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

  async function fetchLatestAnalysis({ force = false } = {}) {
    if (force) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tendency.analysis(), exact: true })
    }

    const analysisData = await queryClient.fetchQuery({
      queryKey: queryKeys.tendency.analysis(),
      queryFn: getLatestTendencyAnalysis,
      staleTime: TENDENCY_STALE_TIME,
    })
    updateAnalysis(analysisData)
    return analysisData
  }

  async function fetchTendencies({ force = false } = {}) {
    if (loaded.value && !force) return

    loading.value = true
    error.value = null

    try {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.tendency.all })
      }

      const [analysisData, principleData, recommendationData, accessData] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.tendency.analysis(),
          queryFn: getLatestTendencyAnalysis,
          staleTime: TENDENCY_STALE_TIME,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.tendency.principles(),
          queryFn: getUserPrinciples,
          staleTime: TENDENCY_STALE_TIME,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.tendency.recommendations(),
          queryFn: getRecommendedPrinciples,
          staleTime: TENDENCY_STALE_TIME,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.tendency.access(),
          queryFn: getTendencyAccessStatus,
          staleTime: TENDENCY_STALE_TIME,
        }),
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
    recommendationGenerationStatus.value = null

    try {
      const analysisData = await runTendencyAnalysis()
      updateAnalysis(analysisData)
      queryClient.setQueryData(queryKeys.tendency.analysis(), analysisData)
      const [recommendationData, accessData] = await Promise.all([
        fetchFreshRecommendations(analysisData.analysisRunId),
        getTendencyAccessStatus(),
      ])
      recommendationGenerationStatus.value = recommendationData.generationStatus ?? null
      recommendations.value = recommendationData.recommendations || []
      analysisAccess.value = accessData
      queryClient.setQueryData(queryKeys.tendency.recommendations(), recommendationData)
      queryClient.setQueryData(queryKeys.tendency.access(), accessData)
      await queryClient.invalidateQueries({ queryKey: queryKeys.mypage.overview(), exact: true })
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

  // 저장 시 서버는 채택된 추천을 SUGGESTED -> ADOPTED로 전이시키는데(reconcileRecommendationStatuses),
  // 추천 목록 캐시를 갱신하지 않으면 TENDENCY_STALE_TIME(5분) 동안 옛 SUGGESTED 상태가 남아
  // 이미 채택한 추천이 목록에 계속 노출된다. 새로고침하면 메모리 캐시가 날아가 정상으로 보이던
  // 증상의 원인이라, 저장 직후 서버가 판정한 상태를 다시 읽어온다.
  // 저장 자체는 이미 커밋된 뒤이므로, 재조회 실패가 저장 실패로 보이지 않도록 예외는 삼킨다
  // (이 경우 activeRecommendations의 클라이언트 가드가 그대로 백스톱 역할을 한다).
  async function refreshRecommendations() {
    try {
      const recommendationData = await getRecommendedPrinciples()
      recommendations.value = recommendationData.recommendations || []
      queryClient.setQueryData(queryKeys.tendency.recommendations(), recommendationData)
    } catch {
      // 추천 목록 갱신 실패는 저장 결과에 영향을 주지 않는다.
    }
  }

  // 원칙 수정 화면에서 채택했던 추천을 다시 빼면, 저장 전까지는 로컬에서 즉시
  // "추천 원칙 추가하기" 목록으로 되돌려 보여준다. 서버가 recommendationStatus를
  // NEW로 되돌리는지는 별개 문제라, 저장 후 refreshRecommendations()로 다시 덮어써질 수 있다.
  function restoreRecommendation(recommendation) {
    if (recommendation?.recommendationId == null) return
    const alreadyListed = recommendations.value.some(
      (existing) => String(existing.recommendationId) === String(recommendation.recommendationId),
    )
    if (alreadyListed) return

    recommendations.value = [...recommendations.value, recommendation]
  }

  async function applyRecommendations(recommendationIds) {
    // 이미 채택된 추천을 다시 적용하면 같은 recommendationId를 가진 원칙이 중복 저장되므로 제외한다.
    const adoptedRecommendationIds = new Set(
      principles.value
        .map((principle) => principle.recommendationId)
        .filter((recommendationId) => recommendationId != null)
        .map(String),
    )
    const selectedRecommendations = recommendations.value.filter(
      (recommendation) =>
        recommendationIds.includes(recommendation.recommendationId) &&
        !adoptedRecommendationIds.has(String(recommendation.recommendationId)),
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
    queryClient.setQueryData(queryKeys.tendency.principles(), {
      principles: principles.value,
    })
    appliedRecommendationIds.value = [
      ...new Set([...appliedRecommendationIds.value, ...recommendationIds]),
    ]
    window.localStorage.setItem(
      APPLIED_RECOMMENDATIONS_KEY,
      JSON.stringify(appliedRecommendationIds.value),
    )
    await refreshRecommendations()
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
    queryClient.setQueryData(queryKeys.tendency.principles(), {
      principles: principles.value,
    })
    appliedRecommendationIds.value = recommendations.value
      .filter((recommendation) =>
        normalizedPrinciples.some(
          (principle) =>
            (principle.recommendationId != null &&
              String(principle.recommendationId) === String(recommendation.recommendationId)) ||
            String(principle.principleId) === `recommendation-${recommendation.recommendationId}`,
        ),
      )
      .map((recommendation) => recommendation.recommendationId)
    window.localStorage.setItem(
      APPLIED_RECOMMENDATIONS_KEY,
      JSON.stringify(appliedRecommendationIds.value),
    )
    await refreshRecommendations()
  }

  function reset() {
    analysis.value = null
    history.value = []
    principles.value = []
    recommendations.value = []
    analysisAccess.value = null
    loading.value = false
    analyzing.value = false
    loaded.value = false
    error.value = null
    todayTimestamp.value = getTodayTimestamp()
    appliedRecommendationIds.value = []
    queryClient.removeQueries({ queryKey: queryKeys.tendency.all })
  }

  return {
    analysis,
    history,
    principles,
    recommendations,
    analysisAccess,
    loading,
    analyzing,
    recommendationGenerationStatus,
    error,
    selectionResults,
    behaviorResults,
    activeRecommendations,
    shouldShowRecommendation,
    shouldShowReanalysis,
    isAnalysisLocked,
    daysUntilAnalysis,
    recordedDays,
    fetchLatestAnalysis,
    fetchTendencies,
    analyzeTendencies,
    refreshAnalysisDate,
    getHistoryById,
    restoreRecommendation,
    applyRecommendations,
    savePrincipleEdits,
    reset,
  }
})
