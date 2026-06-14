'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalOrganisers: number;
  pendingOrganisers: number;
  totalEvents: number;
  pendingEvents: number;
  publishedEvents: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/admin/dashboard')
      .then((res) => setStats(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'text-gray-900' },
    { label: 'Customers', value: stats.totalCustomers, color: 'text-blue-600' },
    { label: 'Organisers', value: stats.totalOrganisers, color: 'text-purple-600' },
    { label: 'Pending Organisers', value: stats.pendingOrganisers, color: 'text-amber-600', alert: stats.pendingOrganisers > 0 },
    { label: 'Total Events', value: stats.totalEvents, color: 'text-gray-900' },
    { label: 'Pending Events', value: stats.pendingEvents, color: 'text-amber-600', alert: stats.pendingEvents > 0 },
    { label: 'Published Events', value: stats.publishedEvents, color: 'text-green-600' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        {(stats.pendingOrganisers > 0 || stats.pendingEvents > 0) && (
          <Link href="/admin/approvals">
            <Button>
              Review Approvals ({stats.pendingOrganisers + stats.pendingEvents})
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className={card.alert ? 'border-amber-200 bg-amber-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
