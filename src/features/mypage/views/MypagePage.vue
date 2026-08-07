<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { disconnectSocialAccount, withdrawMember } from '@/features/mypage/api/mypageApi'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import PrimaryAppHeader from '@/shared/components/navigation/PrimaryAppHeader.vue'

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

  const selectedLabels = simulation.participants
    .filter((participant) => participant.variantType !== 'ACTUAL_USER')
    .map(
      (participant) =>
        SIMULATION_PARTICIPANT_META[participant.variantType]?.label || participant.variantName,
    )

  return `${selectedLabels.join('·')} 선택 시`
})

const SIMULATION_PARTICIPANT_META = Object.freeze({
  ACTUAL_USER: { label: '실제 나', image: '/assets/images/real-me.png', className: 'actual' },
  PERSONAL_BOT: { label: '나의 봇', image: '/assets/images/my-bot.png', className: 'bot' },
  FAMOUS_STRATEGY: {
    label: '유명 투자자',
    image: '/assets/images/famous-investor.png',
    className: 'investor',
  },
  RANDOM_BOT: { label: '원숭이', image: '/assets/images/monkey.png', className: 'monkey' },
})

const podiumParticipants = computed(() => {
  const participants = mypageStore.recentSimulation?.participants || []
  const participatingTypes = new Set(participants.map((participant) => participant.variantType))
  const unselectedParticipants = Object.entries(SIMULATION_PARTICIPANT_META)
    .filter(
      ([variantType]) =>
        variantType !== 'ACTUAL_USER' && !participatingTypes.has(variantType),
    )
    .map(([variantType, meta]) => ({ variantType, ...meta }))
  let unselectedIndex = 0

  return [2, 1, 3, 4].map((rank) => {
    const participant = participants.find((item) => item.rank === rank)
    if (!participant) {
      const unselectedParticipant = unselectedParticipants[unselectedIndex]
      unselectedIndex += 1

      return {
        rank,
        empty: true,
        label: unselectedParticipant?.label || '',
        image: unselectedParticipant?.image,
        className: unselectedParticipant?.className || 'empty',
      }
    }

    return {
      ...participant,
      ...(SIMULATION_PARTICIPANT_META[participant.variantType] || {
        label: participant.variantName,
        image: '/assets/images/my-bot.png',
        className: 'bot',
      }),
    }
  })
})

const tendencyGroups = computed(() => ({
  selection: mypageStore.tendencyBadges.filter((badge) => badge.group === 'SELECTION'),
  behavior: mypageStore.tendencyBadges.filter((badge) => badge.group === 'BEHAVIOR'),
}))

function goToSection(section) {
  router.push({ name: ROUTE_NAMES.MYPAGE_PLACEHOLDER, params: { section } })
}

function goToSimulation() {
  router.push({ name: ROUTE_NAMES.SIMULATION })
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
    <PrimaryAppHeader>
      <template #right>
        <button type="button" aria-label="마이페이지 도움말" @click="modal = 'help'">
          <AppIcon name="circle-help" :size="18" />
        </button>
      </template>
    </PrimaryAppHeader>

    <h1 class="mypage-title">마이페이지</h1>

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
          <div class="summary-card__header tendency-summary-card__header">
            <span class="summary-card__icon"><AppIcon name="chart-pie" :size="17" /></span>
            <span class="tendency-summary-card__heading">
              <strong>나의 투자성향</strong>
              <small v-if="!mypageStore.tendencyBadges.length">6가지 분석 전</small>
            </span>
          </div>
          <div v-if="mypageStore.tendencyBadges.length" class="tendency-result-preview">
            <div class="tendency-group tendency-group--selection">
              <strong>투자 선택</strong>
              <span v-for="badge in tendencyGroups.selection" :key="badge.code">
                {{ badge.label }}
              </span>
            </div>
            <div class="tendency-group tendency-group--behavior">
              <strong>매매 행동</strong>
              <span v-for="badge in tendencyGroups.behavior" :key="badge.code">
                {{ badge.label }}
              </span>
            </div>
            <div class="tendency-insight">
              <img src="/assets/images/mypage-insight-monkey.png" alt="책을 보며 생각하는 원숭이" />
              <p>최근 기록에서 반복된 선택과 행동을 한눈에 확인해보세요.</p>
            </div>
          </div>
          <div v-else class="summary-empty-state">
            <img src="/assets/icons/monkey-question.png" alt="" />
            <div class="summary-empty-state__copy">
              <strong>아직 결과가 없어요</strong>
              <p>나의 6가지 성향을<br />먼저 확인해보세요</p>
            </div>
          </div>
          <span class="summary-card__action">
            {{ mypageStore.tendencyBadges.length ? '투자성향으로 바로가기' : '투자성향 분석하기' }}
            <AppIcon name="arrow-right" :size="11" />
          </span>
        </button>

        <button type="button" class="simulation-summary-card" @click="goToSimulation">
          <div class="summary-card__header summary-card__header--simulation">
            <span class="summary-card__icon summary-card__icon--orange">
              <AppIcon name="trophy" :size="17" />
            </span>
            <small>{{ mypageStore.recentSimulation ? '최근 시뮬레이션' : '시뮬레이션' }}</small>
          </div>
          <template v-if="mypageStore.recentSimulation">
            <p class="simulation-summary-card__headline">
              <span>{{ recentSimulationHeadline }}</span>
              <strong>실제 나는 {{ mypageStore.recentSimulation.rank }}위예요</strong>
            </p>
            <div class="simulation-podium" aria-label="시뮬레이션 순위 미리보기">
              <div
                v-for="participant in podiumParticipants"
                :key="participant.rank"
                class="simulation-podium__participant"
                :class="[
                  `simulation-podium__participant--rank-${participant.rank}`,
                  `simulation-podium__participant--${participant.className}`,
                  { 'simulation-podium__participant--empty': participant.empty },
                ]"
              >
                <span
                  v-if="participant.rank === 1 && !participant.empty"
                  class="simulation-podium__crown"
                  aria-label="1위"
                >👑</span>
                <span v-else class="simulation-podium__crown-placeholder" aria-hidden="true" />
                <img v-if="participant.image" :src="participant.image" :alt="participant.label" />
                <span v-else class="simulation-podium__empty-image" aria-hidden="true" />
                <small>{{ participant.label }}</small>
                <strong>{{ participant.empty ? '선택 안 함' : `${participant.rank}위` }}</strong>
              </div>
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
            {{ mypageStore.recentSimulation ? '시뮬레이션 다시하기' : '시뮬레이션 시작하기' }}
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

.mypage-title {
  margin: 10px 18px 4px;
  font-size: var(--font-size-title-lg);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.mypage-loading {
  min-height: 520px;
}
.mypage-content {
  display: grid;
  gap: 14px;
  padding: 8px 16px 24px;
}

.profile-summary {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 13px;
  min-height: 116px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  background:
    radial-gradient(circle at 88% 30%, rgba(35, 198, 201, 0.2), transparent 30%),
    linear-gradient(135deg, #102f4b 0%, #0c4674 100%);
  color: #fff;
  box-shadow: 0 12px 26px rgba(23, 67, 101, 0.2);
}
.profile-summary__avatar {
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255, 255, 255, 0.22);
  border-radius: 19px;
  background: linear-gradient(145deg, #13b8af, #0a8f91);
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
  font-size: 19px;
  letter-spacing: -0.04em;
}
.profile-summary__copy > div > span {
  padding: 4px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #10b5aa, #11a0a1);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.22);
  font-size: var(--font-size-caption);
  font-weight: 800;
}
.profile-summary p {
  margin: 5px 0;
  color: #cfe1ec;
  font-size: var(--font-size-caption);
}
.profile-summary small {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #daeaf3;
  font-size: var(--font-size-caption);
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
  align-items: stretch;
  gap: 9px;
}
.tendency-summary-card,
.simulation-summary-card {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 222px;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px 10px 10px;
  border: 1px solid #b9e6e5;
  border-radius: 22px;
  background: linear-gradient(160deg, #ffffff 0%, #f7ffff 100%);
  color: #35484c;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 7px 18px rgba(33, 79, 102, 0.08);
}
.simulation-summary-card {
  border-color: #efd6ad;
  background: linear-gradient(160deg, #ffffff 0%, #fffaf2 100%);
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
  flex: 0 0 38px;
  border-radius: 13px;
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
  font-size: 11px;
  font-weight: 800;
}
.summary-card__header--simulation small {
  color: #ca7a16;
}
.tendency-summary-card__header {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
}
.tendency-summary-card__heading {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.tendency-summary-card__heading strong {
  color: #067d79;
  font-size: 12px;
  line-height: 1.1;
  white-space: nowrap;
}
.tendency-summary-card__heading small {
  color: #789092;
  font-size: 8px;
  font-weight: 650;
}
.summary-card__action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-top: auto;
  padding: 0 6px;
  border-radius: 999px;
  background: #e6f7f5;
  color: #087f7b;
  font-size: 10px;
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
.tendency-result-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  flex: 1;
}
.tendency-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 7px 6px;
  border-radius: 14px;
  background: #eef7f9;
  color: #294f63;
}
.tendency-group--behavior {
  background: #f3effa;
  color: #7252ad;
}
.tendency-group > strong {
  margin-bottom: 7px;
  font-size: 10px;
  line-height: 1;
}
.tendency-group > span {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding-left: 10px;
  color: #385264;
  font-size: 8px;
  font-weight: 750;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tendency-group > span::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 6px;
  height: 6px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: #37a8d0;
  content: '';
}
.tendency-group--behavior > span {
  color: #665482;
}
.tendency-group--behavior > span::before {
  background: #9c82d6;
}
.tendency-insight {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  min-height: 54px;
  padding: 1px 5px 0 0;
}
.tendency-insight img {
  width: 48px;
  height: 54px;
  object-fit: contain;
}
.tendency-insight p {
  margin: 0;
  color: #61777c;
  font-size: 8px;
  font-weight: 650;
  line-height: 1.45;
  word-break: keep-all;
}
.summary-empty-state {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  text-align: center;
}
.summary-empty-state img {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  object-fit: contain;
}
.summary-empty-state__copy {
  display: grid;
  min-width: 0;
  align-content: center;
  gap: 3px;
  text-align: center;
}
.summary-empty-state__copy strong {
  color: #2e3032;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  word-break: keep-all;
}
.summary-empty-state__copy p {
  margin: 0;
  color: #7d8b8e;
  font-size: 9px;
  line-height: 1.45;
}
.summary-empty-state--simulation .summary-empty-state__copy p {
  color: #887967;
}
.simulation-summary-card__headline {
  display: grid;
  min-height: 34px;
  align-content: center;
  gap: 3px;
  margin: 0;
  color: #61777c;
  font-size: 9px;
  font-weight: 650;
  line-height: 1.45;
  text-align: center;
  word-break: keep-all;
}
.simulation-summary-card__headline strong {
  color: #bd6f12;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.25;
}
.simulation-podium {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
  gap: 2px;
  min-height: 100px;
}
.simulation-podium__participant {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  color: #38596c;
  text-align: center;
}
.simulation-podium__participant img,
.simulation-podium__empty-image {
  width: 38px;
  height: 46px;
  object-fit: contain;
}
.simulation-podium__participant small {
  overflow: hidden;
  width: 100%;
  min-height: 16px;
  color: inherit;
  font-size: 7px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.simulation-podium__participant strong {
  display: grid;
  width: 100%;
  height: 30px;
  place-items: center;
  border-radius: 7px 7px 3px 3px;
  background: #dfeff4;
  color: #2e657b;
  font-size: 10px;
}
.simulation-podium__participant--rank-1 strong {
  height: 42px;
  background: #ffdb7b;
  color: #8a5910;
}
.simulation-podium__participant--rank-2 strong {
  height: 35px;
  background: #f7e3a9;
  color: #805e20;
}
.simulation-podium__participant--rank-4 strong {
  height: 23px;
  background: #ede5f7;
  color: #765c94;
  font-size: 7px;
}
.simulation-podium__crown,
.simulation-podium__crown-placeholder {
  display: grid;
  height: 16px;
  place-items: center;
  color: #e98d00;
  font-size: 20px;
  line-height: 1;
}
.simulation-podium__participant--empty:not(.simulation-podium__participant--rank-4) {
  opacity: 0.42;
}
.simulation-summary-card p:not(.simulation-summary-card__headline) {
  color: #68777a;
  font-size: var(--font-size-caption);
}

.menu-section {
  display: grid;
  gap: 8px;
}
.menu-section h2 {
  margin: 0;
  color: #183b59;
  font-size: 15px;
  font-weight: 850;
}
.menu-list {
  display: grid;
  gap: 7px;
}
.menu-list button,
.account-actions button {
  display: grid;
  width: 100%;
  min-height: 48px;
  grid-template-columns: 22px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid #dce6ec;
  border-radius: 14px;
  background: #fff;
  color: #29465d;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  box-shadow: 0 3px 10px rgba(30, 65, 89, 0.035);
}
.account-actions {
  display: grid;
  gap: 7px;
  margin-top: 1px;
}
.account-actions button {
  border-color: #ffe0df;
  border-radius: 14px;
  background: linear-gradient(90deg, #fff5f4, #fffafa);
  color: #e94d54;
}
.app-version {
  display: flex;
  justify-content: center;
  gap: 14px;
  padding: 3px 0 0;
  color: #9aa4a6;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-body);
}
.confirm-dialog > p,
.confirm-dialog li {
  color: #718083;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
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
