'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
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

  const fetchProfile = async (authUser: User) => {
    try {
      const supabase = createClient();

      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileData && !error) {
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
      const supabase = createClient();
      await supabase.auth.signOut();

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
    const supabase = createClient();
    let isMounted = true;

    const initAuth = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        if (activeSession) {
          setSession(activeSession);
          setUser(activeSession.user);
          await fetchProfile(activeSession.user);
        }
        setLoading(false);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, newSession: Session | null) => {
          if (!isMounted) return;

          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            await fetchProfile(newSession.user);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = initAuth();

    return () => {
      isMounted = false;
      cleanup.then((fn) => fn && fn());
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

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
