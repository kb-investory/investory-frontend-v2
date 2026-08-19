const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

let currentAccessToken = null

export function setAccessToken(token) {
  currentAccessToken = token
}

export function getAccessToken() {
  return currentAccessToken
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

export async function request(endpoint, options = {}) {
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

  const response = await fetch(getApiUrl(endpoint), fetchOptions)

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
