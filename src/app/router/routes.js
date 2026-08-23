import { ROUTE_NAMES } from './route-names'

import { hasSeenWelcome } from '@/features/auth/services/welcomePreference'

export const routes = [
  {
    path: '/',
    redirect: () => ({
      name: hasSeenWelcome() ? ROUTE_NAMES.HOME : ROUTE_NAMES.WELCOME,
    }),
  },
  {
    path: '/welcome',
    name: ROUTE_NAMES.WELCOME,
    component: () => import('@/features/auth/views/WelcomePage.vue'),
    meta: { title: 'Investory 시작하기', layout: 'blank' },
  },
  {
    path: '/home',
    name: ROUTE_NAMES.HOME,
    component: () => import('@/features/home/views/HomePage.vue'),
    meta: {
      title: '홈',
      layout: 'full-bleed',
      frameHeight: 956,
      mainBottomPadding: 84,
    },
  },
  {
    path: '/notifications',
    name: ROUTE_NAMES.NOTIFICATIONS,
    component: () => import('@/features/notifications/views/NotificationPage.vue'),
    meta: {
      title: '알림',
      layout: 'full-bleed',
      hideBottomNav: true,
      frameHeight: 920,
      mainBottomPadding: 0,
    },
  },
  {
    path: '/notifications/settings',
    name: ROUTE_NAMES.NOTIFICATION_SETTINGS,
    component: () => import('@/features/notifications/views/NotificationSettingsPage.vue'),
    meta: { title: '알림 설정', layout: 'full-bleed', hideBottomNav: true },
  },
  {
    path: '/login',
    redirect: { name: ROUTE_NAMES.WELCOME },
  },
  {
    path: '/broker-connect',
    name: ROUTE_NAMES.BROKER_CONNECT,
    component: () => import('@/features/mypage/views/BrokerConnectPage.vue'),
    meta: { title: '증권사 선택', layout: 'blank' },
  },
  {
    path: '/broker-connect/login',
    name: ROUTE_NAMES.BROKER_LOGIN,
    component: () => import('@/features/mypage/views/BrokerLoginPage.vue'),
    meta: { title: '증권사 로그인', layout: 'blank' },
  },
  {
    path: '/broker-connect/holdings',
    name: ROUTE_NAMES.BROKER_HOLDINGS,
    component: () => import('@/features/mypage/views/BrokerHoldingsPage.vue'),
    meta: {
      title: '보유 종목 확인',
      layout: 'blank',
      requiresBrokerConnection: true,
    },
  },
  {
    path: '/broker-connect/complete',
    name: ROUTE_NAMES.BROKER_COMPLETE,
    component: () => import('@/features/mypage/views/BrokerConnectionCompletePage.vue'),
    meta: {
      title: '계좌 연결 완료',
      layout: 'blank',
      requiresBrokerConnection: true,
      requiresBrokerHoldings: true,
    },
  },
  {
    path: '/journal',
    name: ROUTE_NAMES.JOURNAL,
    component: () => import('@/features/journal/views/JournalListPage.vue'),
    meta: {
      title: '투자 일지',
      layout: 'full-bleed',
      frameHeight: 912,
      mainBottomPadding: 80,
    },
  },
  {
    path: '/journal/search',
    name: ROUTE_NAMES.JOURNAL_SEARCH,
    component: () => import('@/features/journal/views/JournalStockSearchPage.vue'),
    meta: {
      title: '종목별 일지 검색',
      layout: 'full-bleed',
      frameHeight: 944,
      mainBottomPadding: 0,
      hideBottomNav: true,
    },
  },
  {
    path: '/journal/stocks/:securityCode',
    name: ROUTE_NAMES.JOURNAL_STOCK,
    component: () => import('@/features/journal/views/JournalStockPage.vue'),
    meta: {
      title: '종목 거래 일지',
      layout: 'full-bleed',
      frameHeight: 944,
      mainBottomPadding: 0,
      hideBottomNav: true,
    },
  },
  {
    path: '/journal/create',
    name: ROUTE_NAMES.JOURNAL_CREATE,
    component: () => import('@/features/journal/views/JournalCreatePage.vue'),
    meta: {
      title: '오늘의 투자 일기',
      layout: 'full-bleed',
      frameHeight: 960,
      mainBottomPadding: 80,
    },
  },
  {
    path: '/journal/new',
    redirect: '/journal/create',
  },
  {
    path: '/journal/:date',
    name: ROUTE_NAMES.JOURNAL_DATE,
    component: () => import('@/features/journal/views/JournalDatePage.vue'),
    meta: {
      title: '선택 날짜 투자 일지',
      layout: 'full-bleed',
      frameHeight: 956,
      mainBottomPadding: 80,
    },
  },
  {
    path: '/tendency',
    name: ROUTE_NAMES.TENDENCY,
    component: () => import('@/features/tendency/views/TendencyPage.vue'),
    meta: {
      title: '투자 성향',
      layout: 'full-bleed',
      frameHeight: 920,
      mainBottomPadding: 82,
    },
  },
  {
    path: '/tendency/history/:analysisRunId',
    name: ROUTE_NAMES.TENDENCY_HISTORY_DETAIL,
    component: () => import('@/features/tendency/views/TendencyHistoryDetailPage.vue'),
    meta: { title: '성향 변화 상세' },
  },
  {
    path: '/tendency/principles/recommendations',
    name: ROUTE_NAMES.TENDENCY_RECOMMENDATIONS,
    component: () => import('@/features/tendency/views/PrincipleRecommendationPage.vue'),
    meta: { title: '추천 원칙 선택' },
  },
  {
    path: '/tendency/principles/edit',
    name: ROUTE_NAMES.TENDENCY_PRINCIPLES_EDIT,
    component: () => import('@/features/tendency/views/PrincipleEditPage.vue'),
    meta: { title: '투자원칙 수정', layout: 'full-bleed', hideBottomNav: true, frameHeight: 920 },
  },
  {
    path: '/simulation',
    name: ROUTE_NAMES.SIMULATION,
    component: () => import('@/features/simulation/views/SimulationPage.vue'),
    meta: {
      title: '시뮬레이션',
      layout: 'full-bleed',
      frameHeight: 980,
      mainBottomPadding: 84,
    },
  },
  {
    path: '/simulation/dashboard',
    name: ROUTE_NAMES.SIMULATION_DASHBOARD,
    component: () => import('@/features/simulation/views/SimulationPage.vue'),
    meta: {
      title: '시뮬레이션 - 원칙 중심',
      layout: 'full-bleed',
      frameHeight: 980,
      mainBottomPadding: 84,
    },
  },
  {
    path: '/simulation/bot-ready',
    redirect: '/simulation/comparators',
  },
  {
    path: '/simulation/comparators',
    name: ROUTE_NAMES.SIMULATION_COMPARATORS,
    component: () => import('@/features/simulation/views/SimulationPage.vue'),
    meta: {
      title: '시뮬레이션 - 비교 봇 선택',
      layout: 'full-bleed',
      hideBottomNav: true,
      frameHeight: 980,
      mainBottomPadding: 84,
    },
  },
  {
    // 조건 설정은 비교 봇 선택 화면으로 합쳐졌다. 기존 경로는 그대로 이어준다.
    path: '/simulation/setup',
    redirect: '/simulation/comparators',
  },
  {
    path: '/simulation/live',
    name: ROUTE_NAMES.SIMULATION_LIVE,
    component: () => import('@/features/simulation/views/SimulationPage.vue'),
    meta: {
      title: '시뮬레이션 - 실행 중',
      layout: 'full-bleed',
      hideBottomNav: true,
      frameHeight: 980,
      mainBottomPadding: 84,
    },
  },
  {
    path: '/simulation/result',
    name: ROUTE_NAMES.SIMULATION_RESULT,
    component: () => import('@/features/simulation/views/SimulationPage.vue'),
    alias: ['/simulation/result/mock=:mockId', '/simulation/result/mock/:mockId'],
    meta: {
      title: '시뮬레이션 - 결과',
      layout: 'full-bleed',
      hideBottomNav: true,
      frameHeight: 980,
      mainBottomPadding: 84,
    },
  },
  {
    path: '/simulation/wysmi',
    redirect: { name: ROUTE_NAMES.SIMULATION },
  },
  {
    path: '/mypage',
    name: ROUTE_NAMES.MYPAGE,
    component: () => import('@/features/mypage/views/MypagePage.vue'),
    meta: { title: '마이페이지', layout: 'full-bleed', frameHeight: 920, mainBottomPadding: 82 },
  },
  {
    path: '/mypage/profile/edit',
    name: ROUTE_NAMES.MYPAGE_PROFILE_EDIT,
    component: () => import('@/features/mypage/views/ProfileEditPage.vue'),
    meta: { title: '프로필 수정', layout: 'full-bleed', hideBottomNav: true, frameHeight: 920 },
  },
  {
    path: '/mypage/accounts',
    name: ROUTE_NAMES.MYPAGE_ACCOUNTS,
    component: () => import('@/features/mypage/views/ConnectedAccountsPage.vue'),
    meta: {
      title: '연결 계좌 관리',
      layout: 'full-bleed',
      frameHeight: 920,
      mainBottomPadding: 82,
    },
  },
  {
    path: '/mypage/accounts/:accountId',
    name: ROUTE_NAMES.MYPAGE_ACCOUNT_DETAIL,
    component: () => import('@/features/mypage/views/AccountDetailPage.vue'),
    meta: {
      title: '계좌 상세',
      layout: 'full-bleed',
      frameHeight: 920,
      mainBottomPadding: 82,
    },
  },
  {
    path: '/mypage/simulations/:simulationId',
    name: ROUTE_NAMES.MYPAGE_SIMULATION_DETAIL,
    redirect: (route) => ({
      name: ROUTE_NAMES.SIMULATION_RESULT,
      query: { runId: String(route.params.simulationId) },
    }),
  },
  {
    path: '/mypage/support/:section',
    name: ROUTE_NAMES.MYPAGE_PLACEHOLDER,
    component: () => import('@/features/mypage/views/MypagePlaceholderPage.vue'),
    meta: { title: '마이페이지 안내', layout: 'full-bleed', hideBottomNav: true },
  },
  {
    path: '/ui-kit',
    name: ROUTE_NAMES.UI_KIT,
    component: () => import('@/app/views/UIKitView.vue'),
    meta: { title: 'UI Kit' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/app/views/NotFoundView.vue'),
    meta: { title: '페이지를 찾을 수 없습니다' },
  },
]
