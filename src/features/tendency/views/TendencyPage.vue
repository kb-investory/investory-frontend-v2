<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import ReanalysisFloating from '@/features/tendency/components/ReanalysisFloating.vue'
import RecommendationFloating from '@/features/tendency/components/RecommendationFloating.vue'
import TendencyChangeModal from '@/features/tendency/components/TendencyChangeModal.vue'
import TendencyDetailModal from '@/features/tendency/components/TendencyDetailModal.vue'
import TendencyGroupCard from '@/features/tendency/components/TendencyGroupCard.vue'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import SegmentedControl from '@/shared/components/navigation/SegmentedControl.vue'

const RECOMMENDATION_NOTICE_COLLAPSED_KEY = 'investory:recommendation-notice-collapsed'
const REANALYSIS_NOTICE_COLLAPSED_KEY = 'investory:reanalysis-notice-collapsed'

const route = useRoute()
const router = useRouter()
const tendencyStore = useTendencyStore()
const activeTab = ref(route.query.tab === 'principles' ? '투자원칙' : '투자성향')
const selectedResult = ref(null)
const selectedHistory = ref(null)
let reanalysisMidnightTimer
const recommendationNoticeCollapsed = ref(
  window.localStorage.getItem(RECOMMENDATION_NOTICE_COLLAPSED_KEY) === 'true',
)
const reanalysisNoticeCollapsed = ref(false)

const analyzedDate = computed(() => formatDate(tendencyStore.analysis?.analyzedDate))
const analysisPeriod = computed(() => {
  const period = tendencyStore.analysis?.period
  if (!period) return ''

  return `${formatDate(period.startDate)} ~ ${formatDate(period.endDate)} · 최근 ${period.days}일`
})
const analysisProgressPercent = computed(() => {
  const minimumDays = tendencyStore.analysisAccess?.minimumRecordDays || 90
  return Math.min(100, Math.max(0, (tendencyStore.recordedDays / minimumDays) * 100))
})
const analysisMarkerPercent = computed(() =>
  Math.min(96, Math.max(4, analysisProgressPercent.value)),
)

function formatDate(date) {
  if (!date) return ''
  return date.replaceAll('-', '. ')
}

function formatMonth(date) {
  if (!date) return ''
  return date.slice(0, 7).replace('-', '. ')
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatPrincipleMeta(principle) {
  const isUserPrinciple =
    principle.isUserModified || principle.recommendationSource?.type === 'USER_CREATED'

  if (!isUserPrinciple) return '기본원칙'

  const date = principle.modifiedDate || principle.appliedDate
  return `${formatDate(date || getLocalDateKey())} · 사용자 작성 원칙`
}

function openHistoryDetail(historyItem) {
  selectedHistory.value = historyItem
}

function openRecommendations() {
  if (!tendencyStore.activeRecommendations.length) {
    activeTab.value = '투자원칙'
    return
  }

  router.push({ name: ROUTE_NAMES.TENDENCY_RECOMMENDATIONS })
}

function openPrincipleEdit() {
  router.push({ name: ROUTE_NAMES.TENDENCY_PRINCIPLES_EDIT })
}

async function startTendencyAnalysis() {
  activeTab.value = '투자성향'
  await tendencyStore.analyzeTendencies()
}

function toggleRecommendationNotice() {
  recommendationNoticeCollapsed.value = !recommendationNoticeCollapsed.value
  window.localStorage.setItem(
    RECOMMENDATION_NOTICE_COLLAPSED_KEY,
    String(recommendationNoticeCollapsed.value),
  )
}

function toggleReanalysisNotice() {
  const analysisRunId = tendencyStore.analysis?.analysisRunId
  if (!analysisRunId) return

  reanalysisNoticeCollapsed.value = !reanalysisNoticeCollapsed.value
  window.localStorage.setItem(
    `${REANALYSIS_NOTICE_COLLAPSED_KEY}:${analysisRunId}`,
    String(reanalysisNoticeCollapsed.value),
  )
}

function scheduleMidnightRefresh() {
  const now = new Date()
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)

  reanalysisMidnightTimer = window.setTimeout(() => {
    tendencyStore.refreshAnalysisDate()
    scheduleMidnightRefresh()
  }, nextMidnight.getTime() - now.getTime())
}

watch(activeTab, (tab) => {
  router.replace({
    query: tab === '투자원칙' ? { tab: 'principles' } : {},
  })
})

watch(
  () => tendencyStore.analysis?.analysisRunId,
  (analysisRunId) => {
    reanalysisNoticeCollapsed.value = analysisRunId
      ? window.localStorage.getItem(`${REANALYSIS_NOTICE_COLLAPSED_KEY}:${analysisRunId}`) ===
        'true'
      : false
  },
  { immediate: true },
)

onMounted(() => {
  tendencyStore.fetchTendencies()
  scheduleMidnightRefresh()
})

onBeforeUnmount(() => {
  window.clearTimeout(reanalysisMidnightTimer)
})
</script>

<template>
  <div class="tendency-page">
    <SegmentedControl v-model="activeTab" :options="['투자성향', '투자원칙']" />

    <div v-if="tendencyStore.loading" class="loading-wrapper">
      <BaseLoading />
    </div>

    <section v-else-if="tendencyStore.error" class="error-state" role="alert">
      <AppIcon name="rotate-ccw" :size="22" />
      <strong>투자성향을 불러오지 못했어요</strong>
      <p>잠시 후 다시 시도해 주세요.</p>
      <BaseButton variant="secondary" @click="tendencyStore.fetchTendencies({ force: true })">
        다시 불러오기
      </BaseButton>
    </section>

    <section v-else-if="tendencyStore.isAnalysisLocked" class="analysis-locked">
      <header class="analysis-locked__header">
        <h1>{{ activeTab === '투자성향' ? '나의 투자 성향' : '투자원칙' }}</h1>
        <p>
          {{
            activeTab === '투자성향'
              ? '충분한 투자 기록이 쌓이면 성향을 분석해드려요.'
              : '투자성향 분석 후 나에게 맞는 원칙을 추천해드려요.'
          }}
        </p>
      </header>

      <div class="analysis-locked__card">
        <span class="analysis-locked__icon">
          <AppIcon name="lock" :size="28" />
        </span>
        <span class="analysis-locked__eyebrow">투자 기록을 쌓고 있어요</span>
        <h2>90일 이후에 분석할 수 있어요</h2>
        <p>
          거래와 투자 일지가 충분히 쌓여야<br />
          더 정확한 투자성향을 알려드릴 수 있어요.
        </p>

        <div class="analysis-locked__progress">
          <header>
            <span>투자성향 분석까지</span>
            <strong>D-{{ tendencyStore.daysUntilAnalysis }}</strong>
          </header>
          <div class="analysis-locked__track">
            <span :style="{ width: `${analysisProgressPercent}%` }"></span>
            <img
              src="/assets/icons/monkey.png"
              alt=""
              :style="{ left: `${analysisMarkerPercent}%` }"
            />
          </div>
          <footer>
            <span>현재 {{ tendencyStore.recordedDays }}일째</span>
            <span> {{ tendencyStore.analysisAccess?.minimumRecordDays || 90 }}일 · 분석 가능 </span>
          </footer>
        </div>

        <div class="analysis-locked__available-date">
          <AppIcon name="calendar-range" :size="14" />
          <span>
            {{ formatDate(tendencyStore.analysisAccess?.analysisAvailableDate) }}부터 분석 가능
          </span>
        </div>
      </div>

      <p class="analysis-locked__notice">
        <AppIcon name="calendar-range" :size="12" />
        분석할 수 있는 날이 되면 홈에서 알려드릴게요
      </p>
    </section>

    <section
      v-else-if="tendencyStore.analyzing && activeTab === '투자성향'"
      class="analysis-progress"
      aria-live="polite"
    >
      <div class="analysis-progress__visual" aria-hidden="true">
        <span class="analysis-progress__orbit"></span>
        <span class="analysis-progress__core">
          <AppIcon name="radar" :size="28" />
        </span>
      </div>
      <div class="analysis-progress__copy">
        <span>최근 90일 기록 확인 중</span>
        <h1>투자성향을 분석하고 있어요</h1>
        <p>
          연결 계좌 거래와 투자 일지에서<br />
          반복되는 선택과 매매 행동을 찾고 있어요.
        </p>
      </div>
      <div class="analysis-progress__steps" aria-label="투자성향 분석 진행 단계">
        <span class="analysis-progress__step analysis-progress__step--active"></span>
        <span class="analysis-progress__step analysis-progress__step--active"></span>
        <span class="analysis-progress__step"></span>
      </div>
    </section>

    <main v-else-if="tendencyStore.analysis && activeTab === '투자성향'" class="analysis-content">
      <header class="analysis-header">
        <div class="analysis-header__title-row">
          <h1>나의 투자 성향</h1>
          <span class="analysis-date">
            <AppIcon name="calendar-range" :size="11" />
            {{ analyzedDate }} 분석
          </span>
        </div>
        <p>최근 90일의 연결 계좌 거래와 투자 일지를 바탕으로 분석했어요.</p>
        <span class="analysis-period">{{ analysisPeriod }}</span>
      </header>

      <section class="analysis-guide">
        <div class="analysis-guide__icon">
          <AppIcon name="sparkles" :size="16" />
        </div>
        <div>
          <strong>{{ tendencyStore.analysis.summary.combinationSummary }}</strong>
          <p>{{ tendencyStore.analysis.summary.strengthSummary }}</p>
          <small>아래 성향 카드를 누르면 상세 분석 근거를 볼 수 있어요.</small>
        </div>
      </section>

      <TendencyGroupCard
        label="투자 선택 성향"
        :summary="tendencyStore.analysis.groupSummaries.selection"
        :results="tendencyStore.selectionResults"
        icon="target"
        variant="selection"
        @select="selectedResult = $event"
      />

      <TendencyGroupCard
        label="매매 행동 성향"
        :summary="tendencyStore.analysis.groupSummaries.behavior"
        :results="tendencyStore.behaviorResults"
        icon="activity"
        variant="behavior"
        @select="selectedResult = $event"
      />

      <section class="history-card">
        <header class="history-card__header">
          <div>
            <h2>투자 성향 변화</h2>
            <p>기록을 누르면 당시 6개 결과와 판단 근거를 볼 수 있어요.</p>
          </div>
          <span>{{ formatMonth(tendencyStore.history.at(-1)?.analyzedDate) }} ~ 현재</span>
        </header>

        <div class="history-list">
          <button
            v-for="historyItem in tendencyStore.history"
            :key="historyItem.analysisRunId"
            type="button"
            class="history-item"
            @click="openHistoryDetail(historyItem)"
          >
            <time :datetime="historyItem.analyzedDate">
              {{ formatMonth(historyItem.analyzedDate) }}
            </time>
            <div class="history-item__content">
              <strong>{{ historyItem.label }}</strong>
              <span>{{ historyItem.description }}</span>
              <ul v-if="historyItem.changes.length">
                <li v-for="change in historyItem.changes.slice(0, 2)" :key="change.dimension">
                  {{ change.dimension }} · {{ change.previousType }} → {{ change.currentType }}
                </li>
              </ul>
            </div>
            <span
              v-if="historyItem.changedCount"
              class="history-item__change-count"
              :aria-label="`${historyItem.changedCount}개 성향 변경`"
            >
              {{ historyItem.changedCount }}
            </span>
            <AppIcon name="chevron-right" :size="15" />
          </button>
        </div>
      </section>
    </main>

    <main v-else-if="activeTab === '투자성향'" class="analysis-empty-content">
      <header class="empty-analysis-header">
        <h1>나의 투자 성향</h1>
        <p>아직 분석 결과가 없어요</p>
      </header>

      <section class="analysis-empty-visual">
        <div class="analysis-orbit" aria-hidden="true">
          <span class="analysis-orbit__center">
            <AppIcon name="radar" :size="22" />
            <small>6가지</small>
          </span>
          <i v-for="index in 6" :key="index" :style="{ '--index': index }" />
        </div>
        <strong>내 기록에서 반복되는 투자 패턴을 찾아요</strong>
        <p>연결 계좌의 거래와 투자 일지 판단 근거를 함께 분석해요.</p>
      </section>

      <section class="analysis-empty-benefits" aria-label="투자성향 분석 안내">
        <div>
          <AppIcon name="chart-pie" :size="17" />
          <strong>6가지 성향</strong>
          <span>선택과 행동을 나눠 확인</span>
        </div>
        <div>
          <AppIcon name="history" :size="17" />
          <strong>변화 기록</strong>
          <span>이전 분석과 변화 비교</span>
        </div>
        <div>
          <AppIcon name="notebook" :size="17" />
          <strong>판단 근거</strong>
          <span>실제 일지 기록으로 설명</span>
        </div>
      </section>

      <BaseButton full-width :disabled="tendencyStore.analyzing" @click="startTendencyAnalysis">
        내 투자성향 분석하기
        <template #iconRight><AppIcon name="arrow-right" :size="16" /></template>
      </BaseButton>

      <p class="analysis-empty-security">
        <AppIcon name="lock" :size="12" />
        분석 결과는 나만 확인할 수 있어요
      </p>
    </main>

    <main v-else-if="activeTab === '투자원칙'" class="principles-content">
      <header class="principles-header">
        <div>
          <h1>투자원칙</h1>
          <p>성향을 바탕으로 확정한 나의 매매 기준</p>
        </div>
      </header>

      <section v-if="tendencyStore.principles.length" class="principle-status">
        <header>
          <span>오늘의 적용 상태</span>
          <strong>{{ tendencyStore.principles.length }}개 적용 중</strong>
        </header>
        <h2>{{ tendencyStore.principles.length }}개의 투자원칙을 실천 중입니다.</h2>
        <p>원칙과 체크에서 선택한 기준을 자동으로 확인해드려요.</p>
      </section>

      <section v-if="tendencyStore.principles.length" class="my-principles">
        <header>
          <h2>나의 투자원칙</h2>
          <p>선택한 원칙은 일지와 회고에 적용돼요.</p>
        </header>

        <div class="principle-list" aria-label="적용 중인 투자 원칙">
          <article
            v-for="(principle, index) in tendencyStore.principles"
            :key="principle.principleId"
            class="principle-card"
          >
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <strong>{{ principle.content }}</strong>
              <p>{{ formatPrincipleMeta(principle) }}</p>
            </div>
            <AppIcon name="shield-check" :size="17" />
          </article>
        </div>
      </section>

      <button
        v-if="tendencyStore.principles.length"
        type="button"
        class="principle-edit-button"
        @click="openPrincipleEdit"
      >
        <AppIcon name="pencil" :size="16" />
        수정하기
      </button>

      <section v-else class="principles-empty">
        <span class="principles-empty__icon">
          <AppIcon name="check" :size="25" />
        </span>
        <h2>아직 적용 중인 투자원칙이 없어요</h2>
        <p v-if="tendencyStore.analysis">
          분석된 투자성향을 바탕으로 추천된 원칙 중<br />
          나에게 필요한 기준을 직접 선택해보세요.
        </p>
        <p v-else>
          투자원칙을 추천받으려면 먼저<br />
          최근 거래와 일지의 투자성향 분석이 필요해요.
        </p>
        <BaseButton
          full-width
          :disabled="
            tendencyStore.analyzing ||
            (Boolean(tendencyStore.analysis) && !tendencyStore.activeRecommendations.length)
          "
          @click="tendencyStore.analysis ? openRecommendations() : startTendencyAnalysis()"
        >
          {{ tendencyStore.analysis ? '추천 원칙 선택하기' : '투자성향 먼저 분석하기' }}
          <template #iconRight><AppIcon name="arrow-right" :size="16" /></template>
        </BaseButton>
      </section>
    </main>

    <TendencyDetailModal
      v-if="selectedResult"
      :result="selectedResult"
      @close="selectedResult = null"
    />

    <TendencyChangeModal
      v-if="selectedHistory"
      :history-item="selectedHistory"
      :analysis="tendencyStore.analysis"
      @close="selectedHistory = null"
    />

    <div
      v-if="
        activeTab === '투자성향' &&
        !tendencyStore.analyzing &&
        (tendencyStore.shouldShowReanalysis || tendencyStore.shouldShowRecommendation)
      "
      class="tendency-floating-stack"
    >
      <ReanalysisFloating
        v-if="tendencyStore.shouldShowReanalysis"
        :collapsed="reanalysisNoticeCollapsed"
        @analyze="startTendencyAnalysis"
        @toggle="toggleReanalysisNotice"
      />
      <RecommendationFloating
        v-if="tendencyStore.shouldShowRecommendation"
        :count="tendencyStore.activeRecommendations.length || tendencyStore.recommendations.length"
        :collapsed="recommendationNoticeCollapsed"
        @navigate="openRecommendations"
        @toggle="toggleRecommendationNotice"
      />
    </div>
  </div>
</template>

<style scoped>
.tendency-page {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.tendency-floating-stack {
  position: fixed;
  z-index: 160;
  right: max(16px, calc((100vw - 390px) / 2 + 16px));
  bottom: calc(var(--mobile-frame-edge-offset, 0px) + 84px);
  display: flex;
  width: min(calc(100% - 32px), 358px);
  flex-direction: column;
  gap: 8px;
}

.analysis-content,
.principles-content,
.analysis-empty-content {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.loading-wrapper {
  display: flex;
  min-height: 420px;
  align-items: center;
  justify-content: center;
}

.analysis-locked {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.analysis-locked__header {
  display: grid;
  gap: 4px;
  padding-top: 3px;
}

.analysis-locked__header h1,
.analysis-locked__header p,
.analysis-locked__card h2,
.analysis-locked__card > p,
.analysis-locked__notice {
  margin: 0;
}

.analysis-locked__header h1 {
  color: #181817;
  font-family: var(--font-heading);
  font-size: 22px;
  letter-spacing: -0.045em;
}

.analysis-locked__header p {
  color: #879194;
  font-size: 10px;
  line-height: 1.45;
}

.analysis-locked__card {
  display: flex;
  min-height: 330px;
  flex-direction: column;
  align-items: center;
  padding: 28px 18px 20px;
  border: 1px solid #c7e3e1;
  border-radius: 17px;
  background: #f2faf9;
  text-align: center;
}

.analysis-locked__icon {
  display: inline-flex;
  width: 70px;
  height: 70px;
  align-items: center;
  justify-content: center;
  margin-bottom: 13px;
  border: 1px solid #c7e4e2;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8px 20px rgba(24, 94, 91, 0.06);
  color: #0a918c;
}

.analysis-locked__eyebrow {
  color: #0a918c;
  font-size: 9px;
  font-weight: 800;
}

.analysis-locked__card h2 {
  margin-top: 6px;
  color: #263a3e;
  font-family: var(--font-heading);
  font-size: 18px;
  letter-spacing: -0.04em;
}

.analysis-locked__card > p {
  margin-top: 8px;
  color: #7e8b8d;
  font-size: 9px;
  line-height: 1.55;
}

.analysis-locked__progress {
  display: grid;
  width: 100%;
  gap: 9px;
  margin-top: 23px;
}

.analysis-locked__progress header,
.analysis-locked__progress footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.analysis-locked__progress header {
  color: #526467;
  font-size: 10px;
  font-weight: 750;
}

.analysis-locked__progress header strong {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: 11px;
}

.analysis-locked__track {
  position: relative;
  height: 7px;
  margin: 7px 3px;
  border-radius: 99px;
  background: #dce9e8;
}

.analysis-locked__track::before {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #0a918c;
  content: '';
  transform: translate(-25%, -50%);
}

.analysis-locked__track > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #54c4bf, #0a918c);
}

.analysis-locked__track img {
  position: absolute;
  z-index: 4;
  top: 50%;
  width: 48px;
  height: 48px;
  object-fit: cover;
  filter: drop-shadow(0 3px 5px rgba(21, 82, 80, 0.18));
  transform: translate(-50%, -52%);
}

.analysis-locked__progress footer {
  color: #7c898b;
  font-family: var(--font-mono);
  font-size: 8px;
}

.analysis-locked__progress footer span:last-child {
  color: #879294;
}

.analysis-locked__available-date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 8px 11px;
  border-radius: 9px;
  background: #fff;
  color: #617174;
  font-size: 9px;
  font-weight: 700;
}

.analysis-locked__notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #919a9c;
  font-size: 8px;
}

.analysis-progress {
  display: flex;
  min-height: 520px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  text-align: center;
}

.analysis-progress__visual {
  position: relative;
  display: flex;
  width: 126px;
  height: 126px;
  align-items: center;
  justify-content: center;
}

.analysis-progress__orbit {
  position: absolute;
  inset: 0;
  border: 1px solid #b8dfdd;
  border-radius: 50%;
  animation: analysis-orbit 1.4s linear infinite;
}

.analysis-progress__orbit::before,
.analysis-progress__orbit::after {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 4px solid var(--bg-primary, #f6f4ef);
  border-radius: 50%;
  background: #0a9792;
  content: '';
}

.analysis-progress__orbit::before {
  top: 8px;
  right: 18px;
}

.analysis-progress__orbit::after {
  bottom: 9px;
  left: 16px;
  background: #9fd5d2;
}

.analysis-progress__core {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 76px;
  height: 76px;
  align-items: center;
  justify-content: center;
  border: 1px solid #c4e5e3;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8px 22px rgba(11, 143, 139, 0.09);
  color: #0a918c;
}

.analysis-progress__copy {
  display: grid;
  gap: 7px;
}

.analysis-progress__copy span {
  color: #0a918c;
  font-size: 9px;
  font-weight: 800;
}

.analysis-progress__copy h1,
.analysis-progress__copy p {
  margin: 0;
}

.analysis-progress__copy h1 {
  color: #23373b;
  font-family: var(--font-heading);
  font-size: 20px;
  letter-spacing: -0.04em;
}

.analysis-progress__copy p {
  color: #818d8f;
  font-size: 10px;
  line-height: 1.55;
}

.analysis-progress__steps {
  display: flex;
  gap: 5px;
}

.analysis-progress__step {
  width: 22px;
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: #dce7e6;
}

.analysis-progress__step--active {
  background: #0b9691;
}

@keyframes analysis-orbit {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-progress__orbit {
    animation: none;
  }
}

.analysis-header {
  position: relative;
  display: grid;
  gap: 5px;
  padding-top: 3px;
}

.analysis-header__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.analysis-header h1,
.analysis-header p,
.principles-header h1,
.principles-header p,
.history-card h2,
.history-card p {
  margin: 0;
}

.analysis-header h1,
.principles-header h1 {
  color: #181817;
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.045em;
}

.analysis-header p,
.principles-header p {
  color: #7c8587;
  font-size: 11px;
  line-height: 1.45;
}

.analysis-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 7px;
  background: #f5f7f7;
  color: #6d7779;
  font-family: var(--font-mono);
  font-size: 9px;
  white-space: nowrap;
}

.analysis-period {
  color: #869194;
  font-family: var(--font-mono);
  font-size: 9px;
}

.analysis-guide {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid #bfe4e2;
  border-radius: 13px;
  background: #f1fbfa;
}

.analysis-guide__icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #d8f4f2;
  color: #087f7c;
}

.analysis-guide strong,
.analysis-guide p,
.analysis-guide small {
  display: block;
}

.analysis-guide strong {
  color: #294449;
  font-size: 11px;
  line-height: 1.4;
}

.analysis-guide p {
  margin: 3px 0 0;
  color: #637477;
  font-size: 9px;
  line-height: 1.45;
}

.analysis-guide small {
  margin-top: 5px;
  color: #078681;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.4;
}

.history-card {
  display: grid;
  gap: 10px;
  padding: 15px 12px 12px;
  border: 1px solid #dfe7e7;
  border-radius: 16px;
  background: #ffffff;
}

.history-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.history-card__header h2 {
  color: #24373d;
  font-size: 13px;
  font-weight: 800;
}

.history-card__header p {
  margin-top: 4px;
  color: #8a9395;
  font-size: 9px;
  line-height: 1.4;
}

.history-card__header > span {
  color: #8b9496;
  font-family: var(--font-mono);
  font-size: 8px;
  white-space: nowrap;
}

.history-list {
  display: grid;
  gap: 6px;
}

.history-item {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 9px;
  border: 1px solid #e0e6e6;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  color: #6b7779;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.history-item:hover,
.history-item:focus-visible {
  border-color: #8bc9c6;
  background: #f7fcfc;
  outline: none;
}

.history-item time {
  color: #8b9496;
  font-family: var(--font-mono);
  font-size: 8px;
}

.history-item__content {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.history-item__content strong {
  color: #2e3e42;
  font-size: 10px;
}

.history-item__content > span,
.history-item__content li {
  color: #778184;
  font-size: 8px;
  line-height: 1.4;
}

.history-item__content ul {
  display: grid;
  gap: 1px;
  margin: 3px 0 0;
  padding: 0;
  list-style: none;
}

.history-item__content li::before {
  color: #0b9a95;
  content: '↳ ';
}

.history-item__change-count {
  display: inline-flex;
  width: 21px;
  height: 21px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e6f7f6;
  color: #087f7c;
  font-size: 9px;
  font-weight: 800;
}

.principles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0 5px;
}

.principles-header > div {
  display: grid;
  gap: 4px;
}

.principle-status {
  display: grid;
  gap: 9px;
  padding: 16px;
  border-radius: 16px;
  background: #263e47;
  color: #fff;
  box-shadow: 0 7px 18px rgba(29, 55, 62, 0.14);
}

.principle-status header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.principle-status header span {
  color: #6edbd5;
  font-size: 9px;
  font-weight: 750;
}

.principle-status header strong {
  padding: 5px 9px;
  border: 1px solid #64d0ca;
  border-radius: 99px;
  background: #0b8f8b;
  color: #fff;
  font-size: 9px;
}

.principle-status h2,
.principle-status p,
.my-principles h2,
.my-principles p {
  margin: 0;
}

.principle-status h2 {
  font-size: 16px;
  line-height: 1.4;
  letter-spacing: -0.035em;
}

.principle-status p {
  color: #b9ced1;
  font-size: 9px;
  line-height: 1.45;
}

.my-principles {
  display: grid;
  gap: 10px;
}

.my-principles > header {
  display: grid;
  gap: 4px;
}

.my-principles h2 {
  color: #24373d;
  font-size: 16px;
}

.my-principles > header p {
  color: #8a9496;
  font-size: 9px;
}

.principle-list {
  display: grid;
  gap: 8px;
}

.principle-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 84px;
  padding: 13px 12px;
  border: 1px solid #dfe7e7;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(38, 58, 67, 0.025);
}

.principle-card > span {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #0b9b96;
  color: #fff;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
}

.principle-card > div {
  display: grid;
  gap: 7px;
}

.principle-card strong {
  color: #273a3f;
  font-size: 11px;
  line-height: 1.5;
}

.principle-card p {
  margin: 0;
  color: #9aa2a4;
  font-size: 8px;
  line-height: 1.4;
}

.principle-card > :last-child {
  color: #0b8f8b;
}

.principle-edit-button {
  display: flex;
  min-height: 47px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #dce5e5;
  border-radius: 13px;
  background: #fff;
  color: #58676a;
  cursor: pointer;
  font-size: 11px;
  font-weight: 750;
}

.empty-analysis-header {
  display: grid;
  gap: 4px;
  padding-top: 3px;
}

.empty-analysis-header h1,
.empty-analysis-header p,
.analysis-empty-visual p,
.analysis-empty-security,
.principles-empty h2,
.principles-empty p {
  margin: 0;
}

.empty-analysis-header h1 {
  color: #181817;
  font-family: var(--font-heading);
  font-size: 22px;
  letter-spacing: -0.045em;
}

.empty-analysis-header p {
  color: #879194;
  font-size: 10px;
}

.analysis-empty-visual {
  display: flex;
  min-height: 165px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px;
  border: 1px solid #bfe3e1;
  border-radius: 15px;
  background: #f1fbfa;
  text-align: center;
}

.analysis-orbit {
  position: relative;
  width: 112px;
  height: 84px;
  margin-bottom: 8px;
}

.analysis-orbit__center {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: inline-flex;
  width: 68px;
  height: 68px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid #b8dfdd;
  border-radius: 50%;
  background: #fff;
  color: #0a918c;
  transform: translate(-50%, -50%);
}

.analysis-orbit__center small {
  font-size: 8px;
  font-weight: 800;
}

.analysis-orbit i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #abdcd9;
  transform: translate(-50%, -50%) rotate(calc(var(--index) * 60deg)) translateY(-48px);
  transform-origin: center;
}

.analysis-orbit i:first-of-type {
  background: #0b9d98;
}

.analysis-empty-visual > strong {
  color: #34484c;
  font-size: 11px;
}

.analysis-empty-visual > p {
  margin-top: 5px;
  color: #819092;
  font-size: 8px;
  line-height: 1.45;
}

.analysis-empty-benefits {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid #dfe7e7;
  border-radius: 13px;
  background: #fff;
}

.analysis-empty-benefits > div {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 68px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 9px 4px;
  color: #0a918c;
  text-align: center;
}

.analysis-empty-benefits > div + div::before {
  position: absolute;
  top: 13px;
  bottom: 13px;
  left: 0;
  width: 1px;
  background: #edf0f0;
  content: '';
}

.analysis-empty-benefits strong {
  color: #4a5b5e;
  font-size: 9px;
}

.analysis-empty-benefits span {
  color: #929b9d;
  font-size: 7px;
  line-height: 1.35;
}

.analysis-empty-security {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #919a9c;
  font-size: 8px;
}

.principles-empty {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 22px 14px;
  border: 1px solid #bfe3e1;
  border-radius: 15px;
  background: #f2fbfa;
  text-align: center;
}

.principles-empty__icon {
  display: inline-flex;
  width: 62px;
  height: 62px;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  border: 1px solid #c4e6e4;
  border-radius: 50%;
  background: #fff;
  color: #0a918c;
}

.principles-empty h2 {
  color: #273b3f;
  font-size: 14px;
  letter-spacing: -0.035em;
}

.principles-empty p {
  margin-top: 8px;
  color: #839093;
  font-size: 9px;
  line-height: 1.55;
}

.principles-empty :deep(.base-button) {
  margin-top: 17px;
}

.error-state {
  display: flex;
  min-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #607174;
  text-align: center;
}

.error-state strong {
  color: #263a43;
  font-size: 14px;
}

.error-state p {
  margin: 0 0 8px;
  font-size: 11px;
}
</style>
