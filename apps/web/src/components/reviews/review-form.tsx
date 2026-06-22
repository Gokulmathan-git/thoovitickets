'use client';

import { useEffect, useState } from 'react';
import { Star, Sparkles, Loader2, Send, CheckCircle, Clock, Globe, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import apiClient from '@/lib/api-client';

interface ReviewFormProps {
  orderId: string;
  eventId: string;
  eventTitle: string;
}

interface ExistingReview {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  status?: string;
  createdAt: string;
}

interface AiSuggestion {
  tone: string;
  content: string;
}

const platformStatusBadge: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending Approval', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  APPROVED: { label: 'Published', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  REJECTED: { label: 'Not Published', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

type ReviewTab = 'platform' | 'event';

function StarRating({ value, hover, onSelect, onHover, onLeave, size = 'h-8 w-8' }: {
  value: number; hover: number; onSelect: (v: number) => void; onHover: (v: number) => void; onLeave: () => void; size?: string;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onSelect(star)} onMouseEnter={() => onHover(star)} onMouseLeave={onLeave} className="transition-transform hover:scale-110">
          <Star className={`${size} transition-colors ${star <= (hover || value) ? 'fill-orange-400 text-orange-400' : 'text-gray-300 dark:text-gray-600 hover:text-orange-200'}`} />
        </button>
      ))}
      {value > 0 && <span className="ml-2 self-center text-sm text-gray-500 dark:text-gray-400">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}</span>}
    </div>
  );
}

function ReadOnlyStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-5 w-5 ${star <= rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300 dark:text-gray-600'}`} />
      ))}
    </div>
  );
}

export function ReviewForm({ orderId, eventId, eventTitle }: ReviewFormProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>('event');
  const [platformReview, setPlatformReview] = useState<ExistingReview | null>(null);
  const [eventReview, setEventReview] = useState<ExistingReview | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/reviews/order/${orderId}`).catch(() => ({ data: null })),
      apiClient.get(`/reviews/event/user/${eventId}`).catch(() => ({ data: null })),
    ]).then(([platformRes, eventRes]) => {
      if (platformRes.data) setPlatformReview(platformRes.data);
      if (eventRes.data) setEventReview(eventRes.data);
      if (eventRes.data && !platformRes.data) setActiveTab('platform');
      setLoading(false);
    });
  }, [orderId, eventId]);

  const resetForm = () => {
    setRating(0); setHoverRating(0); setTitle(''); setContent('');
    setError(null); setSuggestions([]); setShowSuggestions(false);
  };

  const handleTabChange = (tab: ReviewTab) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a rating'); return; }
    if (content.length < 10) { setError('Review must be at least 10 characters'); return; }

    setSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'platform') {
        const res = await apiClient.post('/reviews', { rating, title: title || undefined, content, orderId });
        setPlatformReview(res.data);
      } else {
        const res = await apiClient.post('/reviews/event', { rating, title: title || undefined, content, eventId, orderId });
        setEventReview(res.data);
      }
      resetForm();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiSuggest = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await apiClient.post('/ai/review-suggestions', { keywords: content || title || undefined, rating: rating || undefined });
      setSuggestions(res.data.suggestions || []);
      setShowSuggestions(true);
    } catch { setError('Could not generate suggestions. Try again.'); }
    finally { setLoadingSuggestions(false); }
  };

  if (loading) return <div className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;

  const currentExisting = activeTab === 'platform' ? platformReview : eventReview;
  const bothDone = platformReview && eventReview;

  return (
    <Card className="border-orange-200 dark:border-orange-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-orange-500" />
          Share Your Experience
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {bothDone ? 'Thanks for your reviews!' : 'Your feedback helps us and organisers improve'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-1">
          <button
            onClick={() => handleTabChange('event')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'event'
                ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Event Review
            {eventReview && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
          </button>
          <button
            onClick={() => handleTabChange('platform')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'platform'
                ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <Globe className="h-4 w-4" />
            Platform Review
            {platformReview && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
          </button>
        </div>

        {/* Tab description */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {activeTab === 'event'
            ? `Rate your experience at "${eventTitle}" — this helps the organiser and future attendees`
            : 'Rate the ThooviTickets platform — booking process, ticket delivery, and overall experience'}
        </p>

        {/* Show existing review or form */}
        {currentExisting ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <ReadOnlyStars rating={currentExisting.rating} />
              {activeTab === 'platform' && currentExisting.status && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${platformStatusBadge[currentExisting.status]?.color || ''}`}>
                  {platformStatusBadge[currentExisting.status]?.label || currentExisting.status}
                </span>
              )}
              {activeTab === 'event' && (
                <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                  Submitted
                </span>
              )}
            </div>
            {currentExisting.title && <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{currentExisting.title}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-300">{currentExisting.content}</p>
            <p className="mt-2 text-xs text-gray-400">
              Submitted on {new Date(currentExisting.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
          </div>
        ) : (
          <>
            {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">{error}</div>}

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Rating *</p>
              <StarRating value={rating} hover={hoverRating} onSelect={setRating} onHover={setHoverRating} onLeave={() => setHoverRating(0)} />
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Title (optional)</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum up your experience in a few words" maxLength={100} />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Review *</p>
                <button type="button" onClick={handleAiSuggest} disabled={loadingSuggestions}
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-50">
                  {loadingSuggestions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Suggest
                </button>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder={activeTab === 'event' ? 'How was the event? Tell us about the venue, experience, organisation...' : 'Tell us about your booking experience, ticket delivery, overall satisfaction...'}
                rows={3} maxLength={2000}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:text-gray-100" />
              <p className="mt-1 text-xs text-gray-400">{content.length}/2000</p>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 p-3 space-y-2">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Suggestions — click to use
                </p>
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => { setContent(s.content); setShowSuggestions(false); }}
                    className="block w-full text-left rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                    <span className="mb-1 inline-block rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 capitalize">{s.tone}</span>
                    <p className="mt-1">{s.content}</p>
                  </button>
                ))}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting || rating === 0}
              className="w-full bg-linear-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
              {submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="mr-1.5 h-4 w-4" /> Submit {activeTab === 'event' ? 'Event' : 'Platform'} Review</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
