'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  user: any | null;
  session: any | null;
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
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: any) => {
    try {
      const supabase = createClient();
      let profileData = null;

      // Try direct id lookup (works when supabaseToken is applied)
      const { data: byId } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (byId) {
        profileData = byId;
      }

      // Fallback: use the SECURITY DEFINER RPC (handles Firebase UID)
      if (!profileData && authUser.id) {
        const { data: byRpc } = await supabase
          .rpc('get_user_profile', { p_user_id: authUser.id })
          .maybeSingle();
        if (byRpc) {
          profileData = byRpc;
        }
      }

      if (profileData) {
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
          email_verified: !!profileData.email_verified,
          phone_verified: !!profileData.phone_verified,
          permissions,
        });
      } else {
        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || 'User',
          phone: authUser.phone || '',
          role: 'customer',
          wallet_balance: 0,
          reward_coins: 0,
          email_verified: false,
          phone_verified: false,
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
      try {
        const { auth } = await import('@/lib/firebase');
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        if (auth) {
          await firebaseSignOut(auth);
        }
      } catch (e) {
        console.error('Firebase signout error:', e);
      }

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Supabase signout error:', e);
      }

      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.error('Logout cookie clear error:', e);
      }

      setUser(null);
      setSession(null);
      setProfile(null);

      toast.success('Successfully logged out');
      router.push('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
      const apiError = parseApiError(err);
      toast.error(apiError.userMessage);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    let idleId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasInitialized = false;

    const handleFirebaseUser = async (fbUser: any) => {
      if (!isMounted) return;

      if (fbUser) {
        try {
          // Mint __session cookie for middleware
          const idToken = await fbUser.getIdToken(true);
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }).catch(() => {});

          // Resolve Supabase identity and apply custom JWT for RLS reads
          const syncRes = await fetch('/api/auth/sync-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (syncRes.ok) {
            const data = await syncRes.json();
            if (data.supabaseToken) {
              try {
                const supabase = createClient();
                await supabase.auth.setSession({
                  access_token: data.supabaseToken,
                  refresh_token: 'firebase-bridge',
                  expires_in: 432000,
                  token_type: 'bearer',
                });
              } catch (e) {
                console.error('Failed to apply Supabase session:', e);
              }
            }
          }

          if (!isMounted) return;

          const formattedUser = {
            id: fbUser.uid,
            email: fbUser.email || null,
            phone: fbUser.phoneNumber || null,
            user_metadata: {
              full_name: fbUser.displayName || null,
              phone: fbUser.phoneNumber || null,
            },
            app_metadata: { provider: 'firebase' },
            created_at:
              fbUser.metadata?.creationTime || new Date().toISOString(),
          };

          setUser(formattedUser);
          setSession(null);
          await fetchProfile(formattedUser);
        } catch (e) {
          console.error('Firebase session setup error:', e);
        }
      } else {
        try {
          const supabase = createClient();
          await supabase.auth.signOut().catch(() => {});
        } catch {}

        if (isMounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    const cleanupTriggers = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (
        idleId &&
        typeof window !== 'undefined' &&
        'cancelIdleCallback' in window
      ) {
        (window as any).cancelIdleCallback(idleId);
        idleId = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', startAuthListener);
        window.removeEventListener('keydown', startAuthListener);
        window.removeEventListener('touchstart', startAuthListener);
      }
    };

    const startAuthListener = async () => {
      if (hasInitialized || !isMounted) return;
      hasInitialized = true;
      cleanupTriggers();

      try {
        const { auth } = await import('@/lib/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        if (auth && isMounted) {
          unsubscribe = onAuthStateChanged(auth, handleFirebaseUser);
        } else if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize Firebase Auth:', err);
        if (isMounted) setLoading(false);
      }
    };

    // Fast-path detection: Check if immediate auth initialization is required
    // 1. User has an active __session cookie or auth token in storage
    // 2. User is navigating on an authenticated, checkout, or staff/admin route
    const hasExistingSession =
      typeof document !== 'undefined' &&
      (document.cookie.includes('__session') ||
        !!localStorage.getItem('supabaseToken') ||
        !!localStorage.getItem('ruhvi_auth'));

    const isProtectedOrAuthRoute =
      typeof window !== 'undefined' &&
      /^\/(admin|co-founder|portal-orders|support|marketing|tech|operations|account|checkout|orders|wishlist|login|signup)(\/|$)/i.test(
        window.location.pathname
      );

    if (hasExistingSession || isProtectedOrAuthRoute) {
      // Immediate execution for active sessions or protected routes
      startAuthListener();
    } else {
      // Public guest storefront: Defer auth script execution to free main-thread CPU
      setLoading(false);

      if (typeof window !== 'undefined') {
        // Trigger on earliest user interaction
        window.addEventListener('pointerdown', startAuthListener, {
          once: true,
          passive: true,
        });
        window.addEventListener('keydown', startAuthListener, {
          once: true,
          passive: true,
        });
        window.addEventListener('touchstart', startAuthListener, {
          once: true,
          passive: true,
        });

        // Or trigger during idle period after initial render & LCP have settled
        if ('requestIdleCallback' in window) {
          idleId = (window as any).requestIdleCallback(startAuthListener, {
            timeout: 6000,
          });
        } else {
          timeoutId = setTimeout(startAuthListener, 5000);
        }
      } else {
        startAuthListener();
      }
    }

    return () => {
      isMounted = false;
      cleanupTriggers();
      if (unsubscribe) unsubscribe();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
