import { ROUTE_NAMES } from '@/app/router/route-names'

export const authRoutes = [
  {
    path: '/login',
    name: ROUTE_NAMES.LOGIN,
    component: () => import('@/modules/auth/pages/LoginPage.vue'),
    meta: { title: '로그인', layout: 'auth' },
  },
  {
    path: '/auth/callback/:provider',
    name: ROUTE_NAMES.OAUTH_CALLBACK,
    component: () => import('@/modules/auth/pages/OAuthCallbackPage.vue'),
    meta: { title: '로그인 처리', layout: 'auth' },
  },
  {
    path: '/broker-connect',
    name: ROUTE_NAMES.BROKER_CONNECT,
    component: () => import('@/modules/auth/pages/BrokerConnectPage.vue'),
    meta: { title: '증권사 선택', layout: 'auth' },
  },
  {
    path: '/broker-connect/verify',
    name: ROUTE_NAMES.BROKER_VERIFY,
    component: () => import('@/modules/auth/pages/BrokerVerificationPage.vue'),
    meta: { title: '본인 인증', layout: 'auth' },
  },
]
