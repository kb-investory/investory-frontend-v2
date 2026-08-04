import tendencyData from '@/mocks/data/tendency.json'

const FLOW_STORAGE_KEY = 'investory:mock:tendency-flow:v3'
const MINIMUM_RECORD_DAYS = 90

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateBefore(days, baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date
}

function createInitialFlowState() {
  return {
    serviceStartedDate: formatDateKey(getDateBefore(MINIMUM_RECORD_DAYS + 1)),
    analysis: null,
    principles: [],
  }
}

function writeFlowState(state) {
  window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(state))
  return state
}

function readFlowState() {
  try {
    const storedState = JSON.parse(window.localStorage.getItem(FLOW_STORAGE_KEY) || 'null')

    if (storedState?.serviceStartedDate) {
      return {
        serviceStartedDate: storedState.serviceStartedDate,
        analysis: storedState.analysis || null,
        principles: storedState.principles || [],
      }
    }
  } catch {
    // 저장 데이터가 손상되면 데모의 최초 상태부터 다시 시작합니다.
  }

  return writeFlowState(createInitialFlowState())
}

function createAnalysisResponse(previousAnalysis = null) {
  const analyzedAt = getDateBefore(0)
  const analyzedDate = formatDateKey(analyzedAt)
  const isReanalysis = Boolean(previousAnalysis)
  const analysisRunId = isReanalysis
    ? previousAnalysis.analysisRunId + 1
    : tendencyData.analysisRunId
  const historyItem = isReanalysis
    ? {
        analysisRunId,
        analyzedDate,
        label: '재분석',
        description: '6가지 성향 결과 · 1개 변화',
        changedCount: 1,
        changes: [
          {
            dimension: '투자 기간',
            previousType: '중기보유형',
            currentType: '장기투자형',
            reason: '최근 90일 동안 장기 보유한 종목 비중이 증가했어요.',
          },
        ],
      }
    : {
        analysisRunId,
        analyzedDate,
        label: '첫 분석',
        description: '6가지 성향 결과 생성',
        changedCount: 0,
        changes: [],
      }

  return {
    analysisRunId,
    analyzedDate,
    period: {
      startDate: formatDateKey(getDateBefore(MINIMUM_RECORD_DAYS - 1, analyzedAt)),
      endDate: analyzedDate,
      days: MINIMUM_RECORD_DAYS,
    },
    summary: tendencyData.summary,
    groupSummaries: tendencyData.groupSummaries,
    analysisResults: tendencyData.analysisResults,
    history: [historyItem, ...(previousAnalysis?.history || [])],
  }
}

export async function getLatestTendencyAnalysis() {
  return readFlowState().analysis
}

export async function runTendencyAnalysis() {
  await new Promise((resolve) => window.setTimeout(resolve, 3200))

  const flowState = readFlowState()
  const analysis = createAnalysisResponse(flowState.analysis)
  writeFlowState({
    ...flowState,
    analysis,
  })

  return analysis
}

export async function getUserPrinciples() {
  return {
    principles: readFlowState().principles,
  }
}

export async function getTendencyAccessStatus() {
  const { serviceStartedDate } = readFlowState()

  return {
    serviceStartedDate,
    analysisAvailableDate: formatDateKey(addDays(serviceStartedDate, MINIMUM_RECORD_DAYS)),
    minimumRecordDays: MINIMUM_RECORD_DAYS,
  }
}

export async function getRecommendedPrinciples() {
  return {
    recommendations: tendencyData.suggestedPrinciples,
  }
}

export async function saveUserPrinciples({ principles }) {
  const flowState = readFlowState()
  writeFlowState({
    ...flowState,
    principles,
  })

  return {
    principles,
  }
}

// 이전 화면에서 사용하던 함수명을 유지합니다.
export const getTendencyAnalysis = getLatestTendencyAnalysis
export const getPrinciples = getUserPrinciples
export const getSuggestedPrinciples = getRecommendedPrinciples
export const savePrinciples = saveUserPrinciples
