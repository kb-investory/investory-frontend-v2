# 투자성향 · 투자원칙 · 마이페이지 API 보완 명세서

> 상태: 프론트엔드 구현 기준 제안 명세
> 작성 목적: 백엔드 연동 전 누락 API 및 기존 응답 필드 보완
> 공통 기준: 모든 URL은 API Base URL 기준이며 인증 API에는 `Authorization: Bearer {accessToken}`을 전달한다.

---

## 1. 공통 규칙

### 1.1 날짜와 시간

| 구분      | 형식         | 예시                        |
| --------- | ------------ | --------------------------- |
| 날짜      | `YYYY-MM-DD` | `2026-08-06`                |
| 날짜·시간 | ISO-8601     | `2026-08-06T14:30:00+09:00` |

### 1.2 공통 오류 응답

```json
{
  "code": "TENDENCY_ANALYSIS_NOT_FOUND",
  "message": "투자성향 분석 결과가 없습니다."
}
```

| 필드      | 타입   | 필수 | 설명                                  |
| --------- | ------ | ---- | ------------------------------------- |
| `code`    | String | O    | 클라이언트가 분기 처리할 오류 코드    |
| `message` | String | O    | 사용자에게 표시할 수 있는 오류 메시지 |
| `details` | Object | X    | 필드 오류 등 부가 정보                |

### 1.3 공통 HTTP 상태 코드

| 상태                        | 의미                                    |
| --------------------------- | --------------------------------------- |
| `200 OK`                    | 조회·수정 성공                          |
| `201 Created`               | 리소스 생성 성공                        |
| `202 Accepted`              | 비동기 작업 요청 접수                   |
| `204 No Content`            | 응답 본문 없는 성공 또는 조회 결과 없음 |
| `400 Bad Request`           | 요청값 오류                             |
| `401 Unauthorized`          | 인증 실패 또는 토큰 만료                |
| `403 Forbidden`             | 기능 사용 조건 미충족                   |
| `404 Not Found`             | 대상 리소스 없음                        |
| `409 Conflict`              | 중복 요청 또는 처리 중인 작업 존재      |
| `422 Unprocessable Entity`  | 도메인 규칙 위반                        |
| `500 Internal Server Error` | 서버 오류                               |

---

# 2. 투자성향 API

## 2.1 투자성향 분석 가능 상태 조회

최초 서비스 사용 후 90일이 지나기 전에는 투자성향 분석을 실행할 수 없다.

- **Method:** `GET`
- **URL:** `/tendency/access-status`
- **인증:** 필요

### 응답 예시

```json
{
  "eligible": false,
  "reason": "INSUFFICIENT_RECORD_PERIOD",
  "serviceStartedDate": "2026-06-01",
  "analysisAvailableDate": "2026-08-30",
  "minimumRecordDays": 90,
  "recordedDays": 67,
  "remainingDays": 23
}
```

### 응답 필드

| 필드                    | 타입    | 필수 | 설명                      |
| ----------------------- | ------- | ---- | ------------------------- |
| `eligible`              | Boolean | O    | 현재 분석 가능 여부       |
| `reason`                | String  | X    | 분석 불가 사유            |
| `serviceStartedDate`    | Date    | O    | 90일 기록 산정 시작일     |
| `analysisAvailableDate` | Date    | O    | 최초 분석 가능일          |
| `minimumRecordDays`     | Integer | O    | 필요한 최소 기록 일수     |
| `recordedDays`          | Integer | O    | 현재까지 기록된 일수      |
| `remainingDays`         | Integer | O    | 분석 가능일까지 남은 일수 |

### `reason` enum

| 값                           | 설명                       |
| ---------------------------- | -------------------------- |
| `INSUFFICIENT_RECORD_PERIOD` | 최초 사용 후 90일 미경과   |
| `NO_CONNECTED_ACCOUNT`       | 연결 계좌 없음             |
| `INSUFFICIENT_DATA`          | 거래 또는 일지 데이터 부족 |
| `ANALYSIS_IN_PROGRESS`       | 분석 작업 진행 중          |
| `null`                       | 분석 가능                  |

---

## 2.2 투자성향 분석 실행 요청

최근 90일의 연결 계좌 거래와 투자 일지를 기반으로 분석 작업을 생성한다.

- **Method:** `POST`
- **URL:** `/tendency/analyses`
- **인증:** 필요

### 요청 바디

```json
{
  "triggerType": "USER_REQUEST"
}
```

| 필드          | 타입   | 필수 | 설명           |
| ------------- | ------ | ---- | -------------- |
| `triggerType` | String | O    | 분석 실행 사유 |

### `triggerType` enum

| 값                     | 설명                |
| ---------------------- | ------------------- |
| `USER_REQUEST`         | 사용자가 직접 실행  |
| `SCHEDULED_REANALYSIS` | 90일 주기 정기 분석 |

### 성공 응답: `202 Accepted`

```json
{
  "analysisJobId": 187,
  "jobStatus": "REQUESTED",
  "requestedAt": "2026-08-06T14:30:00+09:00"
}
```

### 주요 오류

| HTTP  | 오류 코드                             | 설명                  |
| ----- | ------------------------------------- | --------------------- |
| `403` | `TENDENCY_ANALYSIS_NOT_ELIGIBLE`      | 최초 분석 조건 미충족 |
| `409` | `TENDENCY_ANALYSIS_ALREADY_RUNNING`   | 이미 분석 중          |
| `422` | `TENDENCY_ANALYSIS_DATA_INSUFFICIENT` | 분석할 데이터 부족    |

---

## 2.3 투자성향 분석 작업 상태 조회

분석 중 화면에서 완료 여부를 폴링하기 위한 API이다.

- **Method:** `GET`
- **URL:** `/tendency/analysis-jobs/{analysisJobId}`
- **인증:** 필요

### 성공 응답

```json
{
  "analysisJobId": 187,
  "jobStatus": "COMPLETED",
  "requestedAt": "2026-08-06T14:30:00+09:00",
  "completedAt": "2026-08-06T14:30:04+09:00",
  "analysisRunId": 44,
  "errorMessage": null
}
```

### `jobStatus` enum

| 값          | 설명         |
| ----------- | ------------ |
| `REQUESTED` | 요청 접수    |
| `RUNNING`   | 분석 진행 중 |
| `COMPLETED` | 분석 완료    |
| `FAILED`    | 분석 실패    |

---

## 2.4 최신 투자성향 분석 결과 조회 — 기존 명세 보완

- **Method:** `GET`
- **URL:** `/tendency/analysis/latest`
- **인증:** 필요
- **결과 없음:** `204 No Content`

### 성공 응답

```json
{
  "analysisRunId": 44,
  "analyzedDate": "2026-08-06",
  "triggerType": "USER_REQUEST",
  "period": {
    "startDate": "2026-05-09",
    "endDate": "2026-08-06",
    "days": 90
  },
  "summary": {
    "combinationSummary": "반복된 선택과 매매 행동을 분석했어요",
    "strengthSummary": "분석 결과를 2개 영역, 6가지 성향으로 정리했어요",
    "cautionSummary": "집중 투자 비중이 높아질 때에는 분산 원칙을 확인해보세요."
  },
  "groupSummaries": {
    "selection": "기업을 분석해 확신 있는 종목에 오래 투자해요",
    "behavior": "손실에는 보유하고 수익은 실현하며 원칙을 지켜요"
  },
  "analysisResults": [
    {
      "dimension": {
        "code": "PORTFOLIO_RISK_ALLOCATION",
        "name": "포트폴리오 위험배분",
        "description": "어떤 변동성의 종목에 얼마나 집중하거나 분산하는지 분석해요.",
        "group": "SELECTION"
      },
      "type": {
        "code": "HIGH_VOLATILITY_CONCENTRATED",
        "name": "고변동 집중형",
        "description": "변동성이 높은 소수 종목에 투자 비중을 집중하는 편이에요.",
        "rationale": {
          "summary": "상위 3개 종목의 비중과 가격 변동성이 높게 나타났어요.",
          "items": [
            {
              "type": "PERCENT",
              "label": "상위 3종목 비중",
              "value": 68,
              "unit": "PERCENT",
              "displayValue": "68%",
              "description": "평가금액 기준 상위 3개 종목의 비율이에요."
            }
          ]
        }
      }
    }
  ]
}
```

### 필수 보완 필드

| 필드                             | 타입   | 설명                          |
| -------------------------------- | ------ | ----------------------------- |
| `analyzedDate`                   | Date   | 90일 재분석 안내 기준일       |
| `triggerType`                    | String | 첫 분석·재분석 구분 근거      |
| `period`                         | Object | 실제 분석 대상 기간           |
| `groupSummaries`                 | Object | 선택 성향·행동 성향 요약 문구 |
| `dimension.group`                | String | `SELECTION`, `BEHAVIOR` 구분  |
| `rationale.items[].displayValue` | String | 단위가 적용된 화면 표시값     |

> `analysisResults`는 정확히 6개로 정의한다. 기존 명세의 “총 8개” 주석은 “총 6개”로 수정한다.

---

## 2.5 투자성향 분석 이력 목록 조회

- **Method:** `GET`
- **URL:** `/tendency/analyses?page=0&size=20`
- **인증:** 필요

### 성공 응답

```json
{
  "content": [
    {
      "analysisRunId": 44,
      "analyzedDate": "2026-08-06",
      "triggerType": "USER_REQUEST",
      "label": "재분석",
      "description": "6가지 성향 결과 · 1개 변화",
      "changedCount": 1,
      "changes": [
        {
          "dimensionCode": "INVESTMENT_HORIZON",
          "dimensionName": "투자 기간",
          "previousTypeCode": "MID_TERM_HOLDING",
          "previousTypeName": "중기보유형",
          "currentTypeCode": "LONG_TERM_INVESTMENT",
          "currentTypeName": "장기투자형",
          "reason": "최근 90일 동안 장기 보유 종목의 비중이 증가했어요."
        }
      ]
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 3
}
```

---

## 2.6 과거 투자성향 분석 상세 조회

이력 상세 화면은 현재 결과가 아니라 해당 시점의 6가지 결과를 반환해야 한다.

- **Method:** `GET`
- **URL:** `/tendency/analyses/{analysisRunId}`
- **인증:** 필요

### 성공 응답

`2.4 최신 투자성향 분석 결과`와 동일한 구조에 다음 필드를 추가한다.

```json
{
  "comparison": {
    "changedCount": 1,
    "changes": [
      {
        "dimensionCode": "INVESTMENT_HORIZON",
        "dimensionName": "투자 기간",
        "previousTypeCode": "MID_TERM_HOLDING",
        "previousTypeName": "중기보유형",
        "currentTypeCode": "LONG_TERM_INVESTMENT",
        "currentTypeName": "장기투자형",
        "reason": "장기 보유 종목의 비중이 증가했어요."
      }
    ]
  }
}
```

---

# 3. 투자원칙 API

## 3.1 추천 투자원칙 목록 조회 — 기존 명세 보완

- **Method:** `GET`
- **URL:** `/principles/recommendations`
- **인증:** 필요
- **선택 개수 제한:** 없음

### 성공 응답

```json
{
  "analysisRunId": 44,
  "recommendations": [
    {
      "recommendationId": 101,
      "recommendationText": "한 종목의 투자 비중은 전체 자산의 30%를 넘지 않기",
      "recommendationReason": "집중 투자 위험을 낮추는 데 도움이 돼요.",
      "analysisType": {
        "dimensionCode": "PORTFOLIO_RISK_ALLOCATION",
        "code": "HIGH_VOLATILITY_CONCENTRATED",
        "name": "고변동 집중형"
      },
      "recommendationStatus": "NEW",
      "createdAt": "2026-08-06T14:30:04+09:00"
    }
  ]
}
```

### `recommendationStatus` enum

| 값        | 설명                                                  |
| --------- | ----------------------------------------------------- |
| `NEW`     | 아직 적용하지 않은 추천                               |
| `APPLIED` | 사용자가 원칙으로 적용한 추천                         |
| `EXPIRED` | 과거 분석에 의해 생성되어 더 이상 적용할 수 없는 추천 |

---

## 3.2 사용자 투자원칙 조회 — 기존 명세 보완

- **Method:** `GET`
- **URL:** `/principles`
- **인증:** 필요

### 원칙이 없는 경우

```json
{
  "principleSetId": null,
  "versionNo": 0,
  "setStatus": null,
  "analysisRunId": null,
  "principles": []
}
```

### 성공 응답

```json
{
  "principleSetId": 3,
  "versionNo": 2,
  "setStatus": "ACTIVE",
  "analysisRunId": 44,
  "principles": [
    {
      "principleSetItemId": 21,
      "principleText": "성장 근거가 유지되는지 분기마다 다시 확인한다.",
      "sortOrder": 1,
      "appliedAt": "2026-08-06T14:40:00+09:00",
      "modifiedAt": null,
      "isUserModified": false,
      "origin": {
        "type": "AI_RECOMMENDATION",
        "recommendationId": 101,
        "analysisRunId": 44,
        "analysisTypeCode": "COMPANY_ANALYSIS",
        "analysisTypeName": "기업분석형"
      }
    },
    {
      "principleSetItemId": 22,
      "principleText": "매수 전 투자 근거를 세 줄 이상 기록한다.",
      "sortOrder": 2,
      "appliedAt": "2026-08-06T14:40:00+09:00",
      "modifiedAt": "2026-08-07T09:10:00+09:00",
      "isUserModified": true,
      "origin": {
        "type": "USER_CREATED",
        "recommendationId": null,
        "analysisRunId": null,
        "analysisTypeCode": null,
        "analysisTypeName": null
      }
    }
  ]
}
```

### `origin.type` enum

| 값                  | 설명                               |
| ------------------- | ---------------------------------- |
| `AI_RECOMMENDATION` | 추천 문구를 그대로 적용한 기본원칙 |
| `USER_MODIFIED`     | 추천 문구를 사용자가 수정한 원칙   |
| `USER_CREATED`      | 사용자가 직접 작성한 원칙          |

### 표시 정책

- 추천 원칙 문구가 변경되지 않았다면 `AI_RECOMMENDATION`, `isUserModified=false`를 유지한다.
- 추천 원칙 문구가 실제로 변경된 경우에만 `USER_MODIFIED`, `isUserModified=true`로 저장한다.
- 사용자 수정 또는 직접 작성 원칙은 `modifiedAt` 또는 `appliedAt` 날짜와 함께 표시한다.

---

## 3.3 사용자 투자원칙 저장·수정 — 기존 명세 보완

추가·수정·삭제·순서 변경을 하나의 원칙 집합 교체 요청으로 처리한다.

- **Method:** `PUT`
- **URL:** `/principles`
- **인증:** 필요
- **선택 개수 제한:** 없음

### 요청 바디

```json
{
  "analysisRunId": 44,
  "principles": [
    {
      "principleSetItemId": 21,
      "recommendationId": 101,
      "principleText": "성장 근거가 유지되는지 분기마다 다시 확인한다.",
      "ruleJson": null,
      "sortOrder": 1
    },
    {
      "principleSetItemId": null,
      "recommendationId": null,
      "principleText": "매수 전 투자 근거를 세 줄 이상 기록한다.",
      "ruleJson": null,
      "sortOrder": 2
    }
  ]
}
```

### 서버 처리 규칙

1. 요청 배열에 없는 기존 원칙은 비활성화 또는 삭제한다.
2. `principleSetItemId=null`이면 새 원칙을 생성한다.
3. `recommendationId`가 있고 추천 원문과 문구가 같으면 기본원칙으로 저장한다.
4. `recommendationId`가 있고 추천 원문과 문구가 다르면 사용자 수정 원칙으로 저장한다.
5. `recommendationId=null`이면 사용자 직접 작성 원칙으로 저장한다.
6. `sortOrder`는 1부터 중복 없이 저장한다.

### 성공 응답

저장 후 별도 재조회 없이 화면을 갱신할 수 있도록 `GET /principles`와 동일한 전체 원칙 집합을 반환한다.

```json
{
  "principleSetId": 3,
  "versionNo": 3,
  "setStatus": "ACTIVE",
  "analysisRunId": 44,
  "message": "투자원칙이 저장되었습니다.",
  "principles": []
}
```

---

# 4. 마이페이지 API

## 4.1 회원정보 조회 — 기존 명세 보완

- **Method:** `GET`
- **URL:** `/auth/me`
- **인증:** 필요

### 성공 응답

```json
{
  "userId": 1,
  "oauthProvider": "KAKAO",
  "email": "koomin@jb.com",
  "nickname": "김구민",
  "profileImageUrl": "https://cdn.example.com/profiles/1.webp",
  "userStatus": "ACTIVE",
  "createdAt": "2026-04-07T10:00:00+09:00"
}
```

### `oauthProvider` enum

| 값       | 설명          |
| -------- | ------------- |
| `KAKAO`  | 카카오 로그인 |
| `NAVER`  | 네이버 로그인 |
| `GOOGLE` | Google 로그인 |

> 프론트에서는 사용자 이름 필드를 `nickname`으로 통일한다. 가입 일수는 `createdAt`을 기준으로 계산한다.

---

## 4.2 사용자 프로필 수정

닉네임만 변경하거나 프로필 이미지와 닉네임을 함께 변경할 수 있다.

- **Method:** `PATCH`
- **URL:** `/users/me/profile`
- **Content-Type:** `multipart/form-data`
- **인증:** 필요

### 요청 파트

| 파트                 | 타입    | 필수 | 설명                             |
| -------------------- | ------- | ---- | -------------------------------- |
| `nickname`           | String  | X    | 1~12자, 한글·영문·숫자·공백 허용 |
| `profileImage`       | File    | X    | JPG, PNG, WEBP / 최대 2MB        |
| `removeProfileImage` | Boolean | X    | 기본 이미지로 초기화할 때 `true` |

> 변경하려는 필드는 하나 이상 포함해야 한다.

### 성공 응답

```json
{
  "userId": 1,
  "nickname": "김구민",
  "email": "koomin@jb.com",
  "profileImageUrl": "https://cdn.example.com/profiles/1.webp",
  "updatedAt": "2026-08-06T15:00:00+09:00"
}
```

### 주요 오류

| HTTP  | 오류 코드                    | 설명                    |
| ----- | ---------------------------- | ----------------------- |
| `400` | `INVALID_NICKNAME`           | 닉네임 형식 오류        |
| `400` | `INVALID_PROFILE_IMAGE_TYPE` | 허용하지 않는 파일 형식 |
| `413` | `PROFILE_IMAGE_TOO_LARGE`    | 이미지 용량 초과        |

---

## 4.3 회원탈퇴용 재인증

소셜 로그인 제공자 재인증 완료 후 일회성 재인증 토큰을 발급한다.

- **Method:** `POST`
- **URL:** `/auth/reauth`
- **인증:** 필요

### 요청 바디

```json
{
  "oauthProvider": "KAKAO",
  "authorizationCode": "provider-authorization-code"
}
```

### 성공 응답

```json
{
  "reauthToken": "short-lived-one-time-token",
  "expiresAt": "2026-08-06T15:10:00+09:00"
}
```

---

## 4.4 회원탈퇴

회원탈퇴와 함께 소셜 연결, 인증 세션, 연결 계좌를 서버에서 정리한다.

- **Method:** `DELETE`
- **URL:** `/users/me`
- **인증:** 필요
- **추가 헤더:** `X-Reauth-Token: {reauthToken}`

### 성공 응답

```json
{
  "withdrawn": true,
  "withdrawnAt": "2026-08-06T15:05:00+09:00",
  "oauthConnectionRevoked": true,
  "brokerConnectionsDisconnected": 2,
  "journalPolicy": "RETENTION_POLICY_APPLIED"
}
```

### `journalPolicy` enum

| 값                         | 설명                         |
| -------------------------- | ---------------------------- |
| `DELETED`                  | 즉시 삭제                    |
| `ANONYMIZED`               | 사용자 식별정보 제거 후 보관 |
| `RETENTION_POLICY_APPLIED` | 서비스 보존 정책에 따라 처리 |

---

# 5. 연결계좌 API 보완

## 5.1 전체 계좌 목록 조회 — 상태 필드 추가

- **Method:** `GET`
- **URL:** `/broker/accounts`
- **인증:** 필요

기존 계좌 항목에 다음 필드를 추가한다.

```json
{
  "accountId": 25,
  "connectionId": 15,
  "brokerId": 1,
  "brokerName": "미래에셋증권",
  "accountNoMasked": "1234-****-5678",
  "accountName": "종합주식계좌",
  "accountType": "STOCK",
  "holdingCount": 3,
  "totalMarketValue": 8420000,
  "totalUnrealizedPnl": 320000,
  "connectionStatus": "CONNECTED",
  "latestSyncStatus": "SUCCESS",
  "syncErrorReason": null,
  "lastSyncedAt": "2026-08-06T14:30:03+09:00"
}
```

### 상태 enum

| 필드               | 값                                              |
| ------------------ | ----------------------------------------------- |
| `connectionStatus` | `PENDING`, `CONNECTED`, `ERROR`, `DISCONNECTED` |
| `latestSyncStatus` | `REQUESTED`, `RUNNING`, `SUCCESS`, `FAILED`     |

> 인증 만료 재연결 기능을 제공하지 않는 현재 정책에서는 `AUTH_EXPIRED` 상태를 사용하지 않는다. 인증 만료를 다시 도입한다면 연결 상태 enum과 재인증 API를 함께 추가한다.

---

## 5.2 단일 계좌 상세 조회 — 최근 거래 필드 추가

- **Method:** `GET`
- **URL:** `/broker/accounts/{accountId}`
- **인증:** 필요

기존 응답에 다음 필드를 추가한다.

```json
{
  "connectionStatus": "CONNECTED",
  "latestSyncStatus": "SUCCESS",
  "syncErrorReason": null,
  "latestTrade": {
    "tradeId": 991,
    "securityId": 101,
    "securityName": "삼성전자",
    "tradeSide": "BUY",
    "quantity": 10,
    "unitPrice": 72000,
    "tradedAt": "2026-08-06T09:12:00+09:00"
  }
}
```

최근 거래가 없으면 `latestTrade`는 `null`을 반환한다.

> 대안: `GET /ledger/trades?accountId={accountId}&page=0&size=1&sort=tradedAt,desc`를 호출한다. 이 방식을 사용한다면 거래 목록 명세에 `sort` 파라미터와 기본 정렬을 추가해야 한다.

---

## 5.3 증권사 연결 데이터 동기화

기존 명세를 그대로 사용하되 프론트와 백엔드 모두 `accountId`가 아닌 `connectionId` 단위로 통일한다.

- **Method:** `POST`
- **URL:** `/broker/connections/{connectionId}/sync`
- **인증:** 필요

### 처리 정책

- 같은 증권사에 여러 계좌가 있으면 해당 연결의 전체 계좌를 함께 동기화한다.
- 동일 `connectionId`에 실행 중인 동기화가 있으면 `409 Conflict`를 반환한다.
- 성공 후 프론트는 `GET /broker/accounts`를 다시 호출한다.

---

## 5.4 증권사 연결 해제

계좌 하나가 아닌 증권사 연결 단위로 해제한다.

- **Method:** `DELETE`
- **URL:** `/broker/connections/{connectionId}`
- **인증:** 필요

### 성공 응답

```json
{
  "connectionId": 15,
  "connectionStatus": "DISCONNECTED",
  "disconnectedAt": "2026-08-06T15:20:00+09:00",
  "disconnectedAccountCount": 2,
  "journalsPreserved": true
}
```

### 처리 정책

- 연결에 포함된 모든 계좌를 함께 해제한다.
- 기존 투자 일지는 보존한다.
- 로그인 ID와 비밀번호는 저장하지 않는다.
- 이미 해제된 연결에 다시 요청해도 동일한 결과를 반환하도록 멱등성을 보장한다.

---

# 6. 마이페이지 화면별 API 조합

별도의 거대한 마이페이지 통합 API를 만들지 않고 기존 도메인 API를 조합한다.

| 화면 정보                      | 사용할 API                           | 비고                                  |
| ------------------------------ | ------------------------------------ | ------------------------------------- |
| 사용자 이름·이메일·소셜 제공자 | `GET /auth/me`                       | `profileImageUrl` 추가 필요           |
| 작성한 투자 일지 개수          | 투자일지 목록 응답의 `totalElements` | 전체 목록을 내려받아 세지 않음        |
| 투자성향 6개 배지              | `GET /tendency/analysis/latest`      | 결과 없음은 `204`                     |
| 최근 시뮬레이션 결과           | `GET /api/v1/simulations/latest`     | 실제 사용자 순위는 참가자 결과로 계산 |
| 연결 계좌                      | `GET /broker/accounts`               | 계좌 상태 필드 보완 필요              |
| 앱 버전                        | 프론트 빌드 환경값                   | 백엔드 API 불필요                     |
| 공지·FAQ·문의·알림 설정        | 라우팅만 처리                        | 현재 상세 API 범위 제외               |

---

# 7. 백엔드 구현 우선순위

## P0 — 화면 연동 전 필수

- [ ] 투자성향 분석 실행 API
- [ ] 투자성향 분석 작업 상태 API
- [ ] 투자성향 최초 분석 가능 상태 API
- [ ] 최신 성향 응답에 분석일·기간·그룹 추가
- [ ] 투자성향 이력 목록·상세 API
- [ ] 투자원칙 조회 응답에 적용일·수정일·출처 추가
- [ ] 투자원칙 저장 응답 구조 확정
- [ ] 프로필 수정 API
- [ ] 회원탈퇴 및 재인증 API
- [ ] 증권사 연결 해제 API
- [ ] 연결계좌 상태·동기화 오류 필드 추가

## P1 — 연동 품질 보완

- [ ] 최근 거래 반환 방식 확정
- [ ] 계좌 동기화 단위를 `connectionId`로 통일
- [ ] 추천 상태 enum 확정
- [ ] 성향 결과 개수를 6개로 통일
- [ ] 공통 오류 코드 목록 작성

---

# 8. 프론트 연동 시 호출 순서

## 투자성향 메인

```text
GET /tendency/access-status
  → GET /tendency/analysis/latest
  → GET /tendency/analyses
  → GET /principles
  → GET /principles/recommendations
```

## 투자성향 분석

```text
POST /tendency/analyses
  → GET /tendency/analysis-jobs/{analysisJobId} 폴링
  → 완료 시 GET /tendency/analysis/latest
  → GET /tendency/analyses 재조회
```

## 추천 원칙 적용

```text
GET /principles/recommendations
  → PUT /principles
  → 응답의 principles[]로 스토어 갱신
```

## 계좌 추가

```text
GET /broker/providers
  → POST /broker/connections
  → GET /broker/connections/{connectionId}/accounts
  → GET /broker/accounts
  → 마이페이지 연결 계좌 목록 갱신
```

## 계좌 동기화

```text
POST /broker/connections/{connectionId}/sync
  → GET /broker/accounts
  → 필요 시 GET /broker/accounts/{accountId}
```
