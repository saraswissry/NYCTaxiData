/**
 * lib/auth.ts
 *
 * Centralised JWT authentication module for FleetCommand.
 *
 * Responsibilities:
 *  - Persist / retrieve the Bearer token in localStorage
 *  - Persist / retrieve the logged-in user profile
 *  - Provide helpers consumed by fleet-api.ts and auth-guard.tsx
 *  - Token refresh flow (silent retry on 401)
 */

// ── Storage keys ──────────────────────────────────────────────────────────────

const TOKEN_KEY = 'fleet_auth_token'
const USER_KEY = 'fleet_user'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  phoneNumber: string
  firstName: string
  lastName: string
  role: string          // "Driver" | "Manager" | "Admin" | etc.
  driverId?: string
  employeeId?: string
  department?: string
}

export interface LoginResponse {
  token: string
  user?: AuthUser
  // The server may nest differently — normalise in fleet-api.ts before calling setSession
  [key: string]: unknown
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

// ── User helpers ──────────────────────────────────────────────────────────────

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setUser(user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

// ── Session helpers ───────────────────────────────────────────────────────────

/** Store both token + user in one call (used after login). */
export function setSession(token: string, user: AuthUser): void {
  setToken(token)
  setUser(user)
  // Keep legacy key so any old guard code still works
  if (typeof window !== 'undefined') {
    localStorage.setItem('isLoggedIn', 'true')
  }
}

/** Wipe everything and redirect to login. */
export function logout(): void {
  clearToken()
  clearUser()
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isLoggedIn')
    sessionStorage.removeItem('hasLoadedDashboard')
    window.location.href = '/login'
  }
}

/** Quick boolean check — just looks for a token string. */
export function isAuthenticated(): boolean {
  return !!getToken()
}
