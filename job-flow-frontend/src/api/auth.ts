import client from './client'

export interface AuthResponse {
  token: string | null
  name: string
  email: string
  avatarUrl: string | null
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

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/auth/login', data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/auth/register', data)

export const getMe = () =>
  client.get<AuthResponse>('/auth/me')
