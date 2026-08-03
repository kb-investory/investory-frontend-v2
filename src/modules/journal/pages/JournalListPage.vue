<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import MonthPickerModal from '@/modules/journal/components/MonthPickerModal.vue'
import TimelineItem from '@/modules/journal/components/TimelineItem.vue'
import { useJournalStore } from '@/modules/journal/stores/journalStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import SearchInput from '@/shared/components/SearchInput.vue'

const router = useRouter()
const journalStore = useJournalStore()

const isMonthPickerOpen = ref(false)

const formattedMonthLabel = computed(() => {
  const period = journalStore.selectedPeriod || '2026-07'
  const [year, month] = period.split('-')
  return `${year}. ${month}`
})

const summaryMonthLabel = computed(() => {
  const period = journalStore.selectedPeriod || '2026-07'
  const month = Number(period.split('-')[1])
  return `${month}월 일지`
})

onMounted(() => {
  journalStore.fetchJournals({ isInitial: true })
})

function handleSearchInput(value) {
  journalStore.setSearchQuery(value)
}

function handleMonthSelect(period) {
  journalStore.setPeriod(period)
}

function goToCreate() {
  router.push({ name: ROUTE_NAMES.JOURNAL_CREATE })
}
</script>

<template>
  <div class="journal-timeline-container">
    <div class="journal-timeline-card">
      <!-- 타임라인 콘텐츠 -->
      <div class="timeline-content">
        <!-- 화면 헤더 -->
        <header class="timeline-header">
          <h1 class="timeline-title">투자 일지</h1>

          <!-- 월 선택 버튼 -->
          <button
            class="month-select-btn"
            type="button"
            aria-label="월 선택 모달 열기"
            @click="isMonthPickerOpen = true"
          >
            <span class="month-select-btn__text">{{ formattedMonthLabel }}</span>
            <AppIcon name="chevron-down" :size="14" />
          </button>
        </header>

        <!-- 보기 전환 (탭) -->
        <nav class="view-tabs" aria-label="보기 전환 메뉴">
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': journalStore.activeTab === 'timeline' }"
            @click="journalStore.setActiveTab('timeline')"
          >
            <span>타임라인</span>
            <div v-if="journalStore.activeTab === 'timeline'" class="tab-indicator" />
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': journalStore.activeTab === 'stock' }"
            @click="journalStore.setActiveTab('stock')"
          >
            <span>종목별</span>
            <div v-if="journalStore.activeTab === 'stock'" class="tab-indicator" />
          </button>
        </nav>

        <!-- 검색 바 -->
        <div class="search-section">
          <SearchInput
            :model-value="journalStore.searchQuery"
            placeholder="종목명, 태그, 메모 검색"
            @update:model-value="handleSearchInput"
          />
        </div>

        <!-- 월간 기록 요약 -->
        <section class="monthly-summary" aria-label="월간 기록 요약">
          <div class="summary-item">
            <span class="summary-label">{{ summaryMonthLabel }}</span>
            <span class="summary-value font-mono"
              >{{ journalStore.monthlySummary.monthlyCount }}개</span
            >
          </div>

          <div class="summary-item summary-item--border">
            <span class="summary-label">현재 수익</span>
            <span
              class="summary-value font-mono"
              :class="{
                'text-danger': journalStore.monthlySummary.monthlyReturnRate > 0,
                'text-primary': journalStore.monthlySummary.monthlyReturnRate < 0,
              }"
            >
              {{ journalStore.monthlySummary.formattedReturnRate }}
            </span>
          </div>

          <div class="summary-item summary-item--border">
            <span class="summary-label">추가 의견</span>
            <span class="summary-value font-mono"
              >{{ journalStore.monthlySummary.additionalOpinionCount }}개</span
            >
          </div>
        </section>

        <!-- 날짜별 / 종목별 타임라인 목록 -->
        <main class="timeline-list">
          <div v-if="journalStore.isLoading" class="state-message">일지를 불러오는 중입니다...</div>

          <template v-else-if="journalStore.journals.length > 0">
            <!-- 타임라인 탭 -->
            <template v-if="journalStore.activeTab === 'timeline'">
              <section
                v-for="group in journalStore.dateGroupedJournals"
                :key="group.date"
                class="date-group"
              >
                <!-- 날짜 헤더 -->
                <header class="date-group__header">
                  <span class="date-group__title">{{ group.dateLabel }}</span>
                  <span class="date-group__count">{{ group.items.length }}개 일지</span>
                </header>

                <!-- 날짜 그룹 내 일지 목록 -->
                <div class="date-group__items">
                  <TimelineItem
                    v-for="(item, idx) in group.items"
                    :key="item.journalId"
                    :item="item"
                    :is-last="idx === group.items.length - 1"
                  />
                </div>
              </section>
            </template>

            <!-- 종목별 탭 -->
            <template v-else>
              <section
                v-for="group in journalStore.stockGroupedJournals"
                :key="group.stockName"
                class="stock-group"
              >
                <header class="stock-group__header">
                  <span class="stock-group__title">{{ group.stockName }}</span>
                  <span class="stock-group__count">{{ group.items.length }}개 일지</span>
                </header>

                <div class="stock-group__items">
                  <TimelineItem
                    v-for="(item, idx) in group.items"
                    :key="item.journalId"
                    :item="item"
                    :is-last="idx === group.items.length - 1"
                  />
                </div>
              </section>
            </template>

            <!-- 더보기 버튼 -->
            <div v-if="journalStore.hasMore" class="load-more-section">
              <button
                type="button"
                class="load-more-btn"
                :disabled="journalStore.isLoadingMore"
                @click="journalStore.fetchNextJournals"
              >
                <span>{{
                  journalStore.isLoadingMore ? '일지 불러오는 중...' : '이전 일지 더보기'
                }}</span>
                <AppIcon name="chevron-down" :size="14" />
              </button>
            </div>
          </template>

          <!-- 비어있는 상태 -->
          <div v-else class="state-message">등록된 투자 일지가 없습니다.</div>
        </main>

        <!-- 일지 추가 액션 버튼 -->
        <footer class="action-footer">
          <button class="add-journal-fab" type="button" @click="goToCreate">
            <AppIcon name="plus" :size="18" />
            <span>일지 추가</span>
          </button>
        </footer>
      </div>
    </div>

    <!-- 월 선택 모달 -->
    <MonthPickerModal
      :is-open="isMonthPickerOpen"
      :selected-period="journalStore.selectedPeriod"
      @close="isMonthPickerOpen = false"
      @select="handleMonthSelect"
    />
  </div>
</template>

<style scoped>
.journal-timeline-container {
  display: flex;
  width: 100%;
  justify-content: center;
}

.journal-timeline-card {
  display: flex;
  width: min(390px, 100%);
  min-height: 740px;
  flex-direction: column;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 6%);
  background: var(--color-background);
  overflow: hidden;
}

.timeline-content {
  display: flex;
  width: 100%;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
}

/* 화면 헤더 */
.timeline-header {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.timeline-title {
  margin: 0;
  color: var(--color-heading);
  font-family: var(--font-sans);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.month-select-btn {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
  cursor: pointer;
}

.month-select-btn__text {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

/* 보기 전환 (탭) */
.view-tabs {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: flex-end;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tab-btn {
  position: relative;
  display: flex;
  height: 44px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.tab-btn--active {
  color: var(--color-primary-strong);
  font-weight: 700;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  width: 56px;
  height: 2px;
  background: var(--color-primary);
}

/* 검색 */
.search-section {
  width: 100%;
  height: 44px;
  flex-shrink: 0;
}

/* 월간 기록 요약 */
.monthly-summary {
  display: flex;
  width: 100%;
  height: 58px;
  align-items: center;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.summary-item {
  display: flex;
  width: 33.33%;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 12px;
}

.summary-item--border {
  border-left: 1px solid var(--color-border-subtle);
}

.summary-label {
  color: var(--color-text-subtle);
  font-size: 11px;
}

.summary-value {
  color: var(--color-heading);
  font-size: 17px;
  font-weight: 600;
}

.font-mono {
  font-family: var(--font-mono);
}

.text-danger {
  color: var(--color-danger);
}

.text-primary {
  color: #3976d9;
}

/* 타임라인 목록 */
.timeline-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.state-message {
  padding: 40px 0;
  color: var(--color-text-muted);
  font-size: 14px;
  text-align: center;
}

.date-group,
.stock-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.date-group__header,
.stock-group__header {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-radius: 7px;
  background: var(--color-surface-subtle);
  flex-shrink: 0;
}

.date-group__title,
.stock-group__title {
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
}

.date-group__count,
.stock-group__count {
  color: var(--color-text-subtle);
  font-size: 10px;
  font-weight: 500;
}

.date-group__items,
.stock-group__items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.load-more-section {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

.load-more-btn {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 19px;
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-more-btn:hover:not(:disabled) {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 하단 일지 추가 액션 버튼 */
.action-footer {
  display: flex;
  height: 52px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.add-journal-fab {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 22px;
  box-shadow: 0 5px 14px rgb(24 24 23 / 14%);
  background: #181817;
  color: #ffffff;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.add-journal-fab:hover {
  opacity: 0.9;
}

.add-journal-fab :deep(.app-icon) {
  color: #e8b931;
}
</style>
