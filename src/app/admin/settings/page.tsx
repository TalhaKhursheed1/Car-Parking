'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

type AdminSettings = {
  siteName: string;
  maxBookingDays: number;
  maintenanceMode: boolean;
  autoApproveSpaces: boolean;
};

const DEFAULT_SETTINGS: AdminSettings = {
  siteName: 'ParkSpace',
  maxBookingDays: 30,
  maintenanceMode: false,
  autoApproveSpaces: false,
};

export default function SettingsPage() {
  const { data: settingsData, isLoading, isError } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => apiFetch<{ settings: AdminSettings }>('/api/admin/settings'),
    retry: false,
  });
  const [overrides, setOverrides] = useState<Partial<AdminSettings>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const baseSettings = settingsData?.settings ?? DEFAULT_SETTINGS;
  const settings: AdminSettings = useMemo(() => ({ ...baseSettings, ...overrides }), [baseSettings, overrides]);

  const saveMutation = useMutation({
    mutationFn: (payload: AdminSettings) =>
      apiFetch<{ settings: AdminSettings }>('/api/admin/settings', { method: 'PATCH', body: payload }),
    onSuccess: () => {
      setOverrides({});
      setSaveMessage('Settings saved.');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setSaveMessage(msg);
    },
  });

  const isDirty = useMemo(() => {
    const base = settingsData?.settings ?? DEFAULT_SETTINGS;
    return (
      settings.siteName !== base.siteName ||
        settings.maxBookingDays !== base.maxBookingDays ||
        settings.maintenanceMode !== base.maintenanceMode ||
        settings.autoApproveSpaces !== base.autoApproveSpaces
    );
  }, [settings, settingsData]);

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
          System Settings
        </h1>
        <p className="text-base sm:text-lg text-white/70">
          Manage system configuration and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isLoading ? <p className="text-white">Loading settings…</p> : null}
          {isError ? <p className="text-red-200">Could not load settings.</p> : null}
          {saveMessage ? <p className="text-sm text-white/80">{saveMessage}</p> : null}
          {/* General Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">General Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Site Name"
                type="text"
                value={settings.siteName}
                onChange={(e) => setOverrides((prev) => ({ ...prev, siteName: e.target.value }))}
              />
              <Input
                label="Max Booking Days"
                type="number"
                value={settings.maxBookingDays.toString()}
                onChange={(e) =>
                  setOverrides((prev) => ({ ...prev, maxBookingDays: parseInt(e.target.value, 10) || 30 }))
                }
              />
            </div>
          </Card>

          {/* Notification Settings */}
          {/* <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Notification Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Email Notifications</label>
                  <p className="text-xs text-white/60">Send email notifications to users</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="w-5 h-5 rounded-lg bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">SMS Notifications</label>
                  <p className="text-xs text-white/60">Send SMS notifications to users</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
            </div>
          </Card> */}

          {/* System Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">System Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Maintenance Mode</label>
                  <p className="text-xs text-white/60">Put the system in maintenance mode</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, maintenanceMode: e.target.checked }))}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">Auto Approve Spaces</label>
                  <p className="text-xs text-white/60">Automatically approve new space listings</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoApproveSpaces}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, autoApproveSpaces: e.target.checked }))}
                  className="w-5 h-5 rounded bg-white/10 border-2 border-white/20 cursor-pointer"
                />
              </div>
            </div>
          </Card>

          <div className="flex" style={{ gap: '1rem' }}>
            <Button
              variant="secondary"
              size="lg"
              disabled={saveMutation.isPending || !isDirty}
              onClick={() => saveMutation.mutate(settings)}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={saveMutation.isPending}
              onClick={() => {
                setSaveMessage(null);
                setOverrides({});
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" fullWidth>Backup Database</Button>
              <Button variant="outline" fullWidth>Clear Cache</Button>
            </div>
          </Card> */}

          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">System Information</h3>
            <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex justify-between">
                <span className="text-white/70">Version</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Last Backup</span>
                <span className="text-white">2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Database Size</span>
                <span className="text-white">245 MB</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
}

