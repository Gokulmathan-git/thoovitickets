'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16"><div className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Order Confirmed!</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Your tickets have been booked successfully.
          </p>
          {email && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              A confirmation will be sent to <strong>{email}</strong>
            </p>
          )}
          <div className="mt-8 space-y-3">
            <Link href="/events">
              <Button className="w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">Browse More Events</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Create an Account to Track Orders
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
