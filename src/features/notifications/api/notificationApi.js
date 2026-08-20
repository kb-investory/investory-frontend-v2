import notificationData from '@/mocks/data/notifications.json'
import { request } from '@/shared/api/client'

const USE_MOCK_NOTIFICATION =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_NOTIFICATION === 'true'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

let mockNotifications = null
let mockSettings = null

function getMockNotifications() {
  if (!mockNotifications) mockNotifications = clone(notificationData.notifications || [])
  return mockNotifications
}

function getMockSettings() {
  if (!mockSettings) mockSettings = clone(notificationData.settings || {})
  return mockSettings
}

function getMockUnreadCount() {
  return getMockNotifications().filter((notification) => !notification.isRead).length
}

export async function getNotifications({ page = 0, size = 20, isRead } = {}) {
  if (USE_MOCK_NOTIFICATION) {
    const all = getMockNotifications()
    const filtered =
      isRead == null ? all : all.filter((notification) => notification.isRead === isRead)
    const start = page * size
    return {
      content: clone(filtered.slice(start, start + size)),
      page,
      size,
      totalElements: filtered.length,
      unreadCount: getMockUnreadCount(),
    }
  }

  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (isRead != null) params.set('isRead', String(isRead))
  return await request(`/notifications?${params.toString()}`)
}

export async function getNotification(notificationId) {
  if (USE_MOCK_NOTIFICATION) {
    const found = getMockNotifications().find(
      (notification) => notification.notificationId === notificationId,
    )
    if (!found) throw new Error('NOTIFICATION_NOT_FOUND')
    return clone(found)
  }

  return await request(`/notifications/${notificationId}`)
}

export async function markNotificationRead(notificationId) {
  if (USE_MOCK_NOTIFICATION) {
    const found = getMockNotifications().find(
      (notification) => notification.notificationId === notificationId,
    )
    if (found && !found.isRead) {
      found.isRead = true
      found.readAt = new Date().toISOString()
    }
    return clone(found)
  }

  return await request(`/notifications/${notificationId}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead() {
  if (USE_MOCK_NOTIFICATION) {
    const readAt = new Date().toISOString()
    let updatedCount = 0
    getMockNotifications().forEach((notification) => {
      if (!notification.isRead) {
        notification.isRead = true
        notification.readAt = readAt
        updatedCount += 1
      }
    })
    return { updatedCount, readAt }
  }

  return await request('/notifications/read-all', { method: 'PATCH' })
}

export async function getUnreadNotificationCount() {
  if (USE_MOCK_NOTIFICATION) {
    return { unreadCount: getMockUnreadCount() }
  }

  return await request('/notifications/unread-count')
}

export async function getNotificationSettings() {
  if (USE_MOCK_NOTIFICATION) return clone(getMockSettings())
  return await request('/users/me/notification-settings')
}

export async function updateNotificationSettings(settings) {
  if (USE_MOCK_NOTIFICATION) {
    mockSettings = clone(settings)
    return clone(mockSettings)
  }

  return await request('/users/me/notification-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
