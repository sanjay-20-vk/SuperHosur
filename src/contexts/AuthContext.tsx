import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabase'
import {
  getUserProfile,
  signOut as authSignOut,
  type UserProfile,
} from '../services/auth'
import { AuthContext, type AuthContextValue } from './authContextCore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Track active user ID to avoid duplicate profile queries for token refreshes
  const currentUserIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchProfileForUser = useCallback(async (userId: string | null): Promise<UserProfile | null> => {
    if (!userId) return null
    try {
      return await getUserProfile(userId)
    } catch (err) {
      console.error('Failed to load user profile:', err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const activeUserId = data.session?.user.id ?? null
    if (!activeUserId) {
      if (isMountedRef.current) {
        setProfile(null)
      }
      return
    }
    const profileData = await fetchProfileForUser(activeUserId)
    if (isMountedRef.current) {
      setProfile(profileData)
    }
  }, [fetchProfileForUser])

  const handleSignOut = useCallback(async () => {
    await authSignOut()
    if (isMountedRef.current) {
      setSession(null)
      setUser(null)
      setProfile(null)
      currentUserIdRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    const supabase = getSupabaseClient()

    let initialized = false

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }

        const initialSession = data.session
        const initialUser = initialSession?.user ?? null

        if (isMountedRef.current) {
          setSession(initialSession)
          setUser(initialUser)
          currentUserIdRef.current = initialUser?.id ?? null
        }

        if (initialUser) {
          const initialProfile = await fetchProfileForUser(initialUser.id)
          if (isMountedRef.current) {
            setProfile(initialProfile)
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err)
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          initialized = true
        }
      }
    }

    void initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Safe asynchronous follow-up to avoid Supabase auth mutex deadlock
      setTimeout(async () => {
        if (!isMountedRef.current) return

        const newUser = newSession?.user ?? null
        const newUserId = newUser?.id ?? null

        setSession(newSession)
        setUser(newUser)

        if (event === 'SIGNED_OUT' || !newUserId) {
          currentUserIdRef.current = null
          setProfile(null)
          setLoading(false)
          return
        }

        // If user changed or initial load was not completed yet
        if (newUserId !== currentUserIdRef.current || !initialized) {
          currentUserIdRef.current = newUserId
          const userProfile = await fetchProfileForUser(newUserId)
          if (isMountedRef.current) {
            setProfile(userProfile)
            setLoading(false)
          }
        } else if (event === 'USER_UPDATED') {
          const userProfile = await fetchProfileForUser(newUserId)
          if (isMountedRef.current) {
            setProfile(userProfile)
          }
        }
      }, 0)
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfileForUser])

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(session && user)
    const isAdmin = Boolean(profile?.active && profile?.role === 'admin')

    return {
      session,
      user,
      profile,
      loading,
      isAuthenticated,
      isAdmin,
      refreshProfile,
      signOut: handleSignOut,
    }
  }, [session, user, profile, loading, refreshProfile, handleSignOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
