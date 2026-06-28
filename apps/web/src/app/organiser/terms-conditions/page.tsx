'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Save, FileText, Eye, EyeOff } from 'lucide-react';

export default function OrganiserTermsPage() {
  const { user, setUser } = useAuthStore();
  const [terms, setTerms] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiClient.get('/users/profile')
      .then((res) => {
        setTerms(res.data.data.orgTerms || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiClient.patch('/users/profile', { orgTerms: terms });
      setUser(res.data.data);
      setMessage({ type: 'success', text: 'Terms & Conditions saved successfully. They will appear on all your event pages.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terms & Conditions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            These terms will be displayed on all your event pages for ticket buyers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <><EyeOff className="mr-1 h-4 w-4" /> Editor</> : <><Eye className="mr-1 h-4 w-4" /> Preview</>}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
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
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Your Terms & Conditions</CardTitle>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Maximum 5,000 characters. Displayed under &quot;Terms &amp; Conditions&quot; on your event detail pages.
          </p>
        </CardHeader>
        <CardContent>
          {showPreview ? (
            <div className="min-h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              {terms ? (
                <div className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {terms}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No terms added yet.</p>
              )}
            </div>
          ) : (
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              maxLength={5000}
              placeholder="Enter your terms and conditions for ticket buyers...&#10;&#10;For example:&#10;- No refunds after event date&#10;- Tickets are non-transferable&#10;- Valid ID required for entry"
              className="w-full min-h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 dark:text-gray-100 resize-y"
            />
          )}
          <div className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
            {terms.length}/5,000
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
