import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setStaffProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  setStaffProfile: (profile: Profile) => {
    localStorage.setItem('staff_profile', JSON.stringify(profile));
    // Mock a session so the ProtectedRoute lets them through
    set({ profile, session: { user: { id: profile.id } } as any, isLoading: false });
  },

  initialize: async () => {
    try {
      // 1. Check for custom local staff profile first (bypasses Supabase Auth)
      const storedStaff = localStorage.getItem('staff_profile');
      if (storedStaff) {
        const profile = JSON.parse(storedStaff);
        set({ profile, session: { user: { id: profile.id } } as any, isLoading: false });
        return;
      }

      // 2. Otherwise, check Supabase Auth (for Admin)
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user || null });
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        set({ profile });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      set({ isLoading: false });
    }

    // Listen for Auth changes (for Admin login/logout)
    supabase.auth.onAuthStateChange(async (event, session) => {
      // If they just signed in, we need to fetch their profile before they are fully loaded.
      if (event === 'SIGNED_IN') set({ isLoading: true });
      
      set({ session, user: session?.user || null });
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ profile: profile || null, isLoading: false });
      } else {
        set({ profile: null, isLoading: false });
      }
    });
  },

  signOut: async () => {
    // Clear local staff profile
    localStorage.removeItem('staff_profile');
    // Clear Supabase session
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  }
}));
