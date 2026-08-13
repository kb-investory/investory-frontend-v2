import { queryClient } from '@/app/providers/queryClient'
import { useHomeStore } from '@/features/home/stores/homeStore'
import { useJournalStockSearchStore } from '@/features/journal/stores/journalStockSearchStore'
import { useJournalStockTimelineStore } from '@/features/journal/stores/journalStockTimelineStore'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'

const AUTH_STORAGE_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'investory:auth',
  'investory:oauth-session',
])

const USER_STORAGE_PREFIXES = ['investory:', 'investory-journal-']

function removeUserStorage(storage) {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)
    if (
      key &&
      (AUTH_STORAGE_KEYS.has(key) || USER_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)))
    ) {
      storage.removeItem(key)
    }
  }
}

export async function resetUserSession() {
  await queryClient.cancelQueries()

  useBrokerConnectionStore().reset()
  useHomeStore().reset()
  useJournalStore().reset()
  useJournalStockSearchStore().reset()
  useJournalStockTimelineStore().reset()
  useMypageStore().reset()
  useTendencyStore().reset()
  useSimulationStore().reset()

  queryClient.clear()
  removeUserStorage(window.sessionStorage)
  removeUserStorage(window.localStorage)
}
