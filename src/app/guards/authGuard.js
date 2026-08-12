import { ROUTE_NAMES } from '@/app/router/route-names'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'

const PUBLIC_ROUTE_NAMES = new Set([ROUTE_NAMES.LOGIN, ROUTE_NAMES.UI_KIT, ROUTE_NAMES.NOT_FOUND])

export function setupRouterGuards(router) {
  router.beforeEach(async (to) => {
    const title = to.meta?.title
    if (title) {
      document.title = `${title} | Investory`
    }

    const authStore = useAuthStore()
    await authStore.initialize()

    const requiresAuth = to.meta.requiresAuth ?? !PUBLIC_ROUTE_NAMES.has(to.name)

    if (requiresAuth && !authStore.isAuthenticated) {
      return {
        name: ROUTE_NAMES.LOGIN,
        query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
      }
    }

    if (to.name === ROUTE_NAMES.LOGIN && authStore.isAuthenticated) {
      return { name: ROUTE_NAMES.HOME }
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
