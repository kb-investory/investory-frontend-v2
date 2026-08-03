<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { disconnectSocialAccount, withdrawMember } from '@/features/mypage/api/mypageApi'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import MobileStatusBar from '@/shared/components/MobileStatusBar.vue'

const router = useRouter()
const mypageStore = useMypageStore()
const authStore = useAuthStore()
const modal = ref(null)
const withdrawalEmail = ref('')
const processing = ref(false)
const actionError = ref('')

const simulationRate = computed(() => {
  const rate = mypageStore.recentSimulation?.returnRate ?? 0
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`
})

const withdrawalVerified = computed(
  () => withdrawalEmail.value.trim() === mypageStore.profile?.email,
)

function goToSection(section) {
  router.push({ name: ROUTE_NAMES.MYPAGE_PLACEHOLDER, params: { section } })
}

function clearAuthStorage({ allMemberData = false } = {}) {
  window.sessionStorage.clear()
  if (allMemberData) {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('investory:'))
      .forEach((key) => window.localStorage.removeItem(key))
    return
  }

  ;['accessToken', 'refreshToken', 'investory:auth', 'investory:oauth-session'].forEach((key) =>
    window.localStorage.removeItem(key),
  )
}

async function confirmLogout() {
  if (processing.value) return
  processing.value = true
  actionError.value = ''
  try {
    await authStore.signOut()
    clearAuthStorage()
    await router.replace({ name: ROUTE_NAMES.LOGIN })
  } catch {
    actionError.value = '로그아웃하지 못했어요. 다시 시도해주세요.'
  } finally {
    processing.value = false
  }
}

async function confirmWithdrawal() {
  if (!withdrawalVerified.value || processing.value) return
  processing.value = true
  actionError.value = ''

  try {
    await disconnectSocialAccount()
    for (const account of [...mypageStore.accounts]) {
      await mypageStore.disconnectAccount(account.accountId)
    }
    await withdrawMember()
    await authStore.signOut()
    clearAuthStorage({ allMemberData: true })
    await router.replace({ name: ROUTE_NAMES.LOGIN })
  } catch {
    actionError.value = '회원 탈퇴를 처리하지 못했어요. 다시 시도해주세요.'
  } finally {
    processing.value = false
  }
}

function closeModal() {
  if (processing.value) return
  modal.value = null
  withdrawalEmail.value = ''
  actionError.value = ''
}

onMounted(() => mypageStore.fetchOverview())
</script>

<template>
  <div class="mypage-page">
    <MobileStatusBar />

    <header class="mypage-header">
      <div class="mypage-header__brand">
        <img src="/assets/icons/monkey.png" alt="Investory" />
        <h1>마이페이지</h1>
      </div>
      <button type="button" aria-label="마이페이지 도움말" @click="goToSection('help')">
        <AppIcon name="circle-help" :size="18" />
      </button>
    </header>

    <BaseLoading v-if="mypageStore.loading && !mypageStore.profile" class="mypage-loading" />

    <main v-else-if="mypageStore.profile" class="mypage-content">
      <section class="profile-summary">
        <img
          class="profile-summary__avatar"
          :src="mypageStore.profile.profileImageUrl"
          :alt="`${mypageStore.profile.name} 프로필 이미지`"
        />
        <div class="profile-summary__copy">
          <div>
            <h2>{{ mypageStore.profile.name }}</h2>
            <span>일지 {{ mypageStore.profile.totalJournalsCount }}개</span>
          </div>
          <p>{{ mypageStore.profile.email }}</p>
          <small>
            <span class="provider-dot">K</span>
            {{ mypageStore.profile.oauthProviderLabel }} 계정으로 로그인
          </small>
        </div>
        <button
          type="button"
          class="profile-summary__edit"
          aria-label="프로필 수정"
          @click="router.push({ name: ROUTE_NAMES.MYPAGE_PROFILE_EDIT })"
        >
          <AppIcon name="pencil" :size="17" />
        </button>
      </section>

      <button
        type="button"
        class="tendency-summary-card"
        @click="router.push({ name: ROUTE_NAMES.TENDENCY })"
      >
        <span class="summary-card__icon"><AppIcon name="chart-pie" :size="18" /></span>
        <div>
          <small>나의 6가지 투자성향</small>
          <div v-if="mypageStore.tendencyBadges.length" class="tendency-badges">
            <span v-for="badge in mypageStore.tendencyBadges" :key="badge.code">
              {{ badge.label }}
            </span>
          </div>
          <p v-else class="tendency-summary-card__empty">분석 후 6가지 성향 결과가 표시돼요</p>
        </div>
        <strong>{{ mypageStore.hasTendencyAnalysis ? '분석 리포트' : '분석 시작' }}</strong>
        <AppIcon name="chevron-right" :size="14" />
      </button>

      <button
        v-if="mypageStore.recentSimulation"
        type="button"
        class="simulation-summary-card"
        @click="
          router.push({
            name: ROUTE_NAMES.MYPAGE_SIMULATION_DETAIL,
            params: { simulationId: mypageStore.recentSimulation.simulationId },
          })
        "
      >
        <span class="summary-card__icon summary-card__icon--orange">
          <AppIcon name="trophy" :size="18" />
        </span>
        <div>
          <small>최근 시뮬레이션</small>
          <strong>{{ simulationRate }}</strong>
          <p>
            전체 {{ mypageStore.recentSimulation.rank }}위 · 실제 대비 +{{
              mypageStore.recentSimulation.differenceFromActual.toFixed(1)
            }}%p
          </p>
        </div>
        <span>{{ mypageStore.recentSimulation.status }}</span>
        <AppIcon name="chevron-right" :size="14" />
      </button>

      <section class="menu-section">
        <h2>계정 및 연결</h2>
        <div class="menu-list">
          <button type="button" @click="router.push({ name: ROUTE_NAMES.MYPAGE_ACCOUNTS })">
            <AppIcon name="landmark" :size="17" />
            <span>연결 계좌 관리</span>
            <AppIcon name="chevron-right" :size="14" />
          </button>
          <button type="button" @click="goToSection('notifications')">
            <AppIcon name="bell" :size="17" />
            <span>알림 설정</span>
            <AppIcon name="chevron-right" :size="14" />
          </button>
        </div>
      </section>

      <section class="menu-section">
        <h2>서비스 지원</h2>
        <div class="menu-list">
          <button type="button" @click="goToSection('notices')">
            <AppIcon name="megaphone" :size="17" /><span>공지사항</span>
            <AppIcon name="chevron-right" :size="14" />
          </button>
          <button type="button" @click="goToSection('faq')">
            <AppIcon name="message-circle" :size="17" /><span>자주 묻는 질문</span>
            <AppIcon name="chevron-right" :size="14" />
          </button>
          <button type="button" @click="goToSection('inquiry')">
            <AppIcon name="headphones" :size="17" /><span>문의하기</span>
            <AppIcon name="chevron-right" :size="14" />
          </button>
        </div>
      </section>

      <div class="account-actions">
        <button type="button" @click="modal = 'logout'">
          <AppIcon name="log-out" :size="17" /> 로그아웃
          <AppIcon name="chevron-right" :size="14" />
        </button>
        <button type="button" @click="modal = 'withdraw'">
          <AppIcon name="user-round-x" :size="17" /> 회원 탈퇴
          <AppIcon name="chevron-right" :size="14" />
        </button>
      </div>

      <footer class="app-version">
        <span>{{ mypageStore.appInfo?.name || 'Investory' }}</span>
        <span>{{ mypageStore.appInfo?.version || '-' }}</span>
      </footer>
    </main>

    <div v-if="modal" class="confirm-overlay" role="presentation" @click.self="closeModal">
      <section class="confirm-dialog" role="dialog" aria-modal="true">
        <template v-if="modal === 'logout'">
          <span class="confirm-dialog__icon"><AppIcon name="log-out" :size="22" /></span>
          <h2>로그아웃할까요?</h2>
          <p>현재 기기의 인증 토큰과 로그인 세션이 삭제됩니다.</p>
          <div class="confirm-dialog__actions">
            <button type="button" @click="closeModal">취소</button>
            <button type="button" :disabled="processing" @click="confirmLogout">
              {{ processing ? '처리 중...' : '로그아웃' }}
            </button>
          </div>
        </template>

        <template v-else>
          <span class="confirm-dialog__icon confirm-dialog__icon--danger">
            <AppIcon name="triangle-alert" :size="22" />
          </span>
          <h2>회원 탈퇴 전 확인해주세요</h2>
          <ul>
            <li>소셜 로그인 연결과 연결 계좌가 모두 해제돼요.</li>
            <li>회원 데이터는 서비스 보존·파기 정책에 따라 처리돼요.</li>
            <li>연결 해제 전 작성한 투자 일지는 정책에 따라 보존될 수 있어요.</li>
          </ul>
          <label>
            본인 확인을 위해 이메일을 입력해주세요
            <input
              v-model="withdrawalEmail"
              type="email"
              :placeholder="mypageStore.profile.email"
            />
          </label>
          <div class="confirm-dialog__actions">
            <button type="button" @click="closeModal">계속 이용하기</button>
            <button
              type="button"
              class="danger"
              :disabled="!withdrawalVerified || processing"
              @click="confirmWithdrawal"
            >
              {{ processing ? '처리 중...' : '탈퇴하기' }}
            </button>
          </div>
        </template>
        <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mypage-page {
  min-height: 100%;
  background: #fff;
  color: #263a3f;
}

.mypage-page :deep(.mobile-status-bar) {
  height: 44px;
  padding: 0 18px;
  background: #fff;
  font-size: 10px;
}

.mypage-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px 8px;
}

.mypage-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mypage-header__brand img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.mypage-header h1 {
  margin: 0;
  font-size: 16px;
  letter-spacing: -0.04em;
}
.mypage-header > button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #dbe5e5;
  border-radius: 50%;
  background: #fff;
  color: #526366;
  cursor: pointer;
}

.mypage-loading {
  min-height: 520px;
}
.mypage-content {
  display: grid;
  gap: 11px;
  padding: 0 18px 18px;
}

.profile-summary {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 11px;
  padding: 14px;
  border-radius: 14px;
  background: #233e46;
  color: #fff;
}
.profile-summary__avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #0d9994;
  object-fit: cover;
}
.profile-summary__copy {
  min-width: 0;
}
.profile-summary__copy > div {
  display: flex;
  align-items: center;
  gap: 6px;
}
.profile-summary h2 {
  margin: 0;
  font-size: 14px;
}
.profile-summary__copy > div > span {
  padding: 3px 6px;
  border-radius: 5px;
  background: #0d8d88;
  font-size: 7px;
}
.profile-summary p {
  margin: 3px 0;
  color: #d7e2e3;
  font-size: 8px;
}
.profile-summary small {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #d7e2e3;
  font-size: 7px;
}
.provider-dot {
  display: grid;
  width: 13px;
  height: 13px;
  place-items: center;
  border-radius: 50%;
  background: #fee500;
  color: #332d00;
  font-weight: 900;
}
.profile-summary__edit {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.tendency-summary-card,
.simulation-summary-card {
  display: grid;
  width: 100%;
  grid-template-columns: 32px minmax(0, 1fr) auto 14px;
  align-items: center;
  gap: 9px;
  padding: 11px;
  border: 1px solid #dfe7e7;
  border-radius: 13px;
  background: #fff;
  color: #35484c;
  cursor: pointer;
  text-align: left;
}
.summary-card__icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: #e8f8f7;
  color: #078d88;
}
.summary-card__icon--orange {
  background: #fff3df;
  color: #db8b1c;
}
.tendency-summary-card small,
.simulation-summary-card small {
  display: block;
  margin-bottom: 4px;
  color: #78888b;
  font-size: 7px;
}
.tendency-summary-card > strong {
  align-self: start;
  color: #078d88;
  font-size: 7px;
}
.tendency-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 4px;
}
.tendency-badges span {
  display: inline-flex;
  min-height: 19px;
  align-items: center;
  gap: 5px;
  padding: 3px 7px 3px 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #397caf 0%, #235c91 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 7px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}
.tendency-badges span::before {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: #2eb5ff;
  content: '';
}
.tendency-summary-card__empty {
  margin: 0;
  color: #7d8b8e;
  font-size: 7px;
}
.simulation-summary-card > div > strong {
  color: #078d88;
  font-size: 13px;
}
.simulation-summary-card p {
  display: inline;
  margin: 0 0 0 5px;
  color: #68777a;
  font-size: 7px;
}
.simulation-summary-card > span {
  color: #ce7c12;
  font-size: 7px;
}

.menu-section {
  display: grid;
  gap: 5px;
}
.menu-section h2 {
  margin: 0;
  color: #607174;
  font-size: 8px;
  font-weight: 700;
}
.menu-list {
  overflow: hidden;
  border: 1px solid #e0e7e7;
  border-radius: 12px;
  background: #fff;
}
.menu-list button,
.account-actions button {
  display: grid;
  width: 100%;
  min-height: 43px;
  grid-template-columns: 22px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 0;
  border-bottom: 1px solid #edf1f1;
  background: #fff;
  color: #415356;
  cursor: pointer;
  font-size: 9px;
  text-align: left;
}
.menu-list button:last-child {
  border-bottom: 0;
}
.account-actions {
  display: grid;
  gap: 7px;
  margin-top: 1px;
}
.account-actions button {
  border: 0;
  border-radius: 10px;
  background: #fff3f2;
  color: #ec5258;
}
.app-version {
  display: flex;
  justify-content: center;
  gap: 14px;
  padding: 3px 0 0;
  color: #9aa4a6;
  font-family: var(--font-mono);
  font-size: 6px;
}

.confirm-overlay {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(22, 34, 37, 0.55);
}
.confirm-dialog {
  width: min(100%, 340px);
  padding: 20px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
}
.confirm-dialog__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 12px;
  background: #e9f7f6;
  color: #088e89;
}
.confirm-dialog__icon--danger {
  background: #fff0ee;
  color: #e24e52;
}
.confirm-dialog h2 {
  margin: 0;
  font-size: 17px;
}
.confirm-dialog > p,
.confirm-dialog li {
  color: #718083;
  font-size: 10px;
  line-height: 1.6;
}
.confirm-dialog ul {
  margin: 10px 0;
  padding-left: 18px;
}
.confirm-dialog label {
  display: grid;
  gap: 6px;
  color: #506063;
  font-size: 9px;
}
.confirm-dialog input {
  height: 40px;
  padding: 0 11px;
  border: 1px solid #d5dfdf;
  border-radius: 9px;
  font: inherit;
}
.confirm-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
}
.confirm-dialog__actions button {
  min-height: 40px;
  border: 0;
  border-radius: 9px;
  background: #eef2f2;
  color: #566669;
  cursor: pointer;
  font-weight: 750;
}
.confirm-dialog__actions button:last-child {
  background: #173942;
  color: #fff;
}
.confirm-dialog__actions button.danger {
  background: #e94f55;
}
.confirm-dialog__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-error {
  margin-bottom: 0;
  color: #d94449 !important;
  text-align: center;
}
</style>
