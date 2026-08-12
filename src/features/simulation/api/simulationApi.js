import simulationData from '@/mocks/data/simulation.json'
import { request } from '@/shared/api/client'

function clone(value) {
  return structuredClone(value)
}

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

export async function getSimulationHistory() {
  return await request('/api/v1/simulations/history')
}

export async function getInitialCapital(startDate, accountId, { signal } = {}) {
  const query = new URLSearchParams({
    start_date: startDate,
    account_id: accountId,
  }).toString()
  return await request(`/api/v1/simulations/initial-capital?${query}`, { signal })
}

export async function getSimulationOverview(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.startDate) searchParams.set('start_date', params.startDate)
  if (params.accountId) searchParams.set('account_id', params.accountId)
  const query = searchParams.toString()
  return await request(`/api/v1/simulations/overview${query ? `?${query}` : ''}`)
}

export async function getLatestSimulationResult() {
  const data = await request('/api/v1/simulations/latest')
  const dailyPerformance = normalizeDailyPerformanceArray(
    data.dailyPerformance || data.dailySnapshots,
  )
  return {
    ...data,
    dailyPerformance,
    dailySnapshots: dailyPerformance,
  }
}

export async function getLatestCompletedSimulationResult() {
  return await getLatestSimulationResult()
}

export async function saveLatestCompletedSimulationResult(result) {
  if (!result) throw new Error('저장할 시뮬레이션 결과가 없습니다.')
  return clone(result)
}

export async function compileSimulationBot(payload = {}) {
  const requestBody = {
    principles: payload.principles ?? [
      '익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절',
      '단일 종목 보유 수 최대 5개',
    ],
    profile: payload.profile ?? DEFAULT_HARDCODED_PROFILE,
  }
  return await request('/api/v1/simulation-bots/compile', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })
}

export async function getSimulationBotCompileJob(jobId) {
  return await request(`/api/v1/simulation-bots/compile-jobs/${jobId}`)
}

export async function getSimulationComparators() {
  return await request('/api/v1/simulation-bots/comparators')
}

export async function runSimulation(payload = {}) {
  const requestBody = {
    simulationRunId: payload.simulationRunId ?? 101,
    periodStart: payload.periodStart ?? '2026-03-01',
    periodEnd: payload.periodEnd ?? '2026-07-29',
    initialCapital: payload.initialCapital ?? 5000000.0,
    principles: payload.principles ?? ['익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절'],
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
}

export async function getSimulationDetail(simulationId) {
  const response = await request(`/api/v1/simulations/${simulationId}`)
  const dailyPerformance = normalizeDailyPerformanceArray(
    response.dailyPerformance || response.dailySnapshots,
  )
  return {
    ...response,
    dailyPerformance,
    dailySnapshots: dailyPerformance,
  }
}

// GET /api/v1/simulations/{simulationId}/report
export async function getSimulationReport(simulationId) {
  return await request(`/api/v1/simulations/${simulationId}/report`)
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
