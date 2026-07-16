export function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return
  document.cookie = `medisecours_token=${token}; path=/; max-age=28800; samesite=lax`
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'medisecours_token=; path=/; max-age=0'
}
