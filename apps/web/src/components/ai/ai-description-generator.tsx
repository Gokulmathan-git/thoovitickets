'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, Wand2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

interface AiDescriptionGeneratorProps {
  title: string;
  category: string;
  venue: string;
  city: string;
  startDate: string;
  endDate?: string;
  onApply: (data: { description: string; shortDesc: string; tags: string[] }) => void;
}

interface AiResult {
  description: string;
  shortDesc: string;
  tags: string[];
}

export function AiDescriptionGenerator({
  title,
  category,
  venue,
  city,
  startDate,
  endDate,
  onApply,
}: AiDescriptionGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [copied, setCopied] = useState(false);

  const canGenerate = title.length >= 3 && category && venue.length >= 2 && city.length >= 2 && startDate;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiClient.post('/ai/generate-description', {
        title,
        category,
        venue,
        city,
        startDate,
        endDate,
        additionalInfo: additionalInfo || undefined,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to generate description. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      setIsOpen(false);
      setResult(null);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/40"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generate with AI
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">AI Description Generator</span>
        </div>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setResult(null); setError(null); }}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!canGenerate && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
          Fill in the title, category, venue, city, and start date above first, then AI can generate a description for you.
        </p>
      )}

      <div className="mb-3 space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Additional context (optional)
        </label>
        <textarea
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="e.g. Features live DJ sets, food stalls, networking area for professionals..."
          rows={2}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-gray-100"
        />
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 dark:bg-red-900/20 p-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!result && (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="w-full bg-linear-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:opacity-50"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-1.5 h-4 w-4" />
              Generate Description
            </>
          )}
        </Button>
      )}

      {result && (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Generated Description</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result.description}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Short Description</span>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-700 dark:text-gray-300">
              {result.shortDesc}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Suggested Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {result.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleApply}
              className="flex-1 bg-linear-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
              size="sm"
            >
              Apply to Event
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
