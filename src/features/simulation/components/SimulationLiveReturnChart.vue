<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import { GridComponent, MarkPointComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

import AppIcon from '@/shared/components/AppIcon.vue'
import { getSecurityDisplayName } from '@/features/simulation/utils/securityDisplayName'

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
        symbolSize: 22,
        label: {
          show: selectedViewId.value === 'all',
          position: 'right',
          distance: 6,
          offset: [0, (participantIndex - 1.5) * 2],
          color: '#DCE7EA',
          fontFamily: 'SUIT Variable, SUIT, sans-serif',
          fontSize: 8,
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
            decisionReason: trade.decisionReason,
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
    name: participant.variantName,
    variantType: participant.variantType,
  })),
)

function getTradeDirection(tradeSide) {
  return ['BUY', 'ADD'].includes(tradeSide) ? 'BUY' : 'SELL'
}

function getTradeSideLabel(tradeSide) {
  return {
    BUY: '매수',
    SELL: '매도',
    ADD: '추가 매수',
    REDUCE: '비중 축소',
  }[tradeSide] ?? tradeSide
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

const selectedPositionSnapshotDate = computed(() =>
  performanceByVariant.value
    .get(Number(selectedTradeParticipantId.value))
    ?.filter(
      (snapshot) =>
        new Date(
          `${snapshot.snapshotDate || snapshot.performanceDate}T23:59:59`,
        ).getTime() <= currentSimulationTimestamp.value,
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
      const returnPercent = averagePrice
        ? ((currentPrice - averagePrice) / averagePrice) * 100
        : 0

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
            color: '#3A535C',
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
          <small v-if="selectedContentView === 'trades'">LIVE TRANSACTIONS</small>
          <strong>
            {{ selectedContentView === 'chart' ? currentSimulationDate : '매수·매도 흐름' }}
          </strong>
          <span v-if="selectedContentView === 'chart'">
            DAY {{ currentSimulationDay }} / {{ totalDays }}
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
      <div class="live-return-chart__progress" aria-label="시뮬레이션 진행률">
        <span>진행률</span>
        <div><i :style="{ width: `${progress}%` }"></i></div>
        <strong>{{ Math.round(progress) }}%</strong>
      </div>

      <div ref="chartElement" class="live-return-chart__plot"></div>

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

      <dl class="trade-summary" aria-label="선택 참가자 거래 요약">
        <div>
          <dt>현재 수익률</dt>
          <dd
            :class="{
              positive: transactionSummary.returnPercent > 0,
              negative: transactionSummary.returnPercent < 0,
            }"
          >
            {{ formatSignedPercent(transactionSummary.returnPercent) }}
          </dd>
        </div>
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
              <strong>{{ getSecurityDisplayName(trade) }}</strong>
              <span>{{ getTradeSideLabel(trade.tradeSide) }}</span>
              <em>{{ formatCurrency(trade.unitPrice * trade.quantity) }}</em>
            </div>
            <p class="trade-timeline__numbers">
              {{ trade.quantity }}주 · 주당 {{ formatCurrency(trade.unitPrice) }}
            </p>
            <p class="trade-timeline__reason">
              <b>판단 근거</b>
              {{ trade.decisionReason }}
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
            <div>
              <strong>{{ holding.displayName }}</strong>
              <span>{{ holding.quantity }}주</span>
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
  gap: 12px;
  padding: 16px;
  border: 1px solid #314c55;
  border-radius: var(--radius-2xl);
  background: #263f48;
  box-shadow: 0 14px 30px rgb(25 48 56 / 14%);
}

.live-return-chart--trades {
  border-color: #dce5e8;
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
  color: #078f90;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
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
  gap: 5px;
  padding: 4px;
  border: 1px solid #45616b;
  border-radius: 12px;
  background: #314b55;
}

.live-return-chart__graph-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.live-return-chart__view-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  min-height: 48px;
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
  gap: 12px;
  color: #263a43;
}

.trade-participants {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.trade-participants button {
  display: flex;
  min-width: 0;
  min-height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 3px;
  border: 1px solid #dfe7ea;
  border-radius: 11px;
  background: #f7f9fa;
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
  border-color: #263f48;
  background: #263f48;
  color: #fff;
}

.trade-participants img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.trade-participants span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  overflow: hidden;
  border: 1px solid #dce5e8;
  border-radius: 11px;
  background: #f7fafb;
}

.trade-summary > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 3px;
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
  font-size: var(--font-size-caption);
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
  padding: 3px;
  border-radius: 10px;
  background: #f0f4f5;
}

.trade-detail-tabs button {
  display: inline-flex;
  min-height: 32px;
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
  color: #263a43;
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

.trade-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trade-timeline::before {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 43px;
  width: 1px;
  background: #cbd9dd;
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
  padding: 10px 8px 10px 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #263a43;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.trade-timeline__item:hover,
.trade-timeline__item.is-expanded {
  background: #f3f8f8;
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
  border: 2px solid #fff;
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
  font-size: var(--font-size-caption);
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
  padding: 12px;
  border: 1px solid #dfe7ea;
  border-radius: 11px;
  background: #f9fbfb;
}

.holding-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.holding-card__top > div {
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
}
</style>
