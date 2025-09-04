import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    kinovoToken?: string
    role?: string
    userId?: string
  }

  interface JWT {
    kinovoToken?: string
    kinovoRefreshToken?: string
    role?: string
    userId?: string
  }
}