'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AuthGuard } from '@/components/AuthGuard';
import { useAdminSpace, useUpdateAdminSpace } from '@/features/admin/spaces/hooks';

export default function AdminLiveSpaceDetailPage() {
  const params = useParams<{ spaceId: string }>();
  const router = useRouter();
  const spaceId = Array.isArray(params?.spaceId) ? params?.spaceId[0] : params?.spaceId;

  const { data, isLoading, isError } = useAdminSpace(spaceId ?? '');
  const mutation = useUpdateAdminSpace(spaceId ?? '');
  const space = data?.space;
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    hourlyRate: '',
    dailyRate: '',
    status: 'approved',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (space) {
      setFormState({
        title: space.title ?? '',
        description: space.description ?? '',
        address: space.address ?? '',
        city: space.city ?? '',
        state: space.state ?? '',
        zipCode: space.zipCode ?? '',
        hourlyRate: space.hourlyRate?.toString() ?? '',
        dailyRate: space.dailyRate?.toString() ?? '',
        status: space.status,
        isActive: space.isActive,
      });
    }
  }, [space]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!spaceId) return;

    const nextErrors: Record<string, string> = {};
    if (!formState.title.trim()) nextErrors.title = 'Title is required';
    if (!formState.address.trim()) nextErrors.address = 'Address is required';
    if (!formState.city.trim()) nextErrors.city = 'City is required';
    if (!formState.state.trim()) nextErrors.state = 'State is required';
    const parsedHourly = Number(formState.hourlyRate);
    if (Number.isNaN(parsedHourly) || parsedHourly <= 0) {
      nextErrors.hourlyRate = 'Hourly rate must be greater than zero';
    }
    if (formState.dailyRate.trim()) {
      const parsedDaily = Number(formState.dailyRate);
      if (Number.isNaN(parsedDaily) || parsedDaily <= 0) {
        nextErrors.dailyRate = 'Daily rate must be greater than zero';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    mutation.mutate(
      {
        title: formState.title.trim(),
        description: formState.description.trim(),
        address: formState.address.trim(),
        city: formState.city.trim(),
        state: formState.state.trim(),
        zipCode: formState.zipCode.trim(),
        hourlyRate: Number(formState.hourlyRate),
        dailyRate: formState.dailyRate.trim() ? Number(formState.dailyRate) : null,
        status: formState.status as 'approved' | 'rejected' | 'archived',
        isActive: formState.isActive,
      },
      {
        onSuccess: () => {
          setSuccessMessage('Changes saved successfully.');
        },
        onError: (error) => {
          setSuccessMessage(null);
          setErrors({
            general: error instanceof Error ? error.message : 'Failed to update space',
          });
        },
      },
    );
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/admin/spaces/live"
            className="inline-flex items-center text-blue-300 hover:text-blue-200 w-fit transition-colors"
          >
            ← Back to Live Spaces
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Edit Space</h1>
            <p className="text-white/70 text-sm">Space ID: {spaceId}</p>
          </div>
        </div>

        <Card className="p-6 bg-white/5 border border-white/10" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isLoading ? (
            <div className="text-white/70">Loading space details…</div>
          ) : isError || !space ? (
            <div className="text-red-200">Unable to load this space.</div>
          ) : (
            <>
              {successMessage && (
                <Card className="p-4 border-green-500/40 bg-green-500/10 text-green-200 text-sm">{successMessage}</Card>
              )}
              {errors.general && (
                <Card className="p-4 border-red-500/40 bg-red-500/10 text-red-200 text-sm">{errors.general}</Card>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid grid-cols-1" style={{ gap: '1rem' }}>
                  <Input
                    label="Title"
                    value={formState.title}
                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                    error={errors.title}
                  />
                  <Input
                    label="Address"
                    value={formState.address}
                    onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                    error={errors.address}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1rem' }}>
                    <Input
                      label="City"
                      value={formState.city}
                      onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                      error={errors.city}
                    />
                    <Input
                      label="State"
                      value={formState.state}
                      onChange={(e) => setFormState((prev) => ({ ...prev, state: e.target.value }))}
                      error={errors.state}
                    />
                    <Input
                      label="Postcode"
                      value={formState.zipCode}
                      onChange={(e) => setFormState((prev) => ({ ...prev, zipCode: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem' }}>
                    <Input
                      label="Hourly rate"
                      type="number"
                      value={formState.hourlyRate}
                      onChange={(e) => setFormState((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                      error={errors.hourlyRate}
                    />
                    <Input
                      label="Daily rate"
                      type="number"
                      value={formState.dailyRate}
                      onChange={(e) => setFormState((prev) => ({ ...prev, dailyRate: e.target.value }))}
                      error={errors.dailyRate}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem' }}>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Status</label>
                      <select
                        value={formState.status}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, status: e.target.value as typeof formState.status }))
                        }
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                        className="w-full px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      >
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Active</label>
                      <select
                        value={formState.isActive ? 'true' : 'false'}
                        onChange={(e) => setFormState((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                        className="w-full px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-1">Description</label>
                    <textarea
                      value={formState.description}
                      onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex pt-4 border-t border-white/10" style={{ gap: '0.75rem' }}>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push('/admin/spaces/live')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </AuthGuard>
  );
}

