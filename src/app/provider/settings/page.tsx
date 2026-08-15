'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AuthGuard } from '@/components/AuthGuard';
import { useProviderProfile } from '@/features/provider/hooks';
import { ProviderPendingNotice } from '@/components/ProviderPendingNotice';
import { useLogout } from '@/features/auth/hooks';

export default function ProviderSettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingNotifications: true,
    paymentNotifications: true,
    marketingEmails: false,
    autoAcceptBookings: false,
    currency: 'USD',
    timezone: 'America/New_York',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const router = useRouter();
  const { data, isLoading, isError } = useProviderProfile();
  const logoutMutation = useLogout();
  const status = data?.profile.status;

  if (isLoading) {
    return (
      <AuthGuard allowedRoles={['provider']}>
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Loading provider settings...
        </div>
      </AuthGuard>
    );
  }

  if (isError || !status) {
    return (
      <AuthGuard allowedRoles={['provider']}>
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Unable to load provider profile. Please try again later.
        </div>
      </AuthGuard>
    );
  }

  if (status !== 'approved') {
    return (
      <AuthGuard allowedRoles={['provider']}>
        <ProviderPendingNotice
          onLogout={() =>
            logoutMutation.mutate(undefined, { onSuccess: () => router.push('/') })
          }
          isLoggingOut={logoutMutation.isPending}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['provider']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="mb-8 sm:mb-12">
        <Link href="/provider/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
          Provider Settings
        </h1>
        <p className="text-base sm:text-lg text-white/70">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Notification Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Notification Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Email Notifications</label>
                  <p className="text-xs text-white/60">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">SMS Notifications</label>
                  <p className="text-xs text-white/60">Receive notifications via SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Booking Notifications</label>
                  <p className="text-xs text-white/60">Notify me when a new booking is made</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bookingNotifications}
                  onChange={(e) => setSettings({ ...settings, bookingNotifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Payment Notifications</label>
                  <p className="text-xs text-white/60">Notify me when payments are received</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.paymentNotifications}
                  onChange={(e) => setSettings({ ...settings, paymentNotifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Marketing Emails</label>
                  <p className="text-xs text-white/60">Receive marketing and promotional emails</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(e) => setSettings({ ...settings, marketingEmails: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Booking Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Booking Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Auto-Accept Bookings</label>
                  <p className="text-xs text-white/60">Automatically accept new bookings</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAcceptBookings}
                  onChange={(e) => setSettings({ ...settings, autoAcceptBookings: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Account Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Account Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/95 text-sm font-semibold mb-2">
                  Currency
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                >
                  <option value="USD" className="bg-slate-900">USD ($)</option>
                  <option value="EUR" className="bg-slate-900">EUR (€)</option>
                  <option value="GBP" className="bg-slate-900">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-white/95 text-sm font-semibold mb-2">
                  Timezone
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                >
                  <option value="America/New_York" className="bg-slate-900">Eastern Time (ET)</option>
                  <option value="America/Chicago" className="bg-slate-900">Central Time (CT)</option>
                  <option value="America/Denver" className="bg-slate-900">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles" className="bg-slate-900">Pacific Time (PT)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>
            <div className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </Card>

          <div className="flex gap-4">
            <Button variant="secondary" size="lg">Save Changes</Button>
            <Button variant="outline" size="lg">Reset to Default</Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Account Status</span>
                <span className="text-green-400">Approved</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Member Since</span>
                <span className="text-white">Jan 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Total Spaces</span>
                <span className="text-white">8</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Danger Zone</h3>
            <div className="space-y-3">
              <Button variant="outline" fullWidth style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}>
                Deactivate Account
              </Button>
              <Button variant="outline" fullWidth style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}>
                Delete Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </AuthGuard>
);
}

