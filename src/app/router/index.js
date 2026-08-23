import { createRouter, createWebHistory } from 'vue-router'

import { setupRouterGuards } from '@/app/guards/authGuard'
import { beginGlobalLoading } from '@/shared/services/globalLoading'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

let finishNavigationLoading = null

router.beforeEach(() => {
  finishNavigationLoading?.()
  finishNavigationLoading = beginGlobalLoading()
  return true
})

function stopNavigationLoading() {
  finishNavigationLoading?.()
  finishNavigationLoading = null
}

router.afterEach(stopNavigationLoading)
router.onError(stopNavigationLoading)

setupRouterGuards(router)

export default router
