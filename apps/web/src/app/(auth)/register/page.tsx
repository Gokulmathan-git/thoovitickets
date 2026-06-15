import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gray-50">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-orange-100 blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-orange-50 blur-3xl opacity-80" />
      </div>

      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="h-96 w-96 animate-pulse rounded-2xl bg-gray-200" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
