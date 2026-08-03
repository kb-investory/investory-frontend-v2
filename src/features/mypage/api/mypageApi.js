import mypageData from '@/mocks/data/mypage.json'

export async function getProfile() {
  return mypageData.profile
}

export async function getConnectedBrokerages() {
  return mypageData.brokerages
}

export async function getNotifications() {
  return mypageData.notifications
}

export async function markNotificationAsRead(id) {
  const notif = mypageData.notifications.find((n) => n.id === id)
  if (notif) notif.isRead = true
  return true
}

// Store compatibility aliases
export const getUserProfile = getProfile
export const getConnectedAccounts = getConnectedBrokerages
export const getUserNotifications = getNotifications
