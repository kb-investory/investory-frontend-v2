import { createRouter, createWebHistory } from 'vue-router'

import { setupRouterGuards } from '@/app/guards/authGuard'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupRouterGuards(router)

export default router
