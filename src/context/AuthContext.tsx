'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

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

      // 2. Try fetching by firebase_uid
      if (!data && authUser.id) {
        const { data: userByFb } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_uid', authUser.id)
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
          full_name: authUser.user_metadata?.full_name || authUser.displayName || authUser.email?.split('@')[0] || 'User',
          phone: authUser.user_metadata?.phone || authUser.phone || authUser.phoneNumber || '',
          role: 'customer',
          wallet_balance: 0,
          reward_coins: 0,
          created_at: authUser.created_at || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
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
    const supabase = createClient();
    await supabase.auth.signOut();
    try {
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Firebase signout error:', e);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    const supabase = createClient();
    let unsubFirebase: (() => void) | null = null;

    const initAuth = async () => {
      // 1. Check Supabase auth session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user as any);
        await fetchProfile(initialSession.user);
        setLoading(false);
        return;
      }

      // 2. Listen to Firebase auth state if no active Supabase session
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        unsubFirebase = onAuthStateChanged(auth, async (fbUser) => {
          const { data: { session: checkSession } } = await supabase.auth.getSession();
          if (checkSession?.user) {
            setSession(checkSession);
            setUser(checkSession.user as any);
            await fetchProfile(checkSession.user);
            setLoading(false);
            return;
          }

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
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        });
      } catch (err) {
        console.error('Firebase auth listener error:', err);
        setLoading(false);
      }
    };

    initAuth();

    // 3. Listen to Supabase Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user as any);
          await fetchProfile(currentSession.user);
          setLoading(false);
        } else {
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
            } else {
              setUser(null);
              setSession(null);
              setProfile(null);
            }
          } catch {
            setUser(null);
            setSession(null);
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
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
