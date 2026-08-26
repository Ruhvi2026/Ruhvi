'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  createClient,
  clearSupabaseTokenCache,
  getCustomToken,
} from '@/lib/supabase/client';
import { decodeJwt } from 'jose';
import toast from 'react-hot-toast';
import { parseApiError } from '@/lib/api-errors';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'staff' | 'manager' | 'admin';
  wallet_balance: number;
  reward_coins: number;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at: string;
  updated_at?: string;
  role_id?: string | null;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: any) => {
    try {
      const supabase = createClient();
      let data: any = null;

      const isUuid =
        authUser.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          authUser.id
        );

      // 1. Try fetching by ID (if valid UUID)
      if (isUuid) {
        const { data: userById } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .limit(1)
          .maybeSingle();
        data = userById;
      }

      // 2. Try fetching by firebase_uid using the secure RPC (bypasses RLS)
      if (!data && authUser.id) {
        const { data: userByFb } = await supabase
          .rpc('get_user_profile', { p_user_id: authUser.id })
          .limit(1)
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
            .limit(1)
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
          .limit(1)
          .maybeSingle();
        data = userByEmail;
      }

      const profileData = Array.isArray(data) ? data[0] : data;

      if (profileData) {
        // Fetch permissions if role_id is present
        let permissions: string[] = [];
        if (profileData.role_id) {
          const { data: perms } = await supabase
            .from('role_permissions')
            .select('permission')
            .eq('role_id', profileData.role_id);

          if (perms) {
            permissions = perms.map((p: any) => p.permission);
          }
        } else if (
          profileData.role === 'super_admin' ||
          profileData.role === 'SUPER_ADMIN'
        ) {
          permissions = ['*'];
        } else if (profileData.role) {
          // Fall back to the base role (ADMIN/MANAGER/STAFF) permissions
          const { data: roleRow } = await supabase
            .from('roles')
            .select('id')
            .eq('name', profileData.role.toUpperCase())
            .maybeSingle();

          if (roleRow) {
            const { data: rolePerms } = await supabase
              .from('role_permissions')
              .select('permission')
              .eq('role_id', roleRow.id);

            if (rolePerms) {
              permissions = rolePerms.map((p: any) => p.permission);
            }
          }
        }

        setProfile({
          ...profileData,
          wallet_balance: Number(profileData.wallet_balance) || 0,
          reward_coins: Number(profileData.reward_coins) || 0,
          email_verified:
            !!profileData.email_verified ||
            !!authUser.email_verified ||
            !!authUser.emailVerified,
          phone_verified:
            !!profileData.phone_verified || !!authUser.phoneNumber,
          permissions,
        });
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
          email_verified: !!authUser.email_verified || !!authUser.emailVerified,
          phone_verified: !!authUser.phoneNumber,
          created_at: authUser.created_at || new Date().toISOString(),
          permissions: [],
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
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

      // 3. Clear Supabase token cache & sign out
      // Note: supabase.auth is unavailable when the client uses a custom accessToken,
      // so Firebase sign-out + cache clear is the complete teardown.
      clearSupabaseTokenCache();

      setUser(null);
      setSession(null);
      setProfile(null);

      toast.success('Successfully logged out');
      router.push('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
      // Next.js might throw a NEXT_REDIRECT error which should not be caught as an API error
      if (
        err?.message?.includes('NEXT_REDIRECT') ||
        err?.digest?.includes('NEXT_REDIRECT')
      ) {
        throw err;
      }
      const apiError = parseApiError(err);
      toast.error(apiError.userMessage);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let unsubFirebase: (() => void) | null = null;

    const handleFirebaseUser = async (fbUser: any) => {
      if (!isMounted) return false;
      if (fbUser) {
        try {
          // Fetch custom JWT to get real Supabase UUID
          const token = await getCustomToken();
          if (!token) throw new Error('No custom token available');

          const decoded = decodeJwt(token);

          const formattedUser: any = {
            id: decoded.sub, // Use real Supabase UUID
            email: decoded.email || fbUser.email || null,
            phone: decoded.phone || fbUser.phoneNumber || null,
            user_metadata: decoded.user_metadata || {
              full_name: fbUser.displayName || null,
              phone: fbUser.phoneNumber || null,
            },
            created_at:
              fbUser.metadata?.creationTime || new Date().toISOString(),
          };
          setUser(formattedUser);
          setSession(null);
          await fetchProfile(formattedUser);
          if (isMounted) setLoading(false);
          return true;
        } catch (e) {
          console.error('Firebase user JWT resolution error:', e);
        }
      }
      return false;
    };

    const initAuth = async () => {
      // Note: supabase.auth is unavailable when the client uses a custom accessToken,
      // so Firebase is the only source of truth for the session.
      // 1. Setup Firebase listener
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        unsubFirebase = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            await handleFirebaseUser(fbUser);
          } else {
            if (isMounted) {
              // Since Supabase uses the accessToken option, we don't manage its session directly.
              // Firebase is the source of truth. If Firebase has no user, we clear the state.
              setUser(null);
              setSession(null);
              setProfile(null);
              setLoading(false);
            }
          }
        });
      } catch (err) {
        console.error('Firebase auth listener error:', err);
        if (isMounted) {
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

  // Real-time synchronization for profile and wallet balance changes
  useEffect(() => {
    if (!profile?.id) return;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        profile.id
      );
    if (!isUuid) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`profile-sync-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${profile.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const updated = payload.new as any;
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    ...updated,
                    wallet_balance: Number(updated.wallet_balance) || 0,
                    reward_coins: Number(updated.reward_coins) || 0,
                  }
                : updated
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
