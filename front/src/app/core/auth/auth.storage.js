const AUTH_STORAGE_KEY = 'courier-auth'

export function readStoredAuth() {
  const storedValue = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    clearStoredAuth()
    return null
  }
}

export function writeStoredAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
