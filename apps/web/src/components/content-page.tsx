'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface ContentPageProps {
  slug: string;
  forceAudience?: string;
}

export function ContentPageView({ slug, forceAudience }: ContentPageProps) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const audience = forceAudience || (user?.role === 'ORGANISER' ? 'organiser' : 'customer');
    apiClient.get(`/content/${slug}?audience=${audience}`)
      .then((res) => {
        setTitle(res.data.data.title);
        setContent(res.data.data.content);
      })
      .catch(() => setContent('<p>Page not found.</p>'))
      .finally(() => setLoading(false));
  }, [slug, forceAudience, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">{title}</h1>
      <div
        className="prose dark:prose-invert mt-8 max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-a:text-orange-500"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
