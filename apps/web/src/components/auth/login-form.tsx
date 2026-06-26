'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { ICON_LOGO } from '@/lib/logos';
import { validateEmail } from '@/lib/validators';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isUnverified, setIsUnverified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      switch (user.role) {
        case 'ADMIN': router.push('/admin/dashboard'); break;
        case 'ORGANISER': router.push('/organiser/dashboard'); break;
        default: router.push('/');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = axiosError.response?.data?.error?.message || 'Login failed. Please try again.';
      setError(msg);
      setIsUnverified(msg.toLowerCase().includes('verify your email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl glass-light p-5 sm:p-8 shadow-2xl shadow-gray-200/30 dark:shadow-black/30">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src={ICON_LOGO} alt="ThooviTickets" className="mx-auto mb-4 h-20 w-20 animate-float-slow" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in to your ThooviTickets account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 text-center whitespace-pre-line">
              {error}
              {isUnverified && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="mt-1 block font-semibold text-orange-500 hover:text-orange-600"
                >
                  Resend verification email
                </Link>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                maxLength={100}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => { const { email: _, ...rest } = prev; return rest; });
                }}
                className={`w-full rounded-xl border ${fieldErrors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400 focus:ring-orange-100'} bg-white dark:bg-gray-800 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
              <Link href="/forgot-password" className="text-xs font-medium text-orange-500 hover:text-orange-600">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                maxLength={128}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; });
                }}
                className={`w-full rounded-xl border ${fieldErrors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400 focus:ring-orange-100'} bg-white dark:bg-gray-800 py-3 pl-10 pr-11 text-sm outline-none transition-all focus:ring-2`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-6 text-base font-semibold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-3 text-gray-400 dark:text-gray-500">New to ThooviTickets?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link href="/register" className="block">
            <Button type="button" variant="outline" className="w-full rounded-xl py-5 text-sm font-semibold">
              Create an Account
            </Button>
          </Link>
        </form>
      </div>
    </div>
  );
}
