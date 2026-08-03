# 인증 토큰 갱신

Method: POST
URL: /auth/token/refresh
도메인: 인증
상세 설명: 유효한 Refresh Token을 이용해 새로운 Access Token을 발급한다.

# 요청 형식

## 요청 헤더

Refresh Token을 HttpOnly 쿠키로 관리한다면:

```
Cookie: refreshToken=eyJ...
```

요청 바디가 없으므로 `Content-Type`은 필수가 아니다.

## URL 파라미터

- 없음

## 쿼리 파라미터

- 없음

## 요청 바디

- 없음

# 응답 형식

## 성공 응답

### 상태 코드

```json
200 OK
```

### 응답 헤더

```json
Content-Type: application/json
```

Refresh Token Rotation을 적용한다면 새 Refresh Token도 내려준다.

```
Set-Cookie: refreshToken=새로운값; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=1209600
```

### 응답 바디

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

### 속성

| 속성          | 자료형    | 필수 | 설명                                       |
| ------------- | --------- | ---- | ------------------------------------------ |
| `accessToken` | `string`  | 필수 | 새로 발급된 Access Token                   |
| `tokenType`   | `string`  | 필수 | 토큰 유형. 일반적으로 `Bearer`             |
| `expiresIn`   | `integer` | 필수 | Access Token 만료까지 남은 시간, 단위는 초 |

### JSON Schema

```json
{
  "type": "object",
  "properties": {
    "accessToken": {
      "type": "string"
    },
    "tokenType": {
      "type": "string",
      "enum": ["Bearer"]
    },
    "expiresIn": {
      "type": "integer",
      "minimum": 1
    }
  },
  "required": ["accessToken", "tokenType", "expiresIn"]
}
```

## 오류 응답

### Refresh Token 없음

```json
401 Unauthorized
Content-Type: application/json
```

```json
{
  "code": "AUTH_REFRESH_TOKEN_MISSING",
  "message": "Refresh Token이 존재하지 않습니다."
}
```

### Refresh Token 만료 또는 위조

```json
401 Unauthorized
```

```json
{
  "code": "AUTH_REFRESH_TOKEN_INVALID",
  "message": "유효하지 않거나 만료된 Refresh Token입니다."
}
```

### 폐기된 Refresh Token

```json
401 Unauthorized
```

```json
{
  "code": "AUTH_REFRESH_TOKEN_REVOKED",
  "message": "이미 폐기된 Refresh Token입니다."
}
```
