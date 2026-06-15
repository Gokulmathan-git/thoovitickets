'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Ticket, CalendarPlus, Eye, EyeOff } from 'lucide-react';

const countryCodes = [
  { code: '+91', country: 'IN', label: 'India', maxLen: 10, format: 'XXXXX XXXXX' },
  { code: '+1', country: 'US', label: 'USA', maxLen: 10, format: '(XXX) XXX-XXXX' },
  { code: '+44', country: 'GB', label: 'UK', maxLen: 10, format: 'XXXX XXX XXX' },
  { code: '+971', country: 'AE', label: 'UAE', maxLen: 9, format: 'XX XXX XXXX' },
  { code: '+65', country: 'SG', label: 'Singapore', maxLen: 8, format: 'XXXX XXXX' },
  { code: '+61', country: 'AU', label: 'Australia', maxLen: 9, format: 'XXX XXX XXX' },
  { code: '+81', country: 'JP', label: 'Japan', maxLen: 10, format: 'XX XXXX XXXX' },
  { code: '+49', country: 'DE', label: 'Germany', maxLen: 11, format: 'XXXX XXXXXXX' },
  { code: '+33', country: 'FR', label: 'France', maxLen: 9, format: 'X XX XX XX XX' },
  { code: '+86', country: 'CN', label: 'China', maxLen: 11, format: 'XXX XXXX XXXX' },
];

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();

  const defaultRole = searchParams.get('role') === 'organiser' ? 'ORGANISER' : 'CUSTOMER';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: defaultRole,
    orgName: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedCountry = countryCodes.find((c) => c.code === countryCode) || countryCodes[0];

  const formatPhone = (value: string) => {
    return value.replace(/\D/g, '').slice(0, selectedCountry.maxLen);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
    if (form.password.length < 8) errs.password = 'Minimum 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password)) errs.password = 'Need uppercase, lowercase, number & special char';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!phoneDigits) errs.phone = 'Phone number is required';
    else if (phoneDigits.length !== selectedCountry.maxLen) errs.phone = `Must be ${selectedCountry.maxLen} digits`;
    if (form.role === 'ORGANISER' && !form.orgName.trim()) errs.orgName = 'Organisation name is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await registerUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: `${countryCode}${form.phone.replace(/\D/g, '')}`,
        role: form.role as 'CUSTOMER' | 'ORGANISER',
        orgName: form.role === 'ORGANISER' ? form.orgName.trim() : undefined,
      });

      router.push(user.role === 'ORGANISER' ? '/organiser/dashboard' : '/');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-all ${
      fieldErrors[field] ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
    }`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/50">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
          <p className="mt-2 text-sm text-gray-500">Join ThooviTickets and start your journey</p>
        </div>

        {/* Role Toggle */}
        <div className="mb-6">
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'CUSTOMER' })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                form.role === 'CUSTOMER'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Ticket className="h-4 w-4" />
              Buy Tickets
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'ORGANISER' })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                form.role === 'ORGANISER'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarPlus className="h-4 w-4" />
              Organise Events
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">First Name</label>
              <input className={inputClass('firstName')} placeholder="John" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Last Name</label>
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

          {/* Org Name (organiser only) */}
          {form.role === 'ORGANISER' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Organisation Name</label>
              <input className={inputClass('orgName')} placeholder="Your company or brand name" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
              {fieldErrors.orgName && <p className="mt-1 text-xs text-red-500">{fieldErrors.orgName}</p>}
            </div>
          )}

          {/* Phone with Country Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => { setCountryCode(e.target.value); setForm({ ...form, phone: '' }); }}
                className="w-28 rounded-xl border border-gray-200 bg-white px-2 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} {c.country}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <input
                  className={inputClass('phone')}
                  type="tel"
                  placeholder={selectedCountry.format}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  maxLength={selectedCountry.maxLen + 5}
                />
              </div>
            </div>
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                className={inputClass('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, Aa1@"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
            {/* Strength indicator */}
            {form.password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((i) => {
                  let strength = 0;
                  if (form.password.length >= 8) strength++;
                  if (/[a-z]/.test(form.password) && /[A-Z]/.test(form.password)) strength++;
                  if (/\d/.test(form.password)) strength++;
                  if (/[@$!%*?&]/.test(form.password)) strength++;
                  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
                  return <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? colors[strength - 1] : 'bg-gray-200'}`} />;
                })}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                className={inputClass('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-6 text-base font-semibold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : form.role === 'ORGANISER' ? 'Create Organiser Account' : 'Create Account'}
          </Button>

          {form.role === 'ORGANISER' && (
            <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              Organiser accounts require admin approval before you can create events.
            </p>
          )}

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
