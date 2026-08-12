# Investory Backend API 상세 명세서

> 기준 저장소: `kb-investory/investory-backend`  
> 기준 브랜치: `feat/market`  
> 고정 검증 커밋: `a565ead5e057435b9daac0d5ece17f108be2d3ae`  
> 검증 기준일: 2026-08-07  
> 검증 방식: 최종 HEAD의 6개 Controller, 요청·응답 DTO, 서비스 검증, Repository 조회 기준, 공통 예외 처리, Security·Scheduler 설정을 직접 대조  
> 문서 버전: Final — Frontend Handoff  
> 대상: 프론트엔드 API 연동, Mock 데이터, TypeScript 타입 작성

---

## 0. 핵심 결론

### 최종 HEAD에서 코드상 노출된 HTTP API

| 도메인         | API 수 | Base Path                                   |
| -------------- | -----: | ------------------------------------------- |
| 인증           |      9 | `/auth`                                     |
| 증권사·계좌    |      9 | `/broker`                                   |
| 투자 일지      |      6 | `/journal`                                  |
| 거래·보유 원장 |      3 | `/ledger`                                   |
| 시장·종목      |  **7** | `/market/securities`, `/markets/securities` |
| **합계**       | **34** |                                             |

### 연동 전에 반드시 알아야 할 현재 구현 상태

1. **최종 공개 API는 34개입니다.**
   - Controller는 `AuthController`, `BrokerController`, `JournalController`, `LedgerController`, `SecurityController`, `MarketDataController` 여섯 개입니다.
   - 도메인별 수량은 Auth 9, Broker 9, Journal 6, Ledger 3, Market 7입니다.
   - Notification·Principle·Simulation·Tendency에는 현재 외부 HTTP Controller가 없습니다.

2. **Market은 Base Path가 두 종류입니다.**
   - 검색·최신 시세 통합 상세: `/market/securities`
   - 종목코드 조회·날짜별 시세·KIS 동기화: `/markets/securities`
   - `stockCode` 기반 API에 단수형 `/market`을 사용하면 안 됩니다.

3. **`GET /market/securities/{securityId}`의 ID 조회 오류는 최신 커밋에서 수정됐습니다.**
   - PathVariable은 `Long securityId`입니다.
   - 서비스는 `stockRepository.findBySecurityId(securityId)`를 사용합니다.
   - 종목이 없으면 `MKT_001 / 404`, 종목은 있지만 시세가 없으면 `latestPrice: null`입니다.
   - Controller의 `Long.valueOf(String.valueOf(securityId))`는 불필요한 변환이지만 결과에는 영향을 주지 않습니다.

4. **종목 목록 검색 API는 연결 가능합니다.**
   - `GET /market/securities`
   - `keyword`, `marketType`, `page`, `size`를 지원합니다.
   - 기본값은 `page=0`, `size=20`이고 `marketType`은 대소문자를 구분하지 않습니다.
   - 다만 page·size 범위 검증이 없어 프론트에서 `page >= 0`, `1 <= size <= 100`으로 제한하는 것을 권장합니다.

5. **현재 Security는 모든 요청을 허용합니다.**
   - 활성 설정은 CSRF 비활성화와 `anyRequest().permitAll()`입니다.
   - JWT 필터, 인증 경로 구분, CORS 설정은 주석 처리되어 실제 Filter Chain에 등록되지 않습니다.
   - 따라서 현재는 Authorization 헤더가 없어도 모든 API에 접근할 수 있습니다.

6. **Broker·Journal·Ledger는 실제 로그인 사용자를 사용하지 않습니다.**
   - 세 Controller 모두 `TEMP_USER_ID = 1L`을 사용합니다.
   - Access Token을 보내더라도 사용자 1번의 데이터만 조회·수정합니다.
   - 다중 사용자 환경에 연결하면 데이터 격리가 되지 않습니다.

7. **`GET /auth/me`는 현재 일반 요청에서 실패합니다.**
   - JWT 필터가 비활성이라 `SecurityContext`에 `Long userId`가 들어가지 않습니다.
   - 따라서 보통 `AUTH_007 / 401`을 반환합니다.

8. **KIS 수동 동기화 API도 인증 없이 공개돼 있습니다.**
   - `/markets/securities/{stockCode}/sync-info`
   - `/markets/securities/{stockCode}/sync-price`
   - `/markets/securities/{stockCode}/sync`
   - 외부 API 호출과 DB 쓰기가 발생하므로 일반 사용자 UI가 아닌 관리자·내부 기능으로 제한해야 합니다.

9. **CORS 설정은 현재 비활성입니다.**
   - 프론트와 백엔드 Origin이 다르면 브라우저 요청이 차단될 수 있습니다.
   - 개발 환경에서는 Vite proxy, 배포 환경에서는 동일 Origin reverse proxy 또는 명시적 CORS 설정이 필요합니다.
   - Refresh Token 쿠키는 `SameSite=Lax`이므로 서로 완전히 다른 사이트 간 XHR 구조라면 쿠키 정책도 함께 재검토해야 합니다.

10. **Spring MVC 입력 형식 오류가 500으로 내려갈 수 있습니다.**
    - 필수 Query 누락, 날짜 형식 오류, 숫자 변환 실패, JSON 파싱 오류를 처리하는 전용 Handler가 없습니다.
    - 이런 예외는 catch-all Handler에서 `INTERNAL_ERROR / 500`으로 변환될 수 있습니다.

11. **Market 스케줄러 주석과 실제 설정이 다릅니다.**
    - 실제 cron은 `0 6 10 * * MON-FRI`, 즉 평일 10:06입니다.
    - `zone`이 없어 서버 기본 시간대를 사용합니다.
    - 코드 주석의 “평일 17:00, KST” 설명과 일치하지 않습니다.

12. **검증 범위**
    - 최신 HEAD 소스 계약은 직접 검증했습니다.
    - 최신 커밋에 연결된 성공 CI 상태와 Workflow Run은 없습니다.
    - 저장소 전체 checkout이 네트워크 제한으로 불가능해 Gradle 빌드, MySQL, OAuth, KIS 실연동은 실행 검증하지 못했습니다.

---

# 1. 공통 규칙

## 1.1 Base URL

실제 배포 주소는 코드에 고정되어 있지 않습니다.

```text
${API_BASE_URL}
```

Controller 경로가 바로 루트에 매핑되므로, 별도의 `/api` prefix가 서버에 설정되지 않았다면 다음과 같이 호출합니다.

```text
${API_BASE_URL}/auth/me
${API_BASE_URL}/broker/accounts
${API_BASE_URL}/journal/entries
${API_BASE_URL}/ledger/holdings
${API_BASE_URL}/market/securities?keyword=삼성
${API_BASE_URL}/markets/securities/005930
```

`app.uri.prefix` 설정은 Swagger 문서의 `pathMapping`에 사용되며 실제 DispatcherServlet 경로를 변경하지는 않습니다.

---

## 1.2 Content-Type

JSON 요청:

```http
Content-Type: application/json
```

JSON 응답:

```http
Content-Type: application/json
```

OAuth 인가·콜백 API는 JSON이 아니라 `302 Found` Redirect 응답입니다.

---

## 1.3 날짜와 숫자 타입

| Java 타입       | JSON 형식             | 예시                     |
| --------------- | --------------------- | ------------------------ |
| `LocalDate`     | `YYYY-MM-DD`          | `"2026-08-07"`           |
| `Instant`       | ISO 8601 UTC          | `"2026-08-07T02:15:30Z"` |
| `LocalDateTime` | ISO 8601, offset 없음 | `"2026-08-07T11:15:30"`  |
| `BigDecimal`    | JSON number           | `125000.50`              |
| `Long`          | JSON number           | `123`                    |
| enum            | 대문자 문자열         | `"BUY"`                  |

### 프론트 권장 타입

금액과 수량은 백엔드에서 `BigDecimal`이지만 JSON에서는 number로 내려옵니다. 큰 금액이나 소수 정밀도가 중요해지면 프론트에서 문자열 기반 decimal 라이브러리를 검토해야 합니다.

---

## 1.4 페이지네이션

- `page`는 **0부터 시작**합니다.
- Ledger 거래 목록의 `size` 허용 범위는 `1~100`입니다.
- Journal 종목별 거래 타임라인은 `size >= 1`만 검증하며 최대값 제한은 없습니다.
- 기본값은 `page=0`, `size=20`입니다.

---

## 1.5 인증 헤더

향후 JWT 필터 활성화 시:

```http
Authorization: Bearer {accessToken}
```

JWT 필터 코드는 헤더가 없으면 `accessToken` 쿠키도 확인하도록 작성되어 있습니다. 다만 현재 Security Filter Chain에는 JWT 필터가 등록되어 있지 않습니다.

---

## 1.6 공통 에러 응답

```json
{
  "errorCode": "BRK_004",
  "message": "계좌 연동 정보가 올바르지 않습니다.",
  "timestamp": "2026-08-07T02:15:30Z",
  "fieldErrors": [
    {
      "field": "loginId",
      "message": "loginId는 1~100자여야 합니다."
    }
  ]
}
```

`fieldErrors`가 비어 있으면 JSON에서 필드 자체가 생략됩니다.

### ErrorType → HTTP Status

| ErrorType        | HTTP |
| ---------------- | ---: |
| `INVALID_INPUT`  |  400 |
| `UNAUTHORIZED`   |  401 |
| `FORBIDDEN`      |  403 |
| `NOT_FOUND`      |  404 |
| `CONFLICT`       |  409 |
| `UNPROCESSABLE`  |  422 |
| `EXTERNAL_ERROR` |  502 |
| `INTERNAL_ERROR` |  500 |

### 인프라·예상치 못한 오류

외부 연동 오류:

```json
{
  "errorCode": "EXTERNAL_ERROR",
  "message": "외부 서비스 연동 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "timestamp": "2026-08-07T02:15:30Z"
}
```

예상하지 못한 서버 오류:

```json
{
  "errorCode": "INTERNAL_ERROR",
  "message": "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "timestamp": "2026-08-07T02:15:30Z"
}
```

> **주의:** Controller 인자 변환 단계에서 발생하는 누락 query, 잘못된 날짜 형식, 숫자 변환 오류, JSON 파싱 오류는 현재 전용 Handler가 없습니다. 따라서 프론트는 이런 요청도 `400`으로 단정하지 말고 `500 / INTERNAL_ERROR` 가능성을 고려해야 합니다.

---

# 2. API 전체 목록

## 2.1 인증

| Method | Path                               | 설명                | 성공 |
| ------ | ---------------------------------- | ------------------- | ---: |
| GET    | `/auth/oauth/kakao/authorization`  | 카카오 로그인 시작  |  302 |
| GET    | `/auth/oauth/kakao/callback`       | 카카오 OAuth 콜백   |  302 |
| GET    | `/auth/oauth/naver/authorization`  | 네이버 로그인 시작  |  302 |
| GET    | `/auth/oauth/naver/callback`       | 네이버 OAuth 콜백   |  302 |
| GET    | `/auth/oauth/google/authorization` | 구글 로그인 시작    |  302 |
| GET    | `/auth/oauth/google/callback`      | 구글 OAuth 콜백     |  302 |
| POST   | `/auth/token/refresh`              | Access Token 재발급 |  200 |
| POST   | `/auth/logout`                     | 로그아웃            |  204 |
| GET    | `/auth/me`                         | 내 회원 정보 조회   |  200 |

## 2.2 증권사·계좌

| Method | Path                                          | 설명                       | 성공 |
| ------ | --------------------------------------------- | -------------------------- | ---: |
| GET    | `/broker/providers`                           | 지원 증권사 목록           |  200 |
| GET    | `/broker/connections`                         | 내 증권사 연결 목록        |  200 |
| POST   | `/broker/connections`                         | 증권사 연결 및 최초 동기화 |  201 |
| GET    | `/broker/connections/{connectionId}`          | 연결 상세                  |  200 |
| GET    | `/broker/connections/{connectionId}/accounts` | 연결에 속한 계좌 목록      |  200 |
| POST   | `/broker/connections/{connectionId}/sync`     | 계좌·거래·보유 재동기화    |  200 |
| GET    | `/broker/accounts`                            | 전체 계좌 목록·요약        |  200 |
| GET    | `/broker/accounts/{accountId}`                | 계좌 상세·보유 종목        |  200 |
| PATCH  | `/broker/accounts/{accountId}`                | 계좌 이름 변경             |  200 |

## 2.3 투자 일지

| Method | Path                           | 설명                      | 성공 |
| ------ | ------------------------------ | ------------------------- | ---: |
| GET    | `/journal/entries`             | 기간별 일지 목록          |  200 |
| GET    | `/journal/entries/on/{date}`   | 날짜별 일지·거래 상세     |  200 |
| GET    | `/journal/entries/{journalId}` | 일지 ID로 상세 조회       |  200 |
| POST   | `/journal/entries`             | 일지 생성                 |  201 |
| PUT    | `/journal/entries/{journalId}` | 일지 전체 수정            |  200 |
| GET    | `/journal/trades`              | 종목별 거래·근거 타임라인 |  200 |

## 2.4 거래·보유 원장

| Method | Path                       | 설명           | 성공 |
| ------ | -------------------------- | -------------- | ---: |
| GET    | `/ledger/trades`           | 거래 목록 검색 |  200 |
| GET    | `/ledger/trades/{tradeId}` | 거래 상세      |  200 |
| GET    | `/ledger/holdings`         | 최신 보유 현황 |  200 |

## 2.5 시장·종목

| Method | Path                                         | 설명                              | 성공 | 연결 판단     |
| ------ | -------------------------------------------- | --------------------------------- | ---: | ------------- |
| GET    | `/market/securities`                         | 종목 검색·시장 필터·페이지네이션  |  200 | 가능          |
| GET    | `/market/securities/{securityId}`            | 종목 정보와 최신 시세 통합 상세   |  200 | 가능          |
| GET    | `/markets/securities/{stockCode}`            | 종목코드 기준 마스터 정보 조회    |  200 | 가능          |
| GET    | `/markets/securities/{stockCode}/prices`     | 특정 날짜 시세 조회               |  200 | 가능          |
| POST   | `/markets/securities/{stockCode}/sync-info`  | KIS 종목 정보 수동 동기화         |  200 | 관리자용 권장 |
| POST   | `/markets/securities/{stockCode}/sync-price` | KIS 오늘 시세 수동 동기화         |  200 | 관리자용 권장 |
| POST   | `/markets/securities/{stockCode}/sync`       | 종목 정보와 오늘 시세 동시 동기화 |  200 | 관리자용 권장 |

---

# 3. 인증 API

## 3.1 소셜 로그인 시작

### `GET /auth/oauth/{provider}/authorization`

지원 provider:

- `kakao`
- `naver`
- `google`

### Query

| 이름          | 타입   |   필수 | 설명                             |
| ------------- | ------ | -----: | -------------------------------- |
| `redirectUri` | string | 아니오 | 로그인 완료 후 돌아갈 프론트 URL |

예시:

```http
GET /auth/oauth/kakao/authorization?redirectUri=http%3A%2F%2Flocalhost%3A5173%2Foauth%2Fcomplete
```

### 성공 응답

```http
HTTP/1.1 302 Found
Location: {provider_authorization_url}
Set-Cookie: post_login_redirect=...; Path=/; Max-Age=300; HttpOnly; SameSite=Lax
```

네이버는 CSRF 검증용 `oauth_state` 쿠키도 추가로 설정합니다.

### 동작

- `redirectUri`가 서버의 허용 Origin으로 시작하면 5분간 HttpOnly 쿠키에 저장합니다.
- 허용되지 않은 URL이면 기본 프론트 URL로 대체합니다.
- 프론트에서는 Axios로 JSON을 받으려 하지 말고 브라우저 이동을 사용해야 합니다.

```ts
window.location.href =
  `${API_BASE_URL}/auth/oauth/kakao/authorization` +
  `?redirectUri=${encodeURIComponent(window.location.origin + '/oauth/complete')}`
```

---

## 3.2 소셜 로그인 Callback

### Kakao

```http
GET /auth/oauth/kakao/callback?code={authorizationCode}
```

### Naver

```http
GET /auth/oauth/naver/callback?code={authorizationCode}&state={state}
```

### Google

```http
GET /auth/oauth/google/callback?code={authorizationCode}
```

### 성공 응답

```http
HTTP/1.1 302 Found
Location: {saved_frontend_redirect_uri}
Set-Cookie: refreshToken={jwt}; Path=/; Max-Age=1209600; HttpOnly; SameSite=Lax
```

- Refresh Token은 JSON이 아니라 HttpOnly 쿠키로 저장됩니다.
- Access Token은 callback에서 반환하지 않습니다.
- 프론트로 돌아온 뒤 `POST /auth/token/refresh`를 호출해야 합니다.

### 주요 에러

| HTTP | errorCode        | 조건                                                                              |
| ---: | ---------------- | --------------------------------------------------------------------------------- |
|  400 | `AUTH_003`       | 네이버 state 쿠키와 query state 불일치                                            |
|  403 | `AUTH_005`       | 조회된 회원이 탈퇴 상태                                                           |
|  500 | `INTERNAL_ERROR` | OAuth HTTP 통신 실패, 응답 Body 누락, 응답 구조 불일치 등 현재 매핑되지 않은 예외 |

> `AUTH_004`는 ErrorCode에 선언되어 있지만 현재 OAuth Client 구현에서 해당 예외로 변환하는 코드가 없습니다. 따라서 프론트는 소셜 제공자 장애가 항상 `AUTH_004 / 502`로 온다고 가정하면 안 됩니다.

---

## 3.3 Access Token 재발급

### `POST /auth/token/refresh`

### Cookie

```http
Cookie: refreshToken={refreshToken}
```

Body 없음.

### 성공 `200`

```json
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer ",
  "expiresIn": 1800
}
```

> `tokenType` 값에 현재 **뒤쪽 공백이 포함**되어 있습니다.

프론트 권장:

```ts
const authorization = `Bearer ${response.accessToken}`
```

### 에러

| HTTP | errorCode  | 조건                     |
| ---: | ---------- | ------------------------ |
|  400 | `AUTH_002` | refreshToken 쿠키 없음   |
|  401 | `AUTH_007` | 유효하지 않은 토큰       |
|  401 | `AUTH_008` | 만료된 토큰              |
|  401 | `AUTH_009` | Refresh Token이 아닌 JWT |

### Axios

```ts
const { data } = await api.post('/auth/token/refresh', undefined, { withCredentials: true })
```

---

## 3.4 로그아웃

### `POST /auth/logout`

Body 없음.

### 성공 `204 No Content`

```http
Set-Cookie: refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax
```

- 서버는 Refresh Token 쿠키만 삭제합니다.
- 프론트가 메모리·스토리지에 보관한 Access Token은 직접 삭제해야 합니다.

---

## 3.5 내 정보 조회

### `GET /auth/me`

향후 인증 적용 후 요청:

```http
Authorization: Bearer {accessToken}
```

### 성공 `200`

```json
{
  "userId": 1,
  "oauthProvider": "KAKAO",
  "email": "user@example.com",
  "nickname": "상우",
  "userStatus": "ACTIVE",
  "createdAt": "2026-08-07T11:00:00"
}
```

### Enum

```text
oauthProvider: KAKAO | NAVER | GOOGLE
userStatus: ACTIVE | WITHDRAWN
```

### 에러

| HTTP | errorCode  | 조건                                 |
| ---: | ---------- | ------------------------------------ |
|  401 | `AUTH_007` | SecurityContext에 Long userId가 없음 |
|  404 | `AUTH_006` | 회원 없음                            |

> **현재 브랜치 주의:** JWT 필터가 Security Filter Chain에 등록되지 않아 이 API는 실질적으로 `AUTH_007`이 발생할 가능성이 높습니다.

---

# 4. 증권사·계좌 API

> 현재 모든 API는 인증 사용자 대신 `TEMP_USER_ID = 1L`을 사용합니다.

## 4.1 지원 증권사 목록

### `GET /broker/providers`

### 성공 `200`

```json
{
  "providers": [
    {
      "brokerId": 1,
      "brokerCode": "KB",
      "brokerName": "KB증권"
    }
  ]
}
```

빈 목록:

```json
{
  "providers": []
}
```

---

## 4.2 증권사 연결 목록

### `GET /broker/connections`

### 성공 `200`

```json
{
  "connections": [
    {
      "connectionId": 10,
      "brokerId": 1,
      "brokerCode": "KB",
      "brokerName": "KB증권",
      "connectionStatus": "CONNECTED",
      "connectedAt": "2026-08-07T01:00:00Z",
      "lastSyncedAt": "2026-08-07T01:05:00Z",
      "accountCount": 2
    }
  ]
}
```

### Enum

```text
connectionStatus:
PENDING | CONNECTED | ERROR | DISCONNECTED
```

---

## 4.3 증권사 연결 생성·최초 동기화

### `POST /broker/connections`

### Request

```json
{
  "brokerId": 1,
  "loginId": "broker-user-id",
  "password": "broker-password"
}
```

| 필드       | 타입   | 필수 | 서버 검증          |
| ---------- | ------ | ---: | ------------------ |
| `brokerId` | number |   예 | 1 이상             |
| `loginId`  | string |   예 | 공백 불가, 1~100자 |
| `password` | string |   예 | 공백 불가, 1~100자 |

### 성공 `201`

```json
{
  "connectionId": 10,
  "brokerId": 1,
  "brokerCode": "KB",
  "brokerName": "KB증권",
  "connectionStatus": "CONNECTED",
  "connectedAt": "2026-08-07T01:00:00Z",
  "lastSyncedAt": "2026-08-07T01:05:00Z",
  "syncResult": {
    "syncBatchId": 100,
    "syncStatus": "SUCCESS",
    "accountCount": 2,
    "insertedTradeCount": 35,
    "holdingCount": 8
  }
}
```

### 동기화 실패 시에도 연결 생성은 성공할 수 있음

외부 데이터 동기화 중 오류가 나면 HTTP 에러 대신 `201` 응답에서 다음처럼 표시될 수 있습니다.

```json
{
  "connectionId": 10,
  "brokerId": 1,
  "brokerCode": "KB",
  "brokerName": "KB증권",
  "connectionStatus": "CONNECTED",
  "connectedAt": "2026-08-07T01:00:00Z",
  "lastSyncedAt": null,
  "syncResult": {
    "syncBatchId": 100,
    "syncStatus": "FAILED",
    "accountCount": 0,
    "insertedTradeCount": 0,
    "holdingCount": 0
  }
}
```

프론트는 HTTP Status만 보지 말고 반드시 `syncResult.syncStatus`를 확인해야 합니다.

### Enum

```text
syncStatus:
REQUESTED | RUNNING | SUCCESS | FAILED
```

### 에러

| HTTP | errorCode | 조건                              |
| ---: | --------- | --------------------------------- |
|  400 | `BRK_004` | 요청 필드 검증 실패               |
|  401 | `BRK_003` | 증권사 로그인 실패                |
|  404 | `BRK_001` | brokerId에 해당하는 증권사 없음   |
|  409 | `BRK_002` | 같은 증권사에 이미 활성 연결 존재 |

필드 검증 실패 예시:

```json
{
  "errorCode": "BRK_004",
  "message": "계좌 연동 정보가 올바르지 않습니다.",
  "timestamp": "2026-08-07T01:00:00Z",
  "fieldErrors": [
    {
      "field": "brokerId",
      "message": "brokerId는 1 이상이어야 합니다."
    },
    {
      "field": "loginId",
      "message": "loginId는 1~100자여야 합니다."
    }
  ]
}
```

---

## 4.4 증권사 연결 상세

### `GET /broker/connections/{connectionId}`

### Path

| 이름           | 타입   | 필수 |
| -------------- | ------ | ---: |
| `connectionId` | number |   예 |

### 성공 `200`

```json
{
  "connectionId": 10,
  "brokerId": 1,
  "brokerCode": "KB",
  "brokerName": "KB증권",
  "connectionStatus": "CONNECTED",
  "connectedAt": "2026-08-07T01:00:00Z",
  "lastSyncedAt": "2026-08-07T01:05:00Z",
  "latestSync": {
    "syncBatchId": 100,
    "syncStatus": "SUCCESS",
    "requestedAt": "2026-08-07T01:00:10Z",
    "completedAt": "2026-08-07T01:05:00Z",
    "errorMessage": null
  }
}
```

동기화 이력이 없으면:

```json
{
  "connectionId": 10,
  "brokerId": 1,
  "brokerCode": "KB",
  "brokerName": "KB증권",
  "connectionStatus": "CONNECTED",
  "connectedAt": "2026-08-07T01:00:00Z",
  "lastSyncedAt": null,
  "latestSync": null
}
```

### 에러

| HTTP | errorCode |
| ---: | --------- |
|  404 | `BRK_005` |

---

## 4.5 연결별 계좌 목록

### `GET /broker/connections/{connectionId}/accounts`

### 성공 `200`

```json
{
  "connectionId": 10,
  "brokerId": 1,
  "brokerName": "KB증권",
  "accounts": [
    {
      "accountId": 21,
      "accountNoMasked": "123****4567",
      "accountName": "종합위탁",
      "accountType": "STOCK",
      "holdingCount": 4,
      "totalMarketValue": 12500000,
      "totalUnrealizedPnl": 350000
    }
  ]
}
```

### Enum

```text
accountType:
STOCK | ISA | PENSION | ETC
```

### 에러

| HTTP | errorCode |
| ---: | --------- |
|  404 | `BRK_005` |

---

## 4.6 연결 재동기화

### `POST /broker/connections/{connectionId}/sync`

Body 없음.

### 성공 `200`

```json
{
  "syncBatchId": 101,
  "connectionId": 10,
  "syncStatus": "SUCCESS",
  "requestedAt": "2026-08-07T02:00:00Z",
  "completedAt": "2026-08-07T02:00:10Z",
  "accountCount": 2,
  "insertedTradeCount": 3,
  "skippedTradeCount": 32,
  "holdingCount": 8
}
```

동기화 실행 중 내부 오류가 나도 HTTP `200`으로 내려오며:

```json
{
  "syncBatchId": 101,
  "connectionId": 10,
  "syncStatus": "FAILED",
  "requestedAt": "2026-08-07T02:00:00Z",
  "completedAt": null,
  "accountCount": 0,
  "insertedTradeCount": 0,
  "skippedTradeCount": 0,
  "holdingCount": 0
}
```

### 에러

| HTTP | errorCode |
| ---: | --------- |
|  404 | `BRK_005` |

---

## 4.7 전체 계좌 목록·요약

### `GET /broker/accounts`

### 성공 `200`

```json
{
  "summary": {
    "accountCount": 2,
    "totalMarketValue": 20000000,
    "totalUnrealizedPnl": 500000
  },
  "accounts": [
    {
      "accountId": 21,
      "connectionId": 10,
      "brokerId": 1,
      "brokerName": "KB증권",
      "accountNoMasked": "123****4567",
      "accountName": "종합위탁",
      "accountType": "STOCK",
      "holdingCount": 4,
      "totalMarketValue": 12500000,
      "totalUnrealizedPnl": 350000,
      "lastSyncedAt": "2026-08-07T02:00:10Z"
    }
  ]
}
```

계좌 없음:

```json
{
  "summary": {
    "accountCount": 0,
    "totalMarketValue": 0,
    "totalUnrealizedPnl": 0
  },
  "accounts": []
}
```

> 이 API의 합계 금액은 서버에서 `BigDecimal.longValue()`로 변환됩니다. 소수점이 존재하면 버려집니다.

---

## 4.8 계좌 상세·보유 종목

### `GET /broker/accounts/{accountId}`

### 성공 `200`

```json
{
  "accountId": 21,
  "connectionId": 10,
  "brokerId": 1,
  "brokerName": "KB증권",
  "accountNoMasked": "123****4567",
  "accountName": "종합위탁",
  "accountType": "STOCK",
  "lastSyncedAt": "2026-08-07T02:00:10Z",
  "summary": {
    "holdingCount": 2,
    "totalMarketValue": 12500000.0,
    "totalUnrealizedPnl": 350000.0
  },
  "holdings": [
    {
      "securityId": 1001,
      "securityCode": "005930",
      "securityName": "삼성전자",
      "marketType": "KOSPI",
      "quantity": 10,
      "averageCost": 70000.0,
      "marketValue": 750000.0,
      "unrealizedPnl": 50000.0,
      "portfolioWeight": 6.0,
      "snapshotDate": "2026-08-07"
    }
  ]
}
```

### 에러

| HTTP | errorCode |
| ---: | --------- |
|  404 | `BRK_006` |

---

## 4.9 계좌 이름 변경

### `PATCH /broker/accounts/{accountId}`

### Request

```json
{
  "accountName": "장기 투자 계좌"
}
```

### 성공 `200`

```json
{
  "accountId": 21,
  "accountNoMasked": "123****4567",
  "accountName": "장기 투자 계좌",
  "accountType": "STOCK"
}
```

### 에러

| HTTP | errorCode |
| ---: | --------- |
|  404 | `BRK_006` |

> 현재 `accountName`의 null, 빈 문자열, 길이에 대한 명시적 서비스 검증이 없습니다. 프론트에서 빈 값 제출을 막아야 하며 백엔드에도 검증 추가를 권장합니다.

---

# 5. 투자 일지 API

> 현재 모든 API는 `TEMP_USER_ID = 1L`을 사용합니다.

## 5.1 기간별 일지 목록

### `GET /journal/entries`

### Query

| 이름        | 타입 | 필수 | 형식         |
| ----------- | ---- | ---: | ------------ |
| `startDate` | date |   예 | `YYYY-MM-DD` |
| `endDate`   | date |   예 | `YYYY-MM-DD` |

```http
GET /journal/entries?startDate=2026-08-01&endDate=2026-08-07
```

### 성공 `200`

```json
{
  "entries": [
    {
      "journalId": 301,
      "journalDate": "2026-08-07",
      "marketMood": "CAUTIOUS",
      "tradeCount": 3,
      "tradeNoteCount": 2,
      "createdAt": "2026-08-07T01:30:00Z",
      "editableUntilAt": "2026-08-08T00:00:00Z",
      "isBackfilled": false,
      "isEditable": true
    }
  ]
}
```

### Enum

```text
marketMood:
CAUTIOUS | CONFIDENT | ANXIOUS | CALM
```

`marketMood`는 생성·수정 시 null 허용이므로 응답에서도 null일 수 있습니다.

### 에러

| HTTP | errorCode | 조건                         |
| ---: | --------- | ---------------------------- |
|  400 | `JNL_005` | startDate가 endDate보다 늦음 |

---

## 5.2 날짜별 일지·거래 상세

### `GET /journal/entries/on/{date}`

```http
GET /journal/entries/on/2026-08-07
```

### 성공: 일지 있음 `200`

```json
{
  "journalDate": "2026-08-07",
  "canCreate": false,
  "journal": {
    "journalId": 301,
    "marketThought": "변동성이 커서 신규 매수를 줄였다.",
    "marketMood": "CAUTIOUS",
    "createdAt": "2026-08-07T01:30:00Z",
    "updatedAt": "2026-08-07T01:45:00Z",
    "editableUntilAt": "2026-08-08T00:00:00Z",
    "isBackfilled": false,
    "isEditable": true
  },
  "trades": [
    {
      "tradeId": 5001,
      "securityId": 1001,
      "securityCode": "005930",
      "securityName": "삼성전자",
      "tradeSide": "BUY",
      "quantity": 10,
      "unitPrice": 70000.0,
      "tradedAt": "2026-08-07T00:30:00Z",
      "note": {
        "journalTradeNoteId": 801,
        "rationaleText": "지지선 부근에서 분할 매수했다.",
        "createdAt": "2026-08-07T01:30:00Z",
        "updatedAt": "2026-08-07T01:30:00Z"
      }
    }
  ]
}
```

### 성공: 일지 없음 `200`

```json
{
  "journalDate": "2026-08-07",
  "canCreate": true,
  "journal": null,
  "trades": []
}
```

- 해당 날짜 일지가 없어도 404가 아니라 200입니다.
- 거래가 있으면 일지 작성 전에도 `trades`에 거래 목록이 내려옵니다.
- 미래 날짜이면 `canCreate=false`입니다.

---

## 5.3 일지 ID 상세 조회

### `GET /journal/entries/{journalId}`

응답은 날짜별 상세 API와 동일한 `JournalDetailResponse`입니다.

### 에러

| HTTP | errorCode |
| ---: | --------- |
|  404 | `JNL_009` |

다른 사용자의 일지 ID도 정보 노출 방지를 위해 동일하게 `JNL_009` 처리합니다.

---

## 5.4 일지 생성

### `POST /journal/entries`

### Request

```json
{
  "journalDate": "2026-08-07",
  "marketThought": "변동성이 커서 신규 매수를 줄였다.",
  "marketMood": "CAUTIOUS",
  "tradeNotes": [
    {
      "tradeId": 5001,
      "rationaleText": "지지선 부근에서 분할 매수했다."
    }
  ]
}
```

| 필드                         | 타입       |   필수 | 비고                                |
| ---------------------------- | ---------- | -----: | ----------------------------------- |
| `journalDate`                | date       |     예 | 미래 날짜 불가                      |
| `marketThought`              | string     |     예 | null 불가                           |
| `marketMood`                 | enum/null  | 아니오 | null 허용                           |
| `tradeNotes`                 | array/null | 아니오 | null은 빈 배열로 처리               |
| `tradeNotes[].tradeId`       | number     |     예 | 해당 사용자의 같은 날짜 거래여야 함 |
| `tradeNotes[].rationaleText` | string     |     예 | 도메인 객체 생성 시 null 불가       |

### 성공 `201`

```json
{
  "journalId": 301,
  "createdAt": "2026-08-07T01:30:00Z"
}
```

### 에러

| HTTP | errorCode | 조건                                        |
| ---: | --------- | ------------------------------------------- |
|  400 | `JNL_003` | 다른 날짜 거래 또는 사용자 소유가 아닌 거래 |
|  400 | `JNL_004` | tradeNotes 안에 동일 tradeId 중복           |
|  400 | `JNL_006` | 필수 일지·근거 데이터가 null                |
|  400 | `JNL_008` | 미래 날짜                                   |
|  409 | `JNL_001` | 같은 날짜 일지가 이미 존재                  |

---

## 5.5 일지 수정

### `PUT /journal/entries/{journalId}`

부분 수정이 아니라 전체 교체 방식입니다.

### Request

```json
{
  "marketThought": "장 마감 후 판단을 수정했다.",
  "marketMood": "CALM",
  "tradeNotes": [
    {
      "tradeId": 5001,
      "rationaleText": "장기 관점의 1차 매수였다."
    }
  ]
}
```

- 요청에서 빠진 기존 거래 근거는 삭제됩니다.
- 같은 tradeId가 있으면 근거가 갱신되고, 없으면 생성됩니다.
- `tradeNotes: null`은 모든 근거를 제거하는 것과 동일하게 처리됩니다.

### 성공 `200`

```json
{
  "journalId": 301,
  "updatedAt": "2026-08-07T02:30:00Z"
}
```

### 에러

| HTTP | errorCode | 조건                            |
| ---: | --------- | ------------------------------- |
|  400 | `JNL_003` | 거래 날짜·소유권 불일치         |
|  400 | `JNL_004` | tradeId 중복                    |
|  400 | `JNL_006` | 일지 데이터 오류                |
|  404 | `JNL_009` | 일지 없음 또는 다른 사용자 소유 |
|  409 | `JNL_002` | 수정 가능 시간 만료             |

### 수정 가능 시간

생성한 시점의 **UTC 날짜 다음 날 00:00 UTC**까지 수정 가능합니다. 한국 시간으로는 오전 9시에 해당합니다.

---

## 5.6 종목별 거래·근거 타임라인

### `GET /journal/trades`

### Query

| 이름         | 타입    |   필수 | 기본값 |
| ------------ | ------- | -----: | ------ |
| `securityId` | number  |     예 | -      |
| `startDate`  | date    | 아니오 | 없음   |
| `endDate`    | date    | 아니오 | 없음   |
| `page`       | integer | 아니오 | `0`    |
| `size`       | integer | 아니오 | `20`   |

```http
GET /journal/trades?securityId=1001&startDate=2026-01-01&endDate=2026-08-07&page=0&size=20
```

### 성공 `200`

```json
{
  "security": {
    "securityId": 1001,
    "securityCode": "005930",
    "securityName": "삼성전자",
    "marketType": "KOSPI"
  },
  "trades": [
    {
      "tradeId": 5001,
      "accountId": 21,
      "accountName": "종합위탁",
      "tradeSide": "BUY",
      "quantity": 10,
      "unitPrice": 70000.0,
      "transactionCostAmount": 100.0,
      "tradedAt": "2026-08-07T00:30:00Z",
      "note": {
        "journalTradeNoteId": 801,
        "journalId": 301,
        "journalDate": "2026-08-07",
        "rationaleText": "지지선 부근에서 분할 매수했다.",
        "createdAt": "2026-08-07T01:30:00Z",
        "updatedAt": "2026-08-07T01:30:00Z"
      }
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

거래 근거가 없으면 `note: null`입니다.

### Enum

```text
tradeSide: BUY | SELL
marketType: KOSPI | KOSDAQ | KONEX
```

### 에러

| HTTP | errorCode | 조건                            |
| ---: | --------- | ------------------------------- |
|  400 | `JNL_005` | startDate > endDate             |
|  400 | `JNL_010` | page < 0 또는 size < 1          |
|  404 | `JNL_007` | securityId에 해당하는 종목 없음 |

---

# 6. 거래·보유 원장 API

> 현재 모든 API는 `TEMP_USER_ID = 1L`을 사용합니다.

## 6.1 거래 목록 검색

### `GET /ledger/trades`

### Query

| 이름         | 타입    |   필수 | 기본값·제약                      |
| ------------ | ------- | -----: | -------------------------------- |
| `accountId`  | number  | 아니오 | 특정 계좌                        |
| `securityId` | number  | 아니오 | 특정 종목                        |
| `tradeSide`  | string  | 아니오 | `BUY` 또는 `SELL`, 대소문자 구분 |
| `from`       | date    | 아니오 | `YYYY-MM-DD`                     |
| `to`         | date    | 아니오 | `YYYY-MM-DD`                     |
| `page`       | integer | 아니오 | 기본 0, 0 이상                   |
| `size`       | integer | 아니오 | 기본 20, 1~100                   |

```http
GET /ledger/trades?accountId=21&tradeSide=BUY&from=2026-01-01&to=2026-08-07&page=0&size=20
```

### 성공 `200`

```json
{
  "content": [
    {
      "tradeId": 5001,
      "accountId": 21,
      "accountName": "종합위탁",
      "securityId": 1001,
      "securityCode": "005930",
      "securityName": "삼성전자",
      "marketType": "KOSPI",
      "tradeSide": "BUY",
      "quantity": 10,
      "unitPrice": 70000.0,
      "tradeAmount": 700000.0,
      "transactionCostAmount": 100.0,
      "tradedAt": "2026-08-07T00:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "hasNext": false
}
```

### 에러

| HTTP | errorCode                     | 조건                                  |
| ---: | ----------------------------- | ------------------------------------- |
|  400 | `LEDGER_INVALID_DATE_RANGE`   | from > to                             |
|  400 | `LEDGER_INVALID_TRADE_SIDE`   | BUY/SELL 이외 값                      |
|  400 | `LEDGER_INVALID_PAGE_REQUEST` | page < 0, size < 1, size > 100        |
|  404 | `ACCOUNT_NOT_FOUND`           | accountId가 없거나 사용자 소유가 아님 |

### 참고

- `securityId`가 존재하지 않아도 별도 404 검증 없이 빈 결과가 나올 수 있습니다.
- 계좌가 하나도 없는 사용자는 빈 페이지를 받습니다.

---

## 6.2 거래 상세

### `GET /ledger/trades/{tradeId}`

### 성공 `200`

```json
{
  "tradeId": 5001,
  "account": {
    "accountId": 21,
    "accountName": "종합위탁",
    "accountNumberMasked": "123****4567",
    "brokerageName": "KB증권"
  },
  "security": {
    "securityId": 1001,
    "securityCode": "005930",
    "securityName": "삼성전자",
    "marketType": "KOSPI",
    "sectorName": "전기전자"
  },
  "tradeSide": "BUY",
  "quantity": 10,
  "unitPrice": 70000.0,
  "tradeAmount": 700000.0,
  "transactionCostAmount": 100.0,
  "settlementAmount": 700100.0,
  "tradedAt": "2026-08-07T00:30:00Z"
}
```

종목 메타데이터를 찾지 못하면 `securityId`만 유지되고 나머지 종목 필드는 null일 수 있습니다.

### 에러

| HTTP | errorCode         |
| ---: | ----------------- |
|  404 | `TRADE_NOT_FOUND` |

거래가 없거나 다른 사용자의 계좌에 속한 거래인 경우 모두 동일하게 처리합니다.

---

## 6.3 최신 보유 현황

### `GET /ledger/holdings`

### Query

| 이름         | 타입   |   필수 | 설명             |
| ------------ | ------ | -----: | ---------------- |
| `accountId`  | number | 아니오 | 특정 계좌만 조회 |
| `securityId` | number | 아니오 | 특정 종목만 조회 |

### 성공 `200`

```json
{
  "snapshotDate": "2026-08-07",
  "summary": {
    "holdingCount": 2,
    "totalPurchaseAmount": 12000000.0,
    "totalMarketValue": 12500000.0,
    "totalProfitLossAmount": 500000.0,
    "totalReturnRate": 4.1666666667
  },
  "holdings": [
    {
      "securityId": 1001,
      "securityCode": "005930",
      "securityName": "삼성전자",
      "marketType": "KOSPI",
      "sectorName": "전기전자",
      "quantity": 10,
      "averagePurchasePrice": 70000.0,
      "currentPrice": 75000.0,
      "purchaseAmount": 700000.0,
      "marketValue": 750000.0,
      "profitLossAmount": 50000.0,
      "returnRate": 7.1428571429,
      "portfolioWeight": 6.0
    }
  ]
}
```

빈 보유 현황:

```json
{
  "snapshotDate": null,
  "summary": {
    "holdingCount": 0,
    "totalPurchaseAmount": 0,
    "totalMarketValue": 0,
    "totalProfitLossAmount": 0,
    "totalReturnRate": 0
  },
  "holdings": []
}
```

### 집계 방식

- `accountId`가 없으면 사용자의 모든 계좌를 합칩니다.
- 같은 종목은 계좌가 달라도 한 항목으로 합칩니다.
- 평균 매입가 = 전체 매입금액 합 ÷ 전체 수량 합
- 수익률과 비중의 단위는 0~1 비율이 아니라 **퍼센트 값**입니다.
  - 예: `7.14` = 7.14%
- 평가금액이 큰 종목부터 내림차순 정렬됩니다.
- 수량이 0 이하인 보유 항목은 제외됩니다.

### 에러

| HTTP | errorCode           |
| ---: | ------------------- |
|  404 | `ACCOUNT_NOT_FOUND` |

---

# 7. Enum 모음

## Auth

```ts
type OAuthProvider = 'KAKAO' | 'NAVER' | 'GOOGLE'
type UserStatus = 'ACTIVE' | 'WITHDRAWN'
```

## Broker

```ts
type AccountType = 'STOCK' | 'ISA' | 'PENSION' | 'ETC'

type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED'

type SyncStatus = 'REQUESTED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
```

## Journal·Ledger

```ts
type MarketMood = 'CAUTIOUS' | 'CONFIDENT' | 'ANXIOUS' | 'CALM'

type TradeSide = 'BUY' | 'SELL'

type MarketType = 'KOSPI' | 'KOSDAQ' | 'KONEX'
```

---

# 8. 에러 코드 전체표

## Auth

| HTTP | Code       | Message                                                            |
| ---: | ---------- | ------------------------------------------------------------------ |
|  400 | `AUTH_001` | 지원하지 않는 소셜 로그인 제공자입니다.                            |
|  400 | `AUTH_002` | 요청 값이 올바르지 않습니다.                                       |
|  400 | `AUTH_003` | OAuth state 값이 일치하지 않습니다. 인가 요청을 다시 시도해주세요. |
|  502 | `AUTH_004` | 소셜 로그인 인증에 실패했습니다.                                   |
|  403 | `AUTH_005` | 탈퇴한 회원입니다.                                                 |
|  404 | `AUTH_006` | 존재하지 않는 회원입니다.                                          |
|  401 | `AUTH_007` | 유효하지 않은 토큰입니다.                                          |
|  401 | `AUTH_008` | 만료된 토큰입니다.                                                 |
|  401 | `AUTH_009` | 리프레시 토큰이 아닙니다.                                          |

## Broker

| HTTP | Code      | Message                                                          |
| ---: | --------- | ---------------------------------------------------------------- |
|  404 | `BRK_001` | 존재하지 않는 증권사입니다.                                      |
|  409 | `BRK_002` | 이미 연동된 증권사입니다.                                        |
|  401 | `BRK_003` | 증권사 인증에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요. |
|  400 | `BRK_004` | 계좌 연동 정보가 올바르지 않습니다.                              |
|  404 | `BRK_005` | 존재하지 않는 증권사 연결입니다.                                 |
|  404 | `BRK_006` | 존재하지 않는 계좌입니다.                                        |

## Journal

| HTTP | Code      | Message                                    |
| ---: | --------- | ------------------------------------------ |
|  409 | `JNL_001` | 이미 작성된 일지가 존재합니다.             |
|  409 | `JNL_002` | 투자일지 수정 가능 시간이 지났습니다.      |
|  400 | `JNL_003` | 거래 일자와 일지 날짜가 일치하지 않습니다. |
|  400 | `JNL_004` | 이미 등록된 거래 근거입니다.               |
|  400 | `JNL_005` | 조회 기간이 올바르지 않습니다.             |
|  400 | `JNL_006` | 투자일지 데이터가 올바르지 않습니다.       |
|  404 | `JNL_007` | 거래 종목 정보를 찾을 수 없습니다.         |
|  400 | `JNL_008` | 미래 날짜의 투자일지는 작성할 수 없습니다. |
|  404 | `JNL_009` | 투자일지를 찾을 수 없습니다.               |
|  400 | `JNL_010` | 페이지 조회 조건이 올바르지 않습니다.      |

## Ledger

| HTTP | Code                          | Message                                    |
| ---: | ----------------------------- | ------------------------------------------ |
|  404 | `TRADE_NOT_FOUND`             | 거래내역을 찾을 수 없습니다.               |
|  404 | `ACCOUNT_NOT_FOUND`           | 계좌를 찾을 수 없습니다.                   |
|  400 | `LEDGER_INVALID_DATE_RANGE`   | 조회 시작일은 종료일보다 늦을 수 없습니다. |
|  400 | `LEDGER_INVALID_TRADE_SIDE`   | 매매 구분은 BUY 또는 SELL이어야 합니다.    |
|  400 | `LEDGER_INVALID_PAGE_REQUEST` | 페이지 번호와 조회 개수를 확인해 주세요.   |
|  400 | `LEDGER_INVALID_TRADE_ID`     | 올바르지 않은 거래 ID입니다.               |
|  400 | `LEDGER_INVALID_ACCOUNT_ID`   | 올바르지 않은 계좌 ID입니다.               |
|  400 | `LEDGER_INVALID_SECURITY_ID`  | 올바르지 않은 종목 ID입니다.               |
|  400 | `LEDGER_INVALID_TRADE_DATA`   | 거래 데이터가 올바르지 않습니다.           |
|  400 | `LEDGER_INVALID_HOLDING_DATA` | 보유현황 데이터가 올바르지 않습니다.       |

일부 Ledger validation code는 enum에는 있으나 현재 조회 서비스 경로에서 직접 사용되지 않습니다.

---

# 9. 시장·종목 API

## 9.1 종목 목록 검색

### `GET /market/securities`

종목명 또는 종목코드 부분 일치 검색, 시장 구분 필터와 페이지네이션을 제공합니다.

### Query

| 이름         | 타입    |   필수 | 기본값 | 설명                                  |
| ------------ | ------- | -----: | -----: | ------------------------------------- |
| `keyword`    | string  | 아니오 | `null` | 종목명·종목코드 부분 일치             |
| `marketType` | string  | 아니오 | `null` | `KOSPI`, `KOSDAQ`; 소문자 입력도 허용 |
| `page`       | integer | 아니오 |    `0` | 0부터 시작                            |
| `size`       | integer | 아니오 |   `20` | 페이지 크기                           |

```http
GET /market/securities?keyword=삼성&marketType=KOSPI&page=0&size=20
```

### 성공 `200`

```json
{
  "securities": [
    {
      "securityId": 1001,
      "securityCode": "005930",
      "securityName": "삼성전자",
      "marketType": "KOSPI",
      "sectorName": "032",
      "industryName": "전자부품 제조업"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### 검색 동작

- `keyword`는 앞뒤 공백을 제거합니다.
- 빈 문자열 keyword는 조건 없음으로 처리합니다.
- 종목명과 종목코드에 `LIKE %keyword%`를 적용합니다.
- 정렬은 `security_code ASC`입니다.
- `marketType`은 trim 후 대문자로 변환합니다.

### 에러·주의사항

| HTTP | Code                  | 조건                                             |
| ---: | --------------------- | ------------------------------------------------ |
|  400 | `MKT_005`             | marketType이 enum으로 변환되지 않음              |
|  500 | `INTERNAL_ERROR` 가능 | 음수 page·size 등으로 SQL LIMIT/OFFSET 오류 발생 |

> `page >= 0`, `size > 0`, 최대 size 제한이 없습니다. 프론트는 일단 `page >= 0`, `1 <= size <= 100` 범위로 제한하는 편이 안전합니다.

---

## 9.2 종목 통합 상세

### `GET /market/securities/{securityId}`

목록 API가 반환한 내부 `securityId`로 종목 정보와 가장 최근 시세를 조회합니다.

```http
GET /market/securities/1001
```

### Path

| 이름         | 타입   | 필수 | 설명                             |
| ------------ | ------ | ---: | -------------------------------- |
| `securityId` | number |   예 | `securities.security_id` 내부 PK |

### 성공: 최신 시세 있음 `200`

```json
{
  "securityId": 1001,
  "securityCode": "005930",
  "securityName": "삼성전자",
  "marketType": "KOSPI",
  "sectorName": "032",
  "industryName": "전자부품 제조업",
  "latestPrice": {
    "priceDate": "2026-08-07",
    "openPrice": 71000,
    "highPrice": 72100,
    "lowPrice": 70200,
    "closePrice": 71800,
    "dailyReturnRate": 1.41,
    "tradingVolume": 14520321,
    "tradingValue": 1035000000000.0
  }
}
```

### 성공: 저장된 시세 없음 `200`

```json
{
  "securityId": 1001,
  "securityCode": "005930",
  "securityName": "삼성전자",
  "marketType": "KOSPI",
  "sectorName": "032",
  "industryName": "전자부품 제조업",
  "latestPrice": null
}
```

### 에러

| HTTP | Code      | 조건                            |
| ---: | --------- | ------------------------------- |
|  404 | `MKT_001` | securityId에 해당하는 종목 없음 |

### 구현 확인

최신 커밋에서 서비스가 다음 조회를 사용하도록 수정됐습니다.

```java
stockRepository.findBySecurityId(securityId)
```

> `sectorName`에는 현재 표준산업분류 코드가, `industryName`에는 표준산업분류명이 매핑됩니다. 이름만 보면 sector의 표시명처럼 보이므로 프론트에서는 라벨을 “산업분류 코드/산업분류명”으로 표시하는 편이 정확합니다.

---

## 9.3 종목코드 기준 마스터 정보 조회

### `GET /markets/securities/{stockCode}`

`stockCode`는 종목 단축코드입니다. 이전 검증본의 `/market/securities/{stockCode}`에서 **`markets` 복수형으로 변경됐습니다.**

```http
GET /markets/securities/005930
```

### 성공 `200`

```json
{
  "securityId": 1001,
  "stockCode": "005930",
  "stockName": "삼성전자",
  "marketType": "KOSPI",
  "stdIdstClsfCode": "032",
  "stdIdstClsfName": "전자부품 제조업",
  "listedDate": "1975-06-11",
  "delistedDate": null,
  "active": true,
  "updatedAt": "2026-08-07T08:30:00"
}
```

### 에러

| HTTP | Code      | 조건                           |
| ---: | --------- | ------------------------------ |
|  404 | `MKT_001` | stockCode에 해당하는 종목 없음 |

---

## 9.4 특정 날짜 시세 조회

### `GET /markets/securities/{stockCode}/prices`

### Query

| 이름   | 타입 |   필수 | 기본값                   |
| ------ | ---- | -----: | ------------------------ |
| `date` | date | 아니오 | 서버의 `LocalDate.now()` |

```http
GET /markets/securities/005930/prices?date=2026-08-07
```

`date`를 생략하면 서버 기본 시간대 기준 오늘 날짜를 사용합니다.

### 성공 `200`

```json
{
  "securityId": 1001,
  "priceDate": "2026-08-07",
  "lowPrice": 70200,
  "highPrice": 72100,
  "openPrice": 71000,
  "closePrice": 71800,
  "dailyReturnRate": 1.41,
  "tradingVolume": 14520321,
  "tradingValue": 1035000000000.0
}
```

### 에러

| HTTP | Code      | 조건                       |
| ---: | --------- | -------------------------- |
|  404 | `MKT_001` | 종목 없음                  |
|  404 | `MKT_004` | 해당 날짜 시세가 DB에 없음 |

---

## 9.5 종목 정보 수동 동기화

### `POST /markets/securities/{stockCode}/sync-info`

KIS에서 종목 마스터 정보를 가져와 `securities` 테이블에 upsert합니다. Body는 없습니다.

```http
POST /markets/securities/005930/sync-info
```

### 성공 `200`

응답은 `GET /markets/securities/{stockCode}`와 같은 `StockResponse`입니다.

### 주요 에러

| HTTP | Code             | 조건                                             |
| ---: | ---------------- | ------------------------------------------------ |
|  502 | `MKT_003`        | KIS HTTP 오류, 네트워크 오류 또는 응답 Body 없음 |
|  500 | `INTERNAL_ERROR` | 비정상 응답 구조, 파싱·DB 저장 오류 등           |

> 현재 인증 없이 호출할 수 있으므로 일반 사용자 UI에 직접 연결하지 않는 것이 좋습니다.

---

## 9.6 오늘 시세 수동 동기화

### `POST /markets/securities/{stockCode}/sync-price`

KIS에서 오늘 날짜의 시세를 가져와 저장합니다. 종목이 DB에 없으면 종목 정보부터 동기화합니다.

```http
POST /markets/securities/005930/sync-price
```

### 성공 `200`

`StockPriceResponse`를 반환합니다.

### 주요 에러

| HTTP | Code             | 조건                                            |
| ---: | ---------------- | ----------------------------------------------- |
|  502 | `MKT_003`        | KIS 호출 실패                                   |
|  500 | `INTERNAL_ERROR` | 응답 필드 파싱, 출력 객체 누락, DB 저장 오류 등 |

---

## 9.7 종목 정보·오늘 시세 동시 동기화

### `POST /markets/securities/{stockCode}/sync`

```http
POST /markets/securities/005930/sync
```

### 성공 `200`

응답 Body가 없습니다.

```http
HTTP/1.1 200 OK
```

> `STOCK_INFO_REFRESH_INTERVAL_DAYS`가 현재 `0`이므로 기존 종목도 종목 정보와 시세를 모두 다시 요청할 가능성이 큽니다.

---

## 9.8 Market 에러 코드

| HTTP | Code      | Message                                               |
| ---: | --------- | ----------------------------------------------------- |
|  404 | `MKT_001` | 존재하지 않는 종목입니다.                             |
|  400 | `MKT_002` | 종목 정보가 올바르지 않습니다.                        |
|  502 | `MKT_003` | 한국투자증권 API 연동 중 오류가 발생했습니다.         |
|  404 | `MKT_004` | 해당 날짜의 시세 정보가 없습니다.                     |
|  400 | `MKT_005` | marketType은 KOSPI, KOSDAQ, KONEX 중 하나여야 합니다. |

> 실제 `MarketType` enum은 현재 `KOSPI`, `KOSDAQ`만 지원하지만 `MKT_005` 메시지에는 `KONEX`가 포함되어 있습니다.

---

## 9.9 Market 배치·KIS 구현상 주의사항

### 실제 스케줄

```text
0 6 10 * * MON-FRI
```

- 실제 실행 시각은 평일 `10:06`입니다.
- `@Scheduled`에 `zone`이 없으므로 서버 기본 시간대를 사용합니다.
- 코드 주석의 “평일 17:00, KST” 설명과 현재 설정은 일치하지 않습니다.

### 종목 정보 갱신 주기

```java
STOCK_INFO_REFRESH_INTERVAL_DAYS = 0
```

조건식이 `updatedAt < now - 0일` 형태이므로 이미 저장된 종목도 거의 항상 정보 갱신 대상으로 판단됩니다.

### KIS Access Token 캐시

코드 주석은 토큰을 만료 1분 전에 폐기한다고 설명하지만 실제 계산은 다음과 같습니다.

```java
expiresInSeconds - 60 * 60 * 2
```

즉 만료시간에서 2시간을 뺍니다. `expires_in`이 2시간 이하라면 캐시가 즉시 만료되어 요청 때마다 토큰을 다시 발급할 가능성이 있습니다.

### KIS Business Error 검증

KIS 응답의 HTTP 상태는 검사하지만 HTTP `200` 안에 담긴 `rt_cd`, `msg_cd`, `msg1` 같은 업무 오류 값을 명시적으로 검증하지 않습니다. `output`이 null이거나 숫자·날짜 필드가 예상 형식과 다르면 `MKT_003`이 아니라 `INTERNAL_ERROR` 500이 될 수 있습니다.

---

# 10. 프론트 연동 권장 구조

## 10.1 Vite Proxy

현재 CORS 설정이 비활성화되어 있으므로 개발 환경에서는 proxy 사용을 권장합니다.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

프론트에서는:

```ts
const API_BASE_URL = '/api'
```

---

## 10.2 Axios Instance

```ts
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})
```

현재 `broker`, `journal`, `ledger`는 토큰을 읽지 않지만 향후 인증 전환을 고려해 헤더 구조를 미리 적용하는 것이 좋습니다.

---

## 10.3 OAuth 로그인 흐름

```text
1. 브라우저를 /auth/oauth/{provider}/authorization으로 이동
2. OAuth 제공자 로그인
3. 백엔드 callback
4. 백엔드가 refreshToken HttpOnly 쿠키 저장
5. 프론트 redirectUri로 302 이동
6. 프론트가 POST /auth/token/refresh 호출
7. 받은 accessToken을 메모리 상태에 저장
8. 이후 Authorization 헤더 첨부
```

---

## 10.4 프론트 에러 처리 타입

```ts
export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  errorCode: string
  message: string
  timestamp: string
  fieldErrors?: ApiFieldError[]
}
```

Axios 처리 예시:

```ts
import axios from 'axios'

export function getApiError(error: unknown): ApiErrorResponse | null {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return null
  }
  return error.response?.data ?? null
}
```

---

# 11. 백엔드 수정 우선순위

프론트 개발과 병행하되, 실제 사용자 대상 배포 전에는 다음 순서로 수정하는 것을 권장합니다.

## P0 — 보안·사용자 격리

1. **JWT 필터 활성화와 `TEMP_USER_ID` 제거**
   - Broker·Journal·Ledger가 `SecurityContext`의 userId를 사용하도록 변경해야 합니다.
   - 이 작업 후 `/auth/me`도 정상적으로 사용할 수 있습니다.

2. **CORS 또는 동일 Origin 배포 구조 확정**
   - 쿠키를 사용하면 `allowCredentials=true`와 명시적 Origin 설정이 필요합니다.
   - 프론트·백엔드가 서로 다른 사이트라면 `SameSite=Lax` 정책도 재설계해야 합니다.

3. **KIS 수동 동기화 API 보호**
   - 관리자 권한, 내부 네트워크 또는 운영 비활성화 중 하나가 필요합니다.
   - 현재는 인증 없이 외부 API 호출과 DB 쓰기를 유발할 수 있습니다.

## P1 — 요청·오류 계약 안정화

4. **Spring MVC 입력 예외 Handler 추가**
   - 필수 Query 누락
   - 날짜·숫자 형식 오류
   - JSON 파싱 오류
   - PathVariable 타입 오류
   - 현재는 위 오류가 `INTERNAL_ERROR / 500`이 될 수 있습니다.

5. **Request DTO Bean Validation 추가**
   - `@Valid`, `@NotNull`, `@NotBlank`, `@Size`
   - 계좌 이름과 일지 텍스트의 길이 정책도 확정해야 합니다.

6. **Market 검색 페이지 검증 추가**
   - `page >= 0`
   - `1 <= size <= 100`
   - 현재 음수·과도한 값이 Repository까지 전달됩니다.

7. **`tokenType` 계약 수정**
   - 현재 값은 `"Bearer "`로 뒤에 공백이 포함됩니다.
   - `"Bearer"`로 변경하거나 프론트가 이 필드를 사용하지 않도록 계약을 명확히 해야 합니다.

## P2 — 계약 일관성·운영 안정성

8. **금액·수량 타입 통일**
   - Broker 목록 합계는 `long`, 상세·Ledger는 `BigDecimal`
   - Journal 거래 수량은 `int`, Ledger 거래 수량은 `BigDecimal`

9. **Enum·필드 의미 통일**
   - MarketType과 TradeSide가 도메인별로 중복 정의돼 있습니다.
   - Market의 `sectorName`은 실제로 산업분류 코드입니다.
   - `MKT_005` 메시지에는 KONEX가 있지만 enum은 KOSPI·KOSDAQ만 존재합니다.

10. **일지 시간대 정책 확정**
    - 미래 날짜, 백필, 수정 마감은 UTC 기준입니다.
    - 한국 사용자 서비스라면 `Asia/Seoul` 기준 전환을 검토해야 합니다.

11. **Market 배치 설정 정리**
    - 주석과 실제 cron 불일치
    - `STOCK_INFO_REFRESH_INTERVAL_DAYS = 0`
    - KIS 토큰 캐시 만료 계산이 주석과 다름

---

# 12. 프론트 작업 범위 판단

## 지금 연결 가능한 API 계약

- OAuth 로그인 Redirect UI
- Refresh Token 쿠키 기반 Access Token 재발급
- 증권사 목록·연결·동기화
- 계좌 목록·상세·이름 변경
- 거래 목록·상세
- 최신 보유 현황
- 투자 일지 목록·상세·생성·수정
- 종목별 거래·근거 타임라인
- 종목 검색·시장 필터·페이지네이션
- 내부 `securityId` 기준 종목 최신 시세 통합 상세
- `stockCode` 기준 종목 마스터 정보
- 날짜별 종목 시세

## 연결할 때 반드시 적용할 프론트 제약

| 항목                  | 프론트 처리                                |
| --------------------- | ------------------------------------------ |
| Market 검색 page      | 0 이상                                     |
| Market 검색 size      | 1~100 권장                                 |
| Ledger 거래 size      | 1~100                                      |
| `tradeSide`           | 대문자 `BUY`, `SELL`                       |
| 날짜                  | `YYYY-MM-DD`                               |
| Access Token          | `Authorization: Bearer ${token}` 직접 구성 |
| Refresh API           | `withCredentials: true`                    |
| Market stockCode API  | `/markets/securities/...` 복수형 사용      |
| Market securityId API | `/market/securities/...` 단수형 사용       |
| 동기화 결과           | HTTP 상태뿐 아니라 `syncStatus` 확인       |
| 큰 금액·소수          | 필요 시 Decimal 라이브러리 사용            |

## 실제 사용자 대상 배포 전 보류하거나 제한할 기능

- `/auth/me`: JWT 필터 활성화 전
- Broker·Journal·Ledger의 사용자별 데이터: `TEMP_USER_ID` 제거 전
- KIS 수동 동기화 POST API: 관리자 보호 전
- Cross-Origin OAuth·Refresh: CORS·쿠키 정책 확정 전

> 개발 단계에서는 Mock과 API Client를 먼저 구현할 수 있지만, 사용자별 데이터가 정상적으로 분리된다고 가정해서는 안 됩니다.

---

# 13. 프론트 TypeScript 핵심 계약

전체 타입 파일은 별도 첨부된 `investory-api-contracts.final.ts`를 사용하면 됩니다.

```ts
type OAuthProvider = 'KAKAO' | 'NAVER' | 'GOOGLE'
type UserStatus = 'ACTIVE' | 'WITHDRAWN'
type AccountType = 'STOCK' | 'ISA' | 'PENSION' | 'ETC'
type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED'
type SyncStatus = 'REQUESTED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
type MarketMood = 'CAUTIOUS' | 'CONFIDENT' | 'ANXIOUS' | 'CALM'
type TradeSide = 'BUY' | 'SELL'
type MarketType = 'KOSPI' | 'KOSDAQ'
```

> Journal 내부 MarketType에는 코드상 KONEX가 존재할 수 있지만, Market 검색 API의 enum은 KOSPI·KOSDAQ 두 값만 지원합니다. 도메인별 타입을 하나로 합치기 전에는 API별 타입을 분리하는 편이 안전합니다.

---

# 14. 소스 기준 파일

주요 Controller:

```text
src/main/java/com/investory/auth/presentation/controller/AuthController.java
src/main/java/com/investory/broker/presentation/controller/BrokerController.java
src/main/java/com/investory/journal/presentation/controller/JournalController.java
src/main/java/com/investory/ledger/presentation/controller/LedgerController.java
src/main/java/com/investory/market/presentation/controller/SecurityController.java
src/main/java/com/investory/market/presentation/controller/MarketDataController.java
```

공통 설정:

```text
src/main/java/com/investory/global/security/SecurityConfig.java
src/main/java/com/investory/global/security/JwtAuthenticationFilter.java
src/main/java/com/investory/global/error/ErrorResponse.java
src/main/java/com/investory/global/error/GlobalExceptionHandler.java
src/main/java/com/investory/global/error/HttpStatusMapper.java
src/main/java/com/investory/global/web/WebConfig.java
src/main/resources/application.properties
```

Market 내부 서비스:

```text
src/main/java/com/investory/market/domain/services/MarketDataQueryService.java
src/main/java/com/investory/market/domain/services/MarketDataSyncService.java
src/main/java/com/investory/market/infra/clients/kis/KisMarketDataClient.java
src/main/java/com/investory/market/infra/scheduler/MarketDataScheduler.java
src/main/java/com/investory/market/infra/scheduler/MarketSchedulingConfig.java
```

---

# 15. 최근 Market Presentation 변경사항

| 커밋                                       | 주요 변경                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `443e7aeab6669204c49b61eadf8347917cbbd6d3` | 종목 검색 API와 `SecurityListResponse` 추가                                           |
| `59bbc572711e0d9b77041b467c286453030d3fd5` | 종목 통합 상세 API·DTO 추가, 기존 MarketData Base Path를 `/markets/securities`로 변경 |
| `a565ead5e057435b9daac0d5ece17f108be2d3ae` | 통합 상세 조회를 `securityId` 기반 `findBySecurityId`로 수정                          |

## 프론트 경로 최종 정리

```text
GET  /market/securities
GET  /market/securities/{securityId}

GET  /markets/securities/{stockCode}
GET  /markets/securities/{stockCode}/prices
POST /markets/securities/{stockCode}/sync-info
POST /markets/securities/{stockCode}/sync-price
POST /markets/securities/{stockCode}/sync
```

`securityId`와 `stockCode`는 서로 다른 식별자입니다.

```text
securityId: 내부 숫자 PK, 예: 1001
stockCode:  종목 단축코드, 예: "005930"
```

---

# 16. 최종 검증 결과표

| 검증 항목         | 결과   | 비고                                                            |
| ----------------- | ------ | --------------------------------------------------------------- |
| 브랜치 HEAD 고정  | 완료   | `a565ead5e057435b9daac0d5ece17f108be2d3ae`                      |
| 최신 Push 비교    | 완료   | 이전 검증 커밋 이후 1개 커밋, 2개 변경 파일 확인                |
| 공개 Controller   | 완료   | Auth, Broker, Journal, Ledger, Security, MarketData             |
| 엔드포인트 수     | 완료   | 총 34개                                                         |
| 요청·응답 DTO     | 완료   | 신규 SecurityListResponse·SecurityDetailResponse 포함           |
| 서비스 검증 로직  | 완료   | 상세 API가 `findBySecurityId`를 사용하는 것 확인                |
| 공통 오류 포맷    | 완료   | Business, Infra, catch-all 분기 확인                            |
| Security·CORS     | 완료   | 현재 permitAll, JWT·CORS 비활성 확인                            |
| Market Scheduler  | 완료   | 실제 cron과 timezone 미지정 확인                                |
| Gradle 빌드 실행  | 미확인 | 성공 CI·Workflow Run 없음, 네트워크 제한으로 전체 checkout 불가 |
| DB 통합 테스트    | 미확인 | MySQL 스키마·데이터와 실제 실행하지 않음                        |
| OAuth 통합 테스트 | 미확인 | Kakao·Naver·Google 실 credential로 실행하지 않음                |
| KIS 통합 테스트   | 미확인 | 실제 KIS credential·응답으로 실행하지 않음                      |

## 이 문서를 프론트에 전달할 때 붙일 한 줄

```text
feat/market @ a565ead5 기준 최종 정적 API 계약서입니다. 34개 라우트와 DTO·서비스 계약은 확인했지만,
현재 인증은 permitAll이고 Broker/Journal/Ledger는 userId=1을 사용하며 런타임 통합 검증은 별도입니다.
```
