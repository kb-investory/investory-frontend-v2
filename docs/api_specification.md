# 🚀 Investory Backend API 명세서 (v1.0)

> **Base URL**: `http://localhost:8000/api/v1`  
> **OpenAPI Swagger Docs**: `http://localhost:8000/docs`  
> **CORS**: All Origins (`*`) Allowed

---

## 📌 API 요약

| 순번 | Category   | Method | Endpoint URI                                   | 주요 기능                                                     |
| :--- | :--------- | :----- | :--------------------------------------------- | :------------------------------------------------------------ |
| 1    | Simulation | `GET`  | `/api/v1/simulations/overview`                 | 시뮬레이션 진입 조건 및 추천 자본금 조회                      |
| 2    | Simulation | `GET`  | `/api/v1/simulations/initial-capital`          | 계좌 잔고 기반 초기 자본금 산출                               |
| 3    | Simulation | `POST` | `/api/v1/simulation-bots/compile`              | 원칙 문장 & 6축 성향 기반 AI 원칙 봇 생성                     |
| 4    | Simulation | `GET`  | `/api/v1/simulation-bots/compile-jobs/{jobId}` | 원칙 봇 생성 상태 비동기 폴링                                 |
| 5    | Simulation | `GET`  | `/api/v1/simulation-bots/comparators`          | 4개 대조군 봇 목록 및 메타 정보 조회                          |
| 6    | Simulation | `POST` | `/api/v1/simulations/run`                      | 4개 봇 백테스트 실행 연산 (수익률·변동성·MDD 포함)            |
| 7    | Simulation | `GET`  | `/api/v1/simulations/{simulationId}/status`    | 시뮬레이션 연산 비동기 진행률 폴링                            |
| 8    | Simulation | `GET`  | `/api/v1/simulations/latest`                   | 가장 최근 실행된 시뮬레이션 성과 대시보드 조회                |
| 9    | Simulation | `GET`  | `/api/v1/simulations/{simulationId}`           | 특정 시뮬레이션 세션 상세 결과 및 체결일지 조회               |
| 10   | Simulation | `GET`  | `/api/v1/simulations/{simulationId}/report`    | **[신규]** AI 감정 복기, 근거 검증, 학습 인사이트 리포트 조회 |
| 11   | Principles | `GET`  | `/api/v1/principles/recommendations`           | **[신규]** 성향 및 결과 복기 기반 추천 원칙 목록 조회         |
| 12   | Principles | `POST` | `/api/v1/principles`                           | **[신규]** 선택된 추천 원칙을 사용자의 원칙으로 저장/적용     |
| 13   | Simulation | `GET`  | `/api/v1/simulations/history`                 | **[신규]** 시뮬레이션 과거 실행 기록 목록 조회                 |

---

## 1. 시뮬레이션 API

### 1-1. 시뮬레이션 개요 조회

- **`GET /api/v1/simulations/overview`**
- **Query Params**: `start_date` (String, default: `"2026-03-01"`), `account_id` (Integer, default: `1`)
- **Response (200 OK)**:

```json
{
  "isReady": true,
  "eligiblePeriod": {
    "startDate": "2026-03-01",
    "endDate": "2026-07-29",
    "totalDays": 150
  },
  "recommendedInitialCapital": 5000000.0,
  "initialCapitalBreakdown": {
    "totalInitialCapital": 5000000.0
  },
  "connectedAccountsCount": 1,
  "recentSimulationCount": 3
}
```

---

### 1-2. 원칙 봇 컴파일 생성 요청

- **`POST /api/v1/simulation-bots/compile`** (하위호환: `/api/v1/rules/compile`)
- **Request Body**:

```json
{
  "principles": [
    "익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절",
    "단일 종목 보유 수 최대 5개"
  ],
  "profile": {
    "value": 0.15,
    "growth": 0.4,
    "quality": 0.2,
    "trend": 0.15,
    "disclosure": 0.1
  }
}
```

- **Response (200 OK)**:

```json
{
  "jobId": "JOB_794FF6CC",
  "status": "COMPLETED",
  "botVersion": "v1.0",
  "ruleSchema": {
    "universe": { "allowed_markets": ["KOSPI", "KOSDAQ"] },
    "selection": { "min_passing_score": 70.0 },
    "exit": { "take_profit_rate": 0.2, "stop_loss_rate": -0.1 }
  }
}
```

---

### 1-3. 원칙 봇 생성 상태 폴링

- **`GET /api/v1/simulation-bots/compile-jobs/{jobId}`**
- **Response (200 OK)**:

```json
{
  "jobId": "JOB_794FF6CC",
  "status": "COMPLETED",
  "progressPercent": 100,
  "message": "AI 원칙 봇 전략 생성이 완료되었습니다."
}
```

---

### 1-4. 대조군 봇 목록 조회

- **`GET /api/v1/simulation-bots/comparators`**
- **Response (200 OK)**:

```json
[
  {
    "variantId": 1,
    "variantType": "ACTUAL_USER",
    "variantName": "실제 나",
    "description": "사용자의 과거 실제 계좌 매수/매도 거래 내역 재현 봇"
  },
  {
    "variantId": 2,
    "variantType": "PERSONAL_BOT",
    "variantName": "나의 투자봇 v1",
    "description": "사용자의 확정 원칙과 6축 성향 기반 AI 투자봇"
  },
  {
    "variantId": 3,
    "variantType": "FAMOUS_STRATEGY",
    "variantName": "우량 가치·품질 퀀트 봇",
    "description": "저PER/고ROE 우량주 가치 퀀트 고정 전략 봇"
  },
  {
    "variantId": 4,
    "variantType": "RANDOM_BOT",
    "variantName": "원숭이 봇",
    "description": "500회 몬테카를로 무작위 종목 및 매매 시도 대조군 봇"
  }
]
```

---

### 1-5. 시뮬레이션 백테스트 실행

- **`POST /api/v1/simulations/run`**
- **Request Body**:

```json
{
  "simulationRunId": 101,
  "periodStart": "2026-03-01",
  "periodEnd": "2026-07-29",
  "initialCapital": 5000000.0,
  "principles": ["익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절"]
}
```

- **Response (200 OK)**:

```json
{
  "simulationRunId": 101,
  "periodStart": "2026-03-01",
  "periodEnd": "2026-07-29",
  "initialCapital": 5000000.0,
  "participantSummary": [
    {
      "variantId": 1,
      "variantName": "실제 나",
      "variantType": "ACTUAL_USER",
      "totalEquity": 5250000.0,
      "cumulativeReturnPercent": 5.0,
      "volatilityPercent": 12.8,
      "mddPercent": -3.2
    },
    {
      "variantId": 2,
      "variantName": "나의 투자봇 v1",
      "variantType": "PERSONAL_BOT",
      "totalEquity": 5850000.0,
      "cumulativeReturnPercent": 17.0,
      "volatilityPercent": 8.4,
      "mddPercent": -1.8
    }
  ],
  "totalTradesCount": 2,
  "simulatedTrades": [
    {
      "simulatedTradeId": 5001,
      "simulationVariantId": 2,
      "securityId": 101,
      "tradeSide": "BUY",
      "tradedAt": "2026-03-05T09:00:00Z",
      "quantity": 10.0,
      "unitPrice": 70000.0,
      "transactionCostAmount": 105.0,
      "decisionReason": "[AI 팩터 통과] 팩터 점수 78.5점 초과"
    }
  ],
  "dailySnapshots": [
    {
      "simulationVariantId": 1,
      "performanceDate": "2026-03-01",
      "cashBalance": 5000000.0,
      "holdingsMarketValue": 0.0,
      "portfolioValue": 5000000.0,
      "dailyReturn": 0.0,
      "cumulativeReturn": 0.0,
      "drawdownRate": 0.0
    }
  ]
}
```

---

### 1-6. 최근 시뮬레이션 / 특정 시뮬레이션 상세 조회

- **`GET /api/v1/simulations/latest`**
- **`GET /api/v1/simulations/{simulationId}`**
- **Response (200 OK)**:

```json
{
  "simulationRun": {
    "simulationRunId": 101,
    "userId": 1,
    "periodStart": "2026-03-01",
    "periodEnd": "2026-07-29",
    "initialCapital": 5000000.0,
    "runStatus": "COMPLETED"
  },
  "participantSummary": [
    {
      "variantId": 1001,
      "variantType": "ACTUAL_USER",
      "variantName": "실제 나",
      "totalEquity": 5250000.0,
      "cumulativeReturnPercent": 5.0,
      "volatilityPercent": 12.8,
      "mddPercent": -3.2
    },
    {
      "variantId": 1002,
      "variantType": "PERSONAL_BOT",
      "variantName": "나의 투자봇 v3",
      "totalEquity": 5850000.0,
      "cumulativeReturnPercent": 17.0,
      "volatilityPercent": 8.4,
      "mddPercent": -1.8
    }
  ],
  "simulationVariants": [
    { "simulationVariantId": 1001, "variantType": "ACTUAL_USER", "variantName": "실제 나" },
    { "simulationVariantId": 1002, "variantType": "PERSONAL_BOT", "variantName": "나의 투자봇 v3" }
  ],
  "simulatedTrades": [],
  "dailyPerformance": []
}
```

---

### 1-7. AI 시뮬레이션 복기 결과 리포트 조회

- **`GET /api/v1/simulations/{simulationId}/report`**
- **Response (200 OK)**:

```json
{
  "decisionReviews": [
    {
      "tradeId": 101,
      "tradedAt": "2026-04-18T09:00:00",
      "securityName": "SK하이닉스",
      "action": "SELL",
      "actionSummary": "30% 매도",
      "emotionTag": "FEAR_SELL",
      "emotionLabel": "공포 매도",
      "subsequentReturnPercent": 11.4,
      "principleBotAction": "HOLD",
      "principleFeedback": "실적 전망이 유지됐으므로 단기 시장 등락에 동요하지 않고 보유했어야 합니다."
    }
  ],
  "evidenceReviews": [
    {
      "tradeId": 101,
      "action": "SK하이닉스 분할 매도",
      "basis": "시장 하락 우려 및 매도 욕구",
      "basisType": "EMOTION",
      "result": "기회비용 -11.4%",
      "confidenceScore": 46,
      "confidenceLabel": "근거 부족"
    }
  ],
  "learningInsights": {
    "primaryMistakePattern": "상승 뒤에는 쫓아 사고, 하락 때는 너무 빨리 매도합니다.",
    "emotionalTradeCount": 5,
    "underperformedTradeCount": 4,
    "actualReturnPercent": 5.0,
    "principleReturnPercent": 17.0,
    "returnImprovementPercentPoint": 12.0
  },
  "recommendedPrinciples": [
    {
      "recommendationId": 1,
      "principleType": "LONG_TERM",
      "title": "장기 투자 유지",
      "description": "투자 가설이 유효하면 단기 등락에 반응하지 않고 90일 이상 최소 보유 기간을 준수하기",
      "ruleJson": { "holding": { "minimumDays": 90 } }
    }
  ],
  "improvementActions": [
    {
      "category": "EMOTIONAL_TRADING",
      "title": "감정적 매매 줄이기",
      "action": "주가 급락 시 감정적 매도 버튼 누름 대신 24시간 냉각기 도입하기"
    }
  ]
}
```

---

## 2. 투자 원칙 관리 API

### 2-1. 추천 원칙 목록 조회

- **`GET /api/v1/principles/recommendations`**
- **Response (200 OK)**:

```json
{
  "recommendations": [
    {
      "principleSetItemId": 1001,
      "principleRecommendationId": 51,
      "principleText": "단일 종목 보유 비중은 총 자율 자산의 25%를 넘기지 않는다.",
      "sortOrder": 1,
      "ruleJson": {
        "ruleType": "MAX_POSITION_WEIGHT",
        "parameters": { "maxWeight": 0.25 }
      }
    },
    {
      "principleSetItemId": 1002,
      "principleRecommendationId": 52,
      "principleText": "매수가 대비 -10% 하락 시 기계적으로 손절하고, +20% 시 이익을 실현한다.",
      "sortOrder": 2,
      "ruleJson": {
        "ruleType": "STOP_LOSS_AND_TAKE_PROFIT",
        "parameters": { "stopLossPercent": -10.0, "takeProfitPercent": 20.0 }
      }
    }
  ]
}
```

---

### 2-2. 추천 원칙 적용 / 사용자 원칙 저장

- **`POST /api/v1/principles`**
- **Request Body**:

```json
{
  "principles": [
    {
      "recommendationId": 1,
      "principleText": "투자 가설이 유효하면 장기 보유한다.",
      "ruleJson": {
        "holding": { "minimumDays": 90 }
      },
      "sortOrder": 1
    }
  ]
}
```

- **Response (200 OK)**:

```json
{
  "status": "SUCCESS",
  "message": "총 1개의 투자 원칙이 성공적으로 적용되었습니다.",
  "principles": [
    {
      "principleSetItemId": 201,
      "recommendationId": 1,
      "principleText": "투자 가설이 유효하면 장기 보유한다.",
      "ruleJson": {
        "holding": { "minimumDays": 90 }
      },
      "sortOrder": 1,
      "isConfirmed": true
    }
  ]
}
```
