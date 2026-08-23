# 시뮬레이션 결과 리포트 API

현재 프론트엔드가 사용하는 최소 응답 계약이다. 시뮬레이션 순위와 기간은
`GET /api/simulation/{simulationId}` 응답을 사용하며 리포트 API에서 중복 반환하지 않는다.

## 요청

```http
GET /api/simulation/{simulationId}/report
Authorization: Bearer {accessToken}
```

## 성공 응답

- Status: `200 OK`
- `data` 또는 `report` 래퍼 없이 아래 객체를 직접 반환한다.
- 필드명은 `camelCase`를 사용한다.
- 빈 컬렉션은 `[]`, 적용되지 않는 시나리오 객체는 `null`로 반환한다.
- 퍼센트 값 `7.25`는 `7.25%`를 의미한다.

```ts
type ReportBranch =
  | 'ACTUAL_DISCIPLINED'
  | 'ACTUAL_AHEAD_WITH_VIOLATIONS'
  | 'PERSONAL_BOT_AHEAD'
  | 'REFERENCE_AHEAD'
  | 'MARKET_LUCK'
  | 'UNKNOWN'

type VariantType = 'ACTUAL_USER' | 'PERSONAL_BOT' | 'FAMOUS_STRATEGY' | 'RANDOM_BOT'

interface SimulationReportResponse {
  outcome: {
    branch: ReportBranch
    winnerVariantType: VariantType
  }
  principleReviewSummary: {
    followedCount: number
    violatedCount: number
    assessedTradeCount: number
    totalTradeCount: number
  }
  principleEvaluations: Array<{
    evaluationId: string
    principleSetItemId: number
    principleText: string
    verdict: 'KEEP' | 'EARLY_SIGNAL' | 'STRENGTHEN' | 'REVISE' | 'CONFIRM_THRESHOLD' | 'REVIEW'
    evaluationReason: string
    statistics: {
      followedCount: number
      violatedCount: number
    }
    suggestion: { description: string } | null
  }>
  decisionReviews: Array<{
    tradeId: number
    tradedAt: string
    securityCode: string
    securityName: string
    principleJudgment: 'VIOLATED'
    matchedPrinciple: {
      principleSetItemId: number
      principleText: string
    }
    judgmentReason: string
  }>
  divergenceReview: {
    momentCount: number
    moments: Array<{
      betterSide: 'PERSONAL_BOT'
      violatedPrinciples: Array<{
        principleSetItemId: number
        principleText: string
        reason: string
      }>
    }>
  } | null
  referenceReview: {
    strategyName: string
    missingSectionCount: number
    missingSections: Array<{
      section: string
      sectionLabel: string
    }>
    references: Array<{
      referenceId: string
      title: string
      description: string
    }>
    disclaimer: string
  } | null
  performanceContext: {
    luckCheck: {
      runCount: number
      profitableRunPercent: number
      medianReturnPercent: number
      actualUserPercentile: number
      periodSummary: string
      disclaimer: string
    } | null
  }
}
```

## 시나리오별 규칙

| `outcome.branch`               | 필요한 상세 데이터                                               |
| ------------------------------ | ---------------------------------------------------------------- |
| `ACTUAL_DISCIPLINED`           | `principleEvaluations`에 잘 지킨 원칙을 반환                     |
| `ACTUAL_AHEAD_WITH_VIOLATIONS` | 개선 대상 `principleEvaluations`와 위반 `decisionReviews`를 반환 |
| `PERSONAL_BOT_AHEAD`           | `divergenceReview`를 반환                                        |
| `REFERENCE_AHEAD`              | `referenceReview`를 반환                                         |
| `MARKET_LUCK`                  | `performanceContext.luckCheck`를 반환                            |
| `UNKNOWN`                      | 시나리오 전용 객체를 모두 `null`로 반환                          |

`decisionReviews`는 전체 거래 목록이 아니라 원칙 위반 거래만 반환한다.
`divergenceReview.moments`는 원칙 봇이 더 나았고 위반 원칙이 확인된 순간만 반환한다.

## 반환하지 않는 데이터

`reportVersion`, `simulationRunId`, 기간, 순위, `keyTradeReviews`, `evidenceReviews`,
`securityEvidenceReviews`, `learningInsights`, 원칙 평가 집계, 진단 정보, 웹 검색 결과,
추천 원칙 원본, 벤치마크 및 종목별 기여도는 이 API에서 반환하지 않는다.

리포트는 완성된 화면 데이터로 한 번만 반환하며, 프론트엔드는 별도 enrichment 폴링을 하지 않는다.
