# Investory 프론트엔드 디렉터리 구조 및 아키텍처 가이드

Investory 프론트엔드는 **도메인 기반 모듈화 구조(Feature-based Architecture)**를 적용하여 기능 간 결합도를 낮추고 유지보수성과 확장성을 극대화한 아키텍처를 따릅니다.

---

## 1. 프론트엔드 파트별 담당자 역할 (Team Member Roles)

| 담당자   | 담당 비즈니스 도메인 / 기능 모듈 | 세부 담당 기능                                             |
| :------- | :------------------------------- | :--------------------------------------------------------- |
| **동호** | `auth`, `home`, `journal`        | 소셜 로그인/인증, 홈 총 자산 요약, 투자일지 작성/복기/목록 |
| **은솔** | `mypage`, `tendency`             | 내 정보, 증권사 계좌 연동, 투자 성향 분석 & 투자 원칙 관리 |
| **상우** | `simulation`                     | AI 기반 투자 원칙 시뮬레이션 및 봇 대화                    |

---

## 2. 3인 동시 개발 협업 및 공통 수칙 (Team Cooperation Rules)

### 1) 🔀 브랜치 전략 및 커밋 컨벤션

- **담당 도메인별 브랜치 분리**:
  - 동호: `feature/auth-login`, `feature/home-dashboard`, `feature/journal-create`
  - 은솔: `feature/mypage-connect`, `feature/tendency-analysis`
  - 상우: `feature/simulation-chat`
- **충돌 방지 원칙**: 각 개발자가 주로 `src/features/{담당도메인}/` 폴더 내부에서 독립적으로 작업하므로 소스 파일 충돌(Merge Conflict)이 최소화됩니다.
- **Squash Merge**: `develop` 브랜치로 PR 머지 시 PR 제목 규칙 준수 (`feat: 로그인 UI 구현`, `fix: 일지 폼 오류 수정`).

### 2) 🎨 공용 UI 컴포넌트 (`shared/components/`) 변경 수칙

- **공용 컴포넌트 보호**: `shared/components/` (AppBar, BottomTabBar, BaseButton, SearchInput 등)의 기존 Props나 CSS는 **팀원 사전 공유 없이 임의 변경을 금지**합니다.
- **컴포넌트 확장 방법**: 새로운 스타일이나 형태가 필요할 경우 optional prop (`variant`, `size` 등)을 추가하거나, 특정 화면에서만 쓰이는 특수 UI는 해당 개발자의 `src/features/{domain}/components/` 폴더 내에 전용 컴포넌트로 생성합니다.

### 3) 🛣️ Vue Router 라우트 호출 표준 (`ROUTE_NAMES`)

- 하드코딩 경로 문자열 사용 금지: `router.push('/journal/create')` ❌
- **`ROUTE_NAMES` 상수 사용**:
  ```javascript
  import { ROUTE_NAMES } from '@/app/router/route-names'

  router.push({ name: ROUTE_NAMES.JOURNAL_CREATE })
  ```
- 새 화면을 추가할 때도 `src/app/router/route-names.js`에 이름을 정의하고 `routes.js`에 등록합니다.

### 4) 🔌 API 모듈 및 백엔드 연동 환경변수 (`.env`)

- 현재 모든 API 서비스 모듈(`src/features/*/api/*Api.js`)은 백엔드 명세(`docs/API-reference`)와 100% 동일한 비동기 스키마로 구성되어 있습니다.
- 백엔드 실제 서버 연결 시 `.env.example`의 `VITE_API_BASE_URL` 환경 변수만 변경하면 실서버 연동이 가능하도록 표준을 유지합니다.

### 5) 🍍 Pinia 스토어 교차 참조 수칙

- 각 기능 스토어(`authStore`, `homeStore`, `journalStore`, `tendencyStore`, `simulationStore`, `mypageStore`)는 자신의 도메인 상태 관리를 전담합니다.
- 타 도메인의 데이터가 필요한 경우(예: 일지 작성 시 사용자 로그인 정보 필요), 필요한 스토어를 직접 가져와 읽는 구조로 작성합니다:
  ```javascript
  import { useAuthStore } from '@/features/auth/stores/authStore'

  const authStore = useAuthStore()
  console.log(authStore.user)
  ```

---

## 3. 전체 디렉터리 구조 (100% 실제 파일시스템 매핑)

```text
investory-frontend/
├─ public/                         # 정적 이미지 및 에셋 리소스
│  └─ assets/                     # 파비콘, 로고, 이미지 에셋
│
├─ docs/                           # 프로젝트 설계 및 참조 문서
│  ├─ coding-convention.md        # 개발 규칙, 커밋 수칙 및 파트별 담당자 명세
│  ├─ directory-structure.md      # 디렉터리 구조 설명 문서
│  ├─ API-reference/               # 백엔드 OpenAPI 명세서 모음
│  ├─ architecture/
│  │  └─ directory-structure.md   # 디렉터리 아키텍처 문서 (본 문서)
│  └─ design-system/
│     ├─ components.md            # Core V3 공용 UI 컴포넌트 명세
│     └─ design-system.md         # UI 디자인 규격 및 토큰 시스템
│
├─ src/                            # Vue 3 애플리케이션 소스 코드
│  ├─ app/                         # 코어 진입점 및 앱 전역 구성 요소
│  │  ├─ layouts/                 # 전역 페이지 레이아웃 (DefaultLayout.vue 등)
│  │  ├─ router/                  # Vue Router 설정 및 라우트 네임 정의
│  │  ├─ views/                   # 시스템 전용 페이지 (UIKitView.vue, NotFoundView.vue)
│  │  └─ App.vue                  # Vue 최상위 루트 컴포넌트
│  │
│  ├─ features/                    # 도메인 기반 모듈 (Feature Modules)
│  │  ├─ auth/                     # [동호] 로그인 및 인증 관련 모듈
│  │  ├─ home/                     # [동호] 총 자산 요약 및 홈 메인 모듈
│  │  ├─ journal/                  # [동호] 투자일지 작성 및 목록 모듈
│  │  ├─ tendency/                 # [은솔] 투자 성향 분석 및 원칙 관리 모듈
│  │  ├─ simulation/               # [상우] AI 투자 시뮬레이션 대화 모듈
│  │  └─ mypage/                   # [은솔] 내 정보 및 증권사 계좌 연동 모듈
│  │
│  ├─ mocks/                       # 백엔드 API 대응 JSON 목데이터
│  │  └─ data/                    # auth.json, home.json, journal.json, tendency.json 등
│  │
│  ├─ shared/                      # 애플리케이션 전역 공용 모듈
│  │  ├─ components/              # Investory Core V3 공용 UI 컴포넌트 (20종)
│  │  │  ├─ navigation/           # AppBar, BottomTabBar, SegmentedControl
│  │  │  ├─ buttons/              # BaseButton, IconButton
│  │  │  ├─ inputs/               # SearchInput, BaseTextField, BaseTextarea, BaseToggle
│  │  │  ├─ cards/                # BaseCard, MetricStrip, QuoteCard, StockCard, TendencyCard
│  │  │  ├─ overlays/             # BottomSheet
│  │  │  ├─ lists/                # ListRow
│  │  │  ├─ badges/               # BaseBadge, StatusBadge
│  │  │  └─ feedback/             # BaseLoading, InfoBanner, TimerProgressBar
│  │  ├─ styles/                  # 디자인 시스템 토큰 및 전역 스타일
│  │  │  ├─ tokens/               # 색상, 폰트, 간격, 그림자 CSS 변수
│  │  │  ├─ base/                 # Reset 스타일 및 기본 태그 스타일
│  │  │  └─ utilities/            # 헬퍼 스타일 유틸리티
│  │  └─ utils/                   # 포맷터 및 공통 유틸리티 함수
│  │
│  └─ main.js                      # 애플리케이션 엔트리 파일 (Pinia & Router 마운트)
│
├─ index.html                      # HTML 메인 템플릿
├─ package.json                    # 의존성 패키지 및 NPM 스크립트 설정
├─ vite.config.js                  # Vite 빌드 및 경로 별칭(`@`) 설정
└─ eslint.config.js                # 코드 품질 및 포맷팅 검사 규칙 설정
```

---

## 4. 레이어별 역할 상세

### 1) `src/app/` (애플리케이션 코어)

- 앱 전체의 뼈대를 형성하는 영역으로, 최상위 `App.vue`, 라우터, 전체 레이아웃, 공통 시스템 페이지를 관리합니다.
- `app/router/`: `routes.js`와 `route-names.js`로 라우팅 경로와 이름을 모듈화 관리합니다.
- `app/layouts/`: GNB, LNB, 헤더/푸터가 포함된 공통 `DefaultLayout.vue`를 제공합니다.
- `app/views/`: UI 디자인 시스템 카탈로그인 `UIKitView.vue` 및 404 페이지 `NotFoundView.vue`를 포함합니다.

### 2) `src/features/` (도메인 기반 모듈)

- 각 비즈니스 영역별로 독립된 모듈 구조를 가집니다.
- 모든 feature 폴더 내부에는 다음과 같은 일관된 구조를 사용합니다:
  - `views/`: 해당 기능의 화면 페이지 컴포넌트 (`HomePage.vue`, `JournalListPage.vue` 등)
  - `components/`: 해당 도메인 전용 UI 컴포넌트
  - `stores/`: Pinia 기반 상태 관리 스토어 (`authStore.js`, `journalStore.js` 등)
  - `api/`: 백엔드 API 호출 전용 모듈 (`authApi.js`, `journalApi.js` 등)

### 3) `src/mocks/data/` (JSON 목데이터)

- 백엔드 서버를 대신하여 OpenAPI 명세와 100% 동일한 구조의 목데이터(`.json`)를 제공합니다.

### 4) `src/shared/` (전역 공용 모듈)

- 특정 도메인에 종속되지 않는 재사용 가능한 자원을 모아둔 영역입니다.
- `shared/components/`: Investory Core V3 디자인 시스템의 4개 분류별 공용 UI 컴포넌트입니다.
- `shared/styles/`: CSS 변수 기반 전역 스타일 토큰 및 유틸리티입니다.

---

## 5. 별칭(Path Alias) 가이드

소스 코드 작성 시 상대 경로 대신 경로 별칭(`@`)을 사용합니다:

- `@/` $\rightarrow$ `src/`
- `@/app/` $\rightarrow$ `src/app/`
- `@/features/` $\rightarrow$ `src/features/`
- `@/mocks/` $\rightarrow$ `src/mocks/`
- `@/shared/` $\rightarrow$ `src/shared/`

---

## 6. 품질 검사 및 빌드 명령

- **ESLint 검사**: `npm run lint`
- **Vite 개발 서버**: `npm run dev`
- **프로덕션 빌드**: `npm run build`
