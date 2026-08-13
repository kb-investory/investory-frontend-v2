import { getBrokerAccounts, getBrokerConnections } from '@/features/mypage/api/brokerConnectionApi'
import { getJournalEntries, getJournalEntryOnDate } from '@/features/journal/api/journalApi'
import { getLedgerHoldings } from '@/features/ledger/api/ledgerApi'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

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
      .filter((activity) => activity.activityDate <= todayKey)
      .map((activity) => activity.activityDate),
  )
  const weekStart = getWeekStart(today)
  const days = DAY_LABELS.map((label, index) => {
    const date = formatLocalDate(addDays(weekStart, index))
    const tradeCount = activityMap.get(date) ?? 0
    const completed = date <= todayKey && activityMap.has(date)

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
    description: '투자일지를 작성한 날을 한눈에 확인해요.',
    insight: completedDates.size
      ? `이번 주 ${completedDates.size}일의 투자 기록을 남겼어요.`
      : '이번 주 첫 투자 기록을 남겨보세요.',
  }
}

export async function getHomeDashboard(today = new Date()) {
  const todayStr = formatLocalDate(today)
  const weekStart = getWeekStart(today)
  const weekEnd = addDays(weekStart, 6)
  const weekStartStr = formatLocalDate(weekStart)
  const weekEndStr = formatLocalDate(weekEnd)

  const [entriesData, todayData, connectionsData] = await Promise.all([
    getJournalEntries({ startDate: weekStartStr, endDate: weekEndStr }),
    getJournalEntryOnDate(todayStr),
    getBrokerConnections(),
  ])

  const entries = entriesData?.entries || []
  const connections = connectionsData?.connections || []
  const trades = todayData?.trades || []
  const buyTrades = trades.filter((trade) => trade.tradeSide === 'BUY').length
  const sellTrades = trades.filter((trade) => trade.tradeSide === 'SELL').length
  const missingReasons = trades.filter((trade) => !trade.note?.rationaleText).length
  const uniqueStocks = new Set(
    trades.map((trade) => trade.securityId || trade.securityCode).filter(Boolean),
  ).size
  const isTodayJournalWritten = Boolean(todayData?.journal)
  const activities = entries.map((entry) => ({
    activityDate: entry.journalDate,
    tradeCount: entry.tradeCount ?? 0,
  }))

  return {
    today: {
      title: isTodayJournalWritten
        ? '오늘의 기록이 완성되었습니다'
        : '오늘의 선택을 기록으로 이어가요',
      totalTrades: trades.length,
      buyTrades,
      sellTrades,
      stockCount: uniqueStocks,
      missingReasons,
    },
    quickActions: {
      journalStatus: isTodayJournalWritten ? '작성 완료' : '작성 전',
      tendencyProgress: '6 / 10',
      connectionCount: connections.length,
    },
    weekly: buildWeeklyRecordRhythm({ streakDays: 0, days: [] }, activities, today),
  }
}

export async function getSummary() {
  const brokerData = await getBrokerAccounts()
  return {
    totalMarketValue: brokerData?.summary?.totalMarketValue ?? 0,
    totalUnrealizedPnl: brokerData?.summary?.totalUnrealizedPnl ?? 0,
  }
}

export async function getHoldings() {
  const holdingsData = await getLedgerHoldings()
  return (holdingsData?.holdings || []).map((holding) => ({
    securityId: holding.securityId,
    securityName: holding.securityName || holding.name || holding.securityCode,
    name: holding.securityName || holding.name || holding.securityCode,
    symbol: holding.securityCode || holding.symbol || '',
    quantity: holding.quantity,
    avgCost: holding.averagePurchasePrice ?? holding.averageCost ?? holding.avgCost ?? 0,
    averageCost: holding.averagePurchasePrice ?? holding.averageCost ?? holding.avgCost ?? 0,
    currentPrice: holding.currentPrice || holding.averagePurchasePrice || 0,
    valuationAmount: holding.marketValue ?? holding.valuationAmount ?? 0,
    unrealizedPnl: holding.profitLossAmount ?? holding.unrealizedPnl ?? 0,
    returnRate: holding.returnRate ?? 0,
    holdingRatio: holding.portfolioWeight ?? 0,
  }))
}

export async function getAccountsSummary() {
  const brokerData = await getBrokerAccounts()
  return {
    summary: {
      accountCount: brokerData?.summary?.accountCount ?? 0,
      totalMarketValue: brokerData?.summary?.totalMarketValue ?? 0,
      totalUnrealizedPnl: brokerData?.summary?.totalUnrealizedPnl ?? 0,
    },
    accounts: brokerData?.accounts ?? [],
  }
}
