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
