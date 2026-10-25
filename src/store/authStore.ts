import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
}

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function loadPersistedProfile(): { profile: Profile; storedAt: number } | null {
  try {
    const adminRaw = localStorage.getItem('admin_profile');
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw);
      const storedAt = parsed._storedAt || 0;
      // Accept admin sessions for up to 12h
      if (Date.now() - storedAt < SESSION_DURATION_MS) {
        return { profile: parsed, storedAt };
      }
      // Expired — clear it
      localStorage.removeItem('admin_profile');
    }

    const staffRaw = localStorage.getItem('staff_profile');
    if (staffRaw) {
      const parsed = JSON.parse(staffRaw);
      const storedAt = parsed._storedAt || 0;
      if (Date.now() - storedAt < SESSION_DURATION_MS) {
        return { profile: parsed, storedAt };
      }
      localStorage.removeItem('staff_profile');
    }
  } catch {
    // Corrupted storage — clear
    localStorage.removeItem('admin_profile');
    localStorage.removeItem('staff_profile');
  }
  return null;
}

function makeSession(profile: Profile) {
  return { user: { id: profile.id, role: profile.role } } as any as Session;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setStaffProfile: (profile: Profile) => void;
  setAdminProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  setAdminProfile: (profile: Profile) => {
    const stamped = { ...profile, _storedAt: Date.now() };
    localStorage.setItem('admin_profile', JSON.stringify(stamped));
    localStorage.removeItem('staff_profile');
    set({ profile, session: makeSession(profile), isLoading: false });
  },

  setStaffProfile: (profile: Profile) => {
    const stamped = { ...profile, _storedAt: Date.now() };
    localStorage.setItem('staff_profile', JSON.stringify(stamped));
    localStorage.removeItem('admin_profile');
    set({ profile, session: makeSession(profile), isLoading: false });
  },

  initialize: async () => {
    // ── Step 1: SYNCHRONOUSLY restore from localStorage ──
    // This prevents any flash-of-login between page loads.
    const persisted = loadPersistedProfile();
    if (persisted) {
      set({
        profile: persisted.profile,
        session: makeSession(persisted.profile),
        isLoading: false,
      });
      return; // Done — no Supabase call needed
    }

    // ── Step 2: Fallback to Supabase Auth (if someone uses magic-link etc.) ──
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        set({ session, user: session.user, profile: profile || null, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    localStorage.removeItem('admin_profile');
    localStorage.removeItem('staff_profile');
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    set({ session: null, user: null, profile: null });
  },
}));
