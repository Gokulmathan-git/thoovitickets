'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { ICON_LOGO } from '@/lib/logos';

const countryCodes = [
  { code: '+91', country: 'IN', maxLen: 10, format: 'XXXXX XXXXX' },
  { code: '+1', country: 'US', maxLen: 10, format: '(XXX) XXX-XXXX' },
  { code: '+44', country: 'GB', maxLen: 10, format: 'XXXX XXX XXX' },
  { code: '+971', country: 'AE', maxLen: 9, format: 'XX XXX XXXX' },
  { code: '+65', country: 'SG', maxLen: 8, format: 'XXXX XXXX' },
  { code: '+61', country: 'AU', maxLen: 9, format: 'XXX XXX XXX' },
  { code: '+81', country: 'JP', maxLen: 10, format: 'XX XXXX XXXX' },
  { code: '+49', country: 'DE', maxLen: 11, format: 'XXXX XXXXXXX' },
  { code: '+33', country: 'FR', maxLen: 9, format: 'X XX XX XX XX' },
  { code: '+86', country: 'CN', maxLen: 11, format: 'XXX XXXX XXXX' },
];

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const isOrganiser = searchParams.get('role') === 'organiser';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', orgName: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedCountry = countryCodes.find((c) => c.code === countryCode) || countryCodes[0];
  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, selectedCountry.maxLen);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (form.password.length < 8) errs.password = 'Minimum 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password)) errs.password = 'Need uppercase, lowercase, number & special char';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!phoneDigits) errs.phone = 'Phone number is required';
    else if (phoneDigits.length !== selectedCountry.maxLen) errs.phone = `Must be ${selectedCountry.maxLen} digits`;
    if (isOrganiser && !form.orgName.trim()) errs.orgName = 'Organisation name is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: `${countryCode}${form.phone.replace(/\D/g, '')}`,
        role: isOrganiser ? 'ORGANISER' : 'CUSTOMER',
        orgName: isOrganiser ? form.orgName.trim() : undefined,
      });
      const { user, accessToken } = response.data.data;

      if (isOrganiser) {
        router.push(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
      } else {
        setAuth(user, accessToken);
        router.push('/');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-3 text-sm outline-none transition-all ${fieldErrors[field] ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'}`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-8 shadow-xl shadow-gray-200/50">
        {/* Header */}
        <div className="mb-6 text-center">
          <img src={ICON_LOGO} alt="ThooviTickets" className="mx-auto mb-4 h-20 w-20 shadow-lg shadow-orange-500/30" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isOrganiser ? 'Organiser Registration' : 'Create Your Account'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isOrganiser ? 'Register to start organising events on ThooviTickets' : 'Join ThooviTickets to discover and book amazing events'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">First Name</label>
              <input className={inputClass('firstName')} placeholder="John" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Last Name</label>
              <input className={inputClass('lastName')} placeholder="Doe" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input className={inputClass('email')} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          {/* Org Name — organiser only */}
          {isOrganiser && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Organisation Name</label>
              <input className={inputClass('orgName')} placeholder="Your company or brand name" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
              {fieldErrors.orgName && <p className="mt-1 text-xs text-red-500">{fieldErrors.orgName}</p>}
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
            <div className="flex gap-2">
              <select value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setForm({ ...form, phone: '' }); }} className="w-24 sm:w-28 shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                {countryCodes.map((c) => <option key={c.code} value={c.code}>{c.code} {c.country}</option>)}
              </select>
              <input className={inputClass('phone') + ' flex-1'} type="tel" placeholder={selectedCountry.format} value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />
            </div>
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input className={inputClass('password')} type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars, Aa1@" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
            {form.password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((i) => {
                  let s = 0;
                  if (form.password.length >= 8) s++;
                  if (/[a-z]/.test(form.password) && /[A-Z]/.test(form.password)) s++;
                  if (/\d/.test(form.password)) s++;
                  if (/[@$!%*?&]/.test(form.password)) s++;
                  const c = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
                  return <div key={i} className={`h-1 flex-1 rounded-full ${i <= s ? c[s - 1] : 'bg-gray-200 dark:bg-gray-700'}`} />;
                })}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input className={inputClass('confirmPassword')} type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className={`w-full rounded-xl py-6 text-base font-semibold text-white shadow-lg ${isOrganiser ? 'bg-gray-900 hover:bg-gray-800 shadow-gray-900/20' : 'bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/20'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : isOrganiser ? 'Register as Organiser' : 'Create Account'}
          </Button>

          {isOrganiser && (
            <p className="text-center text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
              Organiser accounts require admin approval before you can create events.
            </p>
          )}

          {/* Switch link */}
          <div className="space-y-3 pt-2">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">Sign in</Link>
            </p>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-gray-800 px-3 text-gray-400 dark:text-gray-500">or</span></div>
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {isOrganiser ? (
                <>Want to buy tickets instead? <Link href="/register" className="font-semibold text-orange-500 hover:text-orange-600">Register as Customer</Link></>
              ) : (
                <>Want to organise events? <Link href="/register?role=organiser" className="font-semibold text-orange-500 hover:text-orange-600">Register as Organiser</Link></>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
