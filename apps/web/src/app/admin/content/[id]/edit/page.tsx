'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pageInfo, setPageInfo] = useState<{ slug: string; audience: string } | null>(null);

  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      [{ align: [] }],
      ['clean'],
    ],
  }), []);

  useEffect(() => {
    apiClient.get(`/admin/content-pages/${params.id}`)
      .then((res) => {
        const page = res.data.data;
        setTitle(page.title);
        setContent(page.content);
        setPageInfo({ slug: page.slug, audience: page.audience });
      })
      .catch(() => router.push('/admin/content'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch(`/admin/content-pages/${params.id}`, { title, content });
      setMessage({ type: 'success', text: 'Content saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save content' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /><div className="h-96 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/content">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Content</h1>
            {pageInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400">/{pageInfo.slug} — {pageInfo.audience}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <><EyeOff className="mr-1 h-4 w-4" /> Editor</> : <><Eye className="mr-1 h-4 w-4" /> Preview</>}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
            <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" />
          </div>
        </CardHeader>
        <CardContent>
          {showPreview ? (
            <div className="min-h-[400px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          ) : (
            <div className="min-h-[400px] [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-gray-700 dark:[&_.ql-toolbar]:bg-gray-800 [&_.ql-container]:border-gray-200 dark:[&_.ql-container]:border-gray-700 [&_.ql-editor]:min-h-[350px] dark:[&_.ql-editor]:bg-gray-900 dark:[&_.ql-editor]:text-gray-100 [&_.ql-stroke]:!stroke-gray-600 dark:[&_.ql-stroke]:!stroke-gray-400 [&_.ql-fill]:!fill-gray-600 dark:[&_.ql-fill]:!fill-gray-400 [&_.ql-picker-label]:!text-gray-600 dark:[&_.ql-picker-label]:!text-gray-400">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                placeholder="Start writing your content..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
