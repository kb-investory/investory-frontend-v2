import { ROUTE_NAMES } from '@/app/router/route-names'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'

export function setupRouterGuards(router) {
  router.beforeEach((to) => {
    const title = to.meta?.title
    if (title) {
      document.title = `${title} | Investory`
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
