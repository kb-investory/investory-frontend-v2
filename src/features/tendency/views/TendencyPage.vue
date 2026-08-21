<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import RunningMonkey from '@/features/home/components/RunningMonkey.vue'
import ReanalysisFloating from '@/features/tendency/components/ReanalysisFloating.vue'
import RecommendationFloating from '@/features/tendency/components/RecommendationFloating.vue'
import TendencyChangeModal from '@/features/tendency/components/TendencyChangeModal.vue'
import TendencyDetailModal from '@/features/tendency/components/TendencyDetailModal.vue'
import TendencyGroupCard from '@/features/tendency/components/TendencyGroupCard.vue'
import { useFloatingCornerSwipe } from '@/features/tendency/composables/useFloatingCornerSwipe'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'
import SegmentedControl from '@/shared/components/navigation/SegmentedControl.vue'

const RECOMMENDATION_NOTICE_COLLAPSED_KEY = 'investory:recommendation-notice-collapsed:v4'
const REANALYSIS_NOTICE_COLLAPSED_KEY = 'investory:reanalysis-notice-collapsed:v8'
const FLOATING_POSITION_KEY = 'investory:tendency-floating-position:v2'

const route = useRoute()
const router = useRouter()
const tendencyStore = useTendencyStore()
const activeTab = ref(route.query.tab === 'principles' ? '투자원칙' : '투자성향')
const selectedResult = ref(null)
const selectedHistory = ref(null)
const selectedRoadmapHistory = ref(null)
let reanalysisMidnightTimer
const recommendationNoticeCollapsed = ref(
  window.localStorage.getItem(RECOMMENDATION_NOTICE_COLLAPSED_KEY) !== 'false',
)
const reanalysisNoticeCollapsed = ref(true)
const {
  elementRef: floatingStackRef,
  position: floatingPosition,
  sliding: floatingSliding,
  style: floatingStackStyle,
  startSwipe: startFloatingSwipe,
  preventClickAfterSwipe: preventFloatingClick,
} = useFloatingCornerSwipe(FLOATING_POSITION_KEY)

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
const historyAnalysisCount = computed(() => tendencyStore.history.length)
const roadmapHistory = computed(() => [...tendencyStore.history].reverse())

function getRoadmapY(progress) {
  return 116 - 48 * Math.sin(Math.PI * progress) + 14 * Math.sin(Math.PI * 2 * progress)
}

const roadmapPoints = computed(() => {
  const items = roadmapHistory.value

  return items.map((historyItem, index) => {
    const progress = items.length === 1 ? 0.5 : index / (items.length - 1)

    return {
      historyItem,
      x: 22 + progress * 296,
      y: getRoadmapY(progress),
      isLatest: index === items.length - 1,
      isFirst: index === 0,
    }
  })
})

const roadmapLinePoints = computed(() =>
  Array.from({ length: 41 }, (_, index) => {
    const progress = index / 40
    const x = 22 + progress * 296
    return `${x},${getRoadmapY(progress)}`
  }).join(' '),
)

function formatDate(date) {
  if (!date) return ''
  return date.replaceAll('-', '. ')
}

function formatMonth(date) {
  if (!date) return ''
  return date.slice(0, 7).replace('-', '. ')
}

function formatHistoryChange(change) {
  const dimension = change.dimension
    .replace('포트폴리오 위험배분', '위험배분')
    .replace('매수 판단 근거', '판단 기준')
    .replace(' 성향', '')

  return `${dimension} → ${change.currentType}`
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 추천 기반 원칙은 어떤 투자성향에서 나왔는지가 핵심 정보라 성향명을 노출한다.
// 원칙 편집 화면(PrincipleEditPage.getSourceLabel)과 같은 우선순위를 쓴다.
function getPrincipleSourceLabel(principle) {
  return principle.recommendationSource?.tendency?.name ?? principle.title ?? '투자성향'
}

function formatPrincipleMeta(principle) {
  const isUserPrinciple =
    principle.isUserModified || principle.recommendationSource?.type === 'USER_CREATED'

  if (!isUserPrinciple) return `${getPrincipleSourceLabel(principle)} 기반`

  const date = principle.modifiedDate || principle.appliedDate
  return `${formatDate(date || getLocalDateKey())} · 사용자 입력`
}

function openHistoryDetail(historyItem) {
  selectedHistory.value = historyItem
}

function toggleRoadmapHistory(historyItem) {
  selectedRoadmapHistory.value =
    selectedRoadmapHistory.value?.analysisRunId === historyItem.analysisRunId ? null : historyItem
}

function openRoadmapHistoryDetail(historyItem) {
  selectedRoadmapHistory.value = null
  openHistoryDetail(historyItem)
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
    if (!analysisRunId) {
      reanalysisNoticeCollapsed.value = true
      return
    }

    const storedCollapsedState = window.localStorage.getItem(
      `${REANALYSIS_NOTICE_COLLAPSED_KEY}:${analysisRunId}`,
    )
    reanalysisNoticeCollapsed.value =
      storedCollapsedState === null ? false : storedCollapsedState !== 'false'
  },
  { immediate: true },
)

onMounted(async () => {
  await tendencyStore.fetchTendencies()
  tendencyStore.refreshAnalysisDate()
  scheduleMidnightRefresh()

  if (route.query.reanalyze === 'true' && tendencyStore.shouldShowReanalysis) {
    await router.replace({ name: ROUTE_NAMES.TENDENCY })
    await startTendencyAnalysis()
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(reanalysisMidnightTimer)
})
</script>

<template>
  <div class="tendency-page">
    <PrimaryTabHeader
      class="tendency-hero"
      :title="activeTab === '투자성향' ? '나의 투자성향' : '투자원칙'"
      flat-bottom
    />

    <div class="tendency-tabs">
      <SegmentedControl v-model="activeTab" :options="['투자성향', '투자원칙']" />
    </div>

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

    <section
      v-else-if="
        tendencyStore.isAnalysisLocked && !tendencyStore.analysis && activeTab === '투자성향'
      "
      class="analysis-locked"
    >
      <header class="analysis-locked__header">
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
            <span class="analysis-locked__runner" :style="{ left: `${analysisMarkerPercent}%` }">
              <RunningMonkey :size="48" />
            </span>
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
        <span class="analysis-progress__step"></span>
        <span class="analysis-progress__step"></span>
        <span class="analysis-progress__step"></span>
      </div>
    </section>

    <main v-else-if="tendencyStore.analysis && activeTab === '투자성향'" class="analysis-content">
      <section class="analysis-intro">
        <div class="analysis-intro__copy">
          <div class="analysis-intro__eyebrow">
            <AppIcon name="sparkles" :size="14" />
            <span>90일 투자 리포트</span>
          </div>
          <h2>나의 투자성향은 어떤가요?</h2>
          <p>최근 기록에서 반복되는 선택과<br />매매 행동을 찾았어요.</p>
          <span class="analysis-intro__period">{{ analysisPeriod }}</span>
        </div>
        <img
          class="analysis-intro__monkey"
          src="/assets/images/tendency-report-monkey.png"
          alt=""
          aria-hidden="true"
        />
      </section>

      <div v-if="tendencyStore.isAnalysisLocked" class="analysis-cooldown-notice">
        <AppIcon name="calendar-range" :size="14" />
        <span>
          {{ formatDate(tendencyStore.analysisAccess?.analysisAvailableDate) }}부터 다시 분석할 수
          있어요
        </span>
      </div>

      <section class="tendency-combination">
        <header class="tendency-combination__header">
          <h2>나의 성향 조합</h2>
          <p>6가지 성향 버튼을 누르면 각 성향의 상세 설명을 확인할 수 있어요</p>
        </header>

        <div class="tendency-combination__cards">
          <TendencyGroupCard
            label="투자 선택 성향"
            :results="tendencyStore.selectionResults"
            icon="target"
            variant="selection"
            @select="selectedResult = $event"
          />

          <TendencyGroupCard
            label="매매 행동 성향"
            :results="tendencyStore.behaviorResults"
            icon="activity"
            variant="behavior"
            @select="selectedResult = $event"
          />
        </div>
      </section>

      <section class="roadmap-card">
        <header class="roadmap-card__header">
          <div>
            <span aria-hidden="true"><AppIcon name="trending-up" :size="17" /></span>
            <h2>성향 변화 로드맵</h2>
          </div>
          <span>깃발 {{ historyAnalysisCount }}개</span>
        </header>

        <div class="roadmap-card__canvas" @click.self="selectedRoadmapHistory = null">
          <svg viewBox="0 0 340 170" preserveAspectRatio="none" aria-hidden="true">
            <polyline :points="roadmapLinePoints" />
          </svg>

          <div
            v-for="point in roadmapPoints"
            :key="point.historyItem.analysisRunId"
            class="roadmap-point"
            :class="{
              'roadmap-point--latest': point.isLatest,
              'roadmap-point--first': point.isFirst,
            }"
            :style="{ left: `${(point.x / 340) * 100}%`, top: `${(point.y / 170) * 100}%` }"
          >
            <button
              type="button"
              class="roadmap-point__button"
              :aria-label="`${formatMonth(point.historyItem.analyzedDate)} 분석 변화 보기`"
              @click.stop="toggleRoadmapHistory(point.historyItem)"
            >
              <AppIcon name="flag" :size="20" />
              <span></span>
            </button>
            <time :datetime="point.historyItem.analyzedDate">
              {{ formatMonth(point.historyItem.analyzedDate) }}
            </time>

            <div
              v-if="selectedRoadmapHistory?.analysisRunId === point.historyItem.analysisRunId"
              class="roadmap-popover"
              :class="{
                'roadmap-popover--first': point.isFirst,
                'roadmap-popover--latest': point.isLatest,
              }"
              @click.stop
            >
              <strong>
                {{
                  point.historyItem.changedCount
                    ? `${point.historyItem.changedCount}개 변화`
                    : point.historyItem.label
                }}
              </strong>
              <p v-if="point.historyItem.changes.length">
                {{ point.historyItem.changes.slice(0, 2).map(formatHistoryChange).join(' · ') }}
              </p>
              <p v-else>{{ point.historyItem.description }}</p>
              <button type="button" @click="openRoadmapHistoryDetail(point.historyItem)">
                상세보기 <AppIcon name="chevron-right" :size="12" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <main v-else-if="activeTab === '투자성향'" class="analysis-empty-content">
      <header class="empty-analysis-header">
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
      <header v-if="!tendencyStore.analysis" class="principles-header principles-header--empty">
        <div>
          <p>아직 투자성향 분석 결과가 없어요</p>
        </div>
      </header>

      <section v-if="tendencyStore.principles.length" class="principle-status">
        <header>
          <span>
            <AppIcon name="history" :size="13" />
            오늘의 적용 상태
          </span>
          <strong>{{ tendencyStore.principles.length }}개 적용 중</strong>
        </header>
        <div class="principle-status__copy">
          <h2>
            {{ tendencyStore.principles.length }}개의 투자원칙을<br />
            <em>실천 중입니다.</em>
          </h2>
          <p>선택한 기준을 일지와 회고에서<br />자동으로 확인해드려요.</p>
        </div>
        <img
          class="principle-status__monkey"
          src="/assets/images/principle-status-monkey.png"
          alt=""
          aria-hidden="true"
        />
      </section>

      <section v-if="tendencyStore.principles.length" class="my-principles">
        <header>
          <h2>나의 투자원칙</h2>
          <p>선택한 원칙은 일지와 회고에 적용돼요.</p>
        </header>

        <div class="principle-list" aria-label="적용 중인 투자 원칙">
          <button
            v-for="(principle, index) in tendencyStore.principles"
            :key="principle.principleId"
            type="button"
            class="principle-card"
            @click="openPrincipleEdit"
          >
            <span class="principle-card__index" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div>
              <strong>{{ principle.content }}</strong>
              <p>{{ formatPrincipleMeta(principle) }}</p>
            </div>
            <span class="principle-card__actions" aria-hidden="true">
              <AppIcon name="chevron-right" :size="16" />
            </span>
          </button>
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

      <section v-else class="principles-empty-visual">
        <span class="principles-empty__icon">
          <AppIcon name="check" :size="22" />
        </span>
        <strong> 아직 적용 중인 투자원칙이 없어요 </strong>
        <p>나만의 매매 기준을 직접 작성하고 바로 적용할 수 있어요.</p>
      </section>

      <section
        v-if="!tendencyStore.principles.length"
        class="analysis-empty-benefits"
        aria-label="투자원칙 이용 안내"
      >
        <div>
          <AppIcon name="pencil" :size="17" />
          <strong>직접 작성</strong>
          <span>나만의 매매 기준 기록</span>
        </div>
        <div>
          <AppIcon name="refresh-cw" :size="17" />
          <strong>언제든 수정</strong>
          <span>상황에 맞게 기준 변경</span>
        </div>
        <div>
          <AppIcon name="check" :size="17" />
          <strong>바로 적용</strong>
          <span>일지와 회고에서 확인</span>
        </div>
      </section>

      <BaseButton v-if="!tendencyStore.principles.length" full-width @click="openPrincipleEdit">
        투자원칙 직접 작성하기
        <template #iconRight><AppIcon name="arrow-right" :size="16" /></template>
      </BaseButton>

      <p v-if="!tendencyStore.principles.length" class="analysis-empty-security">
        <AppIcon name="lock" :size="12" />
        선택한 투자원칙은 나만 확인할 수 있어요
      </p>
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
      ref="floatingStackRef"
      class="tendency-floating-stack"
      :class="[
        `tendency-floating-stack--${floatingPosition}`,
        { 'tendency-floating-stack--sliding': floatingSliding },
      ]"
      :style="floatingStackStyle"
      @pointerdown="startFloatingSwipe"
      @click.capture="preventFloatingClick"
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
  min-height: 100%;
  flex-direction: column;
  gap: 17px;
  padding: 0 20px;
  background: #ffffff;
}

.tendency-hero {
  width: calc(100% + 40px);
  margin: 0 -20px;
}

.tendency-tabs {
  position: relative;
  z-index: 4;
  /* 페이지의 17px flex gap까지 상쇄해 56px 탭의 절반이 헤더 경계에 걸리게 한다. */
  margin-top: -45px;
}

.tendency-tabs :deep(.segmented-control) {
  height: 56px;
  gap: 6px;
  padding: 4px;
  border: 1px solid #dce6e9;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(2, 35, 44, 0.08);
}

.tendency-tabs :deep(.segmented-control__item) {
  height: 46px;
}

.tendency-tabs :deep(.segmented-control__item--active) {
  border: 1px solid #0b9692;
  background: #ffffff;
  box-shadow: 0 3px 12px rgba(4, 112, 109, 0.12);
}

.tendency-floating-stack {
  position: fixed;
  z-index: 160;
  display: flex;
  width: 220px;
  flex-direction: column;
  gap: 0;
  touch-action: none;
  user-select: none;
  transition: none;
}

.tendency-floating-stack--sliding {
  transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.3, 1);
}

.tendency-floating-stack--top-left,
.tendency-floating-stack--bottom-left {
  --floating-content-shift: -18px;

  left: max(16px, calc((100vw - 390px) / 2 + 16px));
}

.tendency-floating-stack--top-right,
.tendency-floating-stack--bottom-right {
  --floating-content-shift: 18px;

  right: max(16px, calc((100vw - 390px) / 2 + 16px));
}

.tendency-floating-stack--top-left,
.tendency-floating-stack--top-right {
  top: calc(var(--mobile-frame-edge-offset, 0px) + 76px);
}

.tendency-floating-stack--bottom-left,
.tendency-floating-stack--bottom-right {
  bottom: calc(var(--mobile-frame-edge-offset, 0px) + 84px);
}

.tendency-floating-stack :deep(.recommendation-floating--collapsed) {
  align-self: auto;
}

.tendency-floating-stack--top-left,
.tendency-floating-stack--bottom-left {
  align-items: flex-start;
}

.tendency-floating-stack--top-right,
.tendency-floating-stack--bottom-right {
  align-items: flex-end;
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

.analysis-locked__header p,
.analysis-locked__card h2,
.analysis-locked__card > p,
.analysis-locked__notice {
  margin: 0;
}

.analysis-locked__header p {
  color: #879194;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.analysis-locked__card h2 {
  margin-top: 6px;
  color: #263a3e;
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  letter-spacing: -0.04em;
}

.analysis-locked__card > p {
  margin-top: 8px;
  color: #7e8b8d;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  font-weight: 750;
}

.analysis-locked__progress header strong {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
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

.analysis-locked__runner {
  position: absolute;
  z-index: 4;
  top: 50%;
  /* 스프라이트 캐릭터의 발이 프레임 중앙이 아니라 아래쪽(~86%)에 있어서,
     박스 전체를 게이지바에 맞추면 발이 게이지바보다 아래로 처진다.
     발 위치가 게이지바 중앙에 오도록 위로 더 끌어올린다. */
  transform: translate(-50%, -86%);
  transition: left 1s linear;
  will-change: left;
}

.analysis-locked__progress footer {
  color: #7c898b;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.analysis-locked__notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #919a9c;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.analysis-progress__copy h1,
.analysis-progress__copy p {
  margin: 0;
}

.analysis-progress__copy h1 {
  color: #23373b;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  letter-spacing: -0.04em;
}

.analysis-progress__copy p {
  color: #818d8f;
  font-size: var(--font-size-caption);
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
  animation: analysis-step-glow 1.5s ease-in-out infinite;
}

.analysis-progress__step:nth-child(2) {
  animation-delay: 0.5s;
}

.analysis-progress__step:nth-child(3) {
  animation-delay: 1s;
}

@keyframes analysis-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes analysis-step-glow {
  0%,
  28%,
  100% {
    background: #dce7e6;
    box-shadow: none;
    transform: scaleX(1);
  }

  8%,
  18% {
    background: #0b9691;
    box-shadow: 0 0 9px rgba(11, 150, 145, 0.58);
    transform: scaleX(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-locked__runner {
    transition: none;
  }

  .analysis-progress__orbit,
  .analysis-progress__step {
    animation: none;
  }

  .analysis-progress__step:first-child {
    background: #0b9691;
  }
}

.principles-header p,
.history-card h2,
.history-card p {
  margin: 0;
}

.principles-header p {
  color: #7c8587;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.analysis-cooldown-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 13px;
  border-radius: 12px;
  background: #eef4f4;
  color: #526467;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.tendency-combination {
  display: grid;
  gap: 10px;
}

.tendency-combination__header {
  display: grid;
  gap: 4px;
}

.tendency-combination__header h2 {
  margin: 0;
  color: #24373d;
  font-size: var(--font-size-body);
}

.tendency-combination__header p {
  margin: 0;
  color: #8a9496;
  font-size: var(--font-size-caption);
}

.tendency-combination__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 8px;
}

.tendency-combination__cards :deep(.group-card) {
  height: 100%;
}

.analysis-report-card {
  display: grid;
  gap: 14px;
  padding: 18px 12px 12px;
  border: 1px solid #cdecea;
  border-radius: 20px;
  background: radial-gradient(circle at 94% 4%, rgba(11, 143, 139, 0.13), transparent 34%), #f3fbfa;
  box-shadow: 0 8px 22px rgba(23, 72, 76, 0.07);
}

.analysis-report-card :deep(.group-card) {
  border-color: #d6e9e7;
  box-shadow: 0 4px 12px rgba(24, 53, 59, 0.05);
}

.analysis-intro {
  position: relative;
  height: 158px;
  box-sizing: border-box;
  overflow: hidden;
  padding: 15px 17px;
  border: 1px solid #214650;
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 92% 42%,
      rgba(0, 0, 0, 0.92) 0%,
      rgba(0, 0, 0, 0.52) 26%,
      transparent 51%
    ),
    linear-gradient(135deg, #123f49 0%, #082d36 100%);
  box-shadow: 0 10px 23px rgba(21, 48, 56, 0.2);
}

.analysis-intro__copy {
  position: relative;
  z-index: 2;
  display: grid;
  width: 63%;
  gap: 8px;
}

.analysis-intro__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6edbd5;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.analysis-intro h2 {
  margin: 0;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.6px;
}

.analysis-intro p {
  margin: 0;
  color: #b9ced1;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.analysis-intro__period {
  width: fit-content;
  margin-top: 2px;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #d5e4e6;
  font-family: var(--font-mono);
  font-size: 9px;
  white-space: nowrap;
}

.analysis-cooldown-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 13px;
  border-radius: 12px;
  background: #eef4f4;
  color: #526467;
  font-size: var(--font-size-caption);
  font-weight: 700;
  white-space: nowrap;
}

.analysis-intro__monkey {
  position: absolute;
  right: 2px;
  bottom: 2px;
  z-index: 1;
  width: 120px;
  height: 120px;
  object-fit: contain;
  mix-blend-mode: screen;
  pointer-events: none;
  user-select: none;
}

.history-card {
  display: grid;
  gap: 14px;
  padding: 16px 14px 14px;
  border: 1px solid #dfe7e7;
  border-radius: 18px;
  background: #ffffff;
}

.history-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.history-card__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.history-card__title > span {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #e7f8f6;
  color: #07938e;
}

.history-card__title h2 {
  color: #24373d;
  font-size: 17px;
  font-weight: 900;
}

.history-card__summary {
  padding: 8px 10px;
  border-radius: 999px;
  background: #f3f6f6;
  color: #748185;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.history-list {
  display: grid;
  gap: 9px;
}

.history-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 78px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: #f5f8f8;
  cursor: pointer;
  color: #6b7779;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
}

.history-item--current {
  border-color: #78c7c2;
  background: #e9f8f6;
}

.history-item:hover,
.history-item:focus-visible {
  border-color: #8bc9c6;
  background: #edf9f8;
  outline: none;
  transform: translateY(-1px);
}

.history-item time {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 7px 6px;
  border-radius: 11px;
  background: #ffffff;
  color: #8b9496;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
}

.history-item .history-item__date--current {
  background: #07938e;
  color: #ffffff;
  font-family: inherit;
  font-size: 12px;
}

.history-item__content {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.history-item__content strong {
  color: #2e3e42;
  font-size: 13px;
  font-weight: 900;
}

.history-item__content > span {
  color: #778184;
  font-size: 10px;
  line-height: 1.4;
}

.history-item__content ul {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-item__content li {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 999px;
  background: #d9f2ef;
  color: #087f7c;
  font-size: 9px;
  font-weight: 800;
}

.roadmap-card {
  display: grid;
  gap: 12px;
  padding: 16px 14px 14px;
  border: 1px solid #dfe7e7;
  border-radius: 18px;
  background: #ffffff;
}

.roadmap-card h2,
.roadmap-card p {
  margin: 0;
}

.roadmap-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.roadmap-card__header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.roadmap-card__header > div > span {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #e7f8f6;
  color: #07938e;
}

.roadmap-card__header h2 {
  color: #24373d;
  font-size: 16px;
  font-weight: 850;
}

.roadmap-card__header > span {
  padding: 7px 9px;
  border-radius: 999px;
  background: #f3f6f6;
  color: #748185;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.roadmap-card__canvas {
  position: relative;
  height: 190px;
  border-radius: 14px;
  background: #f3faf9;
}

.roadmap-card__canvas > svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.roadmap-card__canvas polyline {
  fill: none;
  stroke: #acdcd8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 8;
}

.roadmap-point {
  position: absolute;
  z-index: 2;
  display: grid;
  justify-items: center;
  transform: translate(-50%, -32px);
}

.roadmap-point__button {
  display: flex;
  width: 32px;
  height: 38px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #697b7e;
  cursor: pointer;
}

.roadmap-point__button:focus-visible {
  border-radius: 8px;
  outline: 2px solid #55bdb8;
  outline-offset: 2px;
}

.roadmap-point__button > span {
  display: block;
  width: 14px;
  height: 14px;
  margin-top: -2px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background: #708285;
  box-shadow: 0 2px 5px rgba(31, 58, 64, 0.17);
}

.roadmap-point--latest .roadmap-point__button {
  color: #008f89;
}

.roadmap-point--latest .roadmap-point__button > span {
  width: 18px;
  height: 18px;
  background: #079b95;
  box-shadow: 0 0 0 4px #d8f4f1;
}

.roadmap-point time {
  margin-top: 1px;
  color: #7b898b;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  white-space: nowrap;
}

.roadmap-point--latest time {
  color: #087f7c;
  font-weight: 850;
}

.roadmap-popover {
  position: absolute;
  bottom: 49px;
  left: 50%;
  z-index: 10;
  display: grid;
  width: 138px;
  gap: 5px;
  padding: 9px 10px;
  border: 1px solid #cfe6e4;
  border-radius: 11px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(27, 55, 62, 0.14);
  transform: translateX(-50%);
}

.roadmap-popover::after {
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 9px;
  height: 9px;
  border-right: 1px solid #cfe6e4;
  border-bottom: 1px solid #cfe6e4;
  background: #ffffff;
  content: '';
  transform: translateX(-50%) rotate(45deg);
}

.roadmap-popover--first {
  left: 0;
  transform: none;
}

.roadmap-popover--first::after {
  left: 15px;
}

.roadmap-popover--latest {
  right: 0;
  left: auto;
  transform: none;
}

.roadmap-popover--latest::after {
  right: 11px;
  left: auto;
}

.roadmap-popover strong {
  color: #263a3f;
  font-size: 12px;
  font-weight: 850;
}

.roadmap-popover p {
  overflow: hidden;
  color: #758285;
  font-size: 9px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roadmap-popover button {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-self: end;
  gap: 2px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: #07938e;
  cursor: pointer;
  font-size: 10px;
  font-weight: 800;
}

.principles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0 5px;
}

.principles-header--empty {
  padding-bottom: 0;
}

.principles-header > div {
  display: grid;
  gap: 4px;
}

.principle-status {
  position: relative;
  display: grid;
  height: 158px;
  box-sizing: border-box;
  align-content: start;
  gap: 8px;
  overflow: hidden;
  padding: 15px 17px;
  border: 1px solid #214650;
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 92% 42%,
      rgba(0, 0, 0, 0.92) 0%,
      rgba(0, 0, 0, 0.52) 26%,
      transparent 51%
    ),
    linear-gradient(135deg, #123f49 0%, #082d36 100%);
  color: #fff;
  box-shadow: 0 10px 23px rgba(21, 48, 56, 0.2);
}

.principle-status header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.principle-status header span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #6edbd5;
  font-size: var(--font-size-caption);
  font-weight: 750;
}

.principle-status header strong {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px 8px;
  border: 1px solid #64d0ca;
  border-radius: 99px;
  background: #0b8f8b;
  color: #fff;
  font-size: var(--font-size-caption);
}

.principle-status h2,
.principle-status p,
.my-principles h2,
.my-principles p {
  margin: 0;
}

.principle-status h2 {
  font-size: 18px;
  line-height: 1.3;
  letter-spacing: -0.035em;
}

.principle-status h2 em {
  color: #67e1da;
  font-style: normal;
}

.principle-status p {
  color: #b9ced1;
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.principle-status__copy {
  position: relative;
  z-index: 2;
  display: grid;
  width: 63%;
  gap: 8px;
}

.principle-status__monkey {
  position: absolute;
  right: 2px;
  bottom: 2px;
  z-index: 1;
  width: 120px;
  height: 120px;
  object-fit: contain;
  mix-blend-mode: screen;
  pointer-events: none;
  user-select: none;
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
  font-size: var(--font-size-body);
}

.my-principles > header p {
  color: #8a9496;
  font-size: var(--font-size-caption);
}

.principle-list {
  display: grid;
  gap: 8px;
}

.principle-card {
  display: grid;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 78px;
  padding: 12px;
  border: 1px solid #dfe7e7;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(38, 58, 67, 0.025);
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.principle-card__index {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #0f9f9b;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.principle-card > div {
  display: grid;
  gap: 5px;
}

.principle-card strong {
  color: #273a3f;
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.principle-card p {
  margin: 0;
  color: #9aa2a4;
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.principle-card__actions {
  display: inline-flex;
  width: auto !important;
  height: auto !important;
  align-items: center;
  gap: 4px;
  border-radius: 0 !important;
  background: transparent !important;
  color: #0b8f8b;
}

.principle-card__actions :last-child {
  color: #93a0a2;
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
  font-size: var(--font-size-caption);
  font-weight: 750;
}

.empty-analysis-header {
  display: grid;
  gap: 4px;
  padding-top: 3px;
}

.empty-analysis-header p,
.analysis-empty-visual p,
.analysis-empty-security,
.principles-empty-visual p {
  margin: 0;
}

.empty-analysis-header p {
  color: #879194;
  font-size: var(--font-size-caption);
}

.analysis-empty-visual,
.principles-empty-visual {
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
  font-size: var(--font-size-caption);
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

.analysis-empty-visual > strong,
.principles-empty-visual > strong {
  color: #34484c;
  font-size: 14px;
  line-height: 1.35;
}

.analysis-empty-visual > p,
.principles-empty-visual > p {
  margin-top: 5px;
  color: #819092;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
}

.analysis-empty-benefits span {
  color: #929b9d;
  font-size: 10px;
  line-height: 1.35;
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.analysis-empty-security {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #919a9c;
  font-size: var(--font-size-caption);
}

.principles-empty__icon {
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 1px solid #c4e6e4;
  border-radius: 50%;
  background: #fff;
  color: #0a918c;
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
  font-size: var(--font-size-body);
}

.error-state p {
  margin: 0 0 8px;
  font-size: var(--font-size-caption);
}
</style>
