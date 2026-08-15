'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useLogin, useLogout } from '@/features/auth/hooks';

export default function ProviderLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setGeneralError(null);
      loginMutation.mutate(
        {
          email: formData.email.trim(),
          password: formData.password,
        },
        {
          onSuccess: (data) => {
            if (data.user.role === 'provider') {
              router.push('/provider/dashboard');
            } else if (data.user.role === 'admin') {
              router.push('/admin/dashboard');
            } else {
              setGeneralError('This account is not a provider account.');
              logoutMutation.mutate();
            }
          },
          onError: (error) => {
            setGeneralError(error instanceof Error ? error.message : 'Login failed');
          },
        },
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="w-full max-w-lg space-y-8 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Provider Login
          </h1>
          <p className="text-base sm:text-lg text-white/80">
            Access your provider dashboard and manage parking spaces
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {generalError}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              className="mt-4"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20 text-center space-y-4">
            <p className="text-white/80 text-sm">
              Need a provider account?{' '}
              <Link href="/provider/register" className="text-white font-semibold hover:underline">
                Register here
              </Link>
            </p>
            <p className="text-white/60 text-xs">
              Not a provider?{' '}
              <Link href="/login" className="text-white/80 hover:text-white font-semibold">
                Return to consumer login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
