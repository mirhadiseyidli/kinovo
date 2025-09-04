'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function useTokenStorage() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session && typeof window !== 'undefined') {
      // Store only access token and user ID in localStorage
      // Refresh token is stored in httpOnly cookie by the backend
      if (session.kinovoToken) {
        localStorage.setItem('accessToken', session.kinovoToken)
      }
      if (session.userId) {
        localStorage.setItem('userId', session.userId)
      }
      // Don't store refreshToken - it's in httpOnly cookie for security
    }
  }, [session])
}