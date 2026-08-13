export function getSecurityDisplayName(security = {}) {
  const securityName = security.securityName?.trim().replace(/보통주$/, '').trim()
  const securityCode = security.securityCode?.trim()

  if (securityName) {
    return `${securityName}${securityCode ? ` (${securityCode})` : ''}`
  }

  return securityCode || '종목 정보 없음'
}
