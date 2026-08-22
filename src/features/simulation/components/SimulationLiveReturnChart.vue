<script setup>
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import { GridComponent, MarkPointComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

import AppIcon from '@/shared/components/AppIcon.vue'
import { resolveParticipantName } from '@/features/simulation/utils/participantName'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import { getDecisionReasonText } from '@/features/simulation/utils/decisionReason'
import { getSecurityDisplayName } from '@/features/simulation/utils/securityDisplayName'
import StockLogo from '@/shared/components/StockLogo.vue'

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
  simulatedTrades: {
    type: Array,
    default: () => [],
  },
  positionSnapshots: {
    type: Array,
    default: null,
  },
  initialCapital: {
    type: Number,
    default: 5000000,
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

const chartSimulationStore = useSimulationStore()
const { comparators: chartComparators } = storeToRefs(chartSimulationStore)

// 순위와 범례가 같은 화면에서 다른 이름을 쓰지 않도록 동일한 해석기를 쓴다.
function chartDisplayName(participant) {
  return resolveParticipantName(participant, chartComparators.value)
}

const chartElement = ref(null)
const selectedViewId = ref('all')
const selectedContentView = ref('chart')
const selectedTradeParticipantId = ref(null)
const selectedTradeTab = ref('history')
const expandedTradeId = ref(null)
const stableRankOrderIds = ref([])
let chart = null
let resizeObserver = null
let cameraViewport = null
let cameraTargetViewport = null
let cameraFrame = null
let lastCameraFrameTime = null
let chartBlankClickHandler = null
let chartDataClickHandler = null
let previousLeaderId = null
let autoFocusTimer = null
let rankOrderTimer = null
let pendingRankOrderKey = null

const colorByVariantType = {
  ACTUAL_USER: '#F7FAFB',
  PERSONAL_BOT: '#0EA5A6',
  FAMOUS_STRATEGY: '#91A8B2',
  RANDOM_BOT: '#B18BD5',
}

const markerSymbolByVariantType = {
  ACTUAL_USER: 'image:///assets/icons/ME.png',
  PERSONAL_BOT: 'image:///assets/icons/BOT.png',
  FAMOUS_STRATEGY: 'image:///assets/icons/FinanceGuru.png',
  RANDOM_BOT: 'image:///assets/icons/Monkey-icon.png',
}

// 추후 전달받은 전용 아이콘으로 이 매핑만 교체하면 된다.
const viewIconByVariantType = {
  ACTUAL_USER: 'user',
  PERSONAL_BOT: 'sparkles',
  FAMOUS_STRATEGY: 'trophy',
  RANDOM_BOT: 'circle-help',
}

const shortLabelByVariantType = {
  ACTUAL_USER: '나',
  PERSONAL_BOT: '투자봇',
  FAMOUS_STRATEGY: '유명',
  RANDOM_BOT: '원숭이',
}

const timelineDates = computed(() =>
  [
    ...new Set(
      (props.dailyPerformance ?? [])
        .map((snapshot) => snapshot.snapshotDate || snapshot.performanceDate)
        .filter(Boolean),
    ),
  ].sort(),
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

const currentSimulationTimestamp = computed(() => {
  const dates = timelineDates.value
  if (!dates.length) return Number.POSITIVE_INFINITY

  const start = new Date(`${dates[0]}T00:00:00`).getTime()
  const end = new Date(`${dates.at(-1)}T23:59:59`).getTime()
  return start + (end - start) * (Math.min(Math.max(props.progress, 0), 100) / 100)
})

const visibleTradeEvents = computed(() =>
  (props.simulatedTrades ?? [])
    .filter((trade) => {
      const timestamp = new Date(trade.tradedAt).getTime()
      return Number.isFinite(timestamp) && timestamp <= currentSimulationTimestamp.value
    })
    .sort((a, b) => new Date(b.tradedAt).getTime() - new Date(a.tradedAt).getTime()),
)

const latestVisibleTrade = computed(() => visibleTradeEvents.value.at(0) ?? null)
const visibleTradeEventCount = computed(() => visibleTradeEvents.value.length)

const latestVisibleTradeParticipant = computed(() =>
  props.participants.find(
    (participant) =>
      String(participant.variantId) === String(latestVisibleTrade.value?.simulationVariantId),
  ),
)

const performanceByVariant = computed(() => {
  const grouped = new Map()

  ;(props.dailyPerformance ?? []).forEach((snapshot) => {
    const snapshots = grouped.get(snapshot.simulationVariantId) ?? []
    snapshots.push(snapshot)
    grouped.set(snapshot.simulationVariantId, snapshots)
  })

  grouped.forEach((snapshots) =>
    snapshots.sort((a, b) =>
      (a.snapshotDate || a.performanceDate || '').localeCompare(
        b.snapshotDate || b.performanceDate || '',
      ),
    ),
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
      new Date(`${snapshot.snapshotDate || snapshot.performanceDate}T00:00:00`).getTime(),
      snapshot.cumulativeReturnPercent,
    ])

    const nextSnapshot = snapshots[completedIndex + 1]
    const currentSnapshot = snapshots[completedIndex]
    if (currentSnapshot && nextSnapshot && interpolation > 0) {
      const currentDate = new Date(
        `${currentSnapshot.snapshotDate || currentSnapshot.performanceDate}T00:00:00`,
      ).getTime()
      const nextDate = new Date(
        `${nextSnapshot.snapshotDate || nextSnapshot.performanceDate}T00:00:00`,
      ).getTime()
      const currentReturn =
        currentSnapshot.cumulativeReturnPercent +
        (nextSnapshot.cumulativeReturnPercent - currentSnapshot.cumulativeReturnPercent) *
          interpolation

      data.push([currentDate + (nextDate - currentDate) * interpolation, currentReturn])
    }

    return {
      id: String(participant.variantId),
      name: chartDisplayName(participant),
      variantType: participant.variantType,
      type: 'line',
      data,
      smooth: 0.25,
      showSymbol: false,
      symbol: 'circle',
      lineStyle: {
        width: participant.variantType === 'PERSONAL_BOT' ? 4 : 2.4,
        opacity: participant.variantType === 'PERSONAL_BOT' ? 1 : 0.88,
      },
      areaStyle:
        participant.variantType === 'PERSONAL_BOT'
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(14, 165, 166, 0.22)' },
                { offset: 1, color: 'rgba(14, 165, 166, 0)' },
              ]),
            }
          : undefined,
      markPoint: {
        silent: true,
        symbol: markerSymbolByVariantType[participant.variantType] ?? 'circle',
        symbolSize: participant.variantType === 'PERSONAL_BOT' ? 30 : 26,
        label: {
          show: selectedViewId.value === 'all',
          position: 'right',
          distance: 6,
          offset: [0, (participantIndex - 1.5) * 2],
          color: '#DCE7EA',
          fontFamily: 'SUIT Variable, SUIT, sans-serif',
          fontSize: 9,
          fontWeight: 700,
          backgroundColor: 'rgba(23, 45, 53, 0.82)',
          borderColor: colorByVariantType[participant.variantType] ?? '#66777D',
          borderWidth: 1,
          borderRadius: 5,
          padding: [3, 5],
          formatter: ({ value }) => `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)}%`,
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

function getReturnAtTimestamp(points, timestamp) {
  if (!points.length) return null
  if (timestamp <= points[0][0]) return points[0][1]
  if (timestamp >= points.at(-1)[0]) return points.at(-1)[1]

  const nextIndex = points.findIndex((point) => point[0] >= timestamp)
  if (nextIndex <= 0) return points[0][1]

  const current = points[nextIndex - 1]
  const next = points[nextIndex]
  const amount = (timestamp - current[0]) / (next[0] - current[0])
  return current[1] + (next[1] - current[1]) * amount
}

const tradeMarkerSeries = computed(() => {
  const focusedVariantId = selectedViewId.value === 'all' ? null : selectedViewId.value
  const completedTrades = props.simulatedTrades.filter((trade) => {
    const timestamp = new Date(trade.tradedAt).getTime()
    const isCompleted = Number.isFinite(timestamp) && timestamp <= currentSimulationTimestamp.value
    const isFocused =
      !focusedVariantId || String(trade.simulationVariantId) === String(focusedVariantId)
    return isCompleted && isFocused
  })

  return ['BUY', 'SELL']
    .map((tradeDirection) => {
      const data = completedTrades
        .filter((trade) => getTradeDirection(trade.tradeSide) === tradeDirection)
        .map((trade) => {
          const timestamp = new Date(trade.tradedAt).getTime()
          const participantSeries = chartSeries.value.find(
            (series) => series.id === String(trade.simulationVariantId),
          )
          const returnPercent = participantSeries
            ? getReturnAtTimestamp(participantSeries.data, timestamp)
            : null
          if (returnPercent === null) return null

          return {
            value: [timestamp, returnPercent],
            tradeId: trade.simulatedTradeId,
            variantId: String(trade.simulationVariantId),
            securityName: getSecurityDisplayName(trade),
            quantity: trade.quantity,
            unitPrice: trade.unitPrice,
            decisionReason: getDecisionReasonText(trade.decisionReason),
          }
        })
        .filter(Boolean)

      return {
        id: `trade-markers-${tradeDirection.toLowerCase()}`,
        name: tradeDirection === 'BUY' ? '매수' : '매도',
        type: 'scatter',
        data,
        symbol: 'triangle',
        symbolRotate: tradeDirection === 'SELL' ? 180 : 0,
        symbolSize: cameraFocus.value.mode === 'full' ? 8 : 11,
        z: 8,
        itemStyle: {
          color: tradeDirection === 'BUY' ? '#F04F55' : '#3478D4',
          borderColor: '#F7FAFB',
          borderWidth: 1,
        },
        label: {
          show: cameraFocus.value.mode === 'focus',
          position: tradeDirection === 'BUY' ? 'top' : 'bottom',
          distance: 4,
          color: tradeDirection === 'BUY' ? '#FAD6D8' : '#CFE2FA',
          fontSize: 7,
          fontWeight: 700,
          formatter: tradeDirection === 'BUY' ? '매수' : '매도',
        },
        tooltip: {
          trigger: 'item',
          formatter: ({ data: item }) =>
            `<strong>${tradeDirection === 'BUY' ? '매수' : '매도'} · ${item.securityName}</strong><br/>${item.quantity}주 · ${formatCurrency(item.unitPrice)}<br/>${item.decisionReason}`,
        },
      }
    })
    .filter((series) => series.data.length)
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

const raceLeader = computed(() => rankedSeries.value[0] ?? null)
const raceRunnerUp = computed(() => rankedSeries.value[1] ?? null)
const raceLeaderGap = computed(() => {
  if (!raceLeader.value?.point || !raceRunnerUp.value?.point) return 0
  return Math.max(raceLeader.value.point[1] - raceRunnerUp.value.point[1], 0)
})

const raceLeaderGapLabel = computed(() =>
  raceLeaderGap.value < 0.05 ? '2위와 초접전 중' : `2위와 ${raceLeaderGap.value.toFixed(1)}%p 차이`,
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

const cameraOptions = computed(() => [
  { id: 'all', icon: 'activity', name: '전체 그래프', shortLabel: '전체', color: '#B8C7CC' },
  ...(stableRankOrderIds.value.length
    ? stableRankOrderIds.value
    : rankedSeries.value.map((series) => series.id)
  )
    .map((seriesId) => rankedSeries.value.find((series) => series.id === seriesId))
    .filter(Boolean)
    .map((series, index) => ({
      id: series.id,
      rank: index + 1,
      icon: viewIconByVariantType[series.variantType] ?? 'circle-help',
      avatar: markerSymbolByVariantType[series.variantType]?.replace('image://', ''),
      shortLabel: shortLabelByVariantType[series.variantType] ?? '참가자',
      name: `${index + 1}위 · ${series.name}`,
      color: series.itemStyle.color,
    })),
])

const transactionParticipants = computed(() =>
  props.participants.map((participant) => ({
    id: String(participant.variantId),
    icon: viewIconByVariantType[participant.variantType] ?? 'circle-help',
    avatar: markerSymbolByVariantType[participant.variantType]?.replace('image://', ''),
    shortLabel: shortLabelByVariantType[participant.variantType] ?? '참가자',
    name: chartDisplayName(participant),
    variantType: participant.variantType,
  })),
)

const selectedTradeParticipant = computed(() =>
  transactionParticipants.value.find(
    (participant) => participant.id === selectedTradeParticipantId.value,
  ),
)

function getTradeDirection(tradeSide) {
  return ['BUY', 'ADD'].includes(tradeSide) ? 'BUY' : 'SELL'
}

function getTradeSideLabel(tradeSide) {
  return (
    {
      BUY: '매수',
      SELL: '매도',
      ADD: '추가 매수',
      REDUCE: '비중 축소',
    }[tradeSide] ?? tradeSide
  )
}

function getParticipantAvatar(participant) {
  return markerSymbolByVariantType[participant?.variantType]?.replace('image://', '') ?? null
}

const visibleTransactions = computed(() =>
  props.simulatedTrades
    .filter((trade) => {
      const tradedAt = new Date(trade.tradedAt).getTime()
      const isCompleted = !Number.isFinite(tradedAt) || tradedAt <= currentSimulationTimestamp.value
      const isSelected =
        String(trade.simulationVariantId) === String(selectedTradeParticipantId.value)
      return isCompleted && isSelected
    })
    .sort((a, b) => new Date(b.tradedAt).getTime() - new Date(a.tradedAt).getTime()),
)

const selectedPositionSnapshotDate = computed(
  () =>
    performanceByVariant.value
      .get(Number(selectedTradeParticipantId.value))
      ?.filter(
        (snapshot) =>
          new Date(`${snapshot.snapshotDate || snapshot.performanceDate}T23:59:59`).getTime() <=
          currentSimulationTimestamp.value,
      )
      .at(-1)?.snapshotDate,
)

const currentHoldings = computed(() => {
  if (Array.isArray(props.positionSnapshots)) {
    const snapshotDate = selectedPositionSnapshotDate.value
    const holdings = props.positionSnapshots
      .filter(
        (snapshot) =>
          String(snapshot.simulationVariantId) === String(selectedTradeParticipantId.value) &&
          snapshot.snapshotDate === snapshotDate,
      )
      .map((snapshot) => ({
        ...snapshot,
        displayName: getSecurityDisplayName(snapshot),
        valuation: Number(snapshot.marketValue) || 0,
        averagePrice: Number(snapshot.averagePrice) || 0,
        currentPrice: Number(snapshot.currentPrice) || 0,
        returnPercent: Number(snapshot.returnPercent) || 0,
      }))
      .sort((a, b) => b.valuation - a.valuation)

    const totalValuation = holdings.reduce((total, holding) => total + holding.valuation, 0)
    return holdings.map((holding) => ({
      ...holding,
      allocationPercent: totalValuation ? (holding.valuation / totalValuation) * 100 : 0,
    }))
  }

  // positionSnapshots가 없는 과거 응답만 체결 내역 기반 추정값을 사용한다.
  const holdingsBySecurity = new Map()

  ;[...visibleTransactions.value].reverse().forEach((trade) => {
    const securityKey = trade.securityId ?? trade.securityCode
    const holding = holdingsBySecurity.get(securityKey) ?? {
      securityId: trade.securityId,
      securityCode: trade.securityCode,
      securityName: trade.securityName,
      quantity: 0,
      costBasis: 0,
      currentPrice: 0,
    }
    const quantity = Number(trade.quantity) || 0
    const unitPrice = Number(trade.unitPrice) || 0
    holding.securityCode = trade.securityCode || holding.securityCode
    holding.securityName = trade.securityName || holding.securityName
    holding.currentPrice = unitPrice || holding.currentPrice

    if (getTradeDirection(trade.tradeSide) === 'BUY') {
      holding.quantity += quantity
      holding.costBasis += quantity * unitPrice
    } else if (holding.quantity > 0) {
      const averagePrice = holding.costBasis / holding.quantity
      const soldQuantity = Math.min(quantity, holding.quantity)
      holding.quantity -= soldQuantity
      holding.costBasis -= averagePrice * soldQuantity
    }

    holdingsBySecurity.set(securityKey, holding)
  })

  const holdings = [...holdingsBySecurity.values()]
    .filter((holding) => holding.quantity > 0)
    .map((holding) => {
      const averagePrice = holding.costBasis / holding.quantity
      const currentPrice = holding.currentPrice || averagePrice
      const valuation = currentPrice * holding.quantity
      const returnPercent = averagePrice ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0

      return {
        ...holding,
        displayName: getSecurityDisplayName(holding),
        currentPrice,
        averagePrice,
        valuation,
        returnPercent,
      }
    })
    .sort((a, b) => b.valuation - a.valuation)

  const totalValuation = holdings.reduce((total, holding) => total + holding.valuation, 0)
  return holdings.map((holding) => ({
    ...holding,
    allocationPercent: totalValuation ? (holding.valuation / totalValuation) * 100 : 0,
  }))
})

const selectedParticipantSeries = computed(() =>
  rankedSeries.value.find((series) => series.id === selectedTradeParticipantId.value),
)

const transactionSummary = computed(() => {
  const latestSnapshot = performanceByVariant.value
    .get(Number(selectedTradeParticipantId.value))
    ?.filter(
      (snapshot) =>
        new Date(`${snapshot.snapshotDate}T23:59:59`).getTime() <= currentSimulationTimestamp.value,
    )
    .at(-1)
  const returnPercent = selectedParticipantSeries.value?.point?.[1] ?? 0
  const cashRatio =
    latestSnapshot?.totalEquity > 0 ? (latestSnapshot.cash / latestSnapshot.totalEquity) * 100 : 0

  return {
    returnPercent,
    tradeCount: visibleTransactions.value.length,
    holdingCount: currentHoldings.value.length,
    cashRatio,
  }
})

function setContentView(view) {
  selectedContentView.value = view

  if (view === 'trades' && !selectedTradeParticipantId.value) {
    const personalBot = transactionParticipants.value.find(
      (option) => option.variantType === 'PERSONAL_BOT',
    )
    selectedTradeParticipantId.value =
      personalBot?.id ?? transactionParticipants.value[0]?.id ?? null
  }

  if (view === 'chart') {
    requestAnimationFrame(() => {
      chart?.resize()
      updateChart()
    })
  }
}

function selectCameraView(viewId) {
  if (autoFocusTimer) {
    clearTimeout(autoFocusTimer)
    autoFocusTimer = null
  }
  selectedViewId.value = selectedViewId.value === viewId && viewId !== 'all' ? 'all' : viewId
}

function openTradeView(participantId, tradeId = null) {
  selectedTradeParticipantId.value = String(participantId)
  selectedTradeTab.value = 'history'
  selectedContentView.value = 'trades'
  expandedTradeId.value = tradeId
}

defineExpose({ openTradeView })

function toggleTradeDetails(tradeId) {
  expandedTradeId.value = expandedTradeId.value === tradeId ? null : tradeId
}

function formatTradeDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))}원`
}

function formatSignedPercent(value) {
  const number = Number(value) || 0
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`
}

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
      formatter: `${shortLabelByVariantType[focused.variantType] ?? '참가자'} ${focused.point[1] > 0 ? '+' : ''}${focused.point[1].toFixed(1)}%`,
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
  const visibleSeries = [...chartSeries.value, ...tradeMarkerSeries.value]
  if (focusMarkerOverlay.value) visibleSeries.push(focusMarkerOverlay.value)

  chart.setOption(
    {
      animation: true,
      animationDuration: 0,
      // 진행 값 자체를 매 프레임 보간하므로 ECharts의 중첩 업데이트 애니메이션은 사용하지 않는다.
      animationDurationUpdate: 0,
      animationEasingUpdate: 'linear',
      grid: {
        top: 22,
        // 전체 보기에서 끝점 오른쪽의 작은 수익률 말풍선이 잘리지 않을 공간만 확보한다.
        right: cameraFocus.value.mode === 'full' ? 54 : 14,
        bottom: 30,
        left: 42,
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
          fontFamily: 'SUIT Variable, SUIT, sans-serif',
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
          fontFamily: 'SUIT Variable, SUIT, sans-serif',
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
            color: 'rgba(132, 163, 172, 0.2)',
            type: 'dashed',
          },
        },
      },
      series: visibleSeries,
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
  chartDataClickHandler = (params) => {
    if (String(params.seriesId).startsWith('trade-markers-')) {
      openTradeView(params.data.variantId, params.data.tradeId)
      return
    }

    if (params.seriesType === 'line') {
      selectCameraView(String(params.seriesId))
    }
  }
  chartBlankClickHandler = (event) => {
    if (!event.target) hideTooltip()
  }
  chart.on('click', chartDataClickHandler)
  chart.getZr().on('click', chartBlankClickHandler)
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartElement.value)
  cameraTargetViewport = { ...replayViewport.value }
  cameraViewport = { ...cameraTargetViewport }
  updateChart()
})

watch([chartSeries, tradeMarkerSeries, focusMarkerOverlay, () => props.speed], () => {
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

watch(
  rankedSeries,
  (series) => {
    const nextOrderIds = series.map((item) => item.id)
    const nextOrderKey = nextOrderIds.join('|')
    const stableOrderKey = stableRankOrderIds.value.join('|')

    if (!stableRankOrderIds.value.length) {
      stableRankOrderIds.value = nextOrderIds
      return
    }

    if (nextOrderKey === stableOrderKey) {
      if (rankOrderTimer) clearTimeout(rankOrderTimer)
      rankOrderTimer = null
      pendingRankOrderKey = null
      return
    }

    if (pendingRankOrderKey === nextOrderKey) return

    if (rankOrderTimer) clearTimeout(rankOrderTimer)
    pendingRankOrderKey = nextOrderKey
    rankOrderTimer = setTimeout(() => {
      stableRankOrderIds.value = nextOrderIds
      pendingRankOrderKey = null
      rankOrderTimer = null
    }, 650)
  },
  { immediate: true },
)

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
  if (chartDataClickHandler) chart?.off('click', chartDataClickHandler)
  if (chartBlankClickHandler) chart?.getZr().off('click', chartBlankClickHandler)
  if (cameraFrame) cancelAnimationFrame(cameraFrame)
  if (autoFocusTimer) clearTimeout(autoFocusTimer)
  if (rankOrderTimer) clearTimeout(rankOrderTimer)
  chart?.dispose()
})
</script>

<template>
  <section
    class="live-return-chart"
    :class="{ 'live-return-chart--trades': selectedContentView === 'trades' }"
    :aria-label="
      selectedContentView === 'chart' ? '참가자별 누적 수익률 그래프' : '참가자별 거래 현황'
    "
  >
    <div class="live-return-chart__header">
      <div class="live-return-chart__session">
        <i></i>
        <div>
          <small>{{ selectedContentView === 'chart' ? '실시간 레이스' : '실시간 거래' }}</small>
          <strong>
            {{ selectedContentView === 'chart' ? currentSimulationDate : '매수·매도 흐름' }}
          </strong>
          <span v-if="selectedContentView === 'chart'">
            {{ currentSimulationDay }}일 / {{ totalDays }}일
          </span>
        </div>
      </div>
      <div class="live-return-chart__content-toggle" aria-label="그래프 콘텐츠 선택">
        <button
          type="button"
          :class="{ 'is-active': selectedContentView === 'chart' }"
          :aria-pressed="selectedContentView === 'chart'"
          @click="setContentView('chart')"
        >
          <AppIcon name="trending-up" :size="12" />
          <span>그래프</span>
        </button>
        <button
          type="button"
          :class="{ 'is-active': selectedContentView === 'trades' }"
          :aria-pressed="selectedContentView === 'trades'"
          @click="setContentView('trades')"
        >
          <AppIcon name="notebook" :size="12" />
          <span>거래</span>
        </button>
      </div>
    </div>

    <div v-show="selectedContentView === 'chart'" class="live-return-chart__graph-content">
      <div v-if="raceLeader" class="live-return-chart__leader" aria-live="polite">
        <span class="live-return-chart__leader-rank">1</span>
        <img
          v-if="getParticipantAvatar(raceLeader)"
          :src="getParticipantAvatar(raceLeader)"
          :alt="raceLeader.name"
        />
        <div class="live-return-chart__leader-copy">
          <small>현재 선두</small>
          <strong>{{ raceLeader.name }}</strong>
        </div>
        <div class="live-return-chart__leader-score">
          <strong>{{ formatSignedPercent(raceLeader.point[1]) }}</strong>
          <span>{{ raceLeaderGapLabel }}</span>
        </div>
      </div>

      <div
        class="live-return-chart__progress"
        role="progressbar"
        aria-label="시뮬레이션 진행률"
        :aria-valuenow="Math.round(progress)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span>진행률</span>
        <div><i :style="{ width: `${progress}%` }"></i></div>
        <strong class="live-return-chart__percent">{{ Math.round(progress) }}%</strong>
      </div>

      <div class="live-return-chart__event-slot" aria-live="polite">
        <button
          v-if="latestVisibleTrade && latestVisibleTradeParticipant"
          :key="latestVisibleTrade.simulatedTradeId"
          type="button"
          class="live-return-chart__event-strip"
          :class="`is-${getTradeDirection(latestVisibleTrade.tradeSide).toLowerCase()}`"
          @click="
            openTradeView(
              latestVisibleTrade.simulationVariantId,
              latestVisibleTrade.simulatedTradeId,
            )
          "
        >
          <img
            :src="getParticipantAvatar(latestVisibleTradeParticipant)"
            :alt="chartDisplayName(latestVisibleTradeParticipant)"
          />
          <span class="live-return-chart__event-copy">
            <small>
              최근 거래 · {{ chartDisplayName(latestVisibleTradeParticipant) }} ·
              {{ getTradeSideLabel(latestVisibleTrade.tradeSide) }}
            </small>
            <strong>
              {{ getSecurityDisplayName(latestVisibleTrade) }}
              {{ latestVisibleTrade.quantity }}주
              <em>{{
                formatCurrency(latestVisibleTrade.unitPrice * latestVisibleTrade.quantity)
              }}</em>
            </strong>
          </span>
          <b>누적 {{ visibleTradeEventCount }}건</b>
          <AppIcon name="chevron-right" :size="14" />
        </button>

        <div v-else class="live-return-chart__event-strip is-waiting">
          <span class="live-return-chart__event-icon">
            <AppIcon name="activity" :size="15" />
          </span>
          <span class="live-return-chart__event-copy">
            <small>최근 거래</small>
            <strong>첫 거래 신호를 기다리고 있어요</strong>
          </span>
          <b>누적 0건</b>
        </div>
      </div>

      <div class="live-return-chart__plot-stage">
        <div ref="chartElement" class="live-return-chart__plot"></div>
      </div>

      <TransitionGroup
        tag="div"
        name="view-option"
        class="live-return-chart__view-controls"
        aria-label="그래프 시점 선택"
      >
        <button
          v-for="option in cameraOptions"
          :key="option.id"
          type="button"
          :class="{ 'is-active': selectedViewId === option.id }"
          :aria-pressed="selectedViewId === option.id"
          :aria-label="option.name"
          :title="option.name"
          :style="{ '--view-color': option.color }"
          @click="selectCameraView(option.id)"
        >
          <div class="live-return-chart__view-avatar">
            <b v-if="option.rank" class="live-return-chart__view-rank">{{ option.rank }}위</b>
            <img v-if="option.avatar" :src="option.avatar" :alt="option.name" />
            <AppIcon v-else :name="option.icon" :size="16" />
          </div>
          <span>{{ option.shortLabel }}</span>
        </button>
      </TransitionGroup>
    </div>

    <div v-if="selectedContentView === 'trades'" class="live-return-chart__trades">
      <section v-if="selectedTradeParticipant" class="trade-overview" aria-live="polite">
        <img
          v-if="selectedTradeParticipant.avatar"
          :src="selectedTradeParticipant.avatar"
          :alt="selectedTradeParticipant.name"
        />
        <div class="trade-overview__copy">
          <small>선택한 참가자</small>
          <strong>{{ selectedTradeParticipant.name }}</strong>
          <span>거래 시점과 판단 근거를 함께 확인해보세요.</span>
        </div>
        <div class="trade-overview__return">
          <small>현재 수익률</small>
          <strong
            :class="{
              positive: transactionSummary.returnPercent > 0,
              negative: transactionSummary.returnPercent < 0,
            }"
          >
            {{ formatSignedPercent(transactionSummary.returnPercent) }}
          </strong>
        </div>
      </section>

      <div class="trade-participant-picker">
        <div class="trade-section-heading">
          <strong>참가자 선택</strong>
          <span>비교할 참가자를 골라보세요</span>
        </div>
        <div class="trade-participants" aria-label="거래 참가자 선택">
          <button
            v-for="option in transactionParticipants"
            :key="option.id"
            type="button"
            :class="{ 'is-active': selectedTradeParticipantId === option.id }"
            :aria-pressed="selectedTradeParticipantId === option.id"
            @click="selectedTradeParticipantId = option.id"
          >
            <img v-if="option.avatar" :src="option.avatar" :alt="option.name" />
            <AppIcon v-else :name="option.icon" :size="18" />
            <span>{{ option.shortLabel }}</span>
          </button>
        </div>
      </div>

      <dl class="trade-summary" aria-label="선택 참가자 거래 요약">
        <div>
          <dt>거래 횟수</dt>
          <dd>{{ transactionSummary.tradeCount }}회</dd>
        </div>
        <div>
          <dt>보유 종목</dt>
          <dd>{{ transactionSummary.holdingCount }}개</dd>
        </div>
        <div>
          <dt>현금 비중</dt>
          <dd>{{ transactionSummary.cashRatio.toFixed(0) }}%</dd>
        </div>
      </dl>

      <div class="trade-detail-tabs" role="tablist" aria-label="거래 상세 보기">
        <button
          type="button"
          role="tab"
          :aria-selected="selectedTradeTab === 'history'"
          :class="{ 'is-active': selectedTradeTab === 'history' }"
          @click="selectedTradeTab = 'history'"
        >
          <AppIcon name="history" :size="14" />
          거래 내역
          <b>{{ visibleTransactions.length }}</b>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="selectedTradeTab === 'holdings'"
          :class="{ 'is-active': selectedTradeTab === 'holdings' }"
          @click="selectedTradeTab = 'holdings'"
        >
          <AppIcon name="briefcase-business" :size="14" />
          종목 현황
          <b>{{ currentHoldings.length }}</b>
        </button>
      </div>

      <div class="trade-panel-heading">
        <div>
          <strong>{{ selectedTradeTab === 'history' ? '최근 거래' : '현재 보유 종목' }}</strong>
          <span>
            {{
              selectedTradeTab === 'history'
                ? '거래를 누르면 판단 근거가 펼쳐져요'
                : '평가금액과 보유 비중을 확인해보세요'
            }}
          </span>
        </div>
        <b>
          {{ selectedTradeTab === 'history' ? visibleTransactions.length : currentHoldings.length
          }}{{ selectedTradeTab === 'history' ? '건' : '개' }}
        </b>
      </div>

      <div v-if="selectedTradeTab === 'history'" class="trade-timeline" role="tabpanel">
        <button
          v-for="trade in visibleTransactions"
          :key="trade.simulatedTradeId"
          type="button"
          class="trade-timeline__item"
          :class="[
            `is-${getTradeDirection(trade.tradeSide).toLowerCase()}`,
            { 'is-expanded': expandedTradeId === trade.simulatedTradeId },
          ]"
          @click="toggleTradeDetails(trade.simulatedTradeId)"
        >
          <time>{{ formatTradeDate(trade.tradedAt) }}</time>
          <i></i>
          <div class="trade-timeline__body">
            <div class="trade-timeline__title">
              <StockLogo :stock="trade" :size="24" />
              <strong>{{ getSecurityDisplayName(trade) }}</strong>
              <span>{{ getTradeSideLabel(trade.tradeSide) }}</span>
              <em>{{ formatCurrency(trade.unitPrice * trade.quantity) }}</em>
            </div>
            <p class="trade-timeline__numbers">
              {{ trade.quantity }}주 · 주당 {{ formatCurrency(trade.unitPrice) }}
            </p>
            <p class="trade-timeline__reason">
              <b>판단 근거</b>
              {{ getDecisionReasonText(trade.decisionReason) }}
            </p>
          </div>
          <AppIcon name="chevron-down" :size="13" />
        </button>

        <p v-if="!visibleTransactions.length" class="trade-empty">
          현재 시점까지 실행된 거래가 없습니다.
        </p>
      </div>

      <div v-else class="holding-list" role="tabpanel">
        <article v-for="holding in currentHoldings" :key="holding.securityId" class="holding-card">
          <div class="holding-card__top">
            <div class="holding-card__identity">
              <StockLogo :stock="holding" :size="30" />
              <div class="holding-card__copy">
                <strong>{{ holding.displayName }}</strong>
                <span>{{ holding.quantity }}주</span>
              </div>
            </div>
            <strong
              :class="{ positive: holding.returnPercent > 0, negative: holding.returnPercent < 0 }"
            >
              {{ formatSignedPercent(holding.returnPercent) }}
            </strong>
          </div>
          <div class="holding-card__bar">
            <i :style="{ width: `${holding.allocationPercent}%` }"></i>
          </div>
          <dl>
            <div>
              <dt>평가금액</dt>
              <dd>{{ formatCurrency(holding.valuation) }}</dd>
            </div>
            <div>
              <dt>평균단가</dt>
              <dd>{{ formatCurrency(holding.averagePrice) }}</dd>
            </div>
            <div>
              <dt>보유 비중</dt>
              <dd>{{ holding.allocationPercent.toFixed(1) }}%</dd>
            </div>
          </dl>
        </article>

        <p v-if="!currentHoldings.length" class="trade-empty">현재 보유 중인 종목이 없습니다.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.live-return-chart {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 14px 14px;
  overflow: hidden;
  border: 1px solid rgb(132 182 190 / 18%);
  border-radius: 20px;
  background: radial-gradient(circle at 78% 2%, rgb(20 184 179 / 11%), transparent 34%), #17313b;
  box-shadow: 0 18px 38px rgb(5 26 33 / 24%);
}

.live-return-chart--trades {
  padding: 16px;
  border-color: #dce5e8;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 24px rgb(30 58 67 / 8%);
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
  animation: live-pulse 1.8s ease-out infinite;
}

.live-return-chart__session div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.live-return-chart__session strong {
  color: #f7fafb;
  font-family: var(--font-mono);
  font-size: var(--font-size-body);
  letter-spacing: 0.02em;
}

.live-return-chart__session small {
  color: #73d8d6;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.live-return-chart__session span {
  color: #91a8b2;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.live-return-chart--trades .live-return-chart__session strong {
  color: #181817;
  font-size: var(--font-size-body);
}

.live-return-chart--trades .live-return-chart__content-toggle {
  background: #eff3f4;
}

.live-return-chart--trades .live-return-chart__content-toggle button {
  color: #71848b;
}

.live-return-chart--trades .live-return-chart__content-toggle button.is-active {
  background: #263f48;
  color: #fff;
  box-shadow: 0 3px 9px rgb(38 63 72 / 20%);
}

.live-return-chart__content-toggle {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 1px;
  padding: 2px;
  border-radius: 9px;
  background: #334e58;
}

.live-return-chart__content-toggle button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-width: 38px;
  height: 32px;
  padding: 2px 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #b8c7cc;
  font-family: inherit;
  font-size: var(--font-size-caption);
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.live-return-chart__content-toggle button:hover {
  color: #fff;
}

.live-return-chart__content-toggle button.is-active {
  background: #0ea5a6;
  color: #fff;
  box-shadow: 0 3px 9px rgb(5 104 105 / 34%);
}

.live-return-chart__content-toggle button:focus-visible {
  outline: 2px solid #73d8d6;
  outline-offset: 2px;
}

.live-return-chart__view-controls {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border: 1px solid rgb(141 174 183 / 15%);
  border-radius: 13px;
  background: rgb(9 34 42 / 48%);
}

.live-return-chart__graph-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-return-chart__leader {
  display: grid;
  grid-template-columns: 24px 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  border: 1px solid rgb(115 216 214 / 18%);
  border-radius: 14px;
  background: rgb(20 184 179 / 9%);
}

.live-return-chart__leader-rank {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  background: #73d8d6;
  color: #06272e;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.live-return-chart__leader > img {
  width: 34px;
  height: 34px;
  border: 2px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  object-fit: cover;
}

.live-return-chart__leader-copy,
.live-return-chart__leader-score {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.live-return-chart__leader-copy small,
.live-return-chart__leader-score span {
  color: #91a8b2;
  font-size: 10px;
  font-weight: 650;
}

.live-return-chart__leader-copy strong {
  overflow: hidden;
  color: #f7fafb;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-return-chart__leader-score {
  align-items: flex-end;
  text-align: right;
}

.live-return-chart__leader-score strong {
  color: #ff7b80;
  font-family: var(--font-mono);
  font-size: 18px;
}

.live-return-chart__plot-stage {
  position: relative;
  margin: 0 -4px;
  border-radius: 14px;
  background: rgb(9 34 42 / 24%);
}

.live-return-chart__view-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  min-height: 44px;
  padding: 5px 2px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--view-color, #b8c7cc);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.view-option-move {
  transition: transform 0.72s cubic-bezier(0.25, 0.8, 0.25, 1);
  will-change: transform;
}

.live-return-chart__view-rank {
  min-width: 17px;
  padding: 2px 3px;
  border-radius: 999px;
  background: rgb(10 30 37 / 45%);
  color: #dce7ea;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  line-height: 1;
  text-align: center;
}

.live-return-chart__view-avatar {
  display: flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.live-return-chart__view-controls button.is-active .live-return-chart__view-rank {
  background: rgb(255 255 255 / 18%);
  color: #fff;
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

.live-return-chart__view-controls img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.live-return-chart__view-controls span {
  max-width: 100%;
  overflow: hidden;
  color: currentColor;
  font-size: var(--font-size-caption);
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-return-chart__plot {
  width: 100%;
  height: 240px;
}

.live-return-chart__event-slot {
  min-height: 58px;
}

.live-return-chart__event-strip {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto 14px;
  width: 100%;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 8px 10px;
  border: 1px solid rgb(240 79 85 / 28%);
  border-radius: 13px;
  background: #102a34;
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 7px 16px rgb(4 20 26 / 18%);
  animation: trade-event-in 0.34s ease-out;
}

.live-return-chart__event-strip:hover {
  background: #15343e;
}

.live-return-chart__event-strip:focus-visible {
  outline: 2px solid #73d8d6;
  outline-offset: 2px;
}

.live-return-chart__event-strip.is-sell {
  border-color: rgb(52 120 212 / 36%);
}

.live-return-chart__event-strip > img {
  width: 32px;
  height: 32px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  object-fit: cover;
}

.live-return-chart__event-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.live-return-chart__event-copy small {
  overflow: hidden;
  color: #ffb0b4;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-return-chart__event-strip.is-sell small {
  color: #a9cdf8;
}

.live-return-chart__event-copy strong {
  overflow: hidden;
  color: #f7fafb;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-return-chart__event-copy em {
  margin-left: 5px;
  color: #91a8b2;
  font-family: var(--font-mono);
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
}

.live-return-chart__event-strip > b {
  padding: 5px 7px;
  border-radius: 999px;
  background: rgb(255 255 255 / 7%);
  color: #b8c7cc;
  font-family: var(--font-mono);
  font-size: 10px;
  white-space: nowrap;
}

.live-return-chart__event-strip > .app-icon {
  color: #91a8b2;
}

.live-return-chart__event-strip.is-waiting {
  grid-template-columns: 32px minmax(0, 1fr) auto;
  border-color: rgb(145 168 178 / 15%);
  color: #91a8b2;
  cursor: default;
  animation: none;
}

.live-return-chart__event-strip.is-waiting:hover {
  background: #102a34;
}

.live-return-chart__event-strip.is-waiting small {
  color: #829ca4;
}

.live-return-chart__event-icon {
  display: inline-grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: rgb(20 184 179 / 12%);
  color: #73d8d6;
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

.live-return-chart__percent {
  flex: 0 0 auto;
  color: #73d8d6;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.live-return-chart__progress > span {
  flex: 0 0 auto;
  color: #b8c7cc;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.live-return-chart__trades {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #263a43;
}

.trade-overview {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 13px;
  border: 1px solid #cceae8;
  border-radius: 15px;
  background: #f1fbfa;
}

.trade-overview > img {
  width: 38px;
  height: 38px;
  border: 2px solid #d8f1ef;
  border-radius: 50%;
  object-fit: cover;
}

.trade-overview__copy,
.trade-overview__return {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.trade-overview__copy small,
.trade-overview__return small {
  color: #749097;
  font-size: 10px;
  font-weight: 700;
}

.trade-overview__copy strong {
  overflow: hidden;
  color: #18323b;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-overview__copy span {
  overflow: hidden;
  color: #789097;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-overview__return {
  align-items: flex-end;
  padding-left: 8px;
  text-align: right;
}

.trade-overview__return strong {
  font-family: var(--font-mono);
  font-size: 18px;
}

.trade-participant-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trade-section-heading,
.trade-panel-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.trade-section-heading strong,
.trade-panel-heading strong {
  color: #263a43;
  font-size: 13px;
}

.trade-section-heading span,
.trade-panel-heading span {
  color: #91a0a6;
  font-size: 10px;
}

.trade-participants {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.trade-participants button {
  display: flex;
  min-width: 0;
  min-height: 52px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 3px;
  border: 1px solid #dfe7ea;
  border-radius: 12px;
  background: #f6f9f9;
  color: #5e7179;
  font: inherit;
  font-size: var(--font-size-caption);
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.trade-participants button:hover {
  transform: translateY(-1px);
}

.trade-participants button.is-active {
  border-color: #8bd8d5;
  background: #e8f7f6;
  color: #087f7c;
  box-shadow: inset 0 0 0 1px rgb(11 143 139 / 8%);
}

.trade-participants img {
  width: 25px;
  height: 25px;
  border: 1px solid transparent;
  border-radius: 50%;
  object-fit: cover;
}

.trade-participants button.is-active img {
  border-color: #74cfcc;
}

.trade-participants span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  overflow: hidden;
  border: 1px solid #dce5e8;
  border-radius: 14px;
  background: #f5f8f9;
}

.trade-summary > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 11px 4px;
  border-right: 1px solid #dce5e8;
}

.trade-summary > div:last-child {
  border-right: 0;
}

.trade-summary dt {
  color: #91a0a6;
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.trade-summary dd {
  margin: 0;
  color: #263a43;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
}

.positive {
  color: #f04f55 !important;
}

.negative {
  color: #3478d4 !important;
}

.trade-detail-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #f0f4f5;
}

.trade-detail-tabs button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #71848b;
  font: inherit;
  font-size: var(--font-size-caption);
  font-weight: 700;
  cursor: pointer;
}

.trade-detail-tabs button.is-active {
  background: #fff;
  color: #087f7c;
  box-shadow: 0 2px 8px rgb(38 63 72 / 10%);
}

.trade-detail-tabs b {
  display: inline-grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  padding: 0 4px;
  border-radius: 999px;
  background: #e2f5f4;
  color: #078f90;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.trade-panel-heading {
  align-items: center;
  padding-top: 2px;
}

.trade-panel-heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.trade-panel-heading > b {
  display: inline-grid;
  min-width: 32px;
  height: 25px;
  place-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: #e8f7f6;
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: 10px;
}

.trade-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trade-timeline::before {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 43px;
  width: 1px;
  background: #d6e2e4;
  content: '';
}

.trade-timeline__item {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 34px 8px minmax(0, 1fr) 14px;
  width: 100%;
  align-items: start;
  gap: 7px;
  padding: 11px 9px 11px 4px;
  border: 1px solid #e4eaec;
  border-radius: 13px;
  background: #fbfcfc;
  color: #263a43;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.trade-timeline__item:hover,
.trade-timeline__item.is-expanded {
  border-color: #b9dfdd;
  background: #f4faf9;
}

.trade-timeline__item:hover {
  transform: translateY(-1px);
}

.trade-timeline__item > time {
  padding-top: 3px;
  color: #819197;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  text-align: right;
}

.trade-timeline__item > i {
  width: 8px;
  height: 8px;
  margin-top: 3px;
  border: 2px solid #fbfcfc;
  border-radius: 50%;
  background: #e95b62;
  box-shadow: 0 0 0 1px #e95b62;
}

.trade-timeline__item.is-sell > i {
  background: #3478d4;
  box-shadow: 0 0 0 1px #3478d4;
}

.trade-timeline__item > svg {
  margin-top: 2px;
  color: #91a0a6;
  transition: transform 0.25s ease;
}

.trade-timeline__item.is-expanded > svg {
  transform: rotate(180deg);
}

.trade-timeline__body {
  min-width: 0;
}

.trade-timeline__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.trade-timeline__title strong {
  overflow: hidden;
  color: #181817;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-timeline__title span {
  flex: 0 0 auto;
  padding: 3px 5px;
  border-radius: 5px;
  background: #fee8e9;
  color: #df464e;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.is-sell .trade-timeline__title span {
  background: #e8f1fc;
  color: #3478d4;
}

.trade-timeline__title em {
  margin-left: auto;
  color: #53666e;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
}

.trade-timeline__numbers {
  margin: 4px 0 0;
  color: #91a0a6;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.trade-timeline__reason {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  color: #667980;
  font-size: var(--font-size-caption);
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.trade-timeline__item.is-expanded .trade-timeline__reason {
  margin-top: 8px;
  padding: 8px 9px;
  border-radius: 8px;
  background: #eaf6f5;
  -webkit-line-clamp: unset;
}

.trade-timeline__reason b {
  margin-right: 4px;
  color: #078f90;
  font-size: var(--font-size-caption);
}

.holding-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.holding-card {
  padding: 13px;
  border: 1px solid #dfe7ea;
  border-radius: 13px;
  background: #fbfcfc;
}

.holding-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.holding-card__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.holding-card__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.holding-card__top strong {
  color: #181817;
  font-size: var(--font-size-caption);
}

.holding-card__top span {
  color: #91a0a6;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.holding-card__top > strong {
  font-family: var(--font-mono);
}

.holding-card__bar {
  height: 5px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e3eaec;
}

.holding-card__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0ea5a6;
}

.holding-card dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 10px 0 0;
}

.holding-card dl > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  border-right: 1px solid #e2e9eb;
  text-align: center;
}

.holding-card dl > div:last-child {
  border-right: 0;
}

.holding-card dt {
  color: #91a0a6;
  font-size: var(--font-size-caption);
}

.holding-card dd {
  margin: 0;
  overflow: hidden;
  color: #3f535b;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-empty {
  margin: 8px 0;
  padding: 18px 10px;
  border-radius: 10px;
  background: #f5f8f9;
  color: #819197;
  font-size: var(--font-size-caption);
  text-align: center;
}

/* 거래 보기에서도 레이스 화면의 어두운 무대를 이어가되,
   데이터 의미 색상은 매수/상승(빨강), 매도/하락(파랑)으로 유지한다. */
.live-return-chart.live-return-chart--trades {
  border-color: rgb(132 182 190 / 18%);
  background: radial-gradient(circle at 78% 2%, rgb(20 184 179 / 10%), transparent 34%), #17313b;
  box-shadow: 0 18px 38px rgb(5 26 33 / 24%);
}

.live-return-chart--trades .live-return-chart__session strong {
  color: #f7fafb;
}

.live-return-chart--trades .live-return-chart__content-toggle {
  background: #102a34;
}

.live-return-chart--trades .live-return-chart__content-toggle button {
  color: #91a8b2;
}

.live-return-chart--trades .live-return-chart__content-toggle button.is-active {
  background: #14b8b3;
  color: #06272e;
  box-shadow: 0 4px 12px rgb(7 83 82 / 34%);
}

.live-return-chart--trades .live-return-chart__trades {
  color: #dce7ea;
}

.live-return-chart--trades .trade-overview {
  border-color: rgb(115 216 214 / 20%);
  background: rgb(20 184 179 / 9%);
}

.live-return-chart--trades .trade-overview > img {
  border-color: rgb(115 216 214 / 24%);
}

.live-return-chart--trades .trade-overview__copy small,
.live-return-chart--trades .trade-overview__return small,
.live-return-chart--trades .trade-overview__copy span {
  color: #91a8b2;
}

.live-return-chart--trades .trade-overview__copy strong,
.live-return-chart--trades .trade-section-heading strong,
.live-return-chart--trades .trade-panel-heading strong {
  color: #f4f8f9;
}

.live-return-chart--trades .trade-section-heading span,
.live-return-chart--trades .trade-panel-heading span {
  color: #829ca4;
}

.live-return-chart--trades .trade-participants button {
  border-color: rgb(145 168 178 / 16%);
  background: #1e3a44;
  color: #9fb5bc;
}

.live-return-chart--trades .trade-participants button:hover {
  border-color: rgb(115 216 214 / 30%);
  color: #dce9eb;
}

.live-return-chart--trades .trade-participants button.is-active {
  border-color: #2bc2bd;
  background: #0d6f6c;
  color: #ffffff;
  box-shadow: 0 5px 14px rgb(4 45 48 / 28%);
}

.live-return-chart--trades .trade-participants button.is-active img {
  border-color: #73d8d6;
}

.live-return-chart--trades .trade-summary {
  border-color: rgb(145 168 178 / 16%);
  background: #1e3a44;
}

.live-return-chart--trades .trade-summary > div {
  border-right-color: rgb(145 168 178 / 16%);
}

.live-return-chart--trades .trade-summary dt {
  color: #829ca4;
}

.live-return-chart--trades .trade-summary dd {
  color: #eef5f6;
}

.live-return-chart--trades .positive {
  color: #ff858a !important;
}

.live-return-chart--trades .negative {
  color: #79b6ff !important;
}

.live-return-chart--trades .trade-detail-tabs {
  background: #102a34;
}

.live-return-chart--trades .trade-detail-tabs button {
  color: #8ba3aa;
}

.live-return-chart--trades .trade-detail-tabs button.is-active {
  background: #294852;
  color: #73d8d6;
  box-shadow: 0 3px 10px rgb(4 23 29 / 24%);
}

.live-return-chart--trades .trade-detail-tabs button:focus-visible,
.live-return-chart--trades .trade-participants button:focus-visible {
  outline: 2px solid #73d8d6;
  outline-offset: 2px;
}

.live-return-chart--trades .trade-detail-tabs b,
.live-return-chart--trades .trade-panel-heading > b {
  background: rgb(20 184 179 / 14%);
  color: #73d8d6;
}

.live-return-chart--trades .trade-timeline::before {
  background: #3b5962;
}

.live-return-chart--trades .trade-timeline__item,
.live-return-chart--trades .holding-card {
  border-color: rgb(145 168 178 / 15%);
  background: #1d3943;
  color: #dce7ea;
}

.live-return-chart--trades .trade-timeline__item:hover,
.live-return-chart--trades .trade-timeline__item.is-expanded {
  border-color: rgb(115 216 214 / 30%);
  background: #21434c;
}

.live-return-chart--trades .trade-timeline__item:focus-visible {
  outline: 2px solid #73d8d6;
  outline-offset: 2px;
}

.live-return-chart--trades .trade-timeline__item > time,
.live-return-chart--trades .trade-timeline__item > svg,
.live-return-chart--trades .trade-timeline__numbers,
.live-return-chart--trades .holding-card__top span,
.live-return-chart--trades .holding-card dt {
  color: #829ca4;
}

.live-return-chart--trades .trade-timeline__item > i {
  border-color: #1d3943;
}

.live-return-chart--trades .trade-timeline__title strong,
.live-return-chart--trades .holding-card__top strong,
.live-return-chart--trades .holding-card dd {
  color: #eef5f6;
}

.live-return-chart--trades .trade-timeline__title em {
  color: #c6d6da;
}

.live-return-chart--trades .trade-timeline__title span {
  background: rgb(240 79 85 / 16%);
  color: #ff969b;
}

.live-return-chart--trades .is-sell .trade-timeline__title span {
  background: rgb(52 120 212 / 18%);
  color: #89bdff;
}

.live-return-chart--trades .trade-timeline__reason {
  color: #a5b8bd;
}

.live-return-chart--trades .trade-timeline__item.is-expanded .trade-timeline__reason {
  background: rgb(20 184 179 / 10%);
}

.live-return-chart--trades .trade-timeline__reason b {
  color: #73d8d6;
}

.live-return-chart--trades .holding-card__bar {
  background: #324f58;
}

.live-return-chart--trades .holding-card dl > div {
  border-right-color: rgb(145 168 178 / 16%);
}

.live-return-chart--trades .trade-empty {
  background: #1d3943;
  color: #829ca4;
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
  font-size: var(--font-size-caption);
  line-height: 1;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
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
  font-size: var(--font-size-caption);
}

.live-return-chart__legend em {
  color: #91a8b2;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-style: normal;
}

.live-return-chart__legend img {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
}

@media (prefers-reduced-motion: reduce) {
  .view-option-move {
    transition: none;
  }

  .live-return-chart__session > i,
  .live-return-chart__event-strip {
    animation: none;
  }
}

@keyframes live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(14 165 166 / 34%);
  }

  70%,
  100% {
    box-shadow: 0 0 0 8px rgb(14 165 166 / 0%);
  }
}

@keyframes trade-event-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
