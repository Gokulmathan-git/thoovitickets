'use client';

import { useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-orange-100 dark:bg-orange-900/30 blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-orange-50 dark:bg-orange-900/20 blur-3xl opacity-80" />
      </div>
      <div className="relative flex items-center justify-center px-4 py-8 sm:py-16 md:py-20">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Check Your Email</h1>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  If an account exists with <strong className="text-gray-700 dark:text-gray-200">{email}</strong>, we&apos;ve sent a password reset link. Check your inbox and spam folder.
                </p>
                <Link href="/login">
                  <Button className="mt-6 w-full rounded-xl bg-orange-500 py-5 text-sm font-semibold text-white hover:bg-orange-600">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30">
                    <Mail className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Forgot Password?</h1>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No worries, we&apos;ll send you reset instructions</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-xl bg-orange-500 py-6 text-base font-semibold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                    disabled={loading || !email}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>

                  <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <ArrowLeft className="h-4 w-4" /> Back to Sign In
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
