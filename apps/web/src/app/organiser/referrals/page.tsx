'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Gift, Trophy, Copy, Check, Clock, CheckCircle, XCircle, AlertCircle, Share2 } from 'lucide-react';

interface Referral {
  id: string;
  status: string;
  referredOrg: string;
  referredAt: string;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  rewardPoints: number | null;
  referralNumber: number | null;
  grossTicketSales: number | null;
  qualifyingEvent: string | null;
  rejectionReason: string | null;
}

interface ReferralData {
  referralCode: string;
  stats: { total: number; pending: number; qualified: number; rewarded: number; rejected: number };
  totalPointsEarned: number;
  currentBalance: number;
  progressToMilestone: number;
  milestoneReached: boolean;
  referrals: Referral[];
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const res = await apiClient.get('/referrals/my-referrals');
      setData(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const referralLink = data ? `${window.location.origin}/register?role=organiser&ref=${data.referralCode}` : '';

  const statusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'QUALIFIED': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'REWARDED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { text: string; cls: string }> = {
      PENDING: { text: 'Pending', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      QUALIFIED: { text: 'Qualified', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      REWARDED: { text: 'Rewarded', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      REJECTED: { text: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    const s = map[status] || { text: status, cls: 'bg-gray-100 text-gray-700' };
    return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{statusIcon(status)}{s.text}</span>;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-red-500">Failed to load referral data</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Referral Program</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Invite event organisers and earn Thoovi Points
        </p>
      </div>

      {/* Referral Code & Link */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-orange-500" /> Your Referral</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Referral Code</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-orange-600 dark:text-orange-400">
                  {data.referralCode}
                </div>
                <Button
                  onClick={() => copyToClipboard(data.referralCode, 'code')}
                  className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shrink-0"
                >
                  {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Referral Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 truncate">
                  {referralLink}
                </div>
                <Button
                  onClick={() => copyToClipboard(referralLink, 'link')}
                  className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shrink-0"
                >
                  {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.stats.total}</p>
            <p className="text-xs text-gray-500">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.stats.rewarded}</p>
            <p className="text-xs text-gray-500">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalPointsEarned}</p>
            <p className="text-xs text-gray-500">Points Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.currentBalance}</p>
            <p className="text-xs text-gray-500">Current Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-purple-500" /> Milestone Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Progress to FREE Pro Plan</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.progressToMilestone} / 10 referrals</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-orange-500 to-purple-500 transition-all duration-500"
                style={{ width: `${(data.progressToMilestone / 10) * 100}%` }}
              />
            </div>
            {data.milestoneReached ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                🎉 Milestone reached! FREE Pro Plan (Worth ₹2,999) activated with 2% Commission
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Complete 10 successful referrals to get FREE Pro Plan (Worth ₹2,999) for 1 Month with 2% Platform Commission
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rewards Table */}
      <Card>
        <CardHeader><CardTitle>Reward Structure</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Referral</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Reward</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 px-3">1st Successful Referral</td>
                  <td className="py-2.5 px-3 font-medium text-orange-600 dark:text-orange-400">499 Thoovi Points</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 px-3">2nd – 10th Successful Referrals</td>
                  <td className="py-2.5 px-3 font-medium text-orange-600 dark:text-orange-400">249 Thoovi Points each</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">10 Successful Referrals</td>
                  <td className="py-2.5 px-3 font-medium text-purple-600 dark:text-purple-400">FREE Pro Plan (Worth ₹2,999) for 1 Month</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Referral List */}
      <Card>
        <CardHeader><CardTitle>Your Referrals</CardTitle></CardHeader>
        <CardContent>
          {data.referrals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm mt-1">Share your referral code to start earning Thoovi Points</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Organiser</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Event</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Sales</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Points</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">{r.referredOrg}</td>
                      <td className="py-2.5 px-3">{statusLabel(r.status)}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{r.qualifyingEvent || '—'}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-400">
                        {r.grossTicketSales ? `₹${r.grossTicketSales.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-orange-600 dark:text-orange-400">
                        {r.rewardPoints ? `+${r.rewardPoints}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {new Date(r.referredAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligibility Info */}
      <Card>
        <CardHeader><CardTitle>Referral Eligibility</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> The organiser registers using your unique referral link or code</li>
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> The referred organiser successfully publishes and completes at least one paid event</li>
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> The completed event generates a minimum of ₹50,000 in Gross Ticket Sales</li>
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> The event is not cancelled and the refund period has ended</li>
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> The event passes ThooviTickets verification and fraud prevention checks</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
