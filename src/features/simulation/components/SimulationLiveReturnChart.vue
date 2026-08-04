<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import { GridComponent, MarkPointComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

import AppIcon from '@/shared/components/AppIcon.vue'

echarts.use([
  GridComponent,
  LineChart,
  MarkPointComponent,
  ScatterChart,
  SVGRenderer,
  TooltipComponent,
])

const props = defineProps({
  participants: {
    type: Array,
    default: () => [],
  },
  dailyPerformance: {
    type: Array,
    default: () => [],
  },
  progress: {
    type: Number,
    default: 0,
  },
  speed: {
    type: Number,
    default: 1,
  },
  totalDays: {
    type: Number,
    default: 150,
  },
})

const chartElement = ref(null)
const selectedViewId = ref('all')
let chart = null
let resizeObserver = null
let cameraViewport = null
let cameraTargetViewport = null
let cameraFrame = null
let lastCameraFrameTime = null
let chartBlankClickHandler = null
let previousLeaderId = null
let autoFocusTimer = null

const colorByVariantType = {
  ACTUAL_USER: '#F7FAFB',
  PERSONAL_BOT: '#0EA5A6',
  FAMOUS_STRATEGY: '#91A8B2',
  RANDOM_BOT: '#B18BD5',
}

const markerSymbolByVariantType = {
  ACTUAL_USER:
    'path://M12 2A5 5 0 1 1 12 12A5 5 0 0 1 12 2ZM4 22C4 17 7 14 12 14C17 14 20 17 20 22Z',
  PERSONAL_BOT:
    'path://M5 7h14v13H5zM9 3h6v4H9zM8 11h3v3H8zM13 11h3v3h-3zM8 17h8v2H8z',
  FAMOUS_STRATEGY:
    'path://M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z',
  RANDOM_BOT:
    'path://M4 4h16v16H4zM7 7h3v3H7zM14 7h3v3h-3zM10.5 10.5h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z',
}

// 추후 전달받은 전용 아이콘으로 이 매핑만 교체하면 된다.
const viewIconByVariantType = {
  ACTUAL_USER: 'user',
  PERSONAL_BOT: 'sparkles',
  FAMOUS_STRATEGY: 'trophy',
  RANDOM_BOT: 'circle-help',
}

const timelineDates = computed(() =>
  [...new Set(props.dailyPerformance.map((snapshot) => snapshot.snapshotDate))].sort(),
)

const currentSimulationDate = computed(() => {
  const dates = timelineDates.value
  if (!dates.length) return '-'

  const start = new Date(`${dates[0]}T00:00:00`).getTime()
  const end = new Date(`${dates.at(-1)}T00:00:00`).getTime()
  const timestamp = start + (end - start) * (Math.min(Math.max(props.progress, 0), 100) / 100)
  const date = new Date(timestamp)

  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
})

const currentSimulationDay = computed(() =>
  Math.min(props.totalDays, Math.max(1, Math.round((props.totalDays * props.progress) / 100))),
)

const performanceByVariant = computed(() => {
  const grouped = new Map()

  props.dailyPerformance.forEach((snapshot) => {
    const snapshots = grouped.get(snapshot.simulationVariantId) ?? []
    snapshots.push(snapshot)
    grouped.set(snapshot.simulationVariantId, snapshots)
  })

  grouped.forEach((snapshots) =>
    snapshots.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate)),
  )
  return grouped
})

const chartSeries = computed(() => {
  const dates = timelineDates.value
  if (dates.length < 2) return []

  const segmentProgress = (Math.min(Math.max(props.progress, 0), 100) / 100) * (dates.length - 1)
  const completedIndex = Math.floor(segmentProgress)
  const interpolation = segmentProgress - completedIndex

  return props.participants.map((participant, participantIndex) => {
    const snapshots = performanceByVariant.value.get(participant.variantId) ?? []
    const completedSnapshots = snapshots.slice(0, completedIndex + 1)
    const data = completedSnapshots.map((snapshot) => [
      new Date(`${snapshot.snapshotDate}T00:00:00`).getTime(),
      snapshot.cumulativeReturnPercent,
    ])

    const nextSnapshot = snapshots[completedIndex + 1]
    const currentSnapshot = snapshots[completedIndex]
    if (currentSnapshot && nextSnapshot && interpolation > 0) {
      const currentDate = new Date(`${currentSnapshot.snapshotDate}T00:00:00`).getTime()
      const nextDate = new Date(`${nextSnapshot.snapshotDate}T00:00:00`).getTime()
      const currentReturn =
        currentSnapshot.cumulativeReturnPercent +
        (nextSnapshot.cumulativeReturnPercent - currentSnapshot.cumulativeReturnPercent) *
          interpolation

      data.push([currentDate + (nextDate - currentDate) * interpolation, currentReturn])
    }

    return {
      id: String(participant.variantId),
      name: participant.variantName,
      variantType: participant.variantType,
      type: 'line',
      data,
      smooth: 0.25,
      showSymbol: false,
      symbol: 'circle',
      lineStyle: {
        width: participant.variantType === 'PERSONAL_BOT' ? 3 : 2,
      },
      markPoint: {
        silent: true,
        symbol: markerSymbolByVariantType[participant.variantType] ?? 'circle',
        symbolSize: 14,
        label: {
          show: selectedViewId.value === 'all',
          position: 'right',
          distance: 6,
          offset: [0, (participantIndex - 1.5) * 2],
          color: '#DCE7EA',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 8,
          fontWeight: 700,
          backgroundColor: 'rgba(23, 45, 53, 0.82)',
          borderColor: colorByVariantType[participant.variantType] ?? '#66777D',
          borderWidth: 1,
          borderRadius: 5,
          padding: [3, 5],
          formatter: ({ value }) =>
            `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)}%`,
        },
        itemStyle: {
          color: colorByVariantType[participant.variantType] ?? '#66777D',
          borderColor: '#263F48',
          borderWidth: 2,
        },
        data: data.length
          ? [
              {
                coord: data.at(-1),
                value: data.at(-1)[1],
              },
            ]
          : [],
      },
      itemStyle: {
        color: colorByVariantType[participant.variantType] ?? '#66777D',
      },
      emphasis: {
        focus: 'series',
      },
    }
  })
})

const rankedSeries = computed(() =>
  chartSeries.value
    .map((series, originalIndex) => ({
      ...series,
      originalIndex,
      point: series.data.at(-1),
    }))
    .filter((series) => series.point)
    .sort((a, b) => b.point[1] - a.point[1] || a.originalIndex - b.originalIndex)
    .map((series, index) => ({ ...series, rank: index + 1 })),
)

const cameraFocus = computed(() => {
  if (selectedViewId.value === 'all' || !rankedSeries.value.length) {
    return { mode: 'full', ids: rankedSeries.value.map((series) => series.id) }
  }

  const selected = rankedSeries.value.find((series) => series.id === selectedViewId.value)
  return selected
    ? { mode: 'focus', ids: [selected.id] }
    : { mode: 'full', ids: rankedSeries.value.map((series) => series.id) }
})

const focusedIdSet = computed(() => new Set(cameraFocus.value.ids))

const legendSeries = computed(() =>
  [...rankedSeries.value].sort((a, b) => a.originalIndex - b.originalIndex),
)

const cameraOptions = computed(() => [
  { id: 'all', icon: 'activity', name: '전체 그래프', color: '#B8C7CC' },
  ...legendSeries.value.map((series) => ({
    id: series.id,
    icon: viewIconByVariantType[series.variantType] ?? 'circle-help',
    name: `${series.rank}위 · ${series.name}`,
    color: series.itemStyle.color,
  })),
])

function getNiceStep(range) {
  const roughStep = Math.max(range / 4, 0.1)
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude

  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

function getReturnViewport(values, { includeZero = true, minRange = 2 } = {}) {
  if (!values.length) return { min: -1, max: 1, interval: 0.5 }

  const dataMin = includeZero ? Math.min(0, ...values) : Math.min(...values)
  const dataMax = includeZero ? Math.max(0, ...values) : Math.max(...values)
  const dataRange = dataMax - dataMin
  // 시작점이 모두 0%일 때도 충분히 확대해 보이되, 선과 포인트가 축에 닿지 않게 한다.
  const paddedRange = Math.max(dataRange * 1.5, minRange)
  const center = (dataMin + dataMax) / 2
  const step = getNiceStep(paddedRange)
  const min = Math.floor((center - paddedRange / 2) / step) * step
  const max = Math.ceil((center + paddedRange / 2) / step) * step

  return {
    min,
    max: min === max ? max + step : max,
    interval: step,
  }
}

const replayViewport = computed(() => {
  if (timelineDates.value.length < 2) {
    return { xMin: undefined, xMax: undefined, yMin: -1, yMax: 1, yInterval: 0.5 }
  }

  const start = new Date(`${timelineDates.value[0]}T00:00:00`).getTime()
  const end = new Date(`${timelineDates.value.at(-1)}T00:00:00`).getTime()
  const fullDuration = end - start
  const latestTime = Math.max(start, ...rankedSeries.value.map((series) => series.point[0]))
  const isFullView = cameraFocus.value.mode === 'full'
  const windowDuration = fullDuration * 0.24
  const xMin = isFullView ? start : latestTime - windowDuration / 2
  const xMax = isFullView ? end : latestTime + windowDuration / 2

  const fullReturns = chartSeries.value.flatMap((series) => series.data.map((point) => point[1]))
  const focusedReturns = rankedSeries.value
    .filter((series) => focusedIdSet.value.has(series.id))
    .map((series) => series.point[1])
  const focusedReturn = focusedReturns[0] ?? 0
  const returnViewport = isFullView
    ? getReturnViewport(fullReturns, { includeZero: true, minRange: 2 })
    : {
        min: focusedReturn - 1,
        max: focusedReturn + 1,
        interval: 0.5,
      }

  return {
    xMin,
    xMax,
    yMin: returnViewport.min,
    yMax: returnViewport.max,
    yInterval: returnViewport.interval,
  }
})

const cameraLabel = computed(() => {
  if (cameraFocus.value.mode === 'full') return 'FULL VIEW'
  const focused = rankedSeries.value.find((series) => focusedIdSet.value.has(series.id))
  return focused ? `${focused.rank}위 VIEW` : 'FULL VIEW'
})

const focusMarkerOverlay = computed(() => {
  if (cameraFocus.value.mode === 'full') return null
  const focused = rankedSeries.value.find((series) => focusedIdSet.value.has(series.id))

  if (!focused) return null

  return {
    id: 'focus-marker-overlay',
    name: `${focused.name} 포커스`,
    type: 'scatter',
    data: [focused.point],
    symbol: markerSymbolByVariantType[focused.variantType] ?? 'circle',
    symbolSize: 24,
    silent: true,
    z: 10,
    itemStyle: {
      color: focused.itemStyle.color,
    },
    label: {
      show: true,
      position: 'top',
      distance: 10,
      color: '#263F48',
      fontSize: 10,
      fontWeight: 700,
      backgroundColor: '#F7FAFB',
      borderColor: focused.itemStyle.color,
      borderWidth: 1,
      borderRadius: 7,
      padding: [5, 8],
      shadowBlur: 8,
      shadowColor: 'rgba(16, 36, 43, 0.2)',
      formatter: `${focused.point[1] > 0 ? '+' : ''}${focused.point[1].toFixed(1)}%`,
    },
  }
})

function formatDate(timestamp) {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function isCameraSettled(current, target) {
  const xRange = Math.max(Math.abs(target.xMax - target.xMin), 1)
  const yRange = Math.max(Math.abs(target.yMax - target.yMin), 1)

  return (
    Math.abs(current.xMin - target.xMin) < xRange * 0.00005 &&
    Math.abs(current.xMax - target.xMax) < xRange * 0.00005 &&
    Math.abs(current.yMin - target.yMin) < yRange * 0.0001 &&
    Math.abs(current.yMax - target.yMax) < yRange * 0.0001
  )
}

function startCameraTransition() {
  if (!cameraTargetViewport || cameraFrame) return

  const moveCamera = (timestamp) => {
    if (!chart || !cameraTargetViewport || !cameraViewport) {
      cameraFrame = null
      return
    }

    // 재시작 첫 프레임도 즉시 이동해 한 프레임씩 멈추는 현상을 방지한다.
    if (lastCameraFrameTime === null) lastCameraFrameTime = timestamp - 1000 / 60
    const elapsed = Math.min(timestamp - lastCameraFrameTime, 50)
    lastCameraFrameTime = timestamp
    // 약 0.6초에 걸쳐 목표 지점에 안착하는 지수 감쇠 카메라.
    const amount = 1 - Math.exp(-elapsed / 140)
    const nextYMin = lerp(cameraViewport.yMin, cameraTargetViewport.yMin, amount)
    const nextYMax = lerp(cameraViewport.yMax, cameraTargetViewport.yMax, amount)

    cameraViewport = {
      xMin: lerp(cameraViewport.xMin, cameraTargetViewport.xMin, amount),
      xMax: lerp(cameraViewport.xMax, cameraTargetViewport.xMax, amount),
      yMin: nextYMin,
      yMax: nextYMax,
      // 줌 범위에 맞춰 간격을 단계적으로 변경해 눈금이 수십 개로 늘어나지 않게 한다.
      yInterval: getNiceStep(nextYMax - nextYMin),
    }

    updateChart()

    if (isCameraSettled(cameraViewport, cameraTargetViewport)) {
      cameraViewport = { ...cameraTargetViewport }
      cameraFrame = null
      lastCameraFrameTime = null
      updateChart()
      return
    }

    cameraFrame = requestAnimationFrame(moveCamera)
  }

  lastCameraFrameTime = null
  cameraFrame = requestAnimationFrame(moveCamera)
}

function updateChart() {
  if (!chart) return
  const viewport = cameraViewport ?? replayViewport.value

  chart.setOption(
    {
      animation: true,
      animationDuration: 0,
      // 진행 값 자체를 매 프레임 보간하므로 ECharts의 중첩 업데이트 애니메이션은 사용하지 않는다.
      animationDurationUpdate: 0,
      animationEasingUpdate: 'linear',
      grid: {
        top: 16,
        // 전체 보기에서 끝점 오른쪽의 작은 수익률 말풍선이 잘리지 않을 공간만 확보한다.
        right: cameraFocus.value.mode === 'full' ? 48 : 12,
        bottom: 26,
        left: 38,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#172D35',
        borderColor: '#45616B',
        borderWidth: 1,
        textStyle: {
          color: '#FFFFFF',
          fontSize: 11,
        },
        valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
      },
      xAxis: {
        type: 'time',
        min: viewport.xMin,
        max: viewport.xMax,
        splitNumber: 4,
        minInterval: 7 * 24 * 60 * 60 * 1000,
        axisLine: {
          lineStyle: { color: '#48616A' },
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#91A8B2',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 9,
          hideOverlap: true,
          margin: 10,
          formatter: formatDate,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: viewport.yMin,
        max: viewport.yMax,
        interval: viewport.yInterval,
        axisLabel: {
          color: '#94948E',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 9,
          width: 32,
          align: 'right',
          hideOverlap: true,
          formatter: (value) => `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}%`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: '#3A535C',
            type: 'dashed',
          },
        },
      },
      series: focusMarkerOverlay.value
        ? [...chartSeries.value, focusMarkerOverlay.value]
        : chartSeries.value,
    },
    // 포커스 → 전체 보기 전환 시 병합된 포커스 마커가 남지 않도록 시리즈를 통째로 교체한다.
    { replaceMerge: ['series'] },
  )
}

function hideTooltip() {
  chart?.dispatchAction({ type: 'hideTip' })
}

function handleOutsidePointerDown(event) {
  if (!chartElement.value?.contains(event.target)) {
    hideTooltip()
  }
}

onMounted(() => {
  chart = echarts.init(chartElement.value, undefined, { renderer: 'svg' })
  chartBlankClickHandler = (event) => {
    if (!event.target) hideTooltip()
  }
  chart.getZr().on('click', chartBlankClickHandler)
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartElement.value)
  cameraTargetViewport = { ...replayViewport.value }
  cameraViewport = { ...cameraTargetViewport }
  updateChart()
})

watch([chartSeries, focusMarkerOverlay, () => props.speed], () => {
  if (!cameraFrame) updateChart()
})

watch(replayViewport, (viewport) => {
  cameraTargetViewport = { ...viewport }
  if (!cameraViewport) {
    cameraViewport = { ...viewport }
    updateChart()
    return
  }
  startCameraTransition()
})

watch(cameraOptions, (options) => {
  if (!options.some((option) => option.id === selectedViewId.value)) {
    selectedViewId.value = 'all'
  }
})

watch(rankedSeries, (series) => {
  const leader = series[0]
  if (!leader) {
    previousLeaderId = null
    return
  }

  const isInitialLeader = previousLeaderId === null
  const hasLeaderChanged = previousLeaderId !== leader.id
  previousLeaderId = leader.id

  // 첫 렌더링은 건너뛰고, 1위가 바뀌는 순간만 새 선두를 잠시 따라간다.
  if (isInitialLeader || !hasLeaderChanged || props.progress <= 0) return

  selectedViewId.value = leader.id
  if (autoFocusTimer) clearTimeout(autoFocusTimer)
  autoFocusTimer = setTimeout(() => {
    selectedViewId.value = 'all'
    autoFocusTimer = null
  }, 2400)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  if (chartBlankClickHandler) chart?.getZr().off('click', chartBlankClickHandler)
  if (cameraFrame) cancelAnimationFrame(cameraFrame)
  if (autoFocusTimer) clearTimeout(autoFocusTimer)
  chart?.dispose()
})
</script>

<template>
  <section class="live-return-chart" aria-label="참가자별 누적 수익률 그래프">
    <div class="live-return-chart__header">
      <div class="live-return-chart__session">
        <i></i>
        <div>
          <strong>{{ currentSimulationDate }}</strong>
          <span>DAY {{ currentSimulationDay }} / {{ totalDays }}</span>
        </div>
      </div>
      <div class="live-return-chart__header-meta">
        <span class="live-return-chart__camera-status"><i></i>{{ cameraLabel }}</span>
      </div>
    </div>

    <div class="live-return-chart__view-controls" aria-label="그래프 시점 선택">
      <button
        v-for="option in cameraOptions"
        :key="option.id"
        type="button"
        :class="{ 'is-active': selectedViewId === option.id }"
        :aria-pressed="selectedViewId === option.id"
        :aria-label="option.name"
        :title="option.name"
        :style="{ '--view-color': option.color }"
        @click="selectedViewId = option.id"
      >
        <AppIcon :name="option.icon" :size="16" />
      </button>
    </div>

    <div class="live-return-chart__progress" aria-label="시뮬레이션 진행률">
      <div><i :style="{ width: `${progress}%` }"></i></div>
      <strong>{{ Math.round(progress) }}%</strong>
    </div>

    <div ref="chartElement" class="live-return-chart__plot"></div>

    <div class="live-return-chart__legend" aria-label="실시간 순위">
      <span
        v-for="series in legendSeries"
        :key="series.id"
        :class="{ 'is-focused': focusedIdSet.has(series.id), 'is-muted': !focusedIdSet.has(series.id) }"
      >
        <b>{{ series.rank }}</b>
        <i :style="{ backgroundColor: series.itemStyle.color }"></i>
        {{ series.name }}
        <em>{{ series.point[1] > 0 ? '+' : '' }}{{ series.point[1].toFixed(1) }}%</em>
      </span>
    </div>
  </section>
</template>

<style scoped>
.live-return-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #314c55;
  border-radius: var(--radius-2xl);
  background: #263f48;
  box-shadow: 0 14px 30px rgb(25 48 56 / 14%);
}

.live-return-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.live-return-chart__session {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-return-chart__session > i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #0ea5a6;
  box-shadow: 0 0 0 7px rgb(14 165 166 / 13%);
}

.live-return-chart__session div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.live-return-chart__session strong {
  color: #f7fafb;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.02em;
}

.live-return-chart__session span {
  color: #91a8b2;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
}

.live-return-chart__header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  padding-top: 0;
}

.live-return-chart__header-meta > span {
  color: #91a8b2;
  font-family: var(--font-mono);
  font-size: 10px;
}

.live-return-chart__camera-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #73d8d6 !important;
  font-size: 8px !important;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.live-return-chart__camera-status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #0ea5a6;
  box-shadow: 0 0 0 3px rgb(14 165 166 / 20%);
}

.live-return-chart__view-controls {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  padding: 4px;
  border: 1px solid #45616b;
  border-radius: 12px;
  background: #314b55;
}

.live-return-chart__view-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 38px;
  padding: 8px 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--view-color, #b8c7cc);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.live-return-chart__view-controls button:hover {
  color: #fff;
  background: rgb(255 255 255 / 8%);
}

.live-return-chart__view-controls button.is-active {
  color: #fff;
  background: #0ea5a6;
  box-shadow: 0 4px 12px rgb(14 165 166 / 26%);
}

.live-return-chart__view-controls button:focus-visible {
  outline: 2px solid #73d8d6;
  outline-offset: 2px;
}

.live-return-chart__plot {
  width: 100%;
  height: 236px;
}

.live-return-chart__progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-return-chart__progress > div {
  flex: 1;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #3b5660;
}

.live-return-chart__progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0ea5a6;
  transition: width 0.1s linear;
}

.live-return-chart__progress strong {
  color: #73d8d6;
  font-family: var(--font-mono);
  font-size: 10px;
}

.live-return-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.live-return-chart__legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #d4dfe2;
  font-size: 10px;
  line-height: 1;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.live-return-chart__legend span.is-focused {
  color: #fff;
  font-weight: 700;
  transform: scale(1.02);
}

.live-return-chart__legend span.is-muted {
  opacity: 0.68;
}

.live-return-chart__legend b {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: #3b5660;
  color: #fff;
  font-family: var(--font-mono);
  font-size: 9px;
}

.live-return-chart__legend em {
  color: #91a8b2;
  font-family: var(--font-mono);
  font-size: 9px;
  font-style: normal;
}

.live-return-chart__legend i {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
}
</style>
