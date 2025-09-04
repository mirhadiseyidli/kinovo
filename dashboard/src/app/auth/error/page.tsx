'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have admin privileges to access this dashboard. Please contact your administrator if you believe this is an error.',
          icon: '🚫'
        }
      case 'Configuration':
        return {
          title: 'Configuration Error',
          message: 'There is a problem with the authentication configuration. Please contact support.',
          icon: '⚙️'
        }
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'The verification token has expired or has already been used.',
          icon: '⏰'
        }
      default:
        return {
          title: 'Authentication Error',
          message: 'An error occurred during authentication. Please try again.',
          icon: '❌'
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">{errorInfo.icon}</div>
          <CardTitle className="text-xl font-bold text-red-400">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="mt-2">
            {errorInfo.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/auth/signin">
            <Button className="w-full">
              Try Again
            </Button>
          </Link>
          
          {error === 'AccessDenied' && (
            <p className="text-xs text-muted-foreground mt-4">
              This dashboard requires admin privileges. If you are an admin, 
              please ensure you&apos;re signed in with the correct Google account 
              associated with your admin role in the Kinovo system.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}