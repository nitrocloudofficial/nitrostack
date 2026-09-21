export type AuthUser = {
  id: string
  email: string | null
  fullName: string
  initials: string
}

export type AuthSessionResponse = {
  authEnabled: boolean
  authRequired: boolean
  user: AuthUser | null
}
