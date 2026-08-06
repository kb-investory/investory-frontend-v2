import homeData from '@/mocks/data/home.json'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function formatLocalDate(date) {
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
  const dashboard = clone(homeData.dashboard)

  return {
    ...dashboard,
    weekly: buildWeeklyRecordRhythm(dashboard.weekly, homeData.weeklyActivity, today),
  }
}

export async function getSummary() {
  return homeData.summary
}

export async function getHoldings() {
  return homeData.holdings
}

export async function getAccountsSummary() {
  return {
    summary: homeData.summary,
    accounts: homeData.accounts ?? [],
  }
}
