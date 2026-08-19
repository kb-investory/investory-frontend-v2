import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { getJournalEntryOnDate } from '@/features/journal/api/journalApi'

const NOTIFICATION_READ_STORAGE_KEY = 'investory:notifications:read:v1'
const SEOUL_TIME_ZONE = 'Asia/Seoul'
const MARKET_OPEN_MINUTES = 9 * 60
const JOURNAL_REMINDER_MINUTES = 18 * 60
const MARKET_WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

const SEOUL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
})

const SEOUL_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: SEOUL_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
})

function getSeoulClock(date = new Date()) {
  const parts = SEOUL_DATE_TIME_FORMATTER.formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const hour = Number(values.hour)
  const minute = Number(values.minute)

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    weekday: values.weekday,
    minuteOfDay: hour * 60 + minute,
  }
}

function getDateKeyFromInstant(instant, fallbackDateKey) {
  if (!instant) return fallbackDateKey
  return getSeoulClock(new Date(instant)).dateKey
}

function getReadNotificationIds() {
  try {
    const storedIds = JSON.parse(window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY) || '[]')
    return new Set(Array.isArray(storedIds) ? storedIds : [])
  } catch {
    return new Set()
  }
}

function formatTradeTime(tradedAt, now = new Date()) {
  if (!tradedAt) return '방금'

  const tradedDate = new Date(tradedAt)
  const elapsedMinutes = Math.floor((now.getTime() - tradedDate.getTime()) / 60000)

  if (elapsedMinutes >= 0 && elapsedMinutes < 1) return '방금'
  if (elapsedMinutes >= 1 && elapsedMinutes < 60) return `${elapsedMinutes}분 전`
  return SEOUL_TIME_FORMATTER.format(tradedDate)
}

function createTradeNotification(trade, dateKey, now, index) {
  const sideLabel = trade.tradeSide === 'SELL' ? '매도' : '매수'
  const securityName = trade.securityName || trade.securityCode || '종목'
  const tradeDateKey = getDateKeyFromInstant(trade.tradedAt, dateKey)

  return {
    id: `trade:${trade.tradeId ?? `${tradeDateKey}:${index}`}`,
    type: 'trade',
    tone: 'slate',
    icon: 'arrow-left-right',
    timeLabel: formatTradeTime(trade.tradedAt, now),
    title: `${securityName} ${sideLabel} 거래가 반영됐어요`,
    description: '거래 내역을 확인하고 판단 근거를 연결해보세요.',
    actionLabel: '거래 확인',
    destination: {
      name: ROUTE_NAMES.JOURNAL_CREATE,
      query: { date: tradeDateKey, from: 'notification' },
    },
    createdAt: trade.tradedAt || now.toISOString(),
  }
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const dailyEntry = ref(null)
  const loadedDateKey = ref('')
  const readNotificationIds = ref(getReadNotificationIds())
  const loading = ref(false)
  const error = ref('')
  const previewing = ref(false)
  let fetchPromise = null

  const unreadCount = computed(
    () => notifications.value.filter((notification) => !notification.read).length,
  )

  function persistReadNotificationIds() {
    window.localStorage.setItem(
      NOTIFICATION_READ_STORAGE_KEY,
      JSON.stringify([...readNotificationIds.value]),
    )
  }

  function applyReadState(items) {
    notifications.value = items.map((item) => ({
      ...item,
      read: readNotificationIds.value.has(item.id),
    }))
  }

  function rebuildNotifications(now = new Date()) {
    const clock = getSeoulClock(now)
    const trades = [...(dailyEntry.value?.trades || [])].sort(
      (left, right) => new Date(right.tradedAt || 0) - new Date(left.tradedAt || 0),
    )
    const items = []

    if (
      clock.minuteOfDay >= JOURNAL_REMINDER_MINUTES &&
      trades.length > 0 &&
      !dailyEntry.value?.journal
    ) {
      items.push({
        id: `journal-reminder:${clock.dateKey}`,
        type: 'journal',
        tone: 'blue',
        icon: 'notebook',
        timeLabel: '오후 6:00',
        title: '오늘 투자일지를 아직 작성하지 않았어요',
        description: `오늘 거래 ${trades.length}건의 판단 근거를 남겨보세요.`,
        actionLabel: '일지 작성',
        destination: {
          name: ROUTE_NAMES.JOURNAL_CREATE,
          query: { date: clock.dateKey, from: 'notification' },
        },
        createdAt: new Date(`${clock.dateKey}T18:00:00+09:00`).toISOString(),
      })
    }

    if (MARKET_WEEKDAYS.has(clock.weekday) && clock.minuteOfDay >= MARKET_OPEN_MINUTES) {
      items.push({
        id: `market-open:${clock.dateKey}`,
        type: 'market',
        tone: 'teal',
        icon: 'shield-check',
        timeLabel: '오전 9:00',
        title: '장이 시작됐어요',
        description: '오늘의 투자원칙을 확인하고 시작하세요.',
        actionLabel: '원칙 확인',
        destination: {
          name: ROUTE_NAMES.TENDENCY,
          query: { tab: 'principles' },
        },
        createdAt: new Date(`${clock.dateKey}T09:00:00+09:00`).toISOString(),
      })
    }

    items.push(
      ...trades.map((trade, index) => createTradeNotification(trade, clock.dateKey, now, index)),
    )

    applyReadState(items)
  }

  async function fetchNotifications({ now = new Date() } = {}) {
    const clock = getSeoulClock(now)

    if (fetchPromise) return fetchPromise

    loading.value = true
    error.value = ''
    previewing.value = false
    fetchPromise = (async () => {
      try {
        dailyEntry.value = await getJournalEntryOnDate(clock.dateKey)
      } catch (requestError) {
        dailyEntry.value = null
        error.value = requestError?.message || '알림 정보를 불러오지 못했어요.'
      } finally {
        loadedDateKey.value = clock.dateKey
        rebuildNotifications(now)
        loading.value = false
        fetchPromise = null
      }

      return notifications.value
    })()

    return fetchPromise
  }

  async function refreshForCurrentTime(now = new Date()) {
    if (previewing.value) return notifications.value
    return await fetchNotifications({ now })
  }

  function markAsRead(notificationId) {
    if (!notificationId || readNotificationIds.value.has(notificationId)) return

    readNotificationIds.value = new Set([...readNotificationIds.value, notificationId])
    persistReadNotificationIds()
    applyReadState(notifications.value)
  }

  function loadPreview(now = new Date()) {
    const clock = getSeoulClock(now)
    previewing.value = true
    loadedDateKey.value = clock.dateKey
    error.value = ''
    loading.value = false

    applyReadState([
      {
        id: `preview-journal:${clock.dateKey}`,
        type: 'journal',
        tone: 'blue',
        icon: 'notebook',
        timeLabel: '오후 6:00',
        title: '오늘 투자일지를 아직 작성하지 않았어요',
        description: '오늘 거래의 판단 근거를 남겨보세요.',
        actionLabel: '일지 작성',
        destination: {
          name: ROUTE_NAMES.JOURNAL_CREATE,
          query: { date: clock.dateKey, from: 'notification' },
        },
        createdAt: now.toISOString(),
      },
      {
        id: `preview-market:${clock.dateKey}`,
        type: 'market',
        tone: 'teal',
        icon: 'shield-check',
        timeLabel: '오전 9:00',
        title: '장이 시작됐어요',
        description: '오늘의 투자원칙 2개를 확인하고 시작하세요.',
        actionLabel: '원칙 확인',
        destination: { name: ROUTE_NAMES.TENDENCY, query: { tab: 'principles' } },
        createdAt: now.toISOString(),
      },
      {
        id: `preview-trade:${clock.dateKey}`,
        type: 'trade',
        tone: 'slate',
        icon: 'arrow-left-right',
        timeLabel: '방금',
        title: '삼성전자 매수 거래가 반영됐어요',
        description: '거래 내역을 확인하고 판단 근거를 연결해보세요.',
        actionLabel: '거래 확인',
        destination: {
          name: ROUTE_NAMES.JOURNAL_CREATE,
          query: { date: clock.dateKey, from: 'notification' },
        },
        createdAt: now.toISOString(),
      },
    ])
  }

  function reset() {
    notifications.value = []
    dailyEntry.value = null
    loadedDateKey.value = ''
    readNotificationIds.value = new Set()
    loading.value = false
    error.value = ''
    previewing.value = false
    fetchPromise = null
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    refreshForCurrentTime,
    markAsRead,
    loadPreview,
    reset,
  }
})
