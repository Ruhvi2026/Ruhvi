import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Gift } from 'lucide-react';
import ReferralLink from './ReferralLink';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth/server';

export default async function ReferralsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { user } = await getServerUser();
  if (!user) {
    redirect('/login?redirectTo=/account/referrals');
  }

  // Get user's referral code from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', user.id)
    .single();

  const referralCode = profile?.referral_code || 'PENDING';

  // Get referrals
  const { data: referralsList } = await supabase
    .from('referrals')
    .select(
      'id, status, coins_awarded, created_at, users!referred_user_id(full_name)'
    )
    .eq('referrer_user_id', user.id)
    .order('created_at', { ascending: false });

  const referrals = (referralsList || []).map((ref: any) => ({
    id: ref.id,
    name: ref.users?.full_name || 'Guest User',
    date: new Date(ref.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    status: ref.status,
    coins: ref.coins_awarded,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/account"
        className="inline-flex items-center text-xs font-semibold text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Account
      </Link>

      {/* Referral Hero Card */}
      <div className="gold-gradient-bg relative overflow-hidden rounded-3xl p-8 text-center text-white shadow-xl sm:p-12">
        <div className="absolute left-0 top-0 -ml-16 -mt-16 h-64 w-64 rounded-full bg-gold-400 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mb-16 -mr-16 h-64 w-64 rounded-full bg-gold-300 opacity-20 blur-3xl"></div>

        <div className="relative z-10 mx-auto max-w-xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-300/60 bg-gold-400/40">
            <Gift className="h-8 w-8 text-gold-100" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold sm:text-4xl">
              Refer a Friend, Get 500 Coins
            </h1>
            <p className="text-sm text-gold-100">
              Invite friends to Ruhvi. When they make their first purchase, you
              get 500 Reward Coins (worth ₹50) after their return window closes.
            </p>
          </div>

          {referralCode === 'PENDING' ? (
            <div className="mt-8 text-sm text-gold-100">
              Your referral code is being generated...
            </div>
          ) : (
            <ReferralLink referralCode={referralCode} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <h2 className="flex items-center space-x-2 font-serif text-xl font-bold text-stone-900">
            <Users className="h-5 w-5 text-stone-400" />
            <span>Your Referrals</span>
          </h2>

          <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {referrals.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-500">
                You haven't referred anyone yet. Share your link to start
                earning!
              </div>
            ) : (
              referrals.map((ref: any) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-5 transition-colors hover:bg-stone-50"
                >
                  <div>
                    <p className="text-sm font-bold text-stone-900">
                      {ref.name}
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      Invited on {ref.date}
                    </p>
                  </div>
                  <div className="text-right">
                    {ref.status === 'completed' && (
                      <>
                        <p className="text-sm font-bold text-emerald-600">
                          +{ref.coins} Coins
                        </p>
                        <p className="mt-0.5 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700/70">
                          Completed
                        </p>
                      </>
                    )}
                    {ref.status === 'pending' && (
                      <>
                        <p className="text-sm font-bold text-amber-600">
                          Pending
                        </p>
                        <p className="mt-0.5 text-[10px] text-stone-500">
                          Awaiting return window
                        </p>
                      </>
                    )}
                    {ref.status === 'expired' && (
                      <>
                        <p className="text-sm font-bold text-stone-400 line-through">
                          +{ref.coins} Coins
                        </p>
                        <p className="mt-0.5 inline-block rounded bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                          Order Cancelled/Returned
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            How it works
          </h2>

          <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">
                1
              </div>
              <p>Share your unique referral link with a friend.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">
                2
              </div>
              <p>They click the link and sign up for a new account.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">
                3
              </div>
              <p>
                When they place their first order (minimum ₹100), it enters the{' '}
                <strong className="font-semibold text-stone-800">
                  Pending
                </strong>{' '}
                state.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">
                4
              </div>
              <p>
                Once their 7-day return window closes without a return, you get
                500 coins!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
