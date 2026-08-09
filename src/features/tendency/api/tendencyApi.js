import tendencyData from '@/mocks/data/tendency.json'
import { request } from '@/shared/api/client'

const FLOW_STORAGE_KEY = 'investory:mock:tendency-flow:v6-analysis-empty'
const MINIMUM_RECORD_DAYS = 90

function formatDateKey(date = new Date()) {
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
  const defaultPrinciples = [
    {
      principleId: 1,
      content: '분할 매수 시 단기 변동에 흔들리지 않고 미리 정한 목표 비중을 준수한다.',
      originalContent: '분할 매수 시 단기 변동에 흔들리지 않고 미리 정한 목표 비중을 준수한다.',
      category: 'PORTFOLIO_RISK_ALLOCATION',
      isActive: true,
      isUserModified: true,
      sortOrder: 1,
      appliedDate: formatDateKey(getDateBefore(30)),
      recommendationSource: { type: 'USER_CREATED', label: '나의 투자원칙' },
    },
    {
      principleId: 2,
      content: '목표 수익률(+15%~20%) 도달 시 30% 수량을 기계적으로 분할 차익실현한다.',
      originalContent: '목표 수익률(+15%~20%) 도달 시 30% 수량을 기계적으로 분할 차익실현한다.',
      category: 'PROFIT_RESPONSE',
      isActive: true,
      isUserModified: true,
      sortOrder: 2,
      appliedDate: formatDateKey(getDateBefore(30)),
      recommendationSource: { type: 'USER_CREATED', label: '나의 투자원칙' },
    },
    {
      principleId: 3,
      content: '기업 펀더멘털 근거가 유지되면 단기 변동성 손실 구간에서도 우직하게 보유한다.',
      originalContent: '기업 펀더멘털 근거가 유지되면 단기 변동성 손실 구간에서도 우직하게 보유한다.',
      category: 'LOSS_RESPONSE',
      isActive: true,
      isUserModified: true,
      sortOrder: 3,
      appliedDate: formatDateKey(getDateBefore(30)),
      recommendationSource: { type: 'USER_CREATED', label: '나의 투자원칙' },
    },
    {
      principleId: 4,
      content: '상위 우량 3개 종목 비중을 60% 이상으로 유지하며 가치 투자를 이행한다.',
      originalContent: '상위 우량 3개 종목 비중을 60% 이상으로 유지하며 가치 투자를 이행한다.',
      category: 'BUY_JUDGMENT_BASIS',
      isActive: true,
      isUserModified: true,
      sortOrder: 4,
      appliedDate: formatDateKey(getDateBefore(30)),
      recommendationSource: { type: 'USER_CREATED', label: '나의 투자원칙' },
    },
    {
      principleId: 5,
      content: '매매 전 작성한 원칙 수칙을 반드시 점검하고 일지에 근거를 기록한다.',
      originalContent: '매매 전 작성한 원칙 수칙을 반드시 점검하고 일지에 근거를 기록한다.',
      category: 'PRINCIPLE_FULFILLMENT',
      isActive: true,
      isUserModified: true,
      sortOrder: 5,
      appliedDate: formatDateKey(getDateBefore(30)),
      recommendationSource: { type: 'USER_CREATED', label: '나의 투자원칙' },
    },
  ]

  return {
    serviceStartedDate: formatDateKey(getDateBefore(MINIMUM_RECORD_DAYS + 1)),
    analysis: tendencyData,
    principles: defaultPrinciples,
  }
}

function writeFlowState(state) {
  window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(state))
  return state
}

function normalizeAnalysisHistory(analysis) {
  if (!analysis) return null

  const history = [...(analysis.history || [])].sort(
    (a, b) => new Date(b.analyzedDate) - new Date(a.analyzedDate),
  )

  return {
    ...analysis,
    history: history.map((item, index) => ({
      ...item,
      label:
        history.length === 1 || index === history.length - 1
          ? '첫 분석'
          : index === 0
            ? '최신 분석'
            : '정기 분석',
    })),
  }
}

function readFlowState() {
  try {
    const storedState = JSON.parse(window.localStorage.getItem(FLOW_STORAGE_KEY) || 'null')

    if (storedState?.serviceStartedDate) {
      return {
        serviceStartedDate: storedState.serviceStartedDate,
        analysis: normalizeAnalysisHistory(storedState.analysis),
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
  const previousHistory = previousAnalysis?.history || []
  const normalizedPreviousHistory = previousHistory.map((item, index) => ({
    ...item,
    label: index === previousHistory.length - 1 ? '첫 분석' : '정기 분석',
  }))
  const historyItem = isReanalysis
    ? {
        analysisRunId,
        analyzedDate,
        label: '최신 분석',
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
    history: [historyItem, ...normalizedPreviousHistory],
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
    recommendations: tendencyData.suggestedPrinciples || [],
  }
}

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

export async function saveUserPrinciples({ principles }) {
  try {
    const payload = {
      principles: (principles || []).map((p, idx) => ({
        recommendationId: p.recommendationId ?? p.recommendationSource?.analysisRunId ?? idx + 1,
        principleText: p.content ?? p.principleText ?? '',
        ruleJson: p.ruleJson ?? { holding: { minimumDays: 90 } },
        sortOrder: p.sortOrder ?? idx + 1,
      })),
    }

    const response = await request('/api/v1/principles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const flowState = readFlowState()
    writeFlowState({
      ...flowState,
      principles,
    })

    return {
      ...response,
      principles: response.principles ?? principles,
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/principles 요청 실패, 목데이터를 사용합니다:', error)
    const flowState = readFlowState()
    writeFlowState({
      ...flowState,
      principles,
    })

    return {
      principles,
    }
  }
}

// 이전 화면에서 사용하던 함수명을 유지합니다.
export const getTendencyAnalysis = getLatestTendencyAnalysis
export const getPrinciples = getUserPrinciples
export const getSuggestedPrinciples = getRecommendedPrinciples
export const savePrinciples = saveUserPrinciples
