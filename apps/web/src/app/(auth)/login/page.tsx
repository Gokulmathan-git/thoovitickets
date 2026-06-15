import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-50">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-orange-100 blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-orange-50 blur-3xl opacity-80" />
      </div>
      <div className="relative flex items-center justify-center px-4 py-16 sm:py-20">
        <LoginForm />
      </div>
    </div>
  );
}
