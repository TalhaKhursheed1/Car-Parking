'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useLogin } from '@/features/auth/hooks';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const router = useRouter();
  const loginMutation = useLogin();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    const newErrors: { email?: string; password?: string } = {};
    const trimmedEmail = formData.email.trim();
    
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 1) {
      newErrors.password = 'Password cannot be empty';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setGeneralError(null);
      loginMutation.mutate(
        {
          email: trimmedEmail,
          password: formData.password,
        },
        {
          onSuccess: (data) => {
            if (data.user.role === 'admin') {
              router.push('/admin/dashboard');
            } else if (data.user.role === 'provider') {
              router.push('/provider/dashboard');
            } else {
              router.push('/');
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
      <div className="w-full animate-fade-in-up" style={{ maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-base sm:text-lg text-white/80">Sign in to your account</p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-white/10 border border-white/20 text-blue-600 focus:ring-blue-500 focus:ring-1 cursor-pointer"
                />
                <span className="ml-2 text-sm text-white/80 group-hover:text-white transition-colors">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-white/80 hover:text-white transition-colors font-semibold"
              >
                Forgot password?
              </Link>
            </div>

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

          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/80 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-white font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
