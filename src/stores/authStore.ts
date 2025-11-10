import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  full_name: string
  role: 'main_boss' | 'senior_manager' | 'factory_manager'
  factory_id: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  permissions: Record<string, any>
}

interface AuthState {
  user: User | null | undefined
  session: Session | null
  loading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined, // undefined = loading, null = not authenticated, User = authenticated
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, session: null, loading: false }),
  reset: () => set({ user: undefined, session: null, loading: true }),
}))
