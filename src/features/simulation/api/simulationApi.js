import simulationData from '@/mocks/data/simulation.json'
import simulationReportData from '@/mocks/data/simulation-report.json'
import {
  liveDailyPerformance,
  liveSimulatedTrades,
} from '@/mocks/data/liveSimulationPerformance.js'
import { request } from '@/shared/api/client'

function clone(value) {
  return structuredClone(value)
}

const compileJobAttempts = new Map()
const MOCK_COMPILE_PROGRESS = [18, 36, 54, 72, 88, 100]
const LATEST_COMPLETED_RESULT_KEY = 'investory:mock:latest-completed-simulation:v2'

function createLatestSimulationResult() {
  return {
    ...simulationData.latest,
    dailyPerformance: liveDailyPerformance,
    simulatedTrades: liveSimulatedTrades,
    totalTradesCount: liveSimulatedTrades.length,
  }
}

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

const DEFAULT_HARDCODED_PROFILE = {
  value: 0.15,
  growth: 0.4,
  quality: 0.2,
  trend: 0.15,
  disclosure: 0.1,
}

function normalizeSnapshot(snapshot) {
  if (!snapshot) return snapshot
  const date = snapshot.snapshotDate || snapshot.performanceDate || ''
  const portfolioValue = snapshot.portfolioValue ?? snapshot.totalEquity ?? 0
  const cash = snapshot.cashBalance ?? snapshot.cash ?? 0

  let cumulativeReturnPercent = snapshot.cumulativeReturnPercent
  if (cumulativeReturnPercent === undefined) {
    if (typeof snapshot.cumulativeReturn === 'number') {
      cumulativeReturnPercent =
        Math.abs(snapshot.cumulativeReturn) <= 2 && snapshot.cumulativeReturn !== 0
          ? snapshot.cumulativeReturn * 100
          : snapshot.cumulativeReturn
    } else {
      cumulativeReturnPercent = 0
    }
  }

  return {
    ...snapshot,
    snapshotDate: date,
    performanceDate: date,
    totalEquity: portfolioValue,
    portfolioValue: portfolioValue,
    cash: cash,
    cashBalance: cash,
    cumulativeReturnPercent: Number(cumulativeReturnPercent) || 0,
  }
}

function normalizeDailyPerformanceArray(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeSnapshot)
}

const MOCK_HISTORY_RECORDS = [
  {
    simulationRunId: 101,
    version: 'v3',
    date: '2026.07.27',
    period: '2026.03.01 ~ 2026.07.29',
    returnPercent: 17.0,
    actualReturnPercent: 5.0,
    status: 'COMPLETED',
  },
  {
    simulationRunId: 102,
    version: 'v2',
    date: '2026.06.18',
    period: '2026.03.01 ~ 2026.06.17',
    returnPercent: 11.4,
    actualReturnPercent: 3.2,
    status: 'COMPLETED',
  },
  {
    simulationRunId: 103,
    version: 'v2',
    date: '2026.05.02',
    period: '2026.03.01 ~ 2026.05.01',
    returnPercent: 9.8,
    actualReturnPercent: 2.1,
    status: 'COMPLETED',
  },
  {
    simulationRunId: 104,
    version: 'v1',
    date: '2026.03.21',
    period: '2026.03.01 ~ 2026.03.20',
    returnPercent: 6.2,
    actualReturnPercent: 1.0,
    status: 'COMPLETED',
  },
]

export async function getSimulationHistory() {
  try {
    return await request('/api/v1/simulations/history')
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulations/history 요청 실패, 목데이터를 사용합니다:', error)
    const completedResult = await getLatestCompletedSimulationResult()
    return completedResult ? clone(MOCK_HISTORY_RECORDS) : []
  }
}

export async function getInitialCapital(startDate) {
  try {
    const query = new URLSearchParams({
      start_date: startDate ?? '2026-03-01',
      account_id: 1,
    }).toString()
    return await request(`/api/v1/simulations/initial-capital?${query}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulations/initial-capital 요청 실패, 기본값을 사용합니다:', error)
    return { totalInitialCapital: 5000000.0 }
  }
}

export async function getSimulationOverview(params = {}) {
  try {
    const query = new URLSearchParams({
      start_date: params.startDate ?? '2026-03-01',
      account_id: params.accountId ?? 1,
    }).toString()
    return await request(`/api/v1/simulations/overview?${query}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulations/overview 요청 실패, 목데이터를 사용합니다:', error)
    return clone(simulationData.overview)
  }
}

export async function getLatestSimulationResult() {
  try {
    const data = await request('/api/v1/simulations/latest')
    const dailyPerformance = normalizeDailyPerformanceArray(
      data.dailyPerformance || data.dailySnapshots,
    )
    return {
      ...data,
      dailyPerformance,
      dailySnapshots: dailyPerformance,
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulations/latest 요청 실패, 목데이터를 사용합니다:', error)
    return getLatestCompletedSimulationResult()
  }
}

export async function getLatestCompletedSimulationResult() {
  try {
    const storedResult = JSON.parse(
      window.localStorage.getItem(LATEST_COMPLETED_RESULT_KEY) || 'null',
    )
    return storedResult ? clone(storedResult) : null
  } catch {
    window.localStorage.removeItem(LATEST_COMPLETED_RESULT_KEY)
    return null
  }
}

export async function saveLatestCompletedSimulationResult(result) {
  const completedResult = JSON.parse(JSON.stringify(result || createLatestSimulationResult()))
  window.localStorage.setItem(LATEST_COMPLETED_RESULT_KEY, JSON.stringify(completedResult))
  return clone(completedResult)
}

export async function compileSimulationBot(payload = {}) {
  try {
    const requestBody = {
      principles: payload.principles ?? [
        '익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절',
        '단일 종목 보유 수 최대 5개',
      ],
      profile: payload.profile ?? DEFAULT_HARDCODED_PROFILE,
    }
    const response = await request('/api/v1/simulation-bots/compile', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
    compileJobAttempts.set(response.jobId, 0)
    return response
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulation-bots/compile 요청 실패, 목데이터를 사용합니다:', error)
    const response = clone(simulationData.compileResponse)
    compileJobAttempts.set(response.jobId, 0)
    return response
  }
}

export async function getSimulationBotCompileJob(jobId) {
  try {
    return await request(`/api/v1/simulation-bots/compile-jobs/${jobId}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(
      `API /api/v1/simulation-bots/compile-jobs/${jobId} 요청 실패, 목데이터를 사용합니다:`,
      error,
    )
    const attempts = (compileJobAttempts.get(jobId) ?? 0) + 1
    compileJobAttempts.set(jobId, attempts)

    const job = clone(simulationData.compileJobs[jobId] ?? simulationData.compileJobs.JOB_794FF6CC)
    const progressIndex = Math.min(attempts - 1, MOCK_COMPILE_PROGRESS.length - 1)
    const progressPercent = MOCK_COMPILE_PROGRESS[progressIndex]

    if (progressPercent === 100) {
      return {
        ...job,
        status: 'COMPLETED',
        progressPercent: 100,
        message: 'AI 원칙 봇 전략 생성이 완료되었습니다.',
      }
    }

    return {
      ...job,
      status: 'RUNNING',
      progressPercent,
      message: '최근 거래 기록과 투자 원칙을 분석하고 있습니다.',
    }
  }
}

export async function getSimulationComparators() {
  try {
    return await request('/api/v1/simulation-bots/comparators')
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulation-bots/comparators 요청 실패, 목데이터를 사용합니다:', error)
    return clone(simulationData.comparators)
  }
}

export async function runSimulation(payload = {}) {
  try {
    const requestBody = {
      simulationRunId: payload.simulationRunId ?? 101,
      periodStart: payload.periodStart ?? '2026-03-01',
      periodEnd: payload.periodEnd ?? '2026-07-29',
      initialCapital: payload.initialCapital ?? 5000000.0,
      principles: payload.principles ?? [
        '익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절',
      ],
      participantTypes: payload.participantTypes ?? [
        'ACTUAL_USER',
        'PERSONAL_BOT',
        'FAMOUS_STRATEGY',
      ],
    }
    const response = await request('/api/v1/simulations/run', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
    const dailyPerformance = normalizeDailyPerformanceArray(
      response.dailyPerformance || response.dailySnapshots,
    )
    return {
      ...response,
      dailyPerformance,
      dailySnapshots: dailyPerformance,
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /api/v1/simulations/run 요청 실패, 목데이터를 사용합니다:', error)
    return {
      ...clone(simulationData.run),
      dailySnapshots: clone(liveDailyPerformance),
    }
  }
}

export async function getSimulationDetail(simulationId) {
  try {
    const response = await request(`/api/v1/simulations/${simulationId}`)
    const dailyPerformance = normalizeDailyPerformanceArray(
      response.dailyPerformance || response.dailySnapshots,
    )
    return {
      ...response,
      dailyPerformance,
      dailySnapshots: dailyPerformance,
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /api/v1/simulations/${simulationId} 요청 실패, 목데이터를 사용합니다:`, error)
    return clone(simulationData.details[String(simulationId)] ?? simulationData.details['101'])
  }
}

// GET /api/v1/simulations/{simulationId}/report
export async function getSimulationReport(simulationId) {
  try {
    return await request(`/api/v1/simulations/${simulationId}/report`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    const report =
      simulationReportData.reports[String(simulationId)] ?? simulationReportData.reports['101']
    return clone(report)
  }
}

export async function getSimulationMessages() {
  return clone(simulationData.messages)
}

export async function sendSimulationMessage(text) {
  const userMessage = {
    id: Date.now(),
    sender: 'USER',
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  simulationData.messages.push(userMessage)

  const botReply = {
    id: Date.now() + 1,
    sender: 'BOT',
    text: `'${text}' 의견을 반영했습니다. 원칙 준수율 기반으로 보조 분석 시뮬레이션을 진행합니다.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  simulationData.messages.push(botReply)

  return [userMessage, botReply]
}

// Store compatibility aliases
export const getConversationMessages = getSimulationMessages
export const getSimulationSessions = getSimulationMessages
export const sendUserMessage = sendSimulationMessage
export const sendSimulationPrompt = sendSimulationMessage
