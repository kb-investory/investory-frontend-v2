import mypageData from '@/mocks/data/mypage.json'

const MYPAGE_STORAGE_KEY = 'investory:mock:mypage:v4'
const MOCK_DELAY = 450

function clone(value) {
  return structuredClone(value)
}

function wait(delay = MOCK_DELAY) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delay))
}

function getInitialState() {
  return {
    profile: clone(mypageData.profile),
    recentSimulation: clone(mypageData.recentSimulation),
    accounts: clone(mypageData.accounts),
    accountDetails: clone(mypageData.accountDetails),
    appInfo: clone(mypageData.appInfo),
  }
}

function writeState(state) {
  window.localStorage.setItem(MYPAGE_STORAGE_KEY, JSON.stringify(state))
  return state
}

function readState() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MYPAGE_STORAGE_KEY) || 'null')
    if (stored?.profile && Array.isArray(stored.accounts)) return stored
  } catch {
    // 손상된 목 데이터는 초기 상태로 복구합니다.
  }

  return writeState(getInitialState())
}

function getLocalIsoString() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offset).toISOString().replace('Z', '+09:00')
}

export async function getMypageOverview() {
  await wait(180)
  return clone(readState())
}

export async function getProfile() {
  return clone(readState().profile)
}

export async function updateUserProfile({ name, profileImageUrl }) {
  await wait()
  if (name.trim() === '저장실패') throw new Error('프로필을 저장하지 못했어요.')

  const state = readState()
  state.profile = {
    ...state.profile,
    name: name.trim(),
    profileImageUrl: profileImageUrl || state.profile.profileImageUrl,
  }
  writeState(state)
  return clone(state.profile)
}

export async function getConnectedAccounts() {
  await wait(180)
  return { accounts: clone(readState().accounts) }
}

export async function getConnectedAccountDetail(accountId) {
  await wait(180)
  const state = readState()
  const account = state.accounts.find((item) => item.accountId === Number(accountId))
  if (!account) return null

  return {
    ...clone(account),
    ...clone(state.accountDetails?.[String(account.accountId)] || {}),
  }
}

export async function syncConnectedAccount(accountId) {
  await wait(850)
  const state = readState()
  const numericAccountId = Number(accountId)
  const syncedAt = getLocalIsoString()

  state.accounts = state.accounts.map((account) =>
    account.accountId === numericAccountId
      ? {
          ...account,
          status: 'CONNECTED',
          statusLabel: '연결됨',
          lastSyncedAt: syncedAt,
          syncErrorReason: '',
        }
      : account,
  )

  const detailKey = String(numericAccountId)
  if (state.accountDetails?.[detailKey]) {
    state.accountDetails[detailKey] = {
      ...state.accountDetails[detailKey],
      holdingSnapshot: {
        ...state.accountDetails[detailKey].holdingSnapshot,
        reflectedAt: syncedAt,
      },
    }
  }

  writeState(state)
  return getConnectedAccountDetail(numericAccountId)
}

export async function syncConnectedAccounts() {
  await wait(950)
  const state = readState()
  const syncedAt = getLocalIsoString()

  state.accounts = state.accounts.map((account) =>
    account.status === 'AUTH_EXPIRED'
      ? account
      : {
          ...account,
          status: 'CONNECTED',
          statusLabel: '연결됨',
          lastSyncedAt: syncedAt,
          syncErrorReason: '',
        },
  )
  writeState(state)
  return {
    accounts: clone(state.accounts),
    syncedAt,
    assetsRefreshed: true,
    transactionsRefreshed: true,
  }
}

export async function retryAccountSync(accountId) {
  await wait(700)
  const state = readState()
  state.accounts = state.accounts.map((account) =>
    account.accountId === accountId && account.status !== 'AUTH_EXPIRED'
      ? {
          ...account,
          status: 'CONNECTED',
          statusLabel: '연결됨',
          lastSyncedAt: getLocalIsoString(),
          syncErrorReason: '',
        }
      : account,
  )
  writeState(state)
  return { accounts: clone(state.accounts) }
}

export async function disconnectBroker(brokerId) {
  await wait()
  const state = readState()
  state.accounts = state.accounts.filter((account) => account.brokerId !== Number(brokerId))
  writeState(state)
  return { accounts: clone(state.accounts), journalsPreserved: true }
}

export async function disconnectSocialAccount() {
  await wait(250)
  return true
}

export async function withdrawMember() {
  await wait(500)
  window.localStorage.removeItem(MYPAGE_STORAGE_KEY)
  return { withdrawn: true, journalPolicy: 'RETENTION_POLICY_APPLIED' }
}

export async function getAppInfo() {
  return clone(readState().appInfo)
}

export async function getConnectedBrokerages() {
  return clone(readState().accounts)
}

export async function getNotifications() {
  return []
}

export async function markNotificationAsRead() {
  return true
}

export const getUserProfile = getProfile
export const getUserNotifications = getNotifications
