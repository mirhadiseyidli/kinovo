'use client'

import { useSession, signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from '@/lib/api'
import { useTokenStorage } from '@/hooks/useTokenStorage'

interface AnalyticsData {
  totalUsers: number
  newUserCount: number
  dailyActiveUsersCount: number
  sessionCount: number
  avgSessionDuration: number
  topStates: Record<string, number>
  retentionRates: {
    day1: string
    day7: string
    day30: string
  }
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Store tokens in localStorage when session is available
  useTokenStorage()
  
  console.log(session)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) redirect('/auth/signin')
    if (session.role !== 'admin') redirect('/auth/error?error=AccessDenied')

    fetchAnalytics()
  }, [session, status])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/analytics/today')
      setAnalytics(response.data.data)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </div>
      </div>
    )
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const handleLogout = async () => {
    try {
      // Clear local storage tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('userId')
      }
      
      // Sign out from NextAuth (which will also clear session cookies)
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if logout fails
      window.location.href = '/auth/signin'
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Kinovo Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-2">Real-time insights into your app usage</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              Logout
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Welcome, {session?.user?.name} • {new Date().toLocaleDateString()}
            </p>
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              Refresh Data
            </Button>
          </div>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{analytics.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">All time registrations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">New Users Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{analytics.newUserCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{analytics.dailyActiveUsersCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Active today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{analytics.sessionCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Analytics</CardTitle>
                <CardDescription>User engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Session Duration</p>
                    <p className="text-lg font-semibold text-foreground">{formatDuration(analytics.avgSessionDuration)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sessions per Active User</p>
                    <p className="text-lg font-semibold text-foreground">
                      {analytics.dailyActiveUsersCount > 0 
                        ? (analytics.sessionCount / analytics.dailyActiveUsersCount).toFixed(1)
                        : '0'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Retention</CardTitle>
                <CardDescription>Cohort retention rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Day 1 Retention</span>
                    <span className="font-semibold text-foreground">{analytics.retentionRates.day1}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Day 7 Retention</span>
                    <span className="font-semibold text-foreground">{analytics.retentionRates.day7}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Day 30 Retention</span>
                    <span className="font-semibold text-foreground">{analytics.retentionRates.day30}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top States</CardTitle>
                <CardDescription>User distribution by state</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(analytics.topStates)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([state, count]) => (
                      <div key={state} className="text-center p-3 bg-muted rounded-lg">
                        <p className="font-semibold text-lg text-foreground">{count}</p>
                        <p className="text-sm text-muted-foreground">{state}</p>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
