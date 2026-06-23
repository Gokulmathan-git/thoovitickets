'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Star,
  Search,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  MessageSquare,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  status: string;
  isVisible: boolean;
  adminNotes: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
  order: { orderNumber: string; items: { event: { title: string } }[] };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageRating: number;
}

interface SentimentData {
  overallSentiment: { positive: number; neutral: number; negative: number };
  executiveSummary: string;
  positiveThemes: string[];
  improvementAreas: string[];
}

const statusFilters = ['All', 'PENDING', 'APPROVED', 'REJECTED'];

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [showSentiment, setShowSentiment] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (activeFilter !== 'All') params.status = activeFilter;
      if (search) params.search = search;

      const res = await apiClient.get('/reviews/admin', { params });
      const data = res.data.data || res.data;
      setReviews(data.reviews || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/reviews/admin/stats');
      setStats(res.data.data || res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchReviews(); }, [activeFilter, search, page]);

  const handleAction = async (reviewId: string, action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(reviewId);
    try {
      const res = await apiClient.post(`/reviews/admin/${reviewId}/action`, { action });
      const updated = res.data.data || res.data;
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...updated, status: action, isVisible: action === 'APPROVED' } : r)));
      fetchStats();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisibility = async (reviewId: string, isVisible: boolean) => {
    try {
      await apiClient.patch(`/reviews/admin/${reviewId}/visibility`, { isVisible });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, isVisible } : r)));
    } catch {
      /* ignore */
    }
  };

  const handleSentiment = async () => {
    setSentimentLoading(true);
    try {
      const res = await apiClient.post('/ai/review-sentiment');
      setSentiment(res.data.data || res.data);
      setShowSentiment(true);
    } catch {
      /* ignore */
    } finally {
      setSentimentLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Review Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage customer platform reviews</p>
        </div>
        <Button
          onClick={handleSentiment}
          disabled={sentimentLoading}
          className="bg-linear-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
          size="sm"
        >
          {sentimentLoading ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles className="mr-1.5 h-4 w-4" /> AI Sentiment Summary</>
          )}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="mx-auto h-5 w-5 text-gray-400 mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto h-5 w-5 text-amber-500 mb-1" />
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Check className="mx-auto h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-gray-500">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <X className="mx-auto h-5 w-5 text-red-500 mb-1" />
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-orange-500 mb-1" />
              <p className="text-2xl font-bold text-orange-600">{stats.averageRating}</p>
              <p className="text-xs text-gray-500">Avg Rating</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Sentiment Modal */}
      {showSentiment && sentiment && (
        <Card className="mb-6 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Sentiment Analysis
              </CardTitle>
              <button onClick={() => setShowSentiment(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{sentiment.executiveSummary}</p>

            <div className="flex gap-2">
              <div className="flex-1 rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-center">
                <p className="text-lg font-bold text-green-600">{sentiment.overallSentiment.positive}%</p>
                <p className="text-xs text-gray-500">Positive</p>
              </div>
              <div className="flex-1 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-center">
                <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{sentiment.overallSentiment.neutral}%</p>
                <p className="text-xs text-gray-500">Neutral</p>
              </div>
              <div className="flex-1 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-center">
                <p className="text-lg font-bold text-red-600">{sentiment.overallSentiment.negative}%</p>
                <p className="text-xs text-gray-500">Negative</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">Positive Themes</p>
                <ul className="space-y-1">
                  {sentiment.positiveThemes.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">Areas for Improvement</p>
                <ul className="space-y-1">
                  {sentiment.improvementAreas.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <TrendingUp className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => { setActiveFilter(filter); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {filter === 'All' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search reviews..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No reviews found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* User + Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-sm font-semibold text-orange-600">
                        {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {review.user.firstName} {review.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{review.user.email}</p>
                      </div>
                      <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[review.status]}`}>
                        {review.status}
                      </span>
                    </div>

                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300 dark:text-gray-600'}`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </div>

                    {review.title && (
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{review.title}</p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{review.content}</p>

                    <p className="mt-1.5 text-xs text-gray-400">
                      Order #{review.order.orderNumber} — {review.order.items[0]?.event?.title || 'Unknown Event'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col">
                    {review.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(review.id, 'APPROVED')}
                          disabled={actionLoading === review.id}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          {actionLoading === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Approve</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(review.id, 'REJECTED')}
                          disabled={actionLoading === review.id}
                        >
                          <X className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                    {review.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleVisibility(review.id, !review.isVisible)}
                        className={review.isVisible ? 'text-green-600 border-green-300' : 'text-gray-500'}
                      >
                        {review.isVisible ? <><Eye className="mr-1 h-4 w-4" /> Visible</> : <><EyeOff className="mr-1 h-4 w-4" /> Hidden</>}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
