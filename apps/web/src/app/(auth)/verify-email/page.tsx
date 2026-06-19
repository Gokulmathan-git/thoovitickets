'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'pending',
  );
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const response = await apiClient.post('/auth/verify-email', { token });
        const { user, accessToken } = response.data.data;
        setAuth(user, accessToken);
        setStatus('success');
        setMessage('Your email has been verified!');
        setTimeout(() => {
          router.push(user.role === 'ORGANISER' ? '/organiser/dashboard' : '/');
        }, 2000);
      } catch (err: unknown) {
        setStatus('error');
        const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
        setMessage(axiosError.response?.data?.error?.message || 'Verification failed. The link may be expired.');
      }
    };

    verify();
  }, [token, setAuth, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setResendCooldown(60);
      setMessage('A new verification link has been sent to your email.');
    } catch {
      setMessage('Failed to resend. Please try again later.');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Verifying your email...</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Email Verified!</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Redirecting you now...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Verification Failed</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <div className="mt-6 space-y-3">
            {email && (
              <Button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="w-full rounded-xl bg-orange-500 py-5 text-white hover:bg-orange-600"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
              </Button>
            )}
            <Link href="/login" className="block text-sm font-medium text-orange-500 hover:text-orange-600">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // status === 'pending' — shown after registration
  return (
    <div className="mx-auto w-full max-w-md px-4">
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <Mail className="h-8 w-8 text-orange-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Check your email</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          We&apos;ve sent a verification link to{' '}
          {email ? <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span> : 'your email'}.
          Click the link to verify your account.
        </p>
        <div className="mt-6 rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or click below to resend.
          </p>
        </div>
        {message && (
          <p className="mt-3 text-sm text-green-600">{message}</p>
        )}
        <div className="mt-4 space-y-3">
          {email && (
            <Button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              variant="outline"
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 py-5"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
            </Button>
          )}
          <Link href="/login" className="block text-sm font-medium text-orange-500 hover:text-orange-600">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
