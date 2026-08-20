import mypageData from '@/mocks/data/mypage.json'
import {
  getBrokerAccountDetail,
  getBrokerAccounts,
  getBrokerConnectionDetail,
  getBrokerConnections,
  syncBrokerConnection,
} from '@/features/mypage/api/brokerConnectionApi'
import { getLedgerTrades } from '@/features/ledger/api/ledgerApi'

const MYPAGE_STORAGE_KEY = 'investory:mock:mypage:v5'
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
    if (stored?.profile && stored?.appInfo) return stored
  } catch {
    // 손상된 목 데이터는 초기 상태로 복구합니다.
  }

  return writeState(getInitialState())
}

const ACCOUNT_TYPE_LABELS = Object.freeze({
  STOCK: '주식',
  ISA: 'ISA',
  PENSION: '연금',
  ETC: '기타',
})

function normalizeConnectionStatus(connection) {
  if (!connection || connection.connectionStatus === 'CONNECTED') {
    return { status: 'CONNECTED', statusLabel: '연결됨', syncErrorReason: '' }
  }

  if (connection.connectionStatus === 'ERROR') {
    return {
      status: 'SYNC_ERROR',
      statusLabel: '동기화 오류',
      syncErrorReason: connection.latestSync?.errorMessage || '계좌 동기화에 실패했어요.',
    }
  }

  return {
    status: connection.connectionStatus,
    statusLabel: connection.connectionStatus === 'PENDING' ? '연결 중' : '연결 해제됨',
    syncErrorReason: '',
  }
}

function normalizeAccount(account, connectionsById) {
  const connection = connectionsById.get(Number(account.connectionId))
  return {
    ...account,
    brokerCode: account.brokerCode || connection?.brokerCode || connection?.providerCode || '',
    brokerName:
      account.brokerName || connection?.brokerName || connection?.providerName || '연결 증권사',
    accountType: ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType || '계좌',
    accountNumber: account.accountNoMasked || '',
    ...normalizeConnectionStatus(connection),
    lastSyncedAt: account.lastSyncedAt || connection?.lastSyncedAt || null,
    sourceConnectionId: account.connectionId,
  }
}

async function getNormalizedAccounts() {
  const [accountsData, connectionsData] = await Promise.all([
    getBrokerAccounts(),
    getBrokerConnections(),
  ])
  const connectionsById = new Map(
    (connectionsData?.connections || []).map((connection) => [
      Number(connection.connectionId),
      connection,
    ]),
  )

  return {
    summary: accountsData?.summary || {},
    accounts: (accountsData?.accounts || []).map((account) =>
      normalizeAccount(account, connectionsById),
    ),
  }
}

export async function getMypageOverview() {
  const [{ accounts }, profile, appInfo] = await Promise.all([
    getNormalizedAccounts(),
    getProfile(),
    getAppInfo(),
  ])
  return { profile, accounts, appInfo }
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
  return await getNormalizedAccounts()
}

export async function getConnectedAccountDetail(accountId) {
  const detail = await getBrokerAccountDetail(accountId)
  if (!detail) return null

  const [connection, tradesData] = await Promise.all([
    getBrokerConnectionDetail(detail.connectionId),
    getLedgerTrades({ accountId, page: 0, size: 1 }),
  ])
  const account = normalizeAccount(detail, new Map([[Number(detail.connectionId), connection]]))
  const latestTrade = tradesData?.content?.[0] || null
  const marketValue = detail.summary?.totalMarketValue ?? 0
  const holdingCount = detail.summary?.holdingCount ?? detail.holdings?.length ?? 0

  return {
    ...account,
    marketValue,
    holdingCount,
    latestTrade: latestTrade
      ? {
          ...latestTrade,
          side: latestTrade.tradeSide,
        }
      : null,
    holdingSnapshot: {
      holdingCount,
      marketValue,
      reflectedAt: account.lastSyncedAt,
    },
    holdings: detail.holdings || [],
  }
}

export async function syncConnectedAccount(accountId) {
  const detail = await getBrokerAccountDetail(accountId)
  await syncBrokerConnection(detail.connectionId)
  return await getConnectedAccountDetail(accountId)
}

export async function syncConnectedAccounts() {
  const connectionsData = await getBrokerConnections()
  const connected = (connectionsData?.connections || []).filter(
    (connection) => connection.connectionStatus !== 'DISCONNECTED',
  )
  const syncResults = await Promise.all(
    connected.map((connection) => syncBrokerConnection(connection.connectionId)),
  )
  const { accounts } = await getNormalizedAccounts()
  const syncedAt = accounts
    .map((account) => account.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  return {
    accounts,
    syncedAt,
    assetsRefreshed: syncResults.every((result) => result.syncStatus === 'SUCCESS'),
    transactionsRefreshed: syncResults.every((result) => result.syncStatus === 'SUCCESS'),
  }
}

export async function retryAccountSync(accountId) {
  await syncConnectedAccount(accountId)
  return await getNormalizedAccounts()
}

export async function disconnectBroker() {
  throw new Error('증권사 연결 해제 API가 아직 제공되지 않아요.')
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
  const { accounts } = await getNormalizedAccounts()
  return accounts
}

export async function getNotifications() {
  return []
}

export async function markNotificationAsRead() {
  return true
}

export const getUserProfile = getProfile
export const getUserNotifications = getNotifications
