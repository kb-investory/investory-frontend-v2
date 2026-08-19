import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notificationApi'

const NOTIFICATION_PAGE_SIZE = 20

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const page = ref(0)
  const hasMore = ref(false)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')

  async function fetchNotifications({ isRead } = {}) {
    loading.value = true
    error.value = ''

    try {
      const response = await getNotifications({ page: 0, size: NOTIFICATION_PAGE_SIZE, isRead })
      notifications.value = response.content || []
      unreadCount.value = response.unreadCount ?? unreadCount.value
      page.value = 0
      hasMore.value = notifications.value.length < (response.totalElements ?? 0)
    } catch (fetchError) {
      error.value = fetchError?.message || '알림을 불러오지 못했어요.'
    } finally {
      loading.value = false
    }
  }

  async function fetchMoreNotifications({ isRead } = {}) {
    if (loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    try {
      const nextPage = page.value + 1
      const response = await getNotifications({
        page: nextPage,
        size: NOTIFICATION_PAGE_SIZE,
        isRead,
      })
      notifications.value = [...notifications.value, ...(response.content || [])]
      unreadCount.value = response.unreadCount ?? unreadCount.value
      page.value = nextPage
      hasMore.value = notifications.value.length < (response.totalElements ?? 0)
    } catch {
      // 추가 로딩 실패는 이미 보여준 목록에 영향을 주지 않는다.
    } finally {
      loadingMore.value = false
    }
  }

  async function refreshUnreadCount() {
    try {
      const response = await getUnreadNotificationCount()
      unreadCount.value = response.unreadCount ?? unreadCount.value
    } catch {
      // 헤더 뱃지 갱신 실패는 조용히 무시한다.
    }
  }

  async function markAsRead(notificationId) {
    const target = notifications.value.find(
      (notification) => notification.notificationId === notificationId,
    )
    if (!target || target.isRead) return

    target.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)

    try {
      await markNotificationRead(notificationId)
    } catch {
      // 서버 반영 실패해도 화면엔 이미 읽음으로 표시된 채 유지한다 — 다음 목록 갱신 때 맞춰진다.
    }
  }

  async function markAllAsRead() {
    const hadUnread = notifications.value.some((notification) => !notification.isRead)
    notifications.value = notifications.value.map((notification) => ({
      ...notification,
      isRead: true,
    }))
    unreadCount.value = 0

    if (!hadUnread) return

    try {
      await markAllNotificationsRead()
    } catch {
      // 실패해도 목록은 이미 읽음으로 보여준다.
    }
  }

  function reset() {
    notifications.value = []
    unreadCount.value = 0
    page.value = 0
    hasMore.value = false
    loading.value = false
    loadingMore.value = false
    error.value = ''
  }

  return {
    notifications,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    error,
    fetchNotifications,
    fetchMoreNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    reset,
  }
})
