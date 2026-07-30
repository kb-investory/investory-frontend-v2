# Investory Frontend

> **"모든 투자에는 이유와 이야기가 있다."**

내 투자를 기록하며 나만의 원칙을 만들어가는 AI 투자 일지 서비스입니다.
투자 경험은 있지만 자신만의 판단 기준을 아직 체계화하지 못한 **자기주도형 개인투자자**를 위해 만들었습니다.

## 구현 기능

### 1. 투자 일지 작성

하루 단위 시장 느낌점과 거래 내역별 한 줄 근거를 함께 기록합니다.
매수·매도마다 "왜 이 결정을 했는지"를 남겨 나중에 복기할 수 있습니다.

### 2. 투자 일지 조회

작성한 투자 일지 목록을 날짜·종목 기준으로 조회하고 복기합니다.

### 3. 투자 성향 분석

내 투자 데이터를 기반으로 6가지 축에서 나의 투자 성향 유형을 분석합니다.
분석 결과를 바탕으로 나만의 투자 원칙도 자동으로 제안됩니다.

> 상세 분석 축 및 원칙 도출 방식 → [기획 문서](./docs/product-spec.md)

### 4. 투자 시뮬레이션

도출된 나만의 투자 원칙(패턴)을 기반으로 여러 투자봇과 수익률을 비교합니다.

| 투자봇            | 설명                                      |
| ----------------- | ----------------------------------------- |
| **나의 원칙봇**   | 내 투자 성향 분석으로 도출된 원칙 기반 봇 |
| **대안 원칙봇**   | 내가 선택하지 않은 원칙들로 구성된 봇     |
| **유명 투자자봇** | 워런 버핏 등 저명 투자자 전략 기반 봇     |
| **랜덤봇**        | 랜덤 매매(원숭이) 봇                      |

- 내가 실제 매수·매도한 종목에 대해서만 시뮬레이션을 돌립니다.
- 시뮬레이션 기간(시작일~종료일)을 직접 지정할 수 있습니다.
- 결과 화면에서 봇 간 수익률을 비교하고 피드백 문장을 제공합니다.

> 시뮬레이션 상세 플로우 → [기획 문서](./docs/product-spec.md)

## 기술 스택

| 분류       | 도구             |
| ---------- | ---------------- |
| 프레임워크 | Vue 3            |
| 빌드 도구  | Vite             |
| 상태 관리  | Pinia            |
| 라우팅     | Vue Router 5     |
| 아이콘     | Lucide Vue       |
| 코드 품질  | ESLint, Prettier |

## 실행 환경

- **Node.js**: `^22.18.0` 또는 `>=24.12.0`
- **패키지 관리자**: npm
- **권장 IDE**: VS Code
- **권장 확장 프로그램**: Vue - Official, ESLint, Prettier

## 시작하기

### 1. 의존성 설치

```powershell
npm.cmd install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성합니다.

```powershell
Copy-Item .env.example .env
```

| 변수                | 설명                                             |
| ------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL` | 백엔드 서버 origin (예: `http://localhost:8080`) |

### 3. 개발 서버 실행

```powershell
npm.cmd run dev
```

> PowerShell 실행 정책에 따라 `npm` 명령이 차단될 수 있으므로 `npm.cmd` 사용을 권장합니다.

## 스크립트

```powershell
# 개발 서버 시작
npm.cmd run dev

# 프로덕션 빌드
npm.cmd run build

# 빌드 결과물 로컬 미리보기
npm.cmd run preview

# ESLint 검사
npm.cmd run lint

# ESLint 자동 수정
npm.cmd run lint:fix

# Prettier 자동 포맷
npm.cmd run format

# Prettier 포맷 검사
npm.cmd run format:check
```

PR을 올리기 전 다음 명령이 모두 통과하는지 확인합니다.

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

## 디렉터리 구조

```text
src/
├─ app/                         # 앱 코어 (진입점, 라우터, 레이아웃)
│  ├─ guards/                   # Vue Router 네비게이션 가드
│  ├─ layouts/                  # 공통 페이지 레이아웃 (DefaultLayout.vue)
│  ├─ plugins/                  # Pinia 등 플러그인 설정
│  ├─ providers/                # 앱 전역 프로바이더
│  ├─ router/                   # 라우터 취합, route-names.js
│  ├─ views/                    # UIKitView, NotFoundView 등 시스템 페이지
│  └─ App.vue                   # 최상위 루트 컴포넌트
│
├─ features/                    # 도메인 기반 기능 모듈
│  ├─ auth/                     # 소셜 로그인 및 인증
│  ├─ home/                     # 홈 (총 자산 요약, 보유 종목)
│  ├─ journal/                  # 투자일지 작성·복기·목록
│  ├─ tendency/                 # 투자 성향 분석 및 투자 원칙 관리
│  ├─ simulation/               # AI 기반 투자 원칙 시뮬레이션 대화
│  └─ mypage/                   # 내 정보, 증권사 계좌 연동
│
├─ mocks/                       # 백엔드 API 대응 목 데이터
│  ├─ data/                     # OpenAPI 명세와 동일 구조의 JSON 파일
│  └─ handlers/                 # 목 API 핸들러
│
├─ shared/                      # 도메인에 종속되지 않는 공통 코드
│  ├─ api/                      # 공통 API 클라이언트
│  ├─ assets/                   # 공통 이미지·폰트 에셋
│  ├─ components/               # Investory Core V3 공용 UI 컴포넌트
│  │  ├─ navigation/            # AppBar, BottomTabBar, SegmentedControl
│  │  ├─ buttons/               # BaseButton, IconButton
│  │  ├─ inputs/                # SearchInput, BaseTextField, BaseTextarea, BaseToggle
│  │  ├─ cards/                 # BaseCard, MetricStrip, QuoteCard, StockCard, TendencyCard
│  │  ├─ overlays/              # BottomSheet
│  │  ├─ lists/                 # ListRow
│  │  ├─ badges/                # BaseBadge, StatusBadge
│  │  └─ feedback/              # BaseLoading, InfoBanner, TimerProgressBar
│  ├─ composables/              # 공통 컴포저블
│  ├─ constants/                # 공통 상수
│  ├─ stores/                   # 공통 Pinia 스토어
│  ├─ styles/                   # 전역 스타일 및 CSS 변수
│  │  ├─ tokens/                # 색상, 폰트, 간격, 그림자 CSS 변수
│  │  ├─ base/                  # Reset 및 기본 태그 스타일
│  │  └─ utilities/             # 헬퍼 스타일 유틸리티
│  └─ utils/                    # 공통 유틸리티 함수 (포맷터 등)
│
└─ main.js                      # 애플리케이션 진입점
```

### 기능 모듈 내부 구조

각 `features/{domain}/`은 아래 구조를 기준으로 필요한 디렉터리만 생성합니다.

```text
features/{domain}/
├─ views/        # 라우터에 직접 연결되는 화면 컴포넌트
├─ components/   # 해당 도메인 전용 UI 컴포넌트
├─ stores/       # Pinia 상태 및 액션
├─ api/          # 백엔드 API 호출 모듈
└─ composables/  # 도메인 전용 컴포저블
```

### 데이터 흐름

```text
View / Component → Pinia Store → API 모듈 → Mock 데이터 또는 실제 백엔드
```

- 컴포넌트에서 목 데이터를 직접 가져오지 않습니다.
- Store는 상태와 사용자 액션 흐름을 전담합니다.
- API 모듈은 데이터 출처를 추상화하며, 실제 백엔드 연동 시 이 계층만 교체합니다.
- 여러 모듈에서 재사용하는 코드는 `shared`로 이동합니다.
- `shared`에서 특정 `features` 코드를 참조하지 않습니다.

## 경로 별칭 (Path Alias)

상대 경로 대신 `@` 별칭을 사용합니다.

| 별칭          | 실제 경로       |
| ------------- | --------------- |
| `@/`          | `src/`          |
| `@/app/`      | `src/app/`      |
| `@/features/` | `src/features/` |
| `@/mocks/`    | `src/mocks/`    |
| `@/shared/`   | `src/shared/`   |

## 라우팅 규칙

- URL은 소문자 kebab-case를 사용합니다.
- 페이지 컴포넌트는 lazy import를 사용합니다.
- 하드코딩 경로 문자열 사용을 금지하고 `ROUTE_NAMES` 상수를 사용합니다.

  ```javascript
  import { ROUTE_NAMES } from '@/app/router/route-names'

  router.push({ name: ROUTE_NAMES.JOURNAL_CREATE })
  ```

- 라우트 이름은 `src/app/router/route-names.js`에서 통합 관리합니다.

## 팀 구성 및 기능 담당

| 팀원     | 담당 기능 모듈            | 세부 기능                                               |
| -------- | ------------------------- | ------------------------------------------------------- |
| **동호** | `auth`, `home`, `journal` | 소셜 로그인/인증, 홈 자산 요약, 투자일지 작성·복기·목록 |
| **은솔** | `mypage`, `tendency`      | 내 정보, 증권사 계좌 연동, 투자 성향 분석·원칙 관리     |
| **상우** | `simulation`              | AI 기반 투자 원칙 시뮬레이션 대화                       |

## 팀 문서

- [코딩 및 Git 컨벤션](./docs/coding-convention.md)
- [디렉터리 구조 및 아키텍처](./docs/directory-structure.md)
- [API 명세서](./docs/API-reference/)
- [디자인 시스템](./docs/design-system/)

## UI Kit

공용 컴포넌트 확인은 개발 서버 실행 후 `/ui-kit` 경로에서 확인할 수 있습니다.

## CI/CD

`main` 브랜치 대상 PR 및 push 시 다음 검사를 자동으로 수행합니다.

1. 의존성 설치 (`npm ci`)
2. ESLint 검사 (`npm run lint`)
3. Prettier 포맷 검사 (`npm run format:check`)
4. 프로덕션 빌드 (`npm run build`)

`main` 브랜치에 push되면 빌드 결과물을 GitHub Actions artifact로 생성하고, rsync를 통해 설정된 VM으로 배포합니다.

### 배포 관련 GitHub Secrets

| Secret           | 설명                              |
| ---------------- | --------------------------------- |
| `DEPLOY_SSH_KEY` | 배포 서버 SSH 개인 키             |
| `DEPLOY_HOST`    | 배포 서버 호스트                  |
| `DEPLOY_USER`    | 배포 서버 사용자 이름             |
| `DEPLOY_PATH`    | 배포 서버 내 대상 경로            |
| `DEPLOY_PORT`    | 배포 서버 SSH 포트 (기본값: `22`) |

## 테스트 (추후 도입)

<!-- TODO: Vitest로 service/store 단위 테스트를 추가한다. -->
<!-- TODO: Playwright로 로그인 → 홈 → 투자일지 작성 핵심 흐름 E2E를 추가한다. -->
<!-- TODO: CI에 단위 테스트와 E2E 실행 조건을 추가한다. -->
