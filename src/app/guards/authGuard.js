import { ROUTE_NAMES } from '@/app/router/route-names'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'

const PUBLIC_ROUTE_NAMES = new Set([ROUTE_NAMES.WELCOME, ROUTE_NAMES.UI_KIT, ROUTE_NAMES.NOT_FOUND])

export function setupRouterGuards(router) {
  router.beforeEach(async (to) => {
    const title = to.meta?.title
    if (title) {
      document.title = `${title} | Investory`
    }

    const requiresAuth = to.meta.requiresAuth ?? !PUBLIC_ROUTE_NAMES.has(to.name)

    const authStore = useAuthStore()

    // 웰컴처럼 공개된 화면은 백엔드 인증 확인이 끝날 때까지 막지 않는다.
    // 이미 인증 상태를 알고 있는 경우에만 홈으로 이동시킨다.
    if (!requiresAuth) {
      if (to.name === ROUTE_NAMES.WELCOME && authStore.initialized && authStore.isAuthenticated) {
        return { name: ROUTE_NAMES.HOME }
      }

      return true
    }

    await authStore.initialize()

    if (requiresAuth && !authStore.isAuthenticated) {
      return {
        name: ROUTE_NAMES.WELCOME,
        query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
      }
    }

    const brokerStore = useBrokerConnectionStore()

    if (to.meta.requiresBrokerConnection && !brokerStore.hasVerifiedConnection) {
      return { name: ROUTE_NAMES.BROKER_CONNECT }
    }

    if (to.meta.requiresBrokerHoldings && !brokerStore.hasLoadedHoldings) {
      return {
        name: ROUTE_NAMES.BROKER_HOLDINGS,
        query: { brokerId: brokerStore.selectedBroker?.brokerId },
      }
    }
  })
}
