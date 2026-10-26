import client from './client'

export interface AuthResponse {
  token: string | null
  name: string
  email: string
  avatarUrl: string | null
  jobTitle: string | null
  bio: string | null
  hasPassword: boolean
  gmailConnected: boolean
  timeZone: string | null // IANA id like "America/Denver"; null until first set
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface UpdateProfileRequest {
  name: string
  email?: string
  jobTitle?: string
  bio?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// Password for accounts that have one, otherwise the account email
export interface DeleteAccountRequest {
  password?: string
  confirmEmail?: string
}

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/auth/login', data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/auth/register', data)

// Which OAuth providers the server has credentials for
export interface AuthProviders {
  google: boolean
  github: boolean
  gmail: boolean
  // Server can send mail; interview reminders depend on it
  emailReminders: boolean
}

export const getAuthProviders = () =>
  client.get<AuthProviders>('/auth/providers')

// Trades the one-time code from the OAuth redirect for a JWT
export const exchangeOAuthCode = (code: string) =>
  client.post<AuthResponse>('/auth/oauth/exchange', { code })

export const getMe = () =>
  client.get<AuthResponse>('/auth/me')

export const updateProfile = (data: UpdateProfileRequest) =>
  client.put<AuthResponse>('/auth/profile', data)

// Signs out every other session; the response has a new token for this one
export const changePassword = (data: ChangePasswordRequest) =>
  client.put<AuthResponse>('/auth/password', data)

export const deleteAccount = (data: DeleteAccountRequest) =>
  client.delete<void>('/auth/me', { data })

export const updateTimeZone = (timeZone: string) =>
  client.put<AuthResponse>('/auth/time-zone', { timeZone })
