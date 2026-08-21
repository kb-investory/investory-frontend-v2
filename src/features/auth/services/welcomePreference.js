const WELCOME_SEEN_KEY = 'investory:welcome-seen'

export function hasSeenWelcome() {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

export function markWelcomeSeen() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, 'true')
  } catch {
    // 저장소 접근이 제한된 환경에서도 로그인 흐름은 계속 진행한다.
  }
}
