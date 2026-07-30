export async function getLatestTendencyAnalysis() {
  return {
    analysisRunId: 1,
    summary: {
      combinationSummary: '원칙과 실적 데이터를 신중히 검토하는 안정성장형 투자자입니다.',
      strengthSummary: '철저한 손절매 기준과 분할 매수 원칙 준수율이 높습니다.',
      cautionSummary: '시장 급변동 시 과도한 신중함으로 진입 시점을 놓칠 위험이 있습니다.',
    },
    analysisResults: [
      {
        dimension: {
          code: 'MARKET_PREFERENCE',
          name: '시장 선호 성향',
          description: 'KOSPI 대형주 및 실적 호조 업종을 우선 고려함',
        },
        type: {
          code: 'STABLE_GROWTH',
          name: '안정 성장형',
          description: '단기 모멘텀보다는 영업이익 가이던스 확인 후 진입',
          rationale: {
            summary: '최근 6개월 매매 기록 24건 분석 결과',
            items: [
              {
                type: 'WIN_RATE',
                label: '원칙 준수율',
                value: '88',
                unit: '%',
                description: '사전 설정한 손절가 이탈 시 90% 이상 실행',
              },
            ],
          },
        },
      },
    ],
  }
}

export async function getUserPrinciples() {
  return {
    principleSetId: 1,
    versionNo: 2,
    setStatus: 'ACTIVE',
    principles: [
      {
        principleSetItemId: 1,
        principleText: '한 종목의 투자 비중은 30%를 넘지 않는다.',
        origin: {
          type: 'AI_RECOMMENDATION',
          analysisTypeName: '분산투자형',
        },
        sortOrder: 1,
      },
      {
        principleSetItemId: 2,
        principleText: '매수 전 명확한 근거와 손절 목표가를 작성한다.',
        origin: {
          type: 'DIRECT',
          analysisTypeName: null,
        },
        sortOrder: 2,
      },
    ],
  }
}

export async function saveUserPrinciples(payload) {
  return {
    principleSetId: 1,
    versionNo: (payload.versionNo || 1) + 1,
    setStatus: 'ACTIVE',
    principles: payload.principles || [],
  }
}

export async function getRecommendedPrinciples() {
  return {
    recommendations: [
      {
        recommendationId: 101,
        recommendationText: '분할 매수는 최소 3회에 걸쳐 진입한다.',
        recommendationReason: '변동성 장세에서 평단가 방어 효과',
        analysisType: {
          code: 'RISK_MANAGEMENT',
          name: '위험 관리형',
        },
        recommendationStatus: 'RECOMMENDED',
      },
    ],
  }
}
