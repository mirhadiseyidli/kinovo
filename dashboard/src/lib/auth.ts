import NextAuth, { type NextAuthOptions, type Account, type User, type Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
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
    async signIn({ account }: { account: Account | null }) {
      if (account?.provider === "google") {
        try {
          console.log('NextAuth account object:', account)
          console.log('ID Token:', account.id_token)
          
          // Authenticate with Kinovo backend using web-specific endpoint
          const response = await api.post('/api/auth/web/google-auth', {
            idToken: account.id_token
          })

          if (response.data.success) {
            console.log('Received user data:', response.data.user)
            console.log('User role:', response.data.user?.role)
            
            // Check if user has admin role
            if (response.data.user?.role === 'admin') {
              return true
            } else {
              console.error('User does not have admin privileges. Current role:', response.data.user?.role)
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
    async jwt({ token, account, user }: { token: JWT; account: Account | null; user?: User }) {
      if (account && user) {
        // Store Kinovo JWT token
        try {
          const response = await api.post('/api/auth/web/google-auth', {
            idToken: account.id_token
          })

          if (response.data.success) {
            token.kinovoToken = response.data.accessToken
            // No need to store refreshToken - it's in httpOnly cookie
            token.role = response.data.user?.role
            token.userId = response.data.user?.id
          }
        } catch (error) {
          console.error('Error getting Kinovo token:', error)
        }
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
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

export default NextAuth(authOptions)