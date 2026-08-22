# Design QA — 시뮬레이션 결과 복기 V11

- Source visual truth: `C:\Users\tkddn\AppData\Local\Temp\codex-clipboard-f5bb27c1-58de-4dc3-8bfa-fe055bdcb219.png`
- Target route: 시뮬레이션 결과 상세의 `02 감정 복기`, `04 학습 인사이트`, `05 원칙 진화`
- Target state: `DETERMINISTIC_V11` 핵심 거래와 투자 근거 현실화 검증 결과
- Source pixels: 1024 × 1536
- Implementation screenshot: unavailable

## 구현 상태

- `keyTradeReviews`를 우선 사용하고 `decisionReviews`를 하위 호환 경로로 유지했다.
- 접힌 상태에는 날짜, 원칙 판정 상태, 5거래일 수익률, 종목, 실제 행동, 패턴, 원칙봇 행동을 표시한다.
- 펼친 상태에는 내가 단 근거, 원칙 위반 여부와 이유, 당시 했어야 할 행동, 원칙봇 판단, 체결 수량과 가격, 이후 결과를 분리해 표시한다.
- `VIOLATION_PATTERN_DETECTED`와 `DECISION_DIFFERENCE`의 제목과 결론 문구를 구분했다.
- 거래별 `thesisOutcome` 판정, 주장별 근거와 출처 링크를 표시하고 미확인 상태를 구분했다.
- `thesisOutcomeSummary`, `thesisNarrative`, `THESIS_VALIDATION` 원칙 제안을 연결했다.
- 백그라운드 검증 중에는 5초 간격, 최대 12회 리포트를 갱신하고 화면 이탈 시 중단한다.
- 사용자 캡처에서 확인된 중첩 카드 문제를 줄이기 위해 02는 행동과 원칙 비교만 남기고 내부 박스를 제거했다.
- 03은 구형 `evidenceReviews` 신뢰도 점수 카드 대신 V11 `thesisOutcome` 중심의 종목별 아코디언으로 교체했다.
- Prettier, ESLint, Vite production build, `git diff --check`를 통과했다.

## 시각 비교 상태

Codex 인앱 브라우저에서 `http://localhost:5174/simulation`에 접근했으나 `http://localhost:5174/login?redirect=/simulation`으로 이동했다. 인증된 실제 시뮬레이션 데이터 화면을 열 수 없어 구현 스크린샷과 펼침 상호작용 증거를 캡처하지 못했다.

## 필수 표면 확인 상태

- Fonts and typography: 코드 스타일과 빌드는 확인했으나 렌더링 비교는 인증 때문에 차단됨.
- Spacing and layout rhythm: 접힘/펼침 구조는 구현했으나 실제 데이터 길이에 따른 줄바꿈 비교는 차단됨.
- Colors and visual tokens: 기존 감정 복기 카드 토큰을 재사용했으나 렌더링 비교는 차단됨.
- Image quality and asset fidelity: 기존 `StockLogo`와 `AppIcon` 컴포넌트를 재사용함.
- Copy and content: V11 필드별 역할, 원칙 판정 상태, 근거 현실화 상태에 맞게 문구를 분리함.

## 후속 확인

- 로그인된 브라우저에서 핵심 거래 최대 3건의 접힘/펼침 상태를 확인한다.
- 긴 `recommendedAction`과 `violationReason`의 모바일 줄바꿈을 확인한다.
- 주장별 출처가 여러 개인 경우 펼침 높이와 외부 링크 동작을 확인한다.
- 브라우저 콘솔 오류와 BUY/SELL/HOLD 조합의 실제 문구를 확인한다.

final result: blocked

---

# Principle card design QA

## Comparison target

- Source visual truth: `C:/Users/tkddn/AppData/Local/Temp/codex-clipboard-8c4d135b-26d9-406b-8acb-7d5b7f9c307f.png`
- Implementation screenshot: `C:/Users/tkddn/Documents/investory-frontend/design-qa-principles-implementation.png`
- Focused implementation screenshot: `C:/Users/tkddn/Documents/investory-frontend/design-qa-principles-list.png`
- Combined comparison input: `C:/Users/tkddn/Documents/investory-frontend/design-qa-principles-comparison.png`
- Route/state: `http://127.0.0.1:5174/tendency?tab=principles`, mock-authenticated state, 3 active principles
- Source pixels: 833 x 751
- Implementation pixels: 557 x 820; CSS viewport 572 x 842
- Focused implementation region: 338.7 x 407.3 CSS px
- Normalization: the supplied reference is a wider visual mock and the implementation is shown inside the existing mobile app shell, so comparison was focused on card composition, spacing rhythm, icon treatment, copy hierarchy, and responsive behavior rather than absolute pixel scale.

## Findings

No actionable P0/P1/P2 findings remain.

- [P3][intentional] Directly written principles use the pencil icon instead of the reference's category illustrations, as explicitly requested.
- [P3][intentional] The existing page status panel and previously selected heading treatment remain outside the principle-card scope; repeated small header text was removed as requested.

## Fidelity review

- Typography: existing SUIT tokens remain in use; principle copy stays at 16px with 600 weight and 1.5 line height.
- Spacing/layout: each card uses a 64px icon area, flexible text column, and 20px trailing chevron. Three cards fit without horizontal overflow; text wraps within the content column.
- Colors/tokens: recommendation cards use the existing teal family; direct-written cards use a restrained lavender treatment for the pencil state; origin badges retain their semantic colors.
- Image/assets: no new raster or custom SVG asset was needed. Icons use the existing Lucide-backed `AppIcon` component.
- Copy/content: `원칙 01`, source badge, principle content, and the existing edit CTA are preserved.

## Verification

- Primary tab state was visible and active.
- `원칙 전체 편집` was visible and enabled.
- Browser console error log was empty.
- App root and principle paper had no horizontal overflow.
- `npm run lint`: passed with 6 pre-existing `no-console` warnings in `src/features/simulation/stores/simulationStore.js`.
- `npm run build`: passed.
- `git diff --check`: passed.

## Implementation checklist

- [x] Add source-based principle icon mapping.
- [x] Use pencil icon for directly written principles.
- [x] Use tendency/category icon for recommendation-based principles.
- [x] Match reference card composition with icon, number, badge, copy, and chevron.
- [x] Verify mobile wrapping and overflow.

final result: passed

---

# Simulation pending modal design QA

## Comparison target

- Source visual truth: `C:/Users/tkddn/AppData/Local/Temp/codex-clipboard-c0b43463-dfea-4b3b-9032-22a12985c340.png`
- Implementation screenshot: `C:/Users/tkddn/Documents/investory-frontend/design-qa-simulation-pending.png`
- Route/state: `/simulation/comparators`, 4 selected participants, pending modal visible
- Source pixels: 1254 x 1254
- Implementation pixels: 557 x 820; CSS viewport 572 x 842
- Normalization: the supplied square artwork is displayed as a full square hero inside the existing mobile modal, so the image is not cropped.

## Findings

No actionable P0/P1/P2 findings remain.

- [P3][resolved] The previous fixed-height, `object-fit: cover` treatment cropped the supplied artwork. The hero now uses a square aspect ratio and `object-fit: contain` so all four participants remain visible.
- [P3][intentional] The `LIVE MATCH` status pill overlays the artwork to preserve the live-state cue without changing the supplied image.

## Fidelity review

- Image/assets: the supplied reference is used as the actual `live-race-hero.png` asset; no recreated illustration was substituted.
- Layout: the full square image leads the modal, followed by the live label, title, description, preparation steps, progress indicator, and waiting copy.
- Contrast: a dark status pill and subtle image overlay keep the live-state text legible over the artwork.
- Motion/state: the preparation modal is held for at least 3 seconds before navigation on the successful simulation path.

## Verification

- Browser screenshot captured with the pending modal visible.
- The complete four-quadrant image was visually confirmed without top/bottom cropping.
- `npm run lint`: passed with 6 pre-existing `no-console` warnings in `src/features/simulation/stores/simulationStore.js`.
- `npm run build`: passed.
- `git diff --check`: passed.

## Implementation checklist

- [x] Use the supplied square illustration in the waiting modal.
- [x] Remove image cropping by preserving the full artwork aspect ratio.
- [x] Keep the waiting modal visible for a minimum of 3 seconds on the successful start path.
- [x] Verify the rendered mobile state in the in-app browser.

final result: passed
