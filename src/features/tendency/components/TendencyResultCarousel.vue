<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import {
  getTendencyCardSummary,
  getTendencyOptionPoints,
  getTendencyTypeConfig,
  TENDENCY_CONFIDENCE,
} from '@/features/tendency/config/tendencyTypeOptions'
import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  results: {
    type: Array,
    required: true,
  },
})
const emit = defineEmits(['change'])

const RESULT_ICONS = Object.freeze({
  PORTFOLIO_RISK_ALLOCATION: 'chart-pie',
  BUY_JUDGMENT_BASIS: 'search',
  INVESTMENT_HORIZON: 'calendar-range',
  LOSS_RESPONSE: 'shield-check',
  PROFIT_RESPONSE: 'trending-up',
  PRINCIPLE_FULFILLMENT: 'refresh-cw',
})

const activeIndex = ref(0)
const selectedTypeCode = ref(null)
const summaryTrack = ref(null)
const typeTrack = ref(null)
const cardProximity = ref([])
const canScrollTypesLeft = ref(false)
const canScrollTypesRight = ref(false)

const activeResult = computed(() => props.results[activeIndex.value] ?? null)
const activeConfig = computed(() =>
  activeResult.value ? getTendencyTypeConfig(activeResult.value.dimension.code) : null,
)
const typeOptions = computed(() => {
  if (!activeResult.value) return null

  const fallbackOption = {
    code: activeResult.value.type.code,
    name: activeResult.value.type.name,
    description: activeResult.value.type.description,
    icon: RESULT_ICONS[activeResult.value.dimension.code] || 'target',
  }
  const options = activeConfig.value?.options?.length
    ? activeConfig.value.options
    : [fallbackOption]

  return [...options].sort((option) => (option.code === activeResult.value.type.code ? -1 : 1))
})
const selectedOption = computed(() => {
  if (!activeResult.value) return null

  return (
    typeOptions.value?.find((option) => option.code === selectedTypeCode.value) ??
    typeOptions.value?.[0]
  )
})
const activePoints = computed(() =>
  activeResult.value && selectedOption.value
    ? getTendencyOptionPoints(selectedOption.value, activeResult.value)
    : [],
)
const isCurrentOptionSelected = computed(
  () => selectedOption.value?.code === activeResult.value?.type?.code,
)
watch(
  () => props.results.length,
  (length) => {
    if (!length) {
      activeIndex.value = 0
    } else if (activeIndex.value >= length) {
      activeIndex.value = length - 1
    }
    nextTick(updateCardProximity)
  },
)

watch(
  () => [activeResult.value?.dimension?.code, activeResult.value?.type?.code],
  () => {
    selectedTypeCode.value = activeResult.value?.type?.code ?? null
    nextTick(() => {
      if (typeTrack.value) typeTrack.value.scrollLeft = 0
      updateTypeScrollState()
    })
  },
  { immediate: true },
)

function getGroupLabel(result) {
  return result?.dimension?.group === 'BEHAVIOR' ? '매매 행동 성향' : '투자 선택 성향'
}

function getConfidence(result) {
  return TENDENCY_CONFIDENCE[result?.dimension?.code] ?? 80
}

function usesStockMajorityEvidence(result) {
  return (
    ['LOSS_RESPONSE', 'PROFIT_RESPONSE'].includes(result?.dimension?.code) &&
    result?.type?.rationale?.items?.some((item) => item.unit === '종목')
  )
}

function getResultTypeIcon(result) {
  return (
    getTendencyTypeConfig(result?.dimension?.code)?.options?.find(
      (option) => option.code === result?.type?.code,
    )?.icon ??
    RESULT_ICONS[result?.dimension?.code] ??
    'target'
  )
}

function getCardStyle(index) {
  const proximity = cardProximity.value[index] ?? (index === activeIndex.value ? 1 : 0)
  return {
    '--card-scale': 0.91 + proximity * 0.09,
    '--card-opacity': 0.5 + proximity * 0.5,
    '--card-saturation': 0.62 + proximity * 0.38,
  }
}

function updateCardProximity() {
  const track = summaryTrack.value
  if (!track) return

  const cards = [...track.querySelectorAll('.result-summary-card')]
  const viewportCenter = track.scrollLeft + track.clientWidth / 2
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  cardProximity.value = cards.map((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2
    const distance = Math.abs(viewportCenter - cardCenter)
    const proximity = Math.max(0, 1 - distance / (card.offsetWidth * 0.78))

    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
    return proximity
  })

  if (closestIndex !== activeIndex.value) {
    activeIndex.value = closestIndex
    emit('change', closestIndex)
  }
}

function moveTo(index) {
  const track = summaryTrack.value
  const card = track?.querySelectorAll('.result-summary-card')[index]
  if (!track || !card) return

  track.scrollTo({
    left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
    behavior: 'smooth',
  })
}

function updateTypeScrollState() {
  const track = typeTrack.value
  if (!track) {
    canScrollTypesLeft.value = false
    canScrollTypesRight.value = false
    return
  }

  canScrollTypesLeft.value = track.scrollLeft > 2
  canScrollTypesRight.value = track.scrollLeft + track.clientWidth < track.scrollWidth - 2
}

function scrollTypesLeft() {
  const track = typeTrack.value
  if (!track) return

  track.scrollBy({ left: -Math.max(120, track.clientWidth * 0.65), behavior: 'smooth' })
}

function scrollTypesRight() {
  const track = typeTrack.value
  if (!track) return

  track.scrollBy({ left: Math.max(120, track.clientWidth * 0.65), behavior: 'smooth' })
}

onMounted(() =>
  nextTick(() => {
    updateCardProximity()
    updateTypeScrollState()
  }),
)
</script>

<template>
  <section
    v-if="activeResult"
    class="result-carousel"
    aria-roledescription="carousel"
    aria-label="나의 투자성향 6가지"
  >
    <div
      ref="summaryTrack"
      class="result-carousel__track"
      aria-label="성향 카드를 좌우로 밀어 이동"
      @scroll.passive="updateCardProximity"
    >
      <article
        v-for="(result, index) in results"
        :key="result.dimension.code"
        class="result-summary-card"
        :class="{
          'is-active': index === activeIndex,
          'is-own-card': index !== activeIndex || isCurrentOptionSelected,
        }"
        :style="getCardStyle(index)"
        :aria-hidden="index === activeIndex ? undefined : 'true'"
      >
        <img
          v-if="index !== activeIndex || isCurrentOptionSelected"
          class="result-summary-card__side-monkey"
          src="/assets/images/tendency-my-monkey.webp"
          alt=""
          width="54"
          height="42"
          loading="eager"
          decoding="sync"
        />
        <div class="result-summary-card__content">
          <div class="result-summary-card__badges">
            <span
              class="result-slide__category"
              :class="result.dimension.group === 'BEHAVIOR' ? 'is-behavior' : 'is-selection'"
            >
              {{ getGroupLabel(result) }}
            </span>
          </div>
          <div class="result-summary-card__title">
            <span aria-hidden="true">
              <AppIcon
                :name="index === activeIndex ? selectedOption.icon : getResultTypeIcon(result)"
                :size="16"
              />
            </span>
            <div class="result-summary-card__title-copy">
              <small>{{ result.dimension.name }}</small>
              <h3>{{ index === activeIndex ? selectedOption.name : result.type.name }}</h3>
            </div>
          </div>
          <p>
            {{
              getTendencyCardSummary(
                result.dimension.code,
                index === activeIndex ? selectedOption : result.type,
              )
            }}
          </p>
        </div>
      </article>
    </div>

    <nav class="result-carousel__dots" aria-label="투자성향 슬라이드 위치">
      <button
        v-for="(result, index) in results"
        :key="result.dimension.code"
        type="button"
        :class="{ 'is-active': index === activeIndex }"
        :aria-label="`${index + 1}번째 성향 ${result.type.name} 보기`"
        :aria-current="index === activeIndex ? 'true' : undefined"
        @click="moveTo(index)"
      />
    </nav>

    <article class="result-slide" aria-live="polite">
      <section class="result-slide__types">
        <div class="result-slide__type-row">
          <button
            v-if="canScrollTypesLeft"
            type="button"
            class="result-slide__type-arrow result-slide__type-prev"
            aria-label="이전 성향 유형 보기"
            @click="scrollTypesLeft"
          >
            <AppIcon name="chevron-left" :size="15" />
          </button>
          <div
            ref="typeTrack"
            class="result-slide__type-scroll"
            role="tablist"
            aria-label="성향 유형 선택"
            @scroll.passive="updateTypeScrollState"
          >
            <button
              v-for="option in typeOptions"
              :key="option.code"
              type="button"
              role="tab"
              :aria-selected="option.code === selectedOption.code"
              :class="{
                'is-selected': option.code === selectedOption.code,
                'is-mine': option.code === activeResult.type.code,
              }"
              @click.stop="selectedTypeCode = option.code"
            >
              <small v-if="option.code === activeResult.type.code">내 성향</small>
              <span class="result-slide__type-icon" aria-hidden="true">
                <AppIcon :name="option.icon || 'target'" :size="11" />
              </span>
              <strong>{{ option.name }}</strong>
            </button>
          </div>
          <button
            v-if="canScrollTypesRight"
            type="button"
            class="result-slide__type-arrow result-slide__type-next"
            aria-label="다음 성향 유형 보기"
            @click="scrollTypesRight"
          >
            <AppIcon name="chevron-right" :size="15" />
          </button>
        </div>
      </section>

      <section class="result-slide__description">
        <h4>{{ selectedOption.name }}의 특징</h4>
        <ul>
          <li v-for="point in activePoints" :key="point">{{ point }}</li>
        </ul>
      </section>

      <section v-if="isCurrentOptionSelected" class="result-slide__evidence">
        <div class="result-slide__evidence-heading">
          <h4>판단 근거 데이터</h4>
          <div class="result-slide__evidence-confidence">
            <strong>{{ getConfidence(activeResult) }}%</strong>
            <span>일치도</span>
          </div>
        </div>
        <p v-if="usesStockMajorityEvidence(activeResult)" class="result-slide__evidence-method">
          <AppIcon name="bar-chart" :size="13" />
          <span>종목별 대응 유형을 먼저 판정한 뒤, 가장 많은 유형을 최종 성향으로 선택했어요.</span>
        </p>
        <dl>
          <div v-for="item in activeResult.type.rationale?.items || []" :key="item.label">
            <dt>
              <span>{{ item.label }}</span>
              <small>{{ item.description }}</small>
            </dt>
            <dd>{{ item.value }}{{ item.unit }}</dd>
          </div>
        </dl>
      </section>

      <aside v-else class="result-slide__compare-note">
        <AppIcon name="info" :size="16" />
        <span>판단 근거 데이터는 <strong>내 성향</strong>을 선택하면 확인할 수 있어요.</span>
      </aside>

      <footer v-if="isCurrentOptionSelected" class="result-slide__source">
        <AppIcon name="database" :size="16" />
        <span>최근 90일 거래와 투자일지 기록을 함께 분석했어요.</span>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.result-carousel {
  position: relative;
  display: grid;
  gap: 12px;
  overflow: visible;
}

.result-carousel__track {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 9%;
  cursor: grab;
  scroll-padding-inline: 9%;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  touch-action: pan-y;
}

.result-carousel__track::-webkit-scrollbar {
  display: none;
}

.result-carousel__track:active {
  cursor: grabbing;
}

.result-slide {
  display: grid;
  gap: 16px;
  width: 100%;
  padding: 2px 0 4px;
  background: #ffffff;
}

.result-summary-card,
.result-slide__source {
  display: flex;
  align-items: center;
}

.result-summary-card {
  position: relative;
  width: 82%;
  min-width: 82%;
  height: 124px;
  box-sizing: border-box;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 12px 8px;
  border-radius: 16px;
  background: linear-gradient(135deg, #073943 0%, #0b625f 100%);
  color: #ffffff;
  opacity: var(--card-opacity);
  filter: saturate(var(--card-saturation));
  scroll-snap-align: center;
  scroll-snap-stop: always;
  transform: scale(var(--card-scale));
  transform-origin: center;
  transition: box-shadow 0.15s ease;
}

.result-summary-card.is-active {
  box-shadow: 0 9px 20px rgba(7, 57, 67, 0.22);
}

.result-summary-card.is-own-card {
  border: 1px solid rgba(101, 220, 212, 0.34);
}

.result-summary-card__content {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  flex: 1 1 auto;
  align-content: space-between;
  gap: 0;
  overflow: hidden;
}

.result-summary-card__badges {
  display: flex;
  align-items: center;
  gap: 5px;
}

.result-summary-card__badges span {
  display: inline-flex;
  width: fit-content;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.result-slide__category.is-selection {
  background: rgba(78, 205, 196, 0.16);
  color: #76e4dc;
}

.result-slide__category.is-behavior {
  background: rgba(255, 195, 105, 0.18);
  color: #ffd08a;
}

.result-summary-card__side-monkey {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: -49px;
  display: block;
  width: 54px;
  height: 42px;
  object-fit: contain;
  pointer-events: none;
  transform: translateY(-50%);
}

.result-summary-card__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  transform: translateY(-4px);
}

.result-summary-card__title > span {
  display: inline-flex;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.13);
  color: #8ee6df;
}

.result-summary-card__title-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.result-summary-card h3,
.result-summary-card p,
.result-slide h4,
.result-slide__description ul,
.result-slide__evidence dl {
  margin: 0;
}

.result-summary-card h3 {
  min-width: 0;
  font-family: var(--font-heading);
  overflow: hidden;
  font-size: 20px;
  letter-spacing: -0.045em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-summary-card__title-copy small {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.68);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-summary-card p {
  width: 100%;
  margin-top: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  line-height: 1.45;
  transform: translateY(-6px);
  white-space: normal;
}

.result-slide__types,
.result-slide__description,
.result-slide__evidence {
  display: grid;
  gap: 11px;
  padding: 14px;
  border: 1px solid #e0e8e8;
  border-radius: 15px;
  background: #ffffff;
}

.result-slide__types {
  gap: 9px;
  padding: 2px 0 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.result-slide__type-row {
  position: relative;
  min-width: 0;
}

.result-slide__type-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 7px 34px 3px 0;
  scroll-behavior: smooth;
  scrollbar-width: none;
  touch-action: pan-x;
}

.result-slide__type-scroll::-webkit-scrollbar {
  display: none;
}

.result-slide__type-scroll button {
  position: relative;
  display: flex;
  min-width: max-content;
  height: 32px;
  box-sizing: border-box;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 3px 9px 3px 6px;
  border: 1px solid #d2e4e3;
  border-radius: 9px;
  background: #ffffff;
  color: #426064;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.result-slide__type-scroll button:hover {
  border-color: #63bbb5;
}

.result-slide__type-scroll button.is-mine:not(.is-selected) {
  border-color: #8ebdb9;
  background: #ffffff;
}

.result-slide__type-scroll button.is-selected {
  color: #ffffff;
}

.result-slide__type-scroll button.is-selected.is-mine {
  border-color: #0b706e;
  background: #0b706e;
}

.result-slide__type-scroll button.is-selected:not(.is-mine) {
  border-color: #355f76;
  background: #355f76;
}

.result-slide__type-scroll button > small {
  position: absolute;
  top: -7px;
  left: 4px;
  padding: 1px 4px;
  border-radius: 3px;
  background: #173f49;
  color: #ffffff;
  font-size: 7px;
  font-weight: 850;
  line-height: 1.25;
}

.result-slide__type-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #e3f5f3;
  color: #087d79;
}

.result-slide__type-scroll button.is-selected .result-slide__type-icon {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.result-slide__type-scroll button strong {
  font-size: 9px;
  line-height: 1;
  text-align: left;
  white-space: nowrap;
}

.result-slide__type-arrow {
  position: absolute;
  z-index: 2;
  top: 50%;
  display: inline-flex;
  width: 29px;
  height: 29px;
  align-items: center;
  justify-content: center;
  padding: 0;
  transform: translateY(-50%);
  border: 1px solid #92c9c5;
  border-radius: 50%;
  background: #ffffff;
  color: #087d79;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(16, 87, 86, 0.15);
}

.result-slide__type-prev {
  left: 0;
  box-shadow:
    8px 0 12px 4px rgba(255, 255, 255, 0.94),
    0 4px 10px rgba(16, 87, 86, 0.15);
}

.result-slide__type-next {
  right: 0;
  box-shadow:
    -8px 0 12px 4px rgba(255, 255, 255, 0.94),
    0 4px 10px rgba(16, 87, 86, 0.15);
}

.result-slide__type-arrow:focus-visible {
  outline: 2px solid #0b918d;
  outline-offset: 2px;
}

.result-slide__type-scroll button:focus-visible {
  outline: 2px solid #0b918d;
  outline-offset: 2px;
}

.result-slide h4 {
  color: #2d4145;
  font-size: 14px;
  font-weight: 850;
}

.result-slide__description ul {
  display: grid;
  gap: 8px;
  padding: 0;
  list-style: none;
}

.result-slide__description li {
  position: relative;
  padding-left: 13px;
  color: #67777a;
  font-size: 13px;
  line-height: 1.5;
}

.result-slide__description li::before {
  position: absolute;
  top: 6px;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10aaa4;
  content: '';
}

.result-slide__evidence dl {
  display: grid;
  gap: 13px;
}

.result-slide__evidence-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-slide__evidence-confidence {
  display: grid;
  min-width: 50px;
  gap: 1px;
  padding: 6px 8px;
  border: 1px solid #b8dfdc;
  border-radius: 10px;
  background: #edf9f7;
  text-align: center;
}

.result-slide__evidence-confidence strong {
  color: #087d79;
  font-size: 14px;
}

.result-slide__evidence-confidence span {
  color: #789092;
  font-size: 8px;
  font-weight: 700;
}

.result-slide__evidence-method {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 8px 9px;
  border-radius: 10px;
  background: #f1f8f7;
  color: #5e7778;
  font-size: 10px;
  line-height: 1.45;
}

.result-slide__evidence-method svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #0b918d;
}

.result-slide__evidence dl > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-slide__evidence dt {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.result-slide__evidence dt span {
  color: #5a696c;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.result-slide__evidence dt small {
  overflow: hidden;
  color: #9aa4a6;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-slide__evidence dd {
  flex: 0 0 auto;
  margin: 0;
  color: #203538;
  font-size: 14px;
  font-weight: 850;
}

.result-slide__source {
  align-items: flex-start;
  gap: 7px;
  padding: 2px 3px 0;
  color: #849194;
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.result-slide__compare-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 13px;
  border-radius: 13px;
  background: #e7f4f3;
  color: #577174;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.result-slide__compare-note svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #0b918d;
}

.result-slide__compare-note strong {
  color: #0a716e;
}

.result-carousel__dots button:focus-visible {
  outline: 2px solid #0b918d;
  outline-offset: 2px;
}

.result-carousel__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.result-carousel__dots button {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #cbd8d8;
  cursor: pointer;
  transition:
    width 0.2s ease,
    background-color 0.2s ease;
}

.result-carousel__dots button.is-active {
  width: 22px;
  background: #0b918d;
}

@media (prefers-reduced-motion: reduce) {
  .result-summary-card {
    transform: none;
  }
}
</style>
