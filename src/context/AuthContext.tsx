'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { parseApiError } from '@/lib/api-errors';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'staff' | 'manager' | 'admin';
  wallet_balance: number;
  reward_coins: number;
  created_at: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: any) => {
    try {
      const supabase = createClient();
      let data = null;

      // 1. Try fetching by ID (Supabase Auth ID)
      if (authUser.id) {
        const { data: userById } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        data = userById;
      }

      // 2. Try fetching by firebase_uid using the secure RPC (bypasses RLS)
      if (!data && authUser.id) {
        const { data: userByFb, error } = await supabase
          .rpc('get_user_profile', { p_user_id: authUser.id })
          .maybeSingle();
        data = userByFb;
      }

      // 3. Try fetching by phone
      if (!data && (authUser.phone || authUser.user_metadata?.phone)) {
        const rawPhone = authUser.phone || authUser.user_metadata?.phone || '';
        const cleanedPhone = rawPhone.replace(/\D/g, '').slice(-10);
        if (cleanedPhone) {
          const { data: userByPhone } = await supabase
            .from('users')
            .select('*')
            .ilike('phone', `%${cleanedPhone}%`)
            .maybeSingle();
          data = userByPhone;
        }
      }

      // 4. Try fetching by email
      if (!data && authUser.email) {
        const { data: userByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();
        data = userByEmail;
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // Fallback profile using auth metadata
        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          full_name:
            authUser.user_metadata?.full_name ||
            authUser.displayName ||
            authUser.email?.split('@')[0] ||
            'User',
          phone:
            authUser.user_metadata?.phone ||
            authUser.phone ||
            authUser.phoneNumber ||
            '',
          role: 'customer',
          wallet_balance: 0,
          reward_coins: 0,
          created_at: authUser.created_at || new Date().toISOString(),
        });
      }
    } catch (err) {
      const apiError = parseApiError(err);
      console.error('Error fetching profile:', err);
      // We don't want to show a toast every time the profile fails to load in background,
      // but we do want to log it and potentially flag an error state if critical.
    }
  };

  const refreshProfile = async () => {
    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser as any);
      await fetchProfile(currentUser);
      return;
    }

    try {
      const { auth } = await import('@/lib/firebase');
      const fbUser = auth.currentUser;
      if (fbUser) {
        const formattedUser: any = {
          id: fbUser.uid,
          email: fbUser.email || null,
          phone: fbUser.phoneNumber || null,
          user_metadata: {
            full_name: fbUser.displayName || null,
            phone: fbUser.phoneNumber || null,
          },
          created_at: fbUser.metadata.creationTime || new Date().toISOString(),
        };
        setUser(formattedUser);
        await fetchProfile(formattedUser);
        return;
      }
    } catch (e) {
      console.error('Firebase refresh error:', e);
    }

    setUser(null);
    setProfile(null);
  };

  const signOut = async () => {
    try {
      // 1. Sign out of Firebase (client-side)
      try {
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');
        await firebaseSignOut(auth);
      } catch (e) {
        console.error('Firebase signout error:', e);
      }

      // 2. Clear the __session cookie on the server
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});

      // 3. Sign out of Supabase (in case of stale session)
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});

      setUser(null);
      setSession(null);
      setProfile(null);
      toast.success('Successfully logged out');
      window.location.href = '/login';
    } catch (err) {
      const apiError = parseApiError(err);
      toast.error(apiError.userMessage);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let unsubFirebase: (() => void) | null = null;

    const handleSupabaseSession = async (currentSession: Session | null) => {
      if (!isMounted) return false;
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user as any);
        await fetchProfile(currentSession.user);
        if (isMounted) setLoading(false);
        return true;
      }
      return false;
    };

    const handleFirebaseUser = async (fbUser: any) => {
      if (!isMounted) return false;
      if (fbUser) {
        const formattedUser: any = {
          id: fbUser.uid,
          email: fbUser.email || null,
          phone: fbUser.phoneNumber || null,
          user_metadata: {
            full_name: fbUser.displayName || null,
            phone: fbUser.phoneNumber || null,
          },
          created_at: fbUser.metadata?.creationTime || new Date().toISOString(),
        };
        setUser(formattedUser);
        setSession(null);
        await fetchProfile(formattedUser);
        if (isMounted) setLoading(false);
        return true;
      }
      return false;
    };

    const initAuth = async () => {
      // 1. Check Supabase first
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      const hasSupabase = await handleSupabaseSession(initialSession);

      // 2. Setup Firebase listener
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        unsubFirebase = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            await handleFirebaseUser(fbUser);
          } else {
            if (isMounted) {
              setUser(null);
              setSession(null);
              setProfile(null);
              setLoading(false);
            }
          }
        });
      } catch (err) {
        console.error('Firebase auth listener error:', err);
        if (!hasSupabase && isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Supabase Auth listener removed, we only listen to Firebase now.

    return () => {
      isMounted = false;
      if (unsubFirebase) unsubFirebase();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
