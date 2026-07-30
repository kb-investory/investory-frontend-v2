<aside>
💡

### Git 저장소

- **프론트엔드** - https://github.com/KB7-FinanceTylenol/financetylenol-frontend
- **백엔드** - https://github.com/KB7-FinanceTylenol/financetylenol-backend

### GitHub 아이디 & 프론트엔드 파트 담당자 (Frontend Team Roles)

| 개발자 | GitHub 아이디 | 담당 도메인 / 기능 모듈 | 세부 담당 기능 |
| :--- | :--- | :--- | :--- |
| **동호** | `Chris-758` | 로그인 (`auth`), 홈 (`home`), 일지 (`journal`) | 소셜 로그인/인증, 홈 총 자산 요약, 투자일지 작성/복기/목록 |
| **은솔** | `nsol0215` | 마이페이지 (`mypage`), 투자 성향 (`tendency`) | 내 정보, 증권사 계좌 연동, 투자 성향 분석 & 원칙 |
| **상우** | `Dev-SangWoo` | 시뮬레이션 (`simulation`) | AI 투자 시뮬레이션 봇 대화 |

- **백엔드 파트 멤버**: 서연 (`seoyeeon`), 태수 (`arbreol`), 윤혁 (`yunhyeokd`)

</aside>

<aside>
🔥

## 절대 금지

브랜치 Push 전에 꼭 다시 확인할 것

- API키, 비밀번호와 같은 값들은 소스코드에 직접 작성금지(무조건 환경변수로 이용)
</aside>

## 1. 브랜치 흐름 및 동시 개발 브랜치 규칙

```
로컬 작업 → 로컬 커밋 → develop PR → merge → develop → main PR
```

모든 작업은 개인 로컬 브랜치에서 진행 후 `develop`으로 PR을 올린다. `develop`에 변경 사항이 쌓이면 `develop → main` PR로 릴리즈한다.

### 담당 도메인별 기능 브랜치 예시
- **동호**: `feature/auth-login`, `feature/home-dashboard`, `feature/journal-create`
- **은솔**: `feature/mypage-connect`, `feature/tendency-analysis`
- **상우**: `feature/simulation-chat`

> [!TIP]
> 각 개발자가 주로 `src/features/{담당도메인}/` 폴더 내부에서 독립적으로 작업하므로 소스 파일 충돌(Merge Conflict)을 최소화할 수 있습니다.

---

## 2. 3인 동시 개발 협업 및 공통 수칙 (Team Cooperation Rules)

### 1) 🎨 공용 UI 컴포넌트 (`shared/components/`) 변경 수칙
- **공용 컴포넌트 보호**: `shared/components/` (AppBar, BottomTabBar, BaseButton, SearchInput 등)의 기존 Props나 CSS는 **팀원 사전 공유 없이 임의 변경을 금지**합니다.
- **컴포넌트 확장 방법**: 새로운 스타일이나 형태가 필요할 경우 optional prop (`variant`, `size` 등)을 추가하거나, 특정 화면에서만 쓰이는 특수 UI는 해당 개발자의 `src/features/{domain}/components/` 폴더 내에 전용 컴포넌트로 생성합니다.

### 2) 🛣️ Vue Router 라우트 호출 표준 (`ROUTE_NAMES`)
- 하드코딩 경로 문자열 사용 금지: `router.push('/journal/create')` ❌
- **`ROUTE_NAMES` 상수 사용**:
  ```javascript
  import { ROUTE_NAMES } from '@/app/router/route-names'

  router.push({ name: ROUTE_NAMES.JOURNAL_CREATE })
  ```
- 새 화면을 추가할 때도 `src/app/router/route-names.js`에 라우트 네임을 정의하고 `routes.js`에 등록합니다.

### 3) 🔌 API 모듈 및 백엔드 연동 환경변수 (`.env`)
- 현재 모든 API 서비스 모듈(`src/features/*/api/*Api.js`)은 백엔드 OpenAPI 명세(`docs/API-reference`)와 100% 동일한 비동기 스키마로 구성되어 있습니다.
- 백엔드 실제 서버 연결 시 `.env.example`의 `VITE_API_BASE_URL` 환경 변수만 변경하면 실서버 연동이 가동하도록 모듈 표준을 유지합니다.

### 4) 🍍 Pinia 스토어 교차 참조 수칙
- 각 기능 스토어(`authStore`, `homeStore`, `journalStore`, `tendencyStore`, `simulationStore`, `mypageStore`)는 자신의 도메인 상태 관리를 전담합니다.
- 타 도메인의 데이터가 필요한 경우(예: 일지 작성 시 사용자 로그인 정보 필요), 필요한 스토어를 직접 가져와 읽는 구조로 작성합니다:
  ```javascript
  import { useAuthStore } from '@/features/auth/stores/authStore'
  
  const authStore = useAuthStore()
  console.log(authStore.user)
  ```

---

## 3. hotfix 흐름 (예외 케이스)

```
main ──────●──────────────●───────► main
             \                    ↗
              hotfix/버그명 ──────
```

- **발동 조건**: `develop`이 `main`보다 앞서 있어 정상 플로우(develop → main PR)로 배포하면 아직 검증되지 않은 변경 사항까지 함께 배포되는 상황일 때만 사용한다.
- **분기 기준**: `main`에서 직접 분기한다 (develop 경유하지 않음).
- **네이밍**: `hotfix/버그내용` (예: `hotfix/payment-crash`)
- **머지 대상**: 반드시 `main`과 `develop` 두 곳 모두에 머지한다.

---

## 4. PR 규칙

- **머지 방식**: 무조건 Squash merge. squash 머지 시 PR 제목이 최종 커밋 메시지가 되므로, PR 제목도 커밋 컨벤션을 그대로 적용한다.
- **리뷰**: 최소 1명 이상 승인 필수, self-merge 금지
- **CI**: `main` 대상 PR과 `main` push에서 lint, format, build를 검사한다.

---

## 5. 커밋 / PR 제목 컨벤션 (Conventional Commits)

```
<type>: <subject>

<body>
```

| type | 의미 |
| --- | --- |
| feat | 새 기능 추가 |
| fix | 버그 수정 |
| docs | 문서 수정 |
| style | 코드 포맷팅 (동작 변화 없음) |
| refactor | 리팩토링 |
| test | 테스트 추가/수정 |
| chore | 빌드, 패키지 매니저 설정 등 |
| perf | 성능 개선 |

**규칙**
- subject는 50자 이내, 명령형으로 작성 ("추가함" ❌ $\rightarrow$ "추가" ✓)
- subject 끝에 마침표 붙이지 않음
- body에는 무엇을, 왜 바꿨는지 작성

---

## 6. 브랜치 네이밍

```text
feature/기능명    예) feature/login-page
fix/버그명        예) fix/header-overflow
hotfix/버그명     예) hotfix/payment-crash
```

---

## 7. 버전 태깅

- **시점**: `develop → main` 머지 시마다 (hotfix 포함)
- **규칙**: Semantic Versioning (`v<major>.<minor>.<patch>`)

```bash
git checkout main
git pull
git tag -a v1.2.0 -m "release: 1.2.0"
git push origin v1.2.0
```
