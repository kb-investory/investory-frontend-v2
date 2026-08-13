const TRADE_REASON_PREFIX =
  /^\s*.*?(?:\(\s*\d{4,10}\s*\)|\[\s*\d{4,10}\s*\])?\s*(?:추가\s*매수|비중\s*축소|매수|매도|BUY|SELL|ADD|REDUCE)\s*[:：]\s*/iu

export function getDecisionReasonText(reason) {
  const normalized = String(reason ?? '').trim()
  if (!normalized) return '기록된 판단 근거가 없습니다.'

  const stripped = normalized.replace(TRADE_REASON_PREFIX, '').trim()
  return stripped || normalized
}
