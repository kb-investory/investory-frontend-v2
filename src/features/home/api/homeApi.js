import homeData from '@/mocks/data/home.json'
import { getBrokerAccounts, getBrokerConnections } from '@/features/mypage/api/brokerConnectionApi'
import { getJournalEntries, getJournalEntryOnDate } from '@/features/journal/api/journalApi'
import { getLedgerHoldings } from '@/features/ledger/api/ledgerApi'

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(date, amount) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)

  return nextDate
}

function getWeekStart(date) {
  const startDate = new Date(date)
  const daysSinceMonday = (startDate.getDay() + 6) % 7

  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - daysSinceMonday)

  return startDate
}

function getActivityTone(tradeCount) {
  return tradeCount >= 3 ? 'blue' : 'teal'
}

function getStreakDays(activityDates, today) {
  let streakDays = 0
  let cursor = new Date(today)

  while (activityDates.has(formatLocalDate(cursor))) {
    streakDays += 1
    cursor = addDays(cursor, -1)
  }

  return streakDays
}

function buildWeeklyRecordRhythm(weekly, activities, today) {
  const todayKey = formatLocalDate(today)
  const activityMap = new Map(
    activities.map((activity) => [activity.activityDate, activity.tradeCount]),
  )
  const completedDates = new Set(
    activities
      .filter((activity) => activity.activityDate <= todayKey && activity.tradeCount > 0)
      .map((activity) => activity.activityDate),
  )
  const weekStart = getWeekStart(today)
  const days = DAY_LABELS.map((label, index) => {
    const date = formatLocalDate(addDays(weekStart, index))
    const tradeCount = activityMap.get(date) ?? 0
    const completed = date <= todayKey && tradeCount > 0

    return {
      date,
      label,
      completed,
      tradeCount: completed ? tradeCount : 0,
      tone: completed ? getActivityTone(tradeCount) : 'empty',
    }
  })

  return {
    ...weekly,
    streakDays: getStreakDays(completedDates, today),
    days,
  }
}

export async function getHomeDashboard(today = new Date()) {
  try {
    const todayStr = formatLocalDate(today)
    const weekStart = getWeekStart(today)
    const weekEnd = addDays(weekStart, 6)
    const weekStartStr = formatLocalDate(weekStart)
    const weekEndStr = formatLocalDate(weekEnd)

    const [entriesRes, todayRes, connectionsRes] = await Promise.allSettled([
      getJournalEntries({ startDate: weekStartStr, endDate: weekEndStr }),
      getJournalEntryOnDate(todayStr),
      getBrokerConnections(),
    ])

    const entries = entriesRes.status === 'fulfilled' ? entriesRes.value?.entries || [] : []
    const todayData = todayRes.status === 'fulfilled' ? todayRes.value || {} : {}
    const connections = connectionsRes.status === 'fulfilled' ? connectionsRes.value?.connections || [] : []

    const trades = todayData.trades || []
    const buyTrades = trades.filter((t) => t.tradeSide === 'BUY').length
    const sellTrades = trades.filter((t) => t.tradeSide === 'SELL').length
    const missingReasons = trades.filter((t) => !t.note?.rationaleText).length
    const uniqueStocks = new Set(trades.map((t) => t.securityId || t.securityCode)).size

    const isTodayJournalWritten = Boolean(todayData.journal)

    const activities = entries.map((entry) => ({
      activityDate: entry.journalDate,
      tradeCount: entry.tradeCount ?? 1,
    }))

    const defaultToday = USE_MOCK_FALLBACK
      ? homeData.dashboard.today
      : { totalTrades: 0, buyTrades: 0, sellTrades: 0, stockCount: 0, missingReasons: 0 }

    const dashboard = {
      today: {
        title: isTodayJournalWritten ? '오늘의 기록이 완성되었습니다' : '오늘의 선택을 기록으로 이어가요',
        totalTrades: trades.length ? trades.length : defaultToday.totalTrades,
        buyTrades: trades.length ? buyTrades : defaultToday.buyTrades,
        sellTrades: trades.length ? sellTrades : defaultToday.sellTrades,
        stockCount: trades.length ? uniqueStocks : defaultToday.stockCount,
        missingReasons: trades.length ? missingReasons : defaultToday.missingReasons,
      },
      quickActions: {
        journalStatus: isTodayJournalWritten ? '작성 완료' : '작성 전',
        tendencyProgress: '6 / 10',
        connectionCount: connections.length,
      },
      weekly: buildWeeklyRecordRhythm(
        USE_MOCK_FALLBACK ? homeData.dashboard.weekly : { streakDays: 0, days: [] },
        activities,
        today,
      ),
    }

    return dashboard
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('홈 대시보드 API 조합 실패, 목데이터를 사용합니다:', error)
    const dashboard = clone(homeData.dashboard)
    return {
      ...dashboard,
      weekly: buildWeeklyRecordRhythm(dashboard.weekly, homeData.weeklyActivity, today),
    }
  }
}

export async function getSummary() {
  try {
    const brokerRes = await getBrokerAccounts()
    if (brokerRes?.summary) {
      return {
        ...(USE_MOCK_FALLBACK ? homeData.summary : {}),
        totalMarketValue: brokerRes.summary.totalMarketValue ?? 0,
        totalUnrealizedPnl: brokerRes.summary.totalUnrealizedPnl ?? 0,
      }
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
  }
  return USE_MOCK_FALLBACK ? homeData.summary : { totalMarketValue: 0, totalUnrealizedPnl: 0 }
}

export async function getHoldings() {
  try {
    const res = await getLedgerHoldings()
    if (Array.isArray(res?.holdings)) {
      return res.holdings.map((h) => ({
        securityId: h.securityId,
        securityName: h.securityName || h.name || h.securityCode,
        name: h.securityName || h.name || h.securityCode,
        symbol: h.securityCode || h.symbol || '',
        quantity: h.quantity,
        avgCost: h.averagePurchasePrice ?? h.averageCost ?? h.avgCost ?? 0,
        averageCost: h.averagePurchasePrice ?? h.averageCost ?? h.avgCost ?? 0,
        currentPrice: h.currentPrice || h.averagePurchasePrice || 0,
        valuationAmount: h.marketValue ?? h.valuationAmount ?? 0,
        unrealizedPnl: h.profitLossAmount ?? h.unrealizedPnl ?? 0,
        returnRate: h.returnRate ?? 0,
        holdingRatio: h.portfolioWeight ?? 0,
      }))
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
  }
  return USE_MOCK_FALLBACK ? homeData.holdings : []
}

export async function getAccountsSummary() {
  try {
    const brokerRes = await getBrokerAccounts()
    if (brokerRes) {
      return {
        summary: {
          accountCount: brokerRes.summary?.accountCount ?? 0,
          totalMarketValue: brokerRes.summary?.totalMarketValue ?? 0,
          totalUnrealizedPnl: brokerRes.summary?.totalUnrealizedPnl ?? 0,
        },
        accounts: brokerRes.accounts ?? [],
      }
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
  }
  return USE_MOCK_FALLBACK
    ? { summary: homeData.summary, accounts: homeData.accounts ?? [] }
    : { summary: { accountCount: 0, totalMarketValue: 0, totalUnrealizedPnl: 0 }, accounts: [] }
}
