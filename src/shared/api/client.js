const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

let currentAccessToken = null
let refreshPromise = null
let onAuthExpired = null

export function setAccessToken(token) {
  currentAccessToken = token
}

export function getAccessToken() {
  return currentAccessToken
}

export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler
}

export function getApiUrl(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE_URL}${normalizedEndpoint}`
}

export class ApiError extends Error {
  constructor(status, errorData) {
    const message = errorData?.message || `API 요청에 실패했습니다. (${status})`
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorData?.errorCode || null
    this.timestamp = errorData?.timestamp || null
    this.fieldErrors = errorData?.fieldErrors || []
    this.data = errorData
  }
}

async function parseResponse(response) {
  if (!response.ok) {
    let errorData = null
    try {
      errorData = await response.json()
    } catch {
      // JSON 파싱 실패 시 기본 메시지 처리
    }
    throw new ApiError(response.status, errorData)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function performFetch(endpoint, options) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (currentAccessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${currentAccessToken}`
  }

  const fetchOptions = {
    ...options,
    headers,
  }

  if (options.withCredentials) {
    fetchOptions.credentials = 'include'
    delete fetchOptions.withCredentials
  }

  return fetch(getApiUrl(endpoint), fetchOptions)
}

// 갱신 토큰(쿠키)으로 액세스 토큰을 재발급한다. request()의 401 인터셉터가 내부에서 사용하며,
// 동시에 여러 요청이 401을 받아도 이 함수가 dedup 지점 역할을 해 갱신 요청은 한 번만 나간다.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performFetch('/auth/token/refresh', {
      method: 'POST',
      withCredentials: true,
    })
      .then(parseResponse)
      .then((data) => {
        setAccessToken(data?.accessToken ?? null)
        return data
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function request(endpoint, options = {}) {
  const { skipAuthRetry, ...fetchOptions } = options
  const response = await performFetch(endpoint, fetchOptions)

  if (response.status === 401 && !skipAuthRetry) {
    try {
      await refreshAccessToken()
    } catch (refreshError) {
      setAccessToken(null)
      onAuthExpired?.()
      throw refreshError
    }
    return request(endpoint, { ...fetchOptions, skipAuthRetry: true })
  }

  return parseResponse(response)
}
