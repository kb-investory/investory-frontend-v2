<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { disconnectSocialAccount, withdrawMember } from '@/features/mypage/api/mypageApi'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'

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

  const winner = simulation.participants.find((participant) => participant.rank === 1)
  const winnerLabel =
    SIMULATION_PARTICIPANT_META[winner?.variantType]?.label || winner?.variantName || '참가자'

  return `${simulation.participantCount}명 대결 · ${winnerLabel} 1위`
})

const SIMULATION_PARTICIPANT_META = Object.freeze({
  ACTUAL_USER: { label: '실제 나', className: 'actual' },
  PERSONAL_BOT: { label: '원칙 봇', className: 'bot' },
  FAMOUS_STRATEGY: {
    label: '유명 투자자',
    className: 'investor',
  },
  RANDOM_BOT: { label: '원숭이', className: 'monkey' },
})

const podiumParticipants = computed(() => {
  const participants = mypageStore.recentSimulation?.participants || []
  const displayOrder = [2, 1, 3, 4]

  return [...participants]
    .sort((first, second) => displayOrder.indexOf(first.rank) - displayOrder.indexOf(second.rank))
    .map((participant) => ({
      ...participant,
      ...(SIMULATION_PARTICIPANT_META[participant.variantType] || {
        label: participant.variantName,
        className: 'bot',
      }),
    }))
})

const tendencyRoadmapPoints = computed(() => {
  const history = mypageStore.tendencyHistory

  return history.map((item, index) => {
    const progress = history.length === 1 ? 0.5 : index / (history.length - 1)
    return {
      ...item,
      x: 14 + progress * 122,
      y: 31 - Math.sin(progress * Math.PI) * 13,
      isLatest: index === history.length - 1,
      month: item.analyzedDate?.slice(2, 7).replace('-', '.'),
    }
  })
})

const tendencyRoadmapLine = computed(() => {
  if (!tendencyRoadmapPoints.value.length) return ''
  if (tendencyRoadmapPoints.value.length === 1) return 'M 14 31 H 136'

  return tendencyRoadmapPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
})

const tendencyRoadmapMessage = computed(() => {
  const history = mypageStore.tendencyHistory
  if (history.length <= 1) return '첫 분석부터 차근차근 성향 변화를 기록해드릴게요.'

  const latest = history.at(-1)
  return latest.changedCount
    ? `최근 분석에서 ${latest.changedCount}가지 성향 변화가 있었어요.`
    : '최근에도 투자성향이 안정적으로 유지되고 있어요.'
})

const podiumGridStyle = computed(() => ({
  '--participant-count': Math.max(podiumParticipants.value.length, 1),
}))

function formatSimulationReturn(value) {
  const number = Number(value) || 0
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`
}

function goToSection(section) {
  router.push({ name: ROUTE_NAMES.MYPAGE_PLACEHOLDER, params: { section } })
}

function goToSimulation() {
  const simulationId = mypageStore.recentSimulation?.simulationId
  router.push(
    simulationId
      ? {
          name: ROUTE_NAMES.MYPAGE_SIMULATION_DETAIL,
          params: { simulationId },
        }
      : { name: ROUTE_NAMES.SIMULATION },
  )
}

async function confirmLogout() {
  if (processing.value) return
  processing.value = true
  actionError.value = ''
  try {
    await authStore.signOut()
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
    const connectionIds = [
      ...new Set(mypageStore.accounts.map((account) => account.sourceConnectionId)),
    ]
    for (const connectionId of connectionIds) {
      await mypageStore.disconnectBroker(connectionId)
    }
    await withdrawMember()
    await authStore.signOut()
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
  await mypageStore.fetchOverview({ authUser: authStore.user })
})
</script>

<template>
  <div class="mypage-page">
    <PrimaryTabHeader title="마이페이지" flat-bottom>
      <template #right>
        <button
          class="mypage-page__help"
          type="button"
          aria-label="마이페이지 도움말"
          @click="modal = 'help'"
        >
          <AppIcon name="circle-help" :size="18" />
        </button>
      </template>
    </PrimaryTabHeader>

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
            <span class="summary-card__icon summary-card__icon--tendency">
              <AppIcon name="chart-pie" :size="17" />
            </span>
            <small>나의 투자성향</small>
          </div>
          <div v-if="mypageStore.tendencyBadges.length" class="tendency-result-preview">
            <div class="tendency-roadmap" aria-label="투자성향 변화 로드맵">
              <div class="tendency-roadmap__title">
                <strong>성향 변화 로드맵</strong>
                <span>분석 {{ mypageStore.tendencyHistory.length }}회</span>
              </div>
              <svg viewBox="0 0 150 52" role="img" aria-hidden="true">
                <path :d="tendencyRoadmapLine" />
                <g
                  v-for="point in tendencyRoadmapPoints"
                  :key="point.analysisRunId"
                  class="tendency-roadmap__point"
                  :class="{ 'is-latest': point.isLatest }"
                >
                  <line :x1="point.x" :y1="point.y - 2" :x2="point.x" :y2="point.y - 17" />
                  <path
                    class="tendency-roadmap__flag"
                    :d="`M ${point.x} ${point.y - 17} L ${point.x + 10} ${point.y - 14} L ${point.x} ${point.y - 10} Z`"
                  />
                  <circle :cx="point.x" :cy="point.y" :r="point.isLatest ? 5 : 3.5" />
                  <text :x="point.x" y="48" text-anchor="middle">{{ point.month }}</text>
                </g>
              </svg>
            </div>
            <div class="tendency-insight">
              <img src="/assets/images/mypage-insight-monkey.png" alt="책을 보며 생각하는 원숭이" />
              <p>{{ tendencyRoadmapMessage }}</p>
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
            <div
              class="simulation-podium"
              :style="podiumGridStyle"
              :aria-label="`${mypageStore.recentSimulation.participantCount}명 시뮬레이션 순위 미리보기`"
            >
              <div
                v-for="participant in podiumParticipants"
                :key="participant.variantId || participant.variantType"
                class="simulation-podium__participant"
                :class="[
                  `simulation-podium__participant--rank-${participant.rank}`,
                  `simulation-podium__participant--${participant.className}`,
                ]"
              >
                <span
                  v-if="participant.rank === 1"
                  class="simulation-podium__crown"
                  aria-label="1위"
                  >👑</span
                >
                <span v-else class="simulation-podium__crown-placeholder" aria-hidden="true" />
                <SimulationParticipantAvatar
                  class="simulation-podium__avatar"
                  :variant-type="participant.variantType"
                  :size="38"
                />
                <small>{{ participant.label }}</small>
                <strong>
                  <span>{{ participant.rank }}위</span>
                  <em>{{ formatSimulationReturn(participant.cumulativeReturnPercent) }}</em>
                </strong>
              </div>
            </div>
          </template>
          <div v-else class="summary-empty-state summary-empty-state--simulation">
            <img src="/assets/icons/monkey-question.png" alt="" />
            <div class="summary-empty-state__copy">
              <strong>아직 결과가 없어요</strong>
              <p>비교 상대를 골라<br />첫 대결을 시작해보세요</p>
            </div>
          </div>
          <span class="summary-card__action summary-card__action--simulation">
            {{ mypageStore.recentSimulation ? '결과 자세히 보기' : '시뮬레이션 시작하기' }}
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

.mypage-page__help {
  border-color: rgb(67 222 217 / 34%) !important;
  background: rgb(5 45 56 / 76%) !important;
  color: #ffffff !important;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.mypage-page__help:hover {
  border-color: rgb(86 235 229 / 72%) !important;
  background: #075863 !important;
  color: #ffffff !important;
  box-shadow: 0 0 20px rgb(22 201 196 / 22%) !important;
}

.mypage-page__help:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c) !important;
  outline-offset: 2px !important;
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
  position: relative;
  z-index: 4;
  display: grid;
  gap: 14px;
  margin-top: -40px;
  padding: 0 16px 24px;
}

.profile-summary {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 11px;
  min-height: 92px;
  padding: 12px 14px;
  border: 1px solid #b9e4e2;
  border-radius: 24px;
  background: #ffffff;
  color: #263a43;
  box-shadow: 0 12px 26px rgb(2 35 44 / 13%);
}
.profile-summary__avatar {
  width: 52px;
  height: 52px;
  border: 2px solid #a9dedb;
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
  background: #e7f8f6;
  color: #087f7c;
  font-size: var(--font-size-caption);
  font-weight: 800;
}
.profile-summary p {
  margin: 3px 0;
  color: #6f7e84;
  font-size: var(--font-size-caption);
}
.profile-summary small {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #60747b;
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
  border: 1px solid #c9e7e5;
  border-radius: 12px;
  background: #f1fbfa;
  color: #087f7c;
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
  border-color: #c7ddf8;
  background: linear-gradient(160deg, #ffffff 0%, #f3f7fd 100%);
  box-shadow: 0 9px 20px rgba(11, 99, 206, 0.08);
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
  background: linear-gradient(145deg, #4386e6, #0b63ce);
  color: #ffffff;
  box-shadow:
    0 6px 12px rgba(11, 99, 206, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.summary-card__icon--tendency {
  background: linear-gradient(145deg, #18b9b2, #078d88);
  color: #ffffff;
  box-shadow:
    0 6px 12px rgba(7, 141, 136, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.tendency-summary-card small,
.simulation-summary-card small {
  color: #078d88;
  font-size: 11px;
  font-weight: 800;
}
.summary-card__header--simulation small {
  color: #0b63ce;
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
  background: #e8f1fd;
  color: #0b63ce !important;
  line-height: 1;
  text-align: center !important;
}
.tendency-result-preview {
  display: grid;
  gap: 6px;
  flex: 1;
}

.tendency-roadmap {
  display: grid;
  min-width: 0;
  gap: 3px;
  padding: 7px 7px 2px;
  border-radius: 14px;
  background: #edf8f7;
}

.tendency-roadmap__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}

.tendency-roadmap__title strong {
  color: #2a555b;
  font-size: 9px;
}

.tendency-roadmap__title span {
  color: #758b8e;
  font-size: 7px;
}

.tendency-roadmap svg {
  display: block;
  width: 100%;
  height: 52px;
  overflow: visible;
}

.tendency-roadmap path {
  fill: none;
  stroke: #9ed8d4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4;
}

.tendency-roadmap__point line {
  stroke: #71878a;
  stroke-linecap: round;
  stroke-width: 1.5;
}

.tendency-roadmap .tendency-roadmap__flag {
  fill: #71878a;
  stroke: none;
}

.tendency-roadmap__point circle {
  fill: #71878a;
  stroke: #ffffff;
  stroke-width: 2;
}

.tendency-roadmap__point.is-latest line {
  stroke: #07948e;
}

.tendency-roadmap .tendency-roadmap__point.is-latest .tendency-roadmap__flag,
.tendency-roadmap__point.is-latest circle {
  fill: #07948e;
}

.tendency-roadmap text {
  fill: #7e9092;
  font-size: 6px;
}
.tendency-insight {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  min-height: 46px;
  padding: 0 5px 0 0;
}
.tendency-insight img {
  width: 45px;
  height: 46px;
  object-fit: contain;
}
.tendency-insight p {
  margin: 0;
  color: #61777c;
  font-size: 9px;
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
  color: #667d96;
}
.simulation-summary-card__headline {
  display: grid;
  min-height: 34px;
  align-content: center;
  gap: 3px;
  margin: 0;
  padding: 8px 7px;
  border: 1px solid #d6e5f8;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  color: #536d89;
  font-size: 9px;
  font-weight: 650;
  line-height: 1.45;
  text-align: center;
  word-break: keep-all;
}
.simulation-summary-card__headline strong {
  color: #0b63ce;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.25;
}
.simulation-podium {
  display: grid;
  grid-template-columns: repeat(var(--participant-count), minmax(0, 1fr));
  align-items: end;
  gap: 4px;
  min-height: 100px;
}
.simulation-podium__participant {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  color: #38596c;
  text-align: center;
}
.simulation-podium__avatar {
  width: 38px;
  height: 38px;
  margin: 4px 0;
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
  display: flex;
  width: 100%;
  min-width: 0;
  height: 30px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-radius: 7px 7px 3px 3px;
  background: #d9ebff;
  color: #275e9b;
  font-size: 10px;
  line-height: 1.05;
}
.simulation-podium__participant strong em {
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
  opacity: 0.78;
}
.simulation-podium__participant--rank-1 strong {
  height: 42px;
  background: #4f91e8;
  color: #ffffff;
}
.simulation-podium__participant--rank-2 strong {
  height: 35px;
  background: #91bdec;
  color: #174f8d;
}
.simulation-podium__participant--rank-3 strong {
  background: #b8d9f7;
  color: #245d98;
}
.simulation-podium__participant--rank-4 strong {
  height: 23px;
  background: #dceafd;
  color: #3c6595;
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
