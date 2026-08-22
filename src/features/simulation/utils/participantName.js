/**
 * 참가자 이름이 화면마다 달라서 같은 참가자가 다른 인물처럼 보이는 문제를 막는다.
 *
 * 같은 참가자인데 데이터 출처마다 이름이 다르다.
 *   - comparators                     : 나의 투자봇 v3 / 유명 투자자 / 원숭이   (사용자가 고른 화면)
 *   - liveSimulationResult, latestResult: 나의 투자봇 v1 / 우량 가치·품질 퀀트 봇 / 원숭이 봇
 *
 * 사용자가 직접 보고 고른 comparators의 이름을 기준으로 삼는다.
 * 목록에 없으면 원본 이름을, 그것도 없으면 유형별 기본 이름을 쓴다.
 */

const FALLBACK_NAME_BY_TYPE = Object.freeze({
  ACTUAL_USER: '실제 나',
  PERSONAL_BOT: '나의 투자봇',
  FAMOUS_STRATEGY: '유명 투자자',
  RANDOM_BOT: '원숭이',
})

// variantType이 없는 옛 데이터를 위한 보정 (simulationOutcome.js와 같은 규칙)
const TYPE_BY_VARIANT_ID = Object.freeze({
  1: 'ACTUAL_USER',
  1001: 'ACTUAL_USER',
  2: 'PERSONAL_BOT',
  1002: 'PERSONAL_BOT',
  3: 'FAMOUS_STRATEGY',
  1003: 'FAMOUS_STRATEGY',
})

export function getParticipantVariantType(participant) {
  if (participant?.variantType) return participant.variantType

  const variantId = Number(participant?.variantId ?? participant?.simulationVariantId ?? 0)
  return TYPE_BY_VARIANT_ID[variantId] ?? 'RANDOM_BOT'
}

export function resolveParticipantName(participant, comparators = []) {
  if (!participant) return ''

  const variantType = getParticipantVariantType(participant)
  const selected = comparators.find((comparator) => comparator?.variantType === variantType)

  return (
    selected?.variantName ??
    participant.variantName ??
    FALLBACK_NAME_BY_TYPE[variantType] ??
    '참가자'
  )
}
