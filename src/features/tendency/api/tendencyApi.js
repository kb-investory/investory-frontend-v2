import { ApiError, request } from '@/shared/api/client'

const MINIMUM_RECORD_DAYS = 90

const DIMENSION_META = Object.freeze({
  PORTFOLIO_RISK_ALLOCATION: {
    code: 'PORTFOLIO_RISK_ALLOCATION',
    description: '보유 종목의 집중도와 가격 변동성을 분석해요.',
    group: 'SELECTION',
    tone: 'amber',
  },
  BUY_DECISION_BASIS: {
    code: 'BUY_JUDGMENT_BASIS',
    description: '투자일지에 기록한 매수 판단 근거를 분석해요.',
    group: 'SELECTION',
    tone: 'blue',
  },
  HOLDING_PERIOD: {
    code: 'INVESTMENT_HORIZON',
    description: '거래별 실제 보유 기간과 매매 주기를 분석해요.',
    group: 'SELECTION',
    tone: 'green',
  },
  LOSS_RESPONSE: {
    code: 'LOSS_RESPONSE',
    description: '손실 구간에서 나타난 매매 행동을 분석해요.',
    group: 'BEHAVIOR',
    tone: 'red',
  },
  PROFIT_RESPONSE: {
    code: 'PROFIT_RESPONSE',
    description: '수익 구간에서 나타난 매매 행동을 분석해요.',
    group: 'BEHAVIOR',
    tone: 'emerald',
  },
  PRINCIPLE_ADHERENCE: {
    code: 'PRINCIPLE_FULFILLMENT',
    description: '작성한 투자 원칙과 실제 매매 행동의 일치도를 분석해요.',
    group: 'BEHAVIOR',
    tone: 'indigo',
  },
})

const TYPE_CODE_MAP = Object.freeze({
  FUNDAMENTAL_ANALYSIS: 'COMPANY_ANALYSIS',
  PRICE_TREND: 'PRICE_FLOW',
  COMPLEX: 'COMPOSITE_JUDGMENT',
  AVERAGING_DOWN: 'ADDITIONAL_PURCHASE',
  AVERAGING_UP: 'ADDITIONAL_PURCHASE',
  TAKE_PROFIT: 'PROFIT_REALIZATION',
  MIXED: 'MIXED_RESPONSE',
  SHORT_TERM: 'SHORT_TERM_ROTATION',
  MEDIUM_TERM: 'MID_TERM_HOLDING',
  LONG_TERM: 'LONG_TERM_INVESTMENT',
  PRINCIPLE_ALIGNED: 'PRINCIPLE_MATCHED',
  INDETERMINATE: 'DIFFICULT_TO_ASSESS',
})

const TYPE_PREFIX_BY_DIMENSION = Object.freeze({
  PORTFOLIO_RISK_ALLOCATION: 'RISK_',
  BUY_DECISION_BASIS: 'BUY_',
  LOSS_RESPONSE: 'LOSS_',
  PROFIT_RESPONSE: 'PROFIT_',
  HOLDING_PERIOD: 'PERIOD_',
  PRINCIPLE_ADHERENCE: 'PRINCIPLE_',
})

function parseEvidence(evidenceJson) {
  if (!evidenceJson) return {}
  if (typeof evidenceJson === 'object') return evidenceJson

  try {
    return JSON.parse(evidenceJson)
  } catch {
    return {}
  }
}

function formatEvidenceValue(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value ?? '-')
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

function evidenceItem(label, value, unit, description) {
  return {
    type: unit === '%' ? 'PERCENT' : 'COUNT',
    label,
    value: formatEvidenceValue(value),
    unit,
    description,
  }
}

function mapEvidenceItems(dimensionCode, evidence) {
  switch (dimensionCode) {
    case 'PORTFOLIO_RISK_ALLOCATION':
      return [
        evidenceItem(
          '최대 종목 비중',
          evidence.maxSecurityWeight,
          '%',
          '가장 큰 보유 종목의 평가 비중이에요.',
        ),
        evidenceItem(
          '가중 변동성',
          evidence.weightedVolatility,
          '%',
          '보유 비중을 반영한 일간 가격 변동성이에요.',
        ),
      ]
    case 'BUY_DECISION_BASIS':
      return [
        evidenceItem(
          '기업 분석 근거',
          evidence.fundamental,
          '%',
          '재무·사업 분석을 근거로 남긴 비율이에요.',
        ),
        evidenceItem(
          '가격 흐름 근거',
          evidence.priceTrend,
          '%',
          '차트와 가격 흐름을 근거로 남긴 비율이에요.',
        ),
        evidenceItem('이벤트 근거', evidence.event, '%', '뉴스와 공시를 근거로 남긴 비율이에요.'),
      ]
    case 'LOSS_RESPONSE':
    case 'PROFIT_RESPONSE':
      return [
        evidenceItem(
          '분석 일수',
          evidence.totalDays,
          '일',
          '최근 분석 기간 중 해당 손익 구간이었던 일수예요.',
        ),
        evidenceItem(
          '순매도 일수',
          evidence.netSellDays,
          '일',
          '해당 손익 구간에서 순매도한 일수예요.',
        ),
        evidenceItem(
          '순매수 일수',
          evidence.netBuyDays,
          '일',
          '해당 손익 구간에서 순매수한 일수예요.',
        ),
        evidenceItem('보유 일수', evidence.holdDays, '일', '추가 거래 없이 보유한 일수예요.'),
      ]
    case 'HOLDING_PERIOD':
      return [
        evidenceItem(
          '전체 매칭 거래',
          evidence.totalCount,
          '건',
          '보유 기간을 계산할 수 있는 거래 수예요.',
        ),
        evidenceItem(
          '단기 보유 비율',
          Number(evidence.shortTerm?.ratio ?? 0) * 100,
          '%',
          '5일 이하 보유한 거래 비율이에요.',
        ),
        evidenceItem(
          '중기 보유 비율',
          Number(evidence.mediumTerm?.ratio ?? 0) * 100,
          '%',
          '6일에서 30일 동안 보유한 거래 비율이에요.',
        ),
        evidenceItem(
          '장기 보유 비율',
          Number(evidence.longTerm?.ratio ?? 0) * 100,
          '%',
          '30일을 초과해 보유한 거래 비율이에요.',
        ),
      ]
    case 'PRINCIPLE_ADHERENCE':
      return [
        evidenceItem(
          '원칙 준수율',
          evidence.complianceRate ?? 0,
          '%',
          '검증 가능한 원칙을 실제로 지킨 비율이에요.',
        ),
        evidenceItem(
          '검증 기회',
          evidence.totalOpportunities,
          '회',
          '원칙 준수 여부를 판단할 수 있었던 횟수예요.',
        ),
        evidenceItem(
          '준수 점수',
          evidence.totalCompliance,
          '점',
          '원칙별 준수 결과를 합산한 점수예요.',
        ),
      ]
    default:
      return Object.entries(evidence)
        .filter(([, value]) => ['string', 'number'].includes(typeof value))
        .slice(0, 4)
        .map(([key, value]) => evidenceItem(key, value, '', '백엔드 분석 결과에 포함된 근거예요.'))
  }
}

function normalizeTypeCode(dimensionCode, typeCode) {
  const prefix = TYPE_PREFIX_BY_DIMENSION[dimensionCode]
  const unprefixed =
    prefix && typeCode?.startsWith(prefix) ? typeCode.slice(prefix.length) : typeCode
  const mapped = TYPE_CODE_MAP[unprefixed] ?? unprefixed

  if (dimensionCode === 'HOLDING_PERIOD' && mapped === 'MIXED_RESPONSE') return 'MIXED_HORIZON'
  return mapped
}

function normalizeAnalysisItem(item) {
  const meta = DIMENSION_META[item.dimensionCode] ?? {
    code: item.dimensionCode,
    description: `${item.dimensionName} 관련 투자 행동을 분석해요.`,
    group: 'BEHAVIOR',
    tone: 'violet',
  }
  const evidence = parseEvidence(item.evidenceJson)

  return {
    dimension: {
      code: meta.code,
      name: item.dimensionName,
      description: meta.description,
      group: meta.group,
      tone: meta.tone,
    },
    type: {
      code: normalizeTypeCode(item.dimensionCode, item.typeCode),
      name: item.typeName,
      description: item.typeDescription,
      rationale: {
        summary: item.typeDescription,
        items: mapEvidenceItems(item.dimensionCode, evidence).filter(
          (evidenceValue) => evidenceValue.value !== 'undefined',
        ),
      },
    },
  }
}

function differenceInDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1)
}

function normalizeAnalysisDetail(detail) {
  const run = detail.run
  const analysisResults = (detail.items || []).map(normalizeAnalysisItem)
  const selectionNames = analysisResults
    .filter((result) => result.dimension.group === 'SELECTION')
    .map((result) => result.type.name)
  const behaviorNames = analysisResults
    .filter((result) => result.dimension.group === 'BEHAVIOR')
    .map((result) => result.type.name)

  return {
    analysisRunId: run.analysisRunId,
    analyzedDate: run.periodEnd,
    period: {
      startDate: run.periodStart,
      endDate: run.periodEnd,
      days: differenceInDays(run.periodStart, run.periodEnd),
    },
    summary: {
      combinationSummary: '연결된 거래와 투자일지 기록을 바탕으로 분석했어요.',
      strengthSummary: `${analysisResults.length}가지 투자 성향을 확인했어요.`,
      cautionSummary: '분석 결과를 투자 원칙과 다음 매매 계획에 활용해 보세요.',
    },
    groupSummaries: {
      selection: selectionNames.length
        ? `${selectionNames.join(' · ')} 성향이 선택 과정에 나타났어요.`
        : '선택 성향을 판단할 기록이 더 필요해요.',
      behavior: behaviorNames.length
        ? `${behaviorNames.join(' · ')} 성향이 매매 행동에 나타났어요.`
        : '행동 성향을 판단할 기록이 더 필요해요.',
    },
    analysisResults,
    tradeCount: run.tradeCount,
    journalCount: run.journalCount,
    analysisVersion: run.analysisVersion,
    createdAt: run.createdAt,
  }
}

function buildChanges(current, previous) {
  if (!previous) return []
  const previousByDimension = new Map(
    previous.analysisResults.map((result) => [result.dimension.code, result]),
  )

  return current.analysisResults.flatMap((result) => {
    const previousResult = previousByDimension.get(result.dimension.code)
    if (!previousResult || previousResult.type.code === result.type.code) return []

    return {
      dimension: result.dimension.name,
      previousType: previousResult.type.name,
      currentType: result.type.name,
      reason: `${result.dimension.name} 분석 결과가 ${previousResult.type.name}에서 ${result.type.name}(으)로 변경됐어요.`,
    }
  })
}

function attachHistory(analyses) {
  const history = analyses.map((analysis, index) => {
    const changes = buildChanges(analysis, analyses[index + 1])
    const isFirst = index === analyses.length - 1
    return {
      analysisRunId: analysis.analysisRunId,
      analyzedDate: analysis.analyzedDate,
      label: isFirst ? '첫 분석' : index === 0 ? '최신 분석' : '정기 분석',
      description: `${analysis.analysisResults.length}가지 성향 결과${changes.length ? ` · ${changes.length}개 변화` : ''}`,
      changedCount: changes.length,
      changes,
      period: analysis.period,
      analysisResults: analysis.analysisResults,
    }
  })

  return analyses.length ? { ...analyses[0], history } : null
}

async function getAllAnalyses() {
  const listResponse = await request('/tendency/analyses')
  const runs = listResponse?.runs || []
  if (!runs.length) return []

  const details = await Promise.all(
    runs.map((run) => request(`/tendency/analyses/${run.analysisRunId}`)),
  )
  return details.map(normalizeAnalysisDetail)
}

function normalizePrinciple(principle) {
  const isDirect = principle.origin?.type === 'DIRECT'
  return {
    principleId: principle.principleSetItemId,
    content: principle.principleText,
    originalContent: principle.principleText,
    category: 'GENERAL',
    isActive: true,
    isUserModified: isDirect,
    sortOrder: principle.sortOrder,
    recommendationSource: isDirect
      ? { type: 'USER_CREATED', label: '나의 투자원칙' }
      : {
          type: 'TENDENCY_ANALYSIS',
          label: '투자성향 기반 추천',
          tendency: principle.origin?.analysisTypeName
            ? { name: principle.origin.analysisTypeName }
            : null,
        },
  }
}

function toPrincipleRequest(principle, index) {
  const rawRecommendationId = principle.recommendationId
  const recommendationId =
    rawRecommendationId == null || rawRecommendationId === '' ? null : Number(rawRecommendationId)
  return {
    recommendationId:
      recommendationId != null && Number.isFinite(recommendationId) ? recommendationId : null,
    principleText: principle.content?.trim() || '',
    ruleJson: principle.ruleJson ?? null,
    sortOrder: index + 1,
  }
}

export async function getLatestTendencyAnalysis() {
  return attachHistory(await getAllAnalyses())
}

export async function runTendencyAnalysis() {
  await request('/tendency/analyses', { method: 'POST' })
  return getLatestTendencyAnalysis()
}

export async function getUserPrinciples() {
  try {
    const response = await request('/api/principle')
    return {
      principleSetId: response.principleSetId,
      versionNo: response.versionNo,
      setStatus: response.setStatus,
      principles: (response.principles || [])
        .map(normalizePrinciple)
        .sort((first, second) => first.sortOrder - second.sortOrder),
    }
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.errorCode === 'PRN_002')) {
      return { principles: [] }
    }
    throw error
  }
}

export async function getTendencyAccessStatus() {
  const listResponse = await request('/tendency/analyses')
  const latestRun = listResponse?.runs?.[0]
  if (!latestRun) {
    return {
      serviceStartedDate: null,
      analysisAvailableDate: null,
      minimumRecordDays: MINIMUM_RECORD_DAYS,
    }
  }

  const nextAvailableDate = new Date(`${latestRun.periodEnd}T00:00:00Z`)
  nextAvailableDate.setUTCDate(nextAvailableDate.getUTCDate() + MINIMUM_RECORD_DAYS)
  return {
    serviceStartedDate: latestRun.periodStart,
    analysisAvailableDate: nextAvailableDate.toISOString().slice(0, 10),
    minimumRecordDays: MINIMUM_RECORD_DAYS,
  }
}

export async function getRecommendedPrinciples() {
  return await request('/api/principle/recommendations')
}

export async function saveUserPrinciples({ analysisRunId, principles }) {
  await request('/api/principle', {
    method: 'POST',
    body: JSON.stringify({
      analysisRunId: analysisRunId ?? null,
      principles: (principles || []).map(toPrincipleRequest),
    }),
  })
  return getUserPrinciples()
}

export const getTendencyAnalysis = getLatestTendencyAnalysis
export const getPrinciples = getUserPrinciples
export const getSuggestedPrinciples = getRecommendedPrinciples
export const savePrinciples = saveUserPrinciples
