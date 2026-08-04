<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { disconnectSocialAccount, withdrawMember } from '@/features/mypage/api/mypageApi'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const router = useRouter()
const mypageStore = useMypageStore()
const authStore = useAuthStore()
const modal = ref(null)
const withdrawalEmail = ref('')
const processing = ref(false)
const actionError = ref('')

const withdrawalVerified = computed(
  () => withdrawalEmail.value.trim() === mypageStore.profile?.email,
)
const recentSimulationHeadline = computed(() => {
  const simulation = mypageStore.recentSimulation
  if (!simulation) return ''

  return `${simulation.botName}가 ${simulation.rank}위예요`
})
const recentSimulationBotLabel = computed(() =>
  mypageStore.recentSimulation?.botName?.replace('나의 투자봇', '나의봇'),
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

  ;[
    'accessToken',
    'refreshToken',
    'investory:auth',
    'investory:oauth-session',
    'investory:mock:oauth-provider',
  ].forEach((key) => window.localStorage.removeItem(key))
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
    const brokerIds = [...new Set(mypageStore.accounts.map((account) => account.brokerId))]
    for (const brokerId of brokerIds) {
      await mypageStore.disconnectBroker(brokerId)
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

onMounted(async () => {
  if (!authStore.user) await authStore.fetchUser()
  await mypageStore.fetchOverview({ force: true, authUser: authStore.user })
})
</script>

<template>
  <div class="mypage-page">
    <header class="mypage-header">
      <div class="mypage-header__brand">
        <img src="/assets/logos/investory-logo.png" alt="Investory 로고" />
        <h1>마이페이지</h1>
      </div>
      <button type="button" aria-label="마이페이지 도움말" @click="modal = 'help'">
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
            <span
              class="provider-dot"
              :class="`provider-dot--${mypageStore.profile.oauthProvider.toLowerCase()}`"
            >
              {{ mypageStore.profile.oauthProvider.slice(0, 1) }}
            </span>
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

      <section class="mypage-highlights" aria-label="투자성향과 시뮬레이션 요약">
        <button
          type="button"
          class="tendency-summary-card"
          @click="router.push({ name: ROUTE_NAMES.TENDENCY })"
        >
          <div class="summary-card__header">
            <span class="summary-card__icon"><AppIcon name="chart-pie" :size="17" /></span>
            <small>투자성향</small>
          </div>
          <div v-if="mypageStore.tendencyBadges.length" class="tendency-badges">
            <span v-for="badge in mypageStore.tendencyBadges" :key="badge.code">
              {{ badge.label }}
            </span>
          </div>
          <div v-else class="summary-empty-state">
            <img src="/assets/icons/monkey-question.png" alt="" />
            <div class="summary-empty-state__copy">
              <strong>아직 분석 전이에요</strong>
              <p>나의 6가지 성향을<br />먼저 확인해보세요</p>
            </div>
          </div>
          <span class="summary-card__action">
            {{ mypageStore.tendencyBadges.length ? '투자성향으로 바로가기' : '투자성향 분석하기' }}
            <AppIcon name="arrow-right" :size="11" />
          </span>
        </button>

        <button
          type="button"
          class="simulation-summary-card"
          @click="router.push({ name: ROUTE_NAMES.SIMULATION })"
        >
          <div class="summary-card__header summary-card__header--simulation">
            <span class="summary-card__icon summary-card__icon--orange">
              <AppIcon name="trophy" :size="17" />
            </span>
            <small>{{ mypageStore.recentSimulation ? '최근 시뮬레이션' : '시뮬레이션' }}</small>
          </div>
          <template v-if="mypageStore.recentSimulation">
            <p class="simulation-summary-card__headline">{{ recentSimulationHeadline }}</p>
            <div class="simulation-preview" aria-label="시뮬레이션 결과 미리보기">
              <span class="simulation-preview__mine">
                <AppIcon name="bot" :size="14" />
                {{ recentSimulationBotLabel }}
              </span>
              <span class="simulation-preview__investor">
                <AppIcon name="medal" :size="14" />
                유명 투자자
              </span>
              <span class="simulation-preview__monkey">
                <AppIcon name="paw-print" :size="14" />
                원숭이
              </span>
            </div>
          </template>
          <div v-else class="summary-empty-state summary-empty-state--simulation">
            <img src="/assets/icons/monkey-question.png" alt="" />
            <div class="summary-empty-state__copy">
              <strong>아직 결과가 없어요</strong>
              <p>투자봇 4개로<br />첫 대결을 시작해보세요</p>
            </div>
          </div>
          <span class="summary-card__action summary-card__action--simulation">
            {{ mypageStore.recentSimulation ? '시뮬레이션으로 바로가기' : '시뮬레이션 시작하기' }}
            <AppIcon name="arrow-right" :size="11" />
          </span>
        </button>
      </section>

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
      <section
        class="confirm-dialog"
        :class="{ 'confirm-dialog--help': modal === 'help' }"
        role="dialog"
        aria-modal="true"
      >
        <template v-if="modal === 'help'">
          <div class="help-dialog__header">
            <span class="confirm-dialog__icon"><AppIcon name="circle-help" :size="22" /></span>
            <button type="button" aria-label="도움말 닫기" @click="closeModal">
              <AppIcon name="x" :size="17" />
            </button>
          </div>
          <h2>마이페이지 도움말</h2>
          <p>현재 사용할 수 있는 기능이에요.</p>
          <ul class="help-dialog__list">
            <li>프로필 이미지와 이름을 수정할 수 있어요.</li>
            <li>투자 일지 수와 로그인한 소셜 계정을 확인할 수 있어요.</li>
            <li>투자성향과 최근 시뮬레이션 결과로 이동할 수 있어요.</li>
            <li>연결 계좌를 동기화하고 계좌별 자산·거래 요약을 볼 수 있어요.</li>
            <li>증권사 연결 해제, 로그아웃, 회원 탈퇴를 진행할 수 있어요.</li>
          </ul>
        </template>

        <template v-else-if="modal === 'logout'">
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

.mypage-header {
  position: sticky;
  z-index: 81;
  top: 0;
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 10px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
}

.mypage-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mypage-header__brand img {
  width: 50px;
  height: 26px;
  object-fit: contain;
}
.mypage-header h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 850;
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
  padding: 8px 18px 18px;
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
.provider-dot--naver {
  background: #03c75a;
  color: #fff;
}
.provider-dot--google {
  background: #fff;
  color: #4285f4;
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

.mypage-highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.tendency-summary-card,
.simulation-summary-card {
  display: flex;
  width: 100%;
  min-height: 174px;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 11px;
  border: 1px solid #cfe7e5;
  border-radius: 17px;
  background: #fff;
  color: #35484c;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 2px 5px rgba(29, 72, 77, 0.08);
}
.simulation-summary-card {
  border-color: #f0dfc7;
  background: #fffdf9;
}
.summary-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.summary-card__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 11px;
  background: #e8f8f7;
  color: #078d88;
}
.summary-card__icon--orange {
  background: #fff3df;
  color: #db8b1c;
}
.tendency-summary-card small,
.simulation-summary-card small {
  color: #078d88;
  font-size: 9px;
  font-weight: 800;
}
.summary-card__header--simulation small {
  color: #ca7a16;
}
.summary-card__action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-top: auto;
  padding: 0 7px;
  border-radius: 999px;
  background: #e6f7f5;
  color: #087f7b;
  font-size: 7.2px;
  font-weight: 800;
  white-space: nowrap;
}
.summary-card__action--simulation {
  max-width: none !important;
  background: #fff3df;
  color: #bc7013 !important;
  line-height: 1;
  text-align: center !important;
}
.tendency-badges {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  justify-content: start;
  gap: 5px 7px;
}
.tendency-badges span {
  display: inline-flex;
  min-height: 21px;
  align-items: center;
  gap: 5px;
  justify-content: flex-start;
  justify-self: start;
  padding: 3px 6px;
  border-radius: 999px;
  background: #1f5a86;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 6.1px;
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
.summary-empty-state {
  display: flex;
  min-height: 51px;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.summary-empty-state img {
  width: 43px;
  height: 43px;
  flex: 0 0 43px;
  object-fit: contain;
}
.summary-empty-state__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.summary-empty-state__copy strong {
  color: #2e3032;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.25;
  white-space: nowrap;
}
.summary-empty-state__copy p {
  margin: 0;
  color: #7d8b8e;
  font-size: 6.5px;
  line-height: 1.45;
}
.summary-empty-state--simulation .summary-empty-state__copy p {
  color: #887967;
}
.simulation-summary-card__headline {
  min-height: 20px;
  margin: 0;
  color: #2e3032;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.45;
  text-align: center;
}
.simulation-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.simulation-preview span {
  display: grid;
  min-height: 48px;
  place-items: center;
  gap: 2px;
  border: 1px solid #71868e;
  border-radius: 8px;
  background: #e7eef1;
  color: #53666c;
  font-size: 5.9px;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
}
.simulation-preview .simulation-preview__investor {
  border-color: #e8b22f;
  background: #fff2bd;
  color: #a56c00;
}
.simulation-preview .simulation-preview__monkey {
  border-color: #b9a5cf;
  background: #f0e9f7;
  color: #7b5c9a;
}
.simulation-summary-card p:not(.simulation-summary-card__headline) {
  color: #68777a;
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
.confirm-dialog--help {
  width: min(100%, 310px);
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
.help-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.help-dialog__header > button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f2f5f5;
  color: #657477;
  cursor: pointer;
}
.help-dialog__list {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.help-dialog__list li {
  position: relative;
  padding: 9px 10px 9px 27px;
  border-radius: 9px;
  background: #f5f9f9;
  color: #526467;
  font-size: 9px;
  line-height: 1.45;
}
.help-dialog__list li::before {
  position: absolute;
  top: 11px;
  left: 10px;
  color: #078d88;
  content: '✓';
  font-weight: 900;
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
