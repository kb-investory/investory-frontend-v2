# OAuth 인증 요청

Method: GET
URL: /auth/oauth/{provider}/authorization
도메인: 인증
상세 설명: OAuth 제공자의 인증 화면으로 리다이렉트

# 요청 형식

## 요청 헤더

- 없음

## URL 파라미터

| 속성 | 자료형 | 필수 | 설명 |
| --- | --- | --- | --- |
| `provider` | `string` | 필수 | OAuth 서비스 제공자(KAKAO, GOOGLE,,..) |

예시 URL:

```
GET /auth/oauth/KAKAO/authorization
```

## 쿼리 파라미터

- 없음.

| 속성 | 자료형 | 필수 | 설명 |
| --- | --- | --- | --- |
| `returnTo` | `string` | 선택 | 로그인 완료 후 이동할 프론트 내부 경로 |

예:

```
GET /auth/oauth/KAKAO/authorize?returnTo=/portfolio
```

`returnTo`는 외부 URL을 허용하지 말고 `/portfolio`처럼 서비스 내부 경로만 허용해야 한다.

## 요청 바디

- 없음

# 응답 형식

## 성공 응답

### 상태 코드

```json
302 Found
```

### 응답 헤더

```json
Location: https://OAuth제공자주소/authorize?...
```

서버 구현에 따라 `state` 저장용 쿠키를 사용할 수도 있다.

```json
Set-Cookie: oauthState=랜덤값; HttpOnly; SameSite=Lax; Max-Age=300
```

### 응답 바디

- 없음
- JSON Schema 없음

## 처리 과정

```
1. provider 지원 여부 확인
2. state 생성
3. PKCE code_verifier 생성
4. code_verifier로 code_challenge 생성
5. state와 code_verifier를 임시 저장
6. OAuth 제공자 인증 URL 생성
7. OAuth 제공자 화면으로 302 Redirect
```

PKCE를 적용할 경우 `code_challenge_method=S256`을 사용하는 게 현재 권장 방식이다.

## 오류 응답

### 지원하지 않는 OAuth 제공자

```json
400 Bad Request
Content-Type: application/json
```

```json
{
  "code":"AUTH_PROVIDER_NOT_SUPPORTED",
  "message":"지원하지 않는 OAuth 제공자입니다."
}
```

### JSON Schema

```json
{
  "type":"object",
  "properties": {
    "code": {
      "type":"string"
    },
    "message": {
      "type":"string"
    }
  },
  "required": ["code","message"
  ]
}
```