# Investory UI 디자인 시스템 V3

> **Investory Core V3 디자인 명세 문서**  
> 현재 `.pen` 화면과 공용 UI 컴포넌트를 기준으로 정리한 정식 명세입니다.

---

## 1. 디자인 방향

### 핵심 인상

- **차분하고 신뢰할 수 있는 금융 서비스**: 거래 자극보다 기록·판단 근거·투자 원칙·회고 중심
- **절제된 표현**: 게임처럼 과도하게 흥분시키는 화려한 장식 지양
- **정확함과 친절함**: 데이터는 정확하게, 설명은 친절하게 제공
- **단일 행동 강조**: 주요 행동(CTA)은 한 화면에 하나만 강하게 강조

### 핵심 키워드

`기록` · `근거` · `분석` · `원칙` · `회고` · `신뢰` · `절제`

---

## 2. 화면 규격

- **기준 모바일 너비**: `390px`

### 기본 여백

| 영역                    | 규격      |
| :---------------------- | :-------- |
| 일반 콘텐츠 좌우 여백   | `20px`    |
| 앱바 좌우 여백          | `16px`    |
| 작은 카드 내부 여백     | `10–12px` |
| 일반 카드 내부 여백     | `14–16px` |
| 모달·바텀시트 내부 여백 | `18–20px` |

### 주요 높이

| 요소                | 높이      |
| :------------------ | :-------- |
| 상태 표시줄         | `62px`    |
| 일반 앱바           | `60px`    |
| 단계·배지 포함 앱바 | `66px`    |
| 탭 전환 영역        | `58px`    |
| 탭 버튼             | `44px`    |
| 하단 내비게이션     | `56px`    |
| 일반 버튼           | `48px`    |
| 주요 CTA            | `54–58px` |
| 아이콘 터치 영역    | `44×44px` |
| 검색 입력           | `48px`    |
| 설정 메뉴 행        | `48px`    |
| 보유 종목 행        | `56px`    |

> [!NOTE]
> 긴 Pencil 화면 명세는 전체 콘텐츠를 파악하기 위한 명세입니다. 실제 Vue 구현에서는 화면을 `100dvh`로 두고 본문 영역만 스크롤합니다.

---

## 3. 색상 시스템 (Color System)

### Brand Colors

| 토큰              | Hex 값    | 주요 용도               |
| :---------------- | :-------- | :---------------------- |
| `brand-teal`      | `#0B8F8B` | 기록, 완료, 진행        |
| `brand-teal-deep` | `#087F7C` | 활성 UI, 강조 텍스트    |
| `teal-deep`       | `#075F5A` | 강조 버튼과 진한 테두리 |
| `brand-teal-soft` | `#E8F7F6` | 활성 탭과 선택 배경     |
| `brand-mist`      | `#F5FBFB` | 분석 및 안내 배경       |
| `slate-strong`    | `#263A43` | 기본 Primary CTA        |
| `slate-primary`   | `#384F59` | 보조 강조 텍스트        |

### Neutral Colors

| 토큰             | Hex 값    | 주요 용도          |
| :--------------- | :-------- | :----------------- |
| `surface`        | `#FFFFFF` | 화면과 카드 표면   |
| `bg-primary`     | `#F6F4EF` | 따뜻한 기본 배경   |
| `text-primary`   | `#181817` | 제목 및 주요 본문  |
| `text-secondary` | `#666662` | 설명 및 보조 정보  |
| `text-tertiary`  | `#94948E` | 메타데이터, 비활성 |
| `border-default` | `#E5E5E0` | 기본 경계선        |
| `border-subtle`  | `#EEEEEA` | 리스트 구분선      |
| `slate-border`   | `#C9D6DA` | 강조 영역의 경계선 |
| `slate-soft`     | `#F0F4F5` | 중립 보조 배경     |

### Investment Data Colors

| 토큰              | Hex 값    | 의미 및 용도             |
| :---------------- | :-------- | :----------------------- |
| `brand-red`       | `#F20D35` | 매수, 상승, 양수 데이터  |
| `brand-red-soft`  | `#FFF0F2` | 매수·상승의 연한 배경    |
| `brand-blue`      | `#0B63CE` | 매도, 하락, 음수 데이터  |
| `brand-blue-soft` | `#EDF5FF` | 매도·하락의 연한 배경    |
| `amber-500`       | `#E8B931` | 성장 성향 등 제한적 의미 |

### 색상 사용 규칙

- **청록색(Teal)**: 기록, 선택, 완료, 진행, 활성 상태에 사용
- **빨간색(Red)**: 매수, 상승, 양수(+) 데이터
- **파란색(Blue)**: 매도, 하락, 음수(-) 데이터
- **노란색(Amber)**: 성장 성향처럼 명확한 카테고리에만 사용
- 주요 CTA는 기본적으로 `slate-strong` (`#263A43`) 사용
- 배경 전체를 강한 브랜드색으로 채우지 않으며 장식 목적으로 빨강/파랑/노랑 금지

---

## 4. 타이포그래피 (Typography)

### Font Family

| 용도                       | 글꼴                           |
| :------------------------- | :----------------------------- |
| **화면 제목, 섹션 제목**   | `Funnel Sans`                  |
| **본문, 버튼, 입력**       | `Inter`                        |
| **수치, 시간, 날짜, 코드** | `Geist Mono` / `IBM Plex Mono` |
| **한국어 보조 설명**       | `Noto Sans KR`                 |

### Font Scale & Weight

| 단계           | 크기      | 주요 용도                |
| :------------- | :-------- | :----------------------- |
| **Micro**      | `8.5–9px` | 작은 배지와 보조 메타    |
| **Caption**    | `9–10px`  | 날짜, 분류, 거래 정보    |
| **Meta**       | `10–11px` | 설명, 상태, 보조 데이터  |
| **Body Small** | `11–12px` | 카드 본문                |
| **Body**       | `12–13px` | 일반 본문과 메뉴         |
| **Control**    | `13–14px` | 버튼, 탭, 입력값         |
| **Section**    | `15–16px` | 카드와 섹션 제목         |
| **App Bar**    | `17–20px` | 화면 제목                |
| **Display**    | `22–30px` | 결과, 핵심 수치, 홈 제목 |

### 텍스트 규칙

- 금액·날짜·시간은 고정폭 글꼴(`font-mono`) 사용
- 중요한 설명은 최소 `11px` 유지
- `9px` 이하 텍스트는 배지와 짧은 메타데이터에만 사용
- 한 카드 안에서 굵은 텍스트를 과도하게 반복하지 않음
- 지원 데이터가 없는 해석형 문장은 작성하지 않음

---

## 5. 간격 시스템 (Spacing)

- `4px`: 초소형 간격
- `6px`: 텍스트와 메타 정보
- `8px`: 밀접한 요소
- `10px`: 아이콘과 텍스트
- `12px`: 카드 내부 기본 간격
- `14px`: 섹션 내부 간격
- `16px`: 기본 컴포넌트 간격
- `20px`: 화면 좌우 여백
- `24px`: 큰 섹션 간격

### Spacing 규칙

- 임의의 7px, 13px, 19px 사용 최소화
- 카드 내부는 주로 `10–14px`
- 화면 섹션 사이는 `16–24px`
- 좁은 모바일 화면에서도 좌우 콘텐츠 여백 `20px` 유지

---

## 6. 모서리 반경 (Border Radius)

| 반경     | 용도                           |
| :------- | :----------------------------- |
| `6px`    | 작은 입력 상태와 메타 영역     |
| `8px`    | 종목 카드, 작은 배지           |
| `10px`   | 아이콘 배경                    |
| `12px`   | 입력창, 일반 카드              |
| `14px`   | CTA, 안내 카드                 |
| `16px`   | 주요 카드와 강조 영역          |
| `18px`   | 플로팅 배너                    |
| `24px`   | 모달과 바텀시트 상단           |
| `9999px` | 하단 내비게이션, 탭, Pill 배지 |

---

## 7. 테두리와 그림자 (Border & Shadow)

### 테두리 (Border)

- **기본 카드**: `1px #E5E5E0`
- **약한 구분선**: `1px #EEEEEA`
- **강조 영역**: `1px #C9D6DA`
- **활성 검색**: `1.5px #075F5A`

### 그림자 (Shadow)

- 기본 카드에는 그림자를 거의 사용하지 않음
- 하단 내비게이션, 플로팅 배너, 바텀시트에만 검은색 `7–12%` 이하의 부드러운 그림자 사용
- 강한 입체감, 글래스모피즘, 다중 그림자 금지

---

## 8. 내비게이션 (Navigation)

### App Bar

- **높이**: `60px` (단계/배지 포함 시 `66px`)
- **좌우 패딩**: `16px`
- **액션 영역**: `44×44px`
- **아이콘**: `20px`
- **제목**: `Funnel Sans 20px / 700`
- **구조**: `[뒤로가기 또는 닫기] / [화면 제목] / [보조 액션]`

### Bottom Tab Bar

- **높이**: `56px`
- **외부 형태**: `Pill` (`radius: 9999px`)
- **배경**: `#FFFFFFCC` (`border: 1px solid #D9E7E8`)
- **탭 순서**: `홈` $\rightarrow$ `일지` $\rightarrow$ `투자 성향` $\rightarrow$ `시뮬레이션` $\rightarrow$ `마이`
- **시뮬레이션 탭**: 일반 아이콘 대신 `monkey-3d-icon.png` 사용

### Segmented Tabs

- **전체 높이**: `58px` (패딩 `7px 20px`)
- **탭 높이**: `44px`
- **활성 배경**: `brand-teal-soft` (`#E8F7F6`)

---

## 9. 버튼 (Button)

### Primary

- **높이**: `54px` (반경 `14px`)
- **배경**: `slate-strong` (`#263A43`), 텍스트 흰색 (`13px`)
- **Journal Primary**: 일지 저장 시 `teal-deep` (`#075F5A`), 높이 `48px`, 반경 `12px`

### Secondary

- **높이**: `48px`, 배경 `brand-teal-soft` (`#E8F7F6`), 테두리 `#CDEDEA`, 텍스트 `brand-teal-deep` (`#087F7C`)

### Ghost

- 편집, 수정, 닫기처럼 낮은 우선순위에 사용하며 배경 최소화

---

## 10. 입력 요소 (Input)

- **Search**: 높이 `48px`, 반경 `24px`, 패딩 `14px`, 활성 테두리 `1.5px teal-deep`
- **Text Area**: 입력 영역 반경 `12px`, 배경 `#F7F8FA`, 테두리 `#E5E7EB`, 라벨+필수표시(`*`), 글자 수 카운터(`0/500`) 포함
- **Switch**: 크기 `44×26px`, Knob `20px`, 반경 `13px`, 활성 배경 `brand-teal-deep`

---

## 11. 카드와 리스트 (Cards & Lists)

- **Base Card**: 배경 `white`, 테두리 `1px`, 반경 `14–16px`, 패딩 `12–16px`
- **Stock Row**: 높이 `56px`, 반경 `8px`, 이미지 `38×38px` (`종목 이미지 / 종목명 / 수량·평단가 / 평가금액`)
- **Navigation Row**: 높이 `48px`, 아이콘 `20px`, 라벨 `13px/500`, Chevron `16px`
- **Disclosure (TendencyCard)**: 접힌 높이 `72px`, 반경 `14px`, 아이콘 영역 `38×38px`

---

## 12. 오버레이 & 상태 (Overlays & Feedback)

- **Bottom Sheet**: 상단 반경 `24px`, 내부 여백 `18–20px`, 어두운 Slate 계열 `40–50%` Dim
- **Inline Alert**: 높이 약 `68px`, 반경 `12px`, 배경 `brand-mist` 또는 `brand-teal-soft`
- **Progress**: 진행률 청록색, 종료점 및 남은 시간(자정 기준) 명확히 표시

---

## 13. 공용 컴포넌트 라인업 (20개 표준)

1. `Navigation/AppBar` (`AppBar.vue`)
2. `Navigation/BottomTabBar` (`BottomTabBar.vue`)
3. `Navigation/SegmentedTabs` (`SegmentedControl.vue`)
4. `Button/Primary` (`BaseButton.vue`)
5. `Button/Secondary` (`BaseButton.vue`)
6. `Button/Icon` (`IconButton.vue`)
7. `Button/Ghost` (`BaseButton.vue`)
8. `Input/Search` (`SearchInput.vue`)
9. `Input/TextArea` (`BaseTextarea.vue`)
10. `Control/SwitchRow` (`BaseToggle.vue`)
11. `Card/Base` (`BaseCard.vue`)
12. `Card/QuoteCard` (`QuoteCard.vue`)
13. `List/StockRow` (`StockCard.vue`)
14. `List/NavigationRow` (`ListRow.vue`)
15. `Disclosure/Collapsed` (`TendencyCard.vue`)
16. `Badge/Status` (`StatusBadge.vue`)
17. `Badge/Data` (`BaseBadge.vue`)
18. `Overlay/BottomSheet` (`BottomSheet.vue`)
19. `Feedback/InlineAlert` (`InfoBanner.vue`)
20. `Progress/Linear` (`TimerProgressBar.vue`)

---

## 14. Vue 구현 및 아키텍처 원칙

- **공용 시각 요소**: `src/shared/components/`
- **기능 전용 UI**: `src/features/*/components/`
- **화면 관점 Vue 컴포넌트**: `src/features/*/views/`
- **상태 관리**: `src/features/*/stores/`
- **API 서비스 통신**: `src/features/*/api/`
- **상태 props 제어**: 활성/비활성 상태는 `variant`, `active`, `status` props로 제어
- **모바일 대응**: `390px` 디자인 표준 기반 유동 너비 응답형 구현
