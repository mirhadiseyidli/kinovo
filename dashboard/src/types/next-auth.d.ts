import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    kinovoToken?: string
    role?: string
    userId?: string
    user: {
      id?: string
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    role?: string
  }

  interface Account {
    provider?: string
    id_token?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    kinovoToken?: string
    kinovoRefreshToken?: string
    role?: string
    userId?: string
  }
}