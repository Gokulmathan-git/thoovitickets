'use client';

import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
  user: { firstName: string; lastName: string; avatarUrl: string | null };
}

interface EventReviewsProps {
  eventId: string;
}

export function EventReviews({ eventId }: EventReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/reviews/event/public/${eventId}`)
      .then((res) => {
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
        setTotalReviews(res.data.totalReviews || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />;
  if (totalReviews === 0) return null;

  return (
    <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Reviews</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-orange-400 text-orange-400" />
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{averageRating}</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-semibold text-orange-600">
                {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {review.user.firstName} {review.user.lastName.charAt(0)}.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300 dark:text-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
            {review.title && <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">{review.title}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{review.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
