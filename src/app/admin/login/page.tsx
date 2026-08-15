'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Shield } from 'lucide-react';

import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useLogin, useLogout } from '@/features/auth/hooks';

export default function AdminLoginPage() {
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
            if (data.user.role === 'admin') {
              router.push('/admin/dashboard');
            } else if (data.user.role === 'provider') {
              router.push('/provider/dashboard');
            } else {
              setGeneralError('This account does not have admin access.');
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
      <div
        className="w-full animate-fade-in-up"
        style={{ maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '2rem' }}
      >
        <div className="text-center">
          {/* <div
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              boxShadow: '0 10px 25px -10px rgba(239, 68, 68, 0.55)',
            }}
          >
            <Shield className="h-7 w-7 text-white" strokeWidth={1.75} aria-hidden />
          </div> */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Admin Portal
          </h1>
          <p className="text-base sm:text-lg text-white/80">Secure admin access</p>
        </div>

        <Card className="p-6 sm:p-8 border-red-500/30">
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {generalError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {generalError}
              </div>
            )}

            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter admin password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
            />

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-white/10 border border-white/20 text-red-600 focus:ring-red-500 focus:ring-1 cursor-pointer"
                />
                <span className="ml-2 text-sm text-white/80 group-hover:text-white transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              variant="secondary"
              className="mt-4"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing In...' : 'Sign In as Admin'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 backdrop-blur-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
            >
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-300"
                aria-hidden
              />
              <p className="text-xs sm:text-sm text-white/85 leading-snug">
                Restricted area. Unauthorized access is prohibited.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
