'use client'

import { useSession, signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import api from '@/lib/api'
import { useTokenStorage } from '@/hooks/useTokenStorage'

interface User {
  _id: string
  full_name: string
  username: string
  email: string
  profile_picture?: string
  createdAt: string
  city: string
  state: string
  lastLogin: string
  friendsCount: number
  eventsCount: number
  sessionCount: number
  isOnline: boolean
  lastActive: string
}

interface RetentionData {
  rate: string
  cohortSize: number
  retainedCount: number
  cohortDate: string
  targetDate: string
}

interface OnlineUser {
  _id: string
  userId: {
    full_name: string
    username: string
    profile_picture?: string
  }
  online: boolean
  lastActive: string
}

interface AnalyticsData {
  totalUsers: number
  totalUsersList: User[]
  newUserCount: number
  newUserIds: string[]
  dailyActiveUsers: string[]
  dailyActiveUserCount: number
  sessionCount: number
  avgSessionDuration: number
  topStates: Record<string, number>
  newUsers?: {
    daily: number
    weekly: number
    monthly: number
  }
  retention?: {
    day1: RetentionData
    day7: RetentionData
    day30: RetentionData
  }
  currentlyOnline?: {
    count: number
    users: OnlineUser[]
  }
  date?: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof User>('full_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Store tokens in localStorage when session is available
  useTokenStorage()
  
  console.log(session)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let endpoint = '/api/analytics/today'
      if (selectedPeriod === 'week') {
        endpoint = '/api/analytics/dashboard?days=7'
      } else if (selectedPeriod === 'month') {
        endpoint = '/api/analytics/dashboard?days=30'
      }
      
      const response = await api.get(endpoint)
      setAnalytics(response.data.data)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) redirect('/auth/signin')
    if (session.role !== 'admin') redirect('/auth/error?error=AccessDenied')

    fetchAnalytics()
  }, [session, status, selectedPeriod])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Skeleton className="h-8 w-80 mb-2" />
                <Skeleton className="h-4 w-60" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Currently Online Skeleton */}
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analytics Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-36 mb-1" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28 mb-1" />
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top States Skeleton */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-4 w-44" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="text-center p-3 bg-muted rounded-lg">
                      <Skeleton className="h-6 w-8 mx-auto mb-1" />
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-60" />
                </div>
                <Skeleton className="h-8 w-64" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {['Name', 'Email', 'Username', 'Location', 'Last Login', 'Friends', 'Events', 'Sessions', 'Status'].map((_, i) => (
                        <th key={i} className="text-left py-3 px-2">
                          <Skeleton className="h-4 w-16" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(8)].map((_, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="py-3 px-2">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-xs space-y-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Skeleton className="h-4 w-6 mx-auto" />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Skeleton className="h-4 w-6 mx-auto" />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Skeleton className="h-4 w-6 mx-auto" />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`
    }
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
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

  const getNewUserCount = () => {
    if (!analytics) return 0
    
    if (selectedPeriod === 'today') {
      return analytics.newUsers?.daily || analytics.newUserCount || 0
    } else if (selectedPeriod === 'week') {
      return analytics.newUsers?.weekly || analytics.newUserCount || 0
    } else {
      return analytics.newUsers?.monthly || analytics.newUserCount || 0
    }
  }

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedUsers = analytics?.totalUsersList
    ?.filter(user => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query) ||
        user.state?.toLowerCase().includes(query)
      )
    })
    ?.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      const aStr = String(aValue || '')
      const bStr = String(bValue || '')
      
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    }) || []

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
              Welcome, {session?.user?.name} • {analytics?.date || new Date().toLocaleDateString()}
            </p>
            <div className="flex gap-2">
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value as 'today' | 'week' | 'month')}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              <Button onClick={fetchAnalytics} variant="outline" size="sm">
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {analytics && (
          <>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    New Users {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{getNewUserCount()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Recently registered</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{analytics.dailyActiveUserCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPeriod === 'today' ? 'Active today' : `Active in period`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{analytics.sessionCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
                </CardContent>
              </Card>
            </div>

            {analytics.currentlyOnline && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Currently Online</CardTitle>
                  <CardDescription>{analytics.currentlyOnline.count} users online now</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analytics.currentlyOnline.users.slice(0, 10).map((user: OnlineUser) => (
                      <div key={user._id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        {user.userId?.profile_picture ? (
                          <img 
                            src={user.userId.profile_picture} 
                            alt={user.userId.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white ${user.userId?.profile_picture ? 'hidden' : 'flex'}`}
                          style={{ display: user.userId?.profile_picture ? 'none' : 'flex' }}
                        >
                          {user.userId?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm">{user.userId?.full_name || 'Unknown'}</span>
                      </div>
                    ))}
                    {analytics.currentlyOnline.count > 10 && (
                      <div className="flex items-center p-2">
                        <span className="text-sm text-muted-foreground">
                          +{analytics.currentlyOnline.count - 10} more
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className={!analytics.retention ? 'lg:col-span-2' : ''}>
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
                        {analytics.dailyActiveUserCount > 0 
                          ? (analytics.sessionCount / analytics.dailyActiveUserCount).toFixed(1)
                          : '0'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analytics.retention && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Retention</CardTitle>
                    <CardDescription>Cohort retention rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">Day 1 Retention</span>
                          <span className="font-semibold text-foreground">{analytics.retention.day1.rate}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.retention.day1.retainedCount} of {analytics.retention.day1.cohortSize} users
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">Day 7 Retention</span>
                          <span className="font-semibold text-foreground">{analytics.retention.day7.rate}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.retention.day7.retainedCount} of {analytics.retention.day7.cohortSize} users
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">Day 30 Retention</span>
                          <span className="font-semibold text-foreground">{analytics.retention.day30.rate}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.retention.day30.retainedCount} of {analytics.retention.day30.cohortSize} users
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

            {/* Comprehensive Users Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Users ({analytics.totalUsersList.length})</CardTitle>
                    <CardDescription>Complete user database with detailed information</CardDescription>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm w-64"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th 
                          className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('full_name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {sortField === 'full_name' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-1">
                            Email
                            {sortField === 'email' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('username')}
                        >
                          <div className="flex items-center gap-1">
                            Username
                            {sortField === 'username' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-2">Location</th>
                        <th 
                          className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('lastLogin')}
                        >
                          <div className="flex items-center gap-1">
                            Last Login
                            {sortField === 'lastLogin' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-center py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('friendsCount')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Friends
                            {sortField === 'friendsCount' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-center py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('eventsCount')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Events
                            {sortField === 'eventsCount' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-center py-3 px-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('sessionCount')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Sessions
                            {sortField === 'sessionCount' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th className="text-center py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedUsers.map((user) => (
                        <tr key={user._id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {user.profile_picture ? (
                                <img 
                                  src={user.profile_picture} 
                                  alt={user.full_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white ${user.profile_picture ? 'hidden' : 'flex'}`}
                                style={{ display: user.profile_picture ? 'none' : 'flex' }}
                              >
                                {user.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="font-medium">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-2">@{user.username}</td>
                          <td className="py-3 px-2">
                            <div className="text-xs">
                              <div>{user.city}</div>
                              <div className="text-muted-foreground">{user.state}</div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {formatDate(user.lastLogin)}
                          </td>
                          <td className="py-3 px-2 text-center">{user.friendsCount}</td>
                          <td className="py-3 px-2 text-center">{user.eventsCount}</td>
                          <td className="py-3 px-2 text-center">{user.sessionCount}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              user.isOnline 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`}></span>
                              {user.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAndSortedUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found matching your search criteria
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}