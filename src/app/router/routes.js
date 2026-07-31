import { ROUTE_NAMES } from './route-names'

export const routes = [
  {
    path: '/',
    name: ROUTE_NAMES.HOME,
    component: () => import('@/features/home/views/HomePage.vue'),
    meta: { title: '홈' },
  },
  {
    path: '/login',
    name: ROUTE_NAMES.LOGIN,
    component: () => import('@/features/auth/views/LoginPage.vue'),
    meta: { title: '로그인', layout: 'blank' },
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
    component: () => import('@/features/journal/views/JournalSearchPlaceholderPage.vue'),
    meta: { title: '종목별 일지 검색' },
  },
  {
    path: '/journal/create',
    name: ROUTE_NAMES.JOURNAL_CREATE,
    component: () => import('@/features/journal/views/JournalCreatePage.vue'),
    meta: { title: '일지 작성' },
  },
  {
    path: '/journal/:date',
    name: ROUTE_NAMES.JOURNAL_DATE,
    component: () => import('@/features/journal/views/JournalDatePlaceholderPage.vue'),
    meta: { title: '투자 일지 상세' },
  },
  {
    path: '/tendency',
    name: ROUTE_NAMES.TENDENCY,
    component: () => import('@/features/tendency/views/TendencyPage.vue'),
    meta: { title: '투자 성향' },
  },
  {
    path: '/simulation',
    name: ROUTE_NAMES.SIMULATION,
    component: () => import('@/features/simulation/views/SimulationPage.vue'),
    meta: { title: '시뮬레이션' },
  },
  {
    path: '/mypage',
    name: ROUTE_NAMES.MYPAGE,
    component: () => import('@/features/mypage/views/MypagePage.vue'),
    meta: { title: '내 정보' },
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
