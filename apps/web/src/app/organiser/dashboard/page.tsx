'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DashboardStats {
  total: number;
  draft: number;
  pending: number;
  published: number;
}

export default function OrganiserDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, draft: 0, pending: 0, published: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/events/my');
        const events = res.data.data;
        setStats({
          total: events.length,
          draft: events.filter((e: { status: string }) => e.status === 'DRAFT').length,
          pending: events.filter((e: { status: string }) => e.status === 'PENDING_APPROVAL').length,
          published: events.filter((e: { status: string }) => e.status === 'PUBLISHED').length,
        });
      } catch {
        // Ignore errors on dashboard load
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const isPending = user?.status === 'PENDING';

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.orgName || user?.firstName}
          </h1>
          <p className="text-sm text-gray-500">Organiser Dashboard</p>
        </div>
        {!isPending && (
          <Link href="/organiser/events/create">
            <Button>Create Event</Button>
          </Link>
        )}
      </div>

      {isPending && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-medium text-amber-800">Account Pending Approval</h3>
          <p className="mt-1 text-sm text-amber-700">
            Your organiser account is awaiting admin approval. You&apos;ll be able to create events once approved.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-600">{stats.draft}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.published}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
