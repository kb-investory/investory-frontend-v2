<script setup>
import { ref } from 'vue'

import StatusBadge from '@/shared/components/badges/StatusBadge.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import IconButton from '@/shared/components/buttons/IconButton.vue'
import QuoteCard from '@/shared/components/cards/QuoteCard.vue'
import StockCard from '@/shared/components/cards/StockCard.vue'
import TendencyCard from '@/shared/components/cards/TendencyCard.vue'
import InfoBanner from '@/shared/components/feedback/InfoBanner.vue'
import PageLoading from '@/shared/components/feedback/PageLoading.vue'
import TimerProgressBar from '@/shared/components/feedback/TimerProgressBar.vue'
import BaseTextarea from '@/shared/components/inputs/BaseTextarea.vue'
import BaseToggle from '@/shared/components/inputs/BaseToggle.vue'
import SearchInput from '@/shared/components/inputs/SearchInput.vue'
import ListRow from '@/shared/components/lists/ListRow.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'
import BottomTabBar from '@/shared/components/navigation/BottomTabBar.vue'
import SegmentedControl from '@/shared/components/navigation/SegmentedControl.vue'
import BottomSheet from '@/shared/components/overlays/BottomSheet.vue'

const search = ref('')
const textarea = ref('')
const notifyToggle = ref(true)
const segmentedTab = ref('투자성향')
const pageLoadingActive = ref(false)

const navTabs = [
  { label: '홈', icon: 'house', active: true },
  { label: '일지', icon: 'book-open' },
  { label: '투자 성향', icon: 'radar' },
  { label: '시뮬레이션', isMonkey: true },
  { label: '마이', icon: 'user' },
]
</script>

<template>
  <div class="ui-kit-wrapper">
    <section class="ui-kit">
      <header class="ui-kit__header">
        <div class="ui-kit__header-title-group">
          <h1 class="ui-kit__title">INVESTORY / CORE UI</h1>
          <p class="ui-kit__subtitle">기록 · 분석 · 원칙을 위한 모바일 공용 컴포넌트</p>
        </div>
        <div class="ui-kit__version">V3.0 · 390 MOBILE</div>
      </header>

      <div class="ui-kit__grid">
        <!-- LEFT COLUMN -->
        <div class="ui-kit__column">
          <!-- 01 / NAVIGATION -->
          <article class="ui-kit__card">
            <header class="ui-kit__card-header">
              <span class="ui-kit__section-category">01 / NAVIGATION</span>
              <h2 class="ui-kit__section-title">앱 구조와 현재 위치</h2>
            </header>

            <div class="ui-kit__card-body">
              <AppBar title="화면 제목" />

              <BottomTabBar :items="navTabs" />

              <BottomSheet title="상세 정보" description="선택한 항목을 확인하세요">
                <div class="ui-kit__sheet-placeholder" />
              </BottomSheet>

              <SegmentedControl v-model="segmentedTab" :options="['투자성향', '투자원칙']" />
            </div>
          </article>

          <!-- 02 / ACTIONS -->
          <article class="ui-kit__card">
            <header class="ui-kit__card-header">
              <span class="ui-kit__section-category">02 / ACTIONS</span>
              <h2 class="ui-kit__section-title">명확한 행동 위계</h2>
            </header>

            <div class="ui-kit__card-body">
              <BaseButton variant="primary" full-width> 확인하고 계속하기 → </BaseButton>

              <BaseButton variant="secondary" full-width> ✨ 성향 기반 추천 보기 </BaseButton>

              <div class="ui-kit__action-row">
                <IconButton label="추가"> + </IconButton>

                <BaseButton variant="ghost"> ✏️ 수정 </BaseButton>
              </div>
            </div>
          </article>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="ui-kit__column">
          <!-- 03 / INPUTS -->
          <article class="ui-kit__card">
            <header class="ui-kit__card-header">
              <span class="ui-kit__section-category">03 / INPUTS</span>
              <h2 class="ui-kit__section-title">기록을 위한 입력</h2>
            </header>

            <div class="ui-kit__card-body">
              <SearchInput v-model="search" placeholder="종목명 또는 종목코드 검색" />

              <BaseTextarea
                v-model="textarea"
                label="오늘 시장을 보며 든 생각"
                :required="true"
                placeholder="오늘 시장을 어떻게 바라봤는지, 어떤 감정을 느꼈는지 자유롭게 적어주세요."
                :max-length="500"
              />

              <BaseToggle
                v-model="notifyToggle"
                label="알림 받기"
                description="오늘의 일지 마감 전에 알려드려요"
              />
            </div>
          </article>

          <!-- 04 / DATA & FEEDBACK -->
          <article class="ui-kit__card">
            <header class="ui-kit__card-header">
              <span class="ui-kit__section-category">04 / DATA & FEEDBACK</span>
              <h2 class="ui-kit__section-title">근거와 상태 표현</h2>
            </header>

            <div class="ui-kit__card-body">
              <QuoteCard
                badge="오늘의 기록"
                title="판단을 남기면 다음 선택의 근거가 됩니다"
                description="수익률보다 당시의 생각과 원칙을 먼저 확인하세요."
              />

              <StockCard
                symbol="S"
                name="삼성전자"
                quantity="10주"
                avg-price="105,500원"
                valuation="10,172,889원"
              />

              <TendencyCard
                title="추천에 반영된 나의 성향"
                description="8가지 성향을 모두 확인할 수 있어요"
                count-text="8개"
              />

              <StatusBadge status-text="기록 완료" step-text="2 / 6" />

              <ListRow title="연결 계좌 관리" icon="landmark" />

              <InfoBanner
                title="분석 결과가 업데이트됐어요"
                description="새로운 기록을 바탕으로 성향을 다시 분석했습니다."
              />

              <TimerProgressBar label="오늘 일지 마감까지" timer-text="03:42:18" :percentage="45" />
            </div>
          </article>

          <!-- 05 / PAGE LOADING -->
          <article class="ui-kit__card">
            <header class="ui-kit__card-header">
              <span class="ui-kit__section-category">05 / PAGE LOADING</span>
              <h2 class="ui-kit__section-title">페이지 전환 시 로딩 (원숭이)</h2>
            </header>

            <div class="ui-kit__card-body">
              <BaseButton variant="ghost" @click="pageLoadingActive = !pageLoadingActive">
                {{ pageLoadingActive ? '로딩 끄기' : '페이지 로딩 데모 보기' }}
              </BaseButton>

              <PageLoading :active="pageLoadingActive" />
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ui-kit-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 40px;
  background: #f3f6f6;
}

.ui-kit {
  display: flex;
  width: 100%;
  max-width: 1360px;
  flex-direction: column;
  gap: 24px;
}

.ui-kit__header {
  display: flex;
  height: 92px;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #263a43;
}

.ui-kit__header-title-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ui-kit__title {
  margin: 0;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-lg);
  font-weight: 700;
  line-height: normal;
}

.ui-kit__subtitle {
  margin: 0;
  color: #dce6e9;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: normal;
}

.ui-kit__version {
  color: #7fe0d9;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  line-height: normal;
}

.ui-kit__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 24px;
  align-items: start;
}

.ui-kit__column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ui-kit__card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border: 1px solid #dce6e9;
  border-radius: 16px;
  background: #ffffff;
}

.ui-kit__card-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ui-kit__section-category {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  letter-spacing: 0;
  line-height: normal;
}

.ui-kit__section-title {
  margin: 0;
  color: #18272d;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
  line-height: normal;
}

.ui-kit__card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-kit__action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ui-kit__sheet-placeholder {
  width: 100%;
  height: 90px;
  border-radius: 12px;
  background: #f9faf9;
}

@media (max-width: 768px) {
  .ui-kit-wrapper {
    padding: 16px;
  }

  .ui-kit__header {
    height: auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 20px;
  }

  .ui-kit__grid {
    grid-template-columns: 1fr;
  }
}
</style>
