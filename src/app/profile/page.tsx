'use client';

import Link from 'next/link';

import Card from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {user ? `Welcome, ${user.fullName}` : "Profile"}
          </h1>
          <p className="text-base sm:text-lg text-white/80">
            Manage your ParkSpace account details and preferences.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {user ? (
            <div className="space-y-4 text-white/80">
              <div>
                <p className="text-sm uppercase tracking-wide text-white/60">
                  Full Name
                </p>
                <p className="text-lg font-semibold text-white">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-white/60">
                  Email
                </p>
                <p className="text-lg font-semibold text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-white/60">
                  Role
                </p>
                <p className="text-lg font-semibold text-white">{user.role}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-white/60">
                  Member Since
                </p>
                <p className="text-lg font-semibold text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-white/70">
                You are not signed in. Please log in to view your profile.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/login" className="btn-base btn-primary btn-md">
                  Login
                </Link>
                <Link href="/register" className="btn-base btn-secondary btn-md">
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

