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

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/auth/login', data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/auth/register', data)

export const getMe = () =>
  client.get<AuthResponse>('/auth/me')

export const updateProfile = (data: UpdateProfileRequest) =>
  client.put<AuthResponse>('/auth/profile', data)

export const changePassword = (data: ChangePasswordRequest) =>
  client.put<void>('/auth/password', data)
