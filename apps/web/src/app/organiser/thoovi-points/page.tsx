'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Gift, CreditCard, Shield, Star } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  points: number;
  balance: number;
  description: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: Transaction[];
}

const typeConfig: Record<string, { label: string; icon: typeof Gift; color: string }> = {
  REFERRAL_REWARD: { label: 'Referral Reward', icon: Gift, color: 'text-green-500' },
  MILESTONE_BONUS: { label: 'Milestone Bonus', icon: Star, color: 'text-purple-500' },
  SUBSCRIPTION_REDEMPTION: { label: 'Subscription', icon: CreditCard, color: 'text-blue-500' },
  FEATURED_LISTING: { label: 'Featured Listing', icon: TrendingUp, color: 'text-orange-500' },
  PLATFORM_FEE_REDEMPTION: { label: 'Platform Fee', icon: Shield, color: 'text-indigo-500' },
  ADMIN_CREDIT: { label: 'Admin Credit', icon: ArrowUpRight, color: 'text-green-500' },
  ADMIN_DEBIT: { label: 'Admin Debit', icon: ArrowDownRight, color: 'text-red-500' },
  EXPIRED: { label: 'Expired', icon: TrendingDown, color: 'text-gray-500' },
};

export default function ThoviPointsPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/referrals/my-wallet');
        setData(res.data.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-red-500">Failed to load wallet data</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Thoovi Points</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your rewards wallet — earn points through referrals, redeem on platform services
          </p>
        </div>
        <Link href="/organiser/referrals">
          <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
            <Gift className="h-4 w-4 mr-2" /> Earn More Points
          </Button>
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-linear-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-5">
            <Coins className="h-8 w-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{data.balance.toLocaleString('en-IN')}</p>
            <p className="text-sm opacity-80 mt-1">Current Balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.totalEarned.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mt-1">Total Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <TrendingDown className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.totalSpent.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mt-1">Total Redeemed</p>
          </CardContent>
        </Card>
      </div>

      {/* What You Can Use Points For */}
      <Card>
        <CardHeader><CardTitle>Redeem Thoovi Points</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <CreditCard className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Subscriptions</p>
                <p className="text-xs text-gray-500">Pay for Pro, Advance or Enterprise plans</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Star className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Featured Listings</p>
                <p className="text-xs text-gray-500">Promote your events on the platform</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Platform Fees</p>
                <p className="text-xs text-gray-500">Offset platform and service charges</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            1 Thoovi Point = ₹1 value. Points cannot be withdrawn as cash.
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Coins className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm mt-1">Start referring organisers to earn Thoovi Points</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.transactions.map(t => {
                const config = typeConfig[t.type] || { label: t.type, icon: Coins, color: 'text-gray-500' };
                const Icon = config.icon;
                const isCredit = t.points > 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <div className={`rounded-full p-2 ${isCredit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{config.label}</p>
                      <p className="text-xs text-gray-500 truncate">{t.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isCredit ? '+' : ''}{t.points}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
