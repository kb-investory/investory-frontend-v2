# **🤖** Investory 시뮬레이션 REST API 상세 명세서

---

## 📌 API 목록 요약

| 순번 | API 명칭                      | Method | Endpoint URI                                  | 대응 화면 ID               | 기능 요약                                                       |
| ---- | ----------------------------- | ------ | --------------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| 1    | **시뮬레이션 개요 조회**      | `GET`  | `/api/v1/simulations/overview`                | `xCJcT`, `WYSMi`           | 시뮬레이션 적격 기간, 시작 자본금, 준비 상태 조회               |
| 2    | **최신 원칙 봇 생성 요청**    | `POST` | `/api/v1/simulation-bots/compile`             | `Inbqv`                    | 자연어 원칙 ➔ 8대 영역 표준 Rule JSON 봇 파싱 생성              |
| 3    | **원칙 봇 생성 상태 조회**    | `GET`  | `/api/v1/simulation-bots/compile-jobs/:jobId` | `Inbqv`, `AZCR3`           | 비동기 봇 생성 작업의 진행 상태 및 completion 조회              |
| 4    | **비교 기준 봇 목록 조회**    | `GET`  | `/api/v1/simulation-bots/comparators`         | `Huymt`                    | 백테스트 참전 4개 대조군 봇(나, 개인봇, 퀀트, 원숭이) 설정 조회 |
| 5    | **시뮬레이션 백테스트 실행**  | `POST` | `/api/v1/simulations/run`                     | `y9DNLy`                   | 4개 대조군 봇 백테스트 연산 및 가상 체결/일별 성과 생성         |
| 6    | **최근 시뮬레이션 성과 조회** | `GET`  | `/api/v1/simulations/latest`                  | `xCJcT`                    | 가장 최근 실행된 백테스트 성과 대시보드 데이터 조회             |
| 7    | **시뮬레이션 상세 조회**      | `GET`  | `/api/v1/simulations/:simulationId`           | `p3vHxf`, `rGj4P`, `GTmqX` | 특정 세션 ID의 성과 비교, 자산 그래프, 체결 일지 상세 조회      |

---

## 1. 시뮬레이션 개요 조회 API

- **URI**: `GET /api/v1/simulations/overview`
- **대응 화면**: `xCJcT`, `WYSMi` (대시보드 메인 / 시뮬레이션 진입 화면)
- **설명**: 백테스트 실행을 위한 사용자의 계좌 연동 상태, 백테스트 가동 가능 날짜 범위, 시작 자본금 추천치를 제공합니다.

### 📥 요청 규격 (Request)

- Query Parameter: 없음 (Header: `Authorization: Bearer <token>`)

### 📤 응답 규격 (Response Body)

| 필드명                      | 타입      | 필수 | 설명                                            |
| --------------------------- | --------- | ---- | ----------------------------------------------- |
| `isReady`                   | `BOOLEAN` | Y    | 시뮬레이션 가동 준비 완료 여부 (`true`/`false`) |
| `eligiblePeriod`            | `Object`  | Y    | 시뮬레이션 연산 가능 날짜 정보 객체             |
| `eligiblePeriod.startDate`  | `String`  | Y    | 백테스트 시작 가능 날짜 (`YYYY-MM-DD`)          |
| `eligiblePeriod.endDate`    | `String`  | Y    | 백테스트 종료 가능 날짜 (`YYYY-MM-DD`)          |
| `eligiblePeriod.totalDays`  | `Integer` | Y    | 전체 대상 거래일수 (일)                         |
| `recommendedInitialCapital` | `Number`  | Y    | 추천 시작 자본금 (원)                           |
| `connectedAccountsCount`    | `Integer` | Y    | 연동된 증권 계좌 수                             |
| `recentSimulationCount`     | `Integer` | Y    | 과거 실행된 총 시뮬레이션 횟수                  |

#### 📄 응답 JSON 샘플

```json
{
  "isReady": true,
  "eligiblePeriod": {
    "startDate": "2026-03-01",
    "endDate": "2026-07-29",
    "totalDays": 150
  },
  "recommendedInitialCapital": 5000000.0,
  "connectedAccountsCount": 1,
  "recentSimulationCount": 3
}
```

---

## 2. 최신 원칙 봇 생성 요청 API

- **URI**: `POST /api/v1/simulation-bots/compile` (하위호환: `POST /api/v1/rules/compile`)
- **대응 화면**: `Inbqv` (원칙 입력 및 봇 생성 화면)
- **설명**: 사용자가 작성한 자연어 투자 원칙 문장들과 6축 성향 데이터를 AI 파이프라인으로 파싱하여 실행 가능한 8대 영역 표준 Rule JSON 봇을 컴파일합니다.

### 📥 요청 규격 (Request Body)

| 필드명          | 타입            | 필수 | 설명                                                             |
| --------------- | --------------- | ---- | ---------------------------------------------------------------- |
| `principles`    | `Array[String]` | N    | 사용자가 입력한 자연어 원칙 문장 목록 (미입력 시 기본 원칙 사용) |
| `profile`       | `Object`        | N    | 6축 투자 성향 가중치 (가치, 성장, 품질, 추세, 공시)              |
| `actual_trades` | `Array[Object]` | N    | 원칙 모호성 보완용 과거 실제 거래 데이터                         |

#### 📄 요청 JSON 샘플

```json
{
  "principles": [
    "익절 +20% 달성 시 이익 실현하고 손절률 -10% 도달 시 손절",
    "단일 종목 보유 수 최대 5개로 제한"
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

### 📤 응답 규격 (Response Body)

| 필드명       | 타입     | 필수 | 설명                                  |
| ------------ | -------- | ---- | ------------------------------------- |
| `jobId`      | `String` | Y    | 봇 생성 작업 고유 ID (`JOB_XXXXXX`)   |
| `status`     | `String` | Y    | 작업 상태 (`COMPLETED`, `RUNNING`)    |
| `botVersion` | `String` | Y    | 생성된 봇 버전 (`v1.0`)               |
| `ruleSchema` | `Object` | Y    | 파싱된 8대 영역 표준 Rule JSON 구조체 |

#### 📄 응답 JSON 샘플

```json
{
  "jobId": "JOB_794FF6CC",
  "status": "COMPLETED",
  "botVersion": "v1.0",
  "ruleSchema": {
    "universe": { "minMarketCap": 100000000000 },
    "selection": { "targetScores": { "growth": 40.0 } },
    "entry": { "chaseBuyLimit": 15.0 },
    "exit": { "takeProfitRate": 0.2, "stopLossRate": -0.1 }
  }
}
```

---

## 3. 최신 원칙 봇 생성 상태 조회 API

- **URI**: `GET /api/v1/simulation-bots/compile-jobs/{job_id}`
- **대응 화면**: `Inbqv`, `AZCR3` (봇 생성 로딩 및 결과 확인 화면)
- **설명**: 비동기로 진행되는 AI 원칙 봇 컴파일 작업의 현재 진행율(%)과 진행 상태를 조회합니다.

### 📥 요청 규격 (Request)

- Path Parameter: `job_id` (`String`, 필수, 예: `JOB_794FF6CC`)

### 📤 응답 규격 (Response Body)

| 필드명            | 타입      | 필수 | 설명                                         |
| ----------------- | --------- | ---- | -------------------------------------------- |
| `jobId`           | `String`  | Y    | 조회된 작업 ID                               |
| `status`          | `String`  | Y    | 작업 상태 (`RUNNING`, `COMPLETED`, `FAILED`) |
| `progressPercent` | `Integer` | Y    | 진행율 (0 ~ 100 %)                           |
| `message`         | `String`  | Y    | 현재 작업 단계 안내 메시지                   |

#### 📄 응답 JSON 샘플

```json
{
  "jobId": "JOB_794FF6CC",
  "status": "COMPLETED",
  "progressPercent": 100,
  "message": "AI 원칙 봇 전략 생성이 완료되었습니다."
}
```

---

## 4. 비교 기준 봇 목록 조회 API

- **URI**: `GET /api/v1/simulation-bots/comparators`
- **대응 화면**: `Huymt` (시뮬레이션 대조군 선택/확인 화면)
- **설명**: 백테스트 시뮬레이션에 동시 참전하여 성과를 겨룰 4개 대조군 봇 목록 및 메타 정보를 반환합니다.

### 📥 요청 규격 (Request)

- Query Parameter: 없음

### 📤 응답 규격 (Response Body: `Array[Object]`)

| 필드명        | 타입      | 필수 | 설명                                                                          |
| ------------- | --------- | ---- | ----------------------------------------------------------------------------- |
| `variantId`   | `Integer` | Y    | 대조군 봇 고유 식별 번호 (1: 실제나, 2: 개인봇, 3: 퀀트봇, 4: 원숭이)         |
| `variantType` | `String`  | Y    | 봇 유형 코드 (`ACTUAL_USER`, `PERSONAL_BOT`, `FAMOUS_STRATEGY`, `RANDOM_BOT`) |
| `variantName` | `String`  | Y    | 화면 표시용 봇 이름                                                           |
| `description` | `String`  | Y    | 봇 매매 방식 설명                                                             |

#### 📄 응답 JSON 샘플

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

## 5. 시뮬레이션 백테스트 실행 API

- **URI**: `POST /api/v1/simulations/run`
- **대응 화면**: `y9DNLy` (시뮬레이션 연산 구동 화면)
- **설명**: 지정된 백테스트 기간 동안 4개 대조군 봇의 일별 백테스트 루프를 구동하고, 봇별 성과 요약, 가상 매매 체결 내역, 일별 자산 차트 데이터를 반환합니다.

### 📥 요청 규격 (Request Body)

| 필드명              | 타입            | 필수 | 기본값         | 설명                           |
| ------------------- | --------------- | ---- | -------------- | ------------------------------ |
| `simulation_run_id` | `Integer`       | N    | `1`            | 시뮬레이션 실행 세션 ID        |
| `period_start`      | `String`        | N    | `"2026-03-01"` | 백테스트 시작일 (`YYYY-MM-DD`) |
| `period_end`        | `String`        | N    | `"2026-07-29"` | 백테스트 종료일 (`YYYY-MM-DD`) |
| `initial_capital`   | `Number`        | N    | `5000000.0`    | 시뮬레이션 시작 자본금 (원)    |
| `principles`        | `Array[String]` | N    | `NULL`         | 적용할 개인 투자 원칙 문장     |
| `profile`           | `Object`        | N    | `NULL`         | 적용할 6축 투자 성향 가중치    |
| `participantTypes`  | `Array[String]` | N    | 전체 참가자    | 실행할 참가자 유형 코드 목록   |

#### 📄 요청 JSON 샘플

```json
{
  "simulation_run_id": 1,
  "period_start": "2026-03-01",
  "period_end": "2026-07-29",
  "initial_capital": 5000000.0,
  "participantTypes": ["ACTUAL_USER", "PERSONAL_BOT", "FAMOUS_STRATEGY"]
}
```

### 📤 응답 규격 (Response Body)

| 필드명                      | 타입            | 필수 | 설명                                                |
| --------------------------- | --------------- | ---- | --------------------------------------------------- |
| `simulationRunId`           | `Integer`       | Y    | 시뮬레이션 실행 세션 ID                             |
| `periodStart` / `periodEnd` | `String`        | Y    | 백테스트 실행 기간                                  |
| `initialCapital`            | `Number`        | Y    | 시작 자본금                                         |
| `participantSummary`        | `Array[Object]` | Y    | 4개 봇별 최종 자산, 누적 수익률(%), MDD(%) 요약     |
| `ruleSchema`                | `Object`        | Y    | 적용된 개인 AI 봇의 Rule JSON 스키마                |
| `totalTradesCount`          | `Integer`       | Y    | 백테스트 동안 실행된 총 가상 체결 건수              |
| `simulatedTrades`           | `Array[Object]` | Y    | 일자별/봇별 상세 가상 매매 체결 레코드 및 판단 이유 |
| `dailySnapshots`            | `Array[Object]` | Y    | 그래프용 일별 현금, 평가금, 누적수익률, MDD 스냅샷  |

#### 📄 응답 JSON 샘플

```json
{
  "simulationRunId": 1,
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
      "mddPercent": -3.2
    },
    {
      "variantId": 2,
      "variantName": "나의 투자봇 v1",
      "variantType": "PERSONAL_BOT",
      "totalEquity": 5850000.0,
      "cumulativeReturnPercent": 17.0,
      "mddPercent": -1.8
    }
  ],
  "totalTradesCount": 2,
  "simulatedTrades": [
    {
      "simulatedTradeId": 1001,
      "simulationVariantId": 2,
      "securityId": 101,
      "tradeSide": "BUY",
      "tradedAt": "2026-03-05T09:00:00",
      "quantity": 10.0,
      "unitPrice": 70000.0,
      "decisionReason": "[AI 팩터 통과] 팩터 점수 78.5점으로 최소 기준 초과 및 상승 추세 감지"
    }
  ]
}
```

---

## 6. 최근 시뮬레이션 성과 조회 API

- **URI**: `GET /api/v1/simulations/latest`
- **대응 화면**: `xCJcT` (대시보드 최근 시뮬레이션 카드 위젯)
- **설명**: 가장 최근 가동되었던 시뮬레이션 세션의 봇 성과 비교, 일별 자산 그래프, 체결 일지를 조회합니다.

### 📥 요청 규격 (Request)

- Query Parameter: 없음

### 📤 응답 규격 (Response Body)

- Section 7 (`GET /api/v1/simulations/{simulation_id}`)의 응답 구조와 100% 동일합니다.

---

## 7. 시뮬레이션 상세 조회 API

- **URI**: `GET /api/v1/simulations/{simulation_id}`
- **대응 화면**: `p3vHxf`, `rGj4P`, `GTmqX` (시뮬레이션 리포트 상세 / 자산 그래프 / 매매 일지 상세)
- **설명**: 특정 시뮬레이션 ID 세션의 성과 요약, 대조군 봇 설정, 가상 체결 내역, 일별 자산 성과 타임시리즈 전체를 조회합니다.

### 📥 요청 규격 (Request)

- Path Parameter: `simulation_id` (`Integer`, 필수, 예: `101`)

### 📤 응답 규격 (Response Body)

| 필드명               | 타입            | 필수 | 설명                                       |
| -------------------- | --------------- | ---- | ------------------------------------------ |
| `simulationRun`      | `Object`        | Y    | 시뮬레이션 세션 메인 데이터                |
| `simulationVariants` | `Array[Object]` | Y    | 4개 대조 참가자 봇 설정 정보               |
| `simulatedTrades`    | `Array[Object]` | Y    | 해당 시뮬레이션의 가상 매매 체결 내역 전체 |
| `dailyPerformance`   | `Array[Object]` | Y    | 차트용 일별 성과 스냅샷 전체               |

#### 📄 응답 JSON 샘플

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
  "simulationVariants": [
    { "simulationVariantId": 1, "variantType": "ACTUAL_USER", "variantName": "실제 나" },
    { "simulationVariantId": 2, "variantType": "PERSONAL_BOT", "variantName": "나의 투자봇 v1" }
  ],
  "simulatedTrades": [
    {
      "simulatedTradeId": 1,
      "simulationVariantId": 2,
      "securityId": 101,
      "tradeSide": "BUY",
      "tradedAt": "2026-03-05 09:00:00",
      "quantity": 10,
      "unitPrice": 70000,
      "decisionReason": "[OpenAI AI 분석] 5,000억 규모 공급계약 공시 호재 감지"
    }
  ]
}
```
