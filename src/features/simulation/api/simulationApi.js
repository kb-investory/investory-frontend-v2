import simulationData from '@/mocks/data/simulation.json'
import { getSecurityDetailById } from '@/features/market/api/marketApi'
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

const securityDetailCache = new Map()

function isPlaceholderSecurityName(name, securityId) {
  if (!name?.trim()) return true

  const normalizedName = name.trim()
  return (
    /^종목\s*#?\d+$/u.test(normalizedName) ||
    (securityId != null && normalizedName === String(securityId))
  )
}

function resolveSecurityId(item) {
  if (item?.securityId != null) return item.securityId

  const placeholderText = [item?.securityName, item?.action].find((value) =>
    /^종목\s*#?\d+/u.test(value?.trim()),
  )
  return placeholderText?.trim().match(/^종목\s*#?(\d+)/u)?.[1] ?? null
}

async function getCachedSecurityDetail(securityId) {
  if (securityId == null) return null

  const cacheKey = String(securityId)
  if (!securityDetailCache.has(cacheKey)) {
    securityDetailCache.set(
      cacheKey,
      getSecurityDetailById(securityId).catch(() => {
        securityDetailCache.delete(cacheKey)
        return null
      }),
    )
  }

  return await securityDetailCache.get(cacheKey)
}

async function enrichSecurityDetails(items) {
  if (!Array.isArray(items) || !items.length) return items

  return await Promise.all(
    items.map(async (item) => {
      const securityId = resolveSecurityId(item)
      if (!securityId || !isPlaceholderSecurityName(item.securityName, securityId)) {
        return item
      }

      const security = await getCachedSecurityDetail(securityId)
      if (!security) return item
      const resolvedName = security.securityName ?? security.securityCode

      return {
        ...item,
        securityId: security.securityId ?? securityId,
        securityCode: security.securityCode ?? item.securityCode,
        securityName: security.securityName ?? item.securityName,
        action: resolvedName ? item.action?.replace(/^종목\s*#?\d+/u, resolvedName) : item.action,
      }
    }),
  )
}

async function normalizeSimulationReport(data) {
  if (!data) return data

  const [decisionReviews, evidenceReviews] = await Promise.all([
    enrichSecurityDetails(data.decisionReviews),
    enrichSecurityDetails(data.evidenceReviews),
  ])

  return {
    ...data,
    decisionReviews,
    evidenceReviews,
  }
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

function normalizeSimulatedTrade(trade) {
  if (!trade) return trade

  return {
    ...trade,
    simulatedTradeId: trade.simulatedTradeId ?? trade.simulated_trade_id,
    simulationVariantId: trade.simulationVariantId ?? trade.simulation_variant_id,
    securityId: trade.securityId ?? trade.security_id,
    securityCode: trade.securityCode ?? trade.security_code ?? '',
    securityName: trade.securityName ?? trade.security_name ?? '',
    tradeSide: trade.tradeSide ?? trade.trade_side,
    tradedAt: trade.tradedAt ?? trade.traded_at,
    unitPrice: trade.unitPrice ?? trade.unit_price,
    decisionReason: trade.decisionReason ?? trade.decision_reason ?? '',
  }
}

function normalizePositionSnapshot(snapshot) {
  if (!snapshot) return snapshot

  return {
    ...snapshot,
    simulationVariantId: snapshot.simulationVariantId ?? snapshot.simulation_variant_id,
    snapshotDate: snapshot.snapshotDate ?? snapshot.snapshot_date,
    securityId: snapshot.securityId ?? snapshot.security_id,
    securityCode: snapshot.securityCode ?? snapshot.security_code ?? '',
    securityName: snapshot.securityName ?? snapshot.security_name ?? '',
    averagePrice: snapshot.averagePrice ?? snapshot.average_price ?? 0,
    currentPrice: snapshot.currentPrice ?? snapshot.current_price ?? 0,
    marketValue: snapshot.marketValue ?? snapshot.market_value ?? 0,
    unrealizedPnl: snapshot.unrealizedPnl ?? snapshot.unrealized_pnl ?? 0,
    returnPercent: snapshot.returnPercent ?? snapshot.return_percent ?? 0,
  }
}

async function normalizeSimulationResult(data) {
  if (!data) return data

  const dailyPerformance = normalizeDailyPerformanceArray(
    data.dailyPerformance || data.dailySnapshots,
  )
  const rawSimulatedTrades = data.simulatedTrades ?? data.simulated_trades
  const normalizedTrades = Array.isArray(rawSimulatedTrades)
    ? rawSimulatedTrades.map(normalizeSimulatedTrade)
    : []
  const rawPositionSnapshots = data.positionSnapshots ?? data.position_snapshots
  const normalizedPositionSnapshots = Array.isArray(rawPositionSnapshots)
    ? rawPositionSnapshots.map(normalizePositionSnapshot)
    : null
  const [simulatedTrades, positionSnapshots] = await Promise.all([
    enrichSecurityDetails(normalizedTrades),
    enrichSecurityDetails(normalizedPositionSnapshots),
  ])

  return {
    ...data,
    dailyPerformance,
    dailySnapshots: dailyPerformance,
    simulatedTrades,
    positionSnapshots,
  }
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
  return await normalizeSimulationResult(data)
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
  return await normalizeSimulationResult(response)
}

export async function getSimulationDetail(simulationId) {
  const response = await request(`/api/v1/simulations/${simulationId}`)
  return await normalizeSimulationResult(response)
}

// GET /api/v1/simulations/{simulationId}/report
export async function getSimulationReport(simulationId) {
  const response = await request(`/api/v1/simulations/${simulationId}/report`)
  return await normalizeSimulationReport(response)
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
