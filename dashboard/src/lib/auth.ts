import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import api from "./api"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Authenticate with Kinovo backend using Google token
          const response = await api.post('/api/auth/google-login', {
            email: user.email,
            name: user.name,
            googleId: account.providerAccountId,
            accessToken: account.access_token
          })

          if (response.data.success) {
            // Check if user has admin role
            if (response.data.user?.role === 'admin') {
              return true
            } else {
              console.error('User does not have admin privileges')
              return '/auth/error?error=AccessDenied'
            }
          } else {
            console.error('Failed to authenticate with Kinovo backend')
            return false
          }
        } catch (error) {
          console.error('Error during sign in:', error)
          return false
        }
      }
      return false
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        // Store Kinovo JWT token
        try {
          const response = await api.post('/api/auth/google-login', {
            email: user.email,
            name: user.name,
            googleId: account.providerAccountId,
            accessToken: account.access_token
          })

          if (response.data.success) {
            token.kinovoToken = response.data.accessToken
            token.kinovoRefreshToken = response.data.refreshToken
            token.role = response.data.user?.role
            token.userId = response.data.user?.id

            // Store tokens in localStorage for API interceptor
            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', response.data.accessToken)
              localStorage.setItem('refreshToken', response.data.refreshToken)
              localStorage.setItem('userId', response.data.user?.id)
            }
          }
        } catch (error) {
          console.error('Error getting Kinovo token:', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      session.kinovoToken = token.kinovoToken as string
      session.role = token.role as string
      session.userId = token.userId as string
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signOut() {
      // Clear tokens from localStorage on sign out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userId')
      }
    }
  }
}