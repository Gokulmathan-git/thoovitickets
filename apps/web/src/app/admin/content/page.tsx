'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Edit2, Globe, Users, User } from 'lucide-react';

interface ContentPage {
  id: string;
  slug: string;
  audience: string;
  title: string;
  updatedAt: string;
}

const audienceLabels: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  all: { label: 'Everyone', icon: Globe, color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
  customer: { label: 'Customers', icon: User, color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  organiser: { label: 'Organisers', icon: Users, color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
};

export default function AdminContentPage() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/content-pages')
      .then((res) => setPages(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content Pages</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage legal and support pages</p>
      </div>

      <div className="space-y-3">
        {pages.map((page) => {
          const aud = audienceLabels[page.audience] || audienceLabels.all;
          const AudIcon = aud.icon;
          return (
            <Card key={page.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{page.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>/{page.slug}</span>
                      <span>Updated: {new Date(page.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${aud.color}`}>
                    <AudIcon className="h-3 w-3" /> {aud.label}
                  </span>
                  <Link href={`/admin/content/${page.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
