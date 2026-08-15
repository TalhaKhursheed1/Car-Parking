'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AuthGuard } from '@/components/AuthGuard';
import {
  useProviderProfile,
  useProviderSpace,
  useUpdateProviderSpace,
  useToggleProviderSpaceActivation,
  useDeleteProviderSpace,
} from '@/features/provider/hooks';
import { ProviderPendingNotice } from '@/components/ProviderPendingNotice';
import { useLogout } from '@/features/auth/hooks';
import SpaceImageUploader from '@/components/provider/SpaceImageUploader';
import { isValidPersonOrPlaceName } from '@/lib/validation/registerForm';
import {
  filterDigits,
  filterPriceInput,
  isValidNumericPostcode,
  isValidOptionalPositivePrice,
  isValidPositivePrice,
  isValidSpaceTitle,
  isValidStateField,
} from '@/lib/validation/spaceForm';

const amenityOptions = [
  'Covered',
  'Security Camera',
  'Lighting',
  'EV Charging',
  'Nearby Restrooms',
  'Wheelchair Accessible',
];

const currencyOptions = ['AUD', 'USD', 'NZD', 'EUR'] as const;

type EditFormState = {
  location: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: string;
  dailyPrice: string;
  currency: string;
  description: string;
  amenities: string[];
  images: string[];
};

export default function EditSpacePage() {
  const params = useParams<{ id: string }>();
  const spaceId = params?.id;

  const [formData, setFormData] = useState<EditFormState>({
    location: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    dailyPrice: '',
    currency: 'AUD',
    description: '',
    amenities: [],
    images: [],
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearErrors = (...fields: string[]) => {
    setFormErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const f of fields) {
        if (f in next) {
          delete next[f];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const router = useRouter();
  const { data, isLoading, isError } = useProviderProfile();
  const logoutMutation = useLogout();
  const updateSpaceMutation = useUpdateProviderSpace();
  const spaceQuery = useProviderSpace(spaceId);
  const toggleActivation = useToggleProviderSpaceActivation();
  const deleteSpaceMutation = useDeleteProviderSpace();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = data?.profile.status;
  const space = spaceQuery.data;

  useEffect(() => {
    if (space) {
      setFormData({
        location: space.title ?? '',
        address: space.address ?? '',
        city: space.city ?? '',
        state: space.state ?? '',
        zipCode: space.zipCode ?? '',
        price: space.hourlyRate?.toString() ?? '',
        dailyPrice: space.dailyRate?.toString() ?? '',
        currency: space.currency ?? 'AUD',
        description: space.description ?? '',
        amenities: space.amenities ?? [],
        images: space.images ?? [],
      });
    }
  }, [space]);

  const selectedAmenities = useMemo(() => new Set(formData.amenities), [formData.amenities]);

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;

    const newErrors: Record<string, string> = {};

    const location = formData.location.trim();
    if (!location) {
      newErrors.location = 'Location name is required';
    } else if (!isValidSpaceTitle(location)) {
      newErrors.location = 'Location name must be 2–120 characters';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    }

    const city = formData.city.trim();
    if (!city) {
      newErrors.city = 'City is required';
    } else if (!isValidPersonOrPlaceName(city)) {
      newErrors.city = 'City must be 2-50 characters and contain only letters';
    }

    const state = formData.state.trim();
    if (!state) {
      newErrors.state = 'State is required';
    } else if (!isValidStateField(state)) {
      newErrors.state = 'State must be 2-50 characters';
    }

    const zip = formData.zipCode.trim();
    if (zip && !isValidNumericPostcode(zip)) {
      newErrors.zipCode = 'Postcode must be 4-10 digits only';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Hourly price is required';
    } else if (!isValidPositivePrice(formData.price)) {
      newErrors.price = 'Enter a valid price greater than zero';
    }

    if (!isValidOptionalPositivePrice(formData.dailyPrice)) {
      newErrors.dailyPrice = 'Daily rate must be greater than zero when provided';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.images.length < 2) {
      newErrors.images = 'Please keep at least two photos for this listing';
    }

    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setGeneralError(null);

    updateSpaceMutation.mutate(
      {
        id: spaceId,
        title: formData.location.trim(),
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        description: formData.description.trim(),
        hourlyRate: Number(formData.price),
        dailyRate: formData.dailyPrice ? Number(formData.dailyPrice) : undefined,
        currency: formData.currency,
        amenities: formData.amenities,
        availabilityType: '24_7',
        customAvailability: [],
        images: formData.images,
        isActive: space?.isActive ?? false,
      },
      {
        onSuccess: () => {
          router.push('/provider/spaces');
        },
        onError: (error) => {
          setGeneralError(error instanceof Error ? error.message : 'Failed to update space');
        },
      },
    );
  };

  const handleDeleteSpace = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!spaceId) {
      setShowDeleteConfirm(false);
      return;
    }

    // Don't close confirmation immediately - let user see the loading state
    setGeneralError(null);
    
    deleteSpaceMutation.mutate(spaceId, {
      onSuccess: () => {
        // Only navigate after successful deletion
        router.push('/provider/spaces');
      },
      onError: (error) => {
        setGeneralError(
          error instanceof Error ? error.message : 'Failed to delete space. Please try again.',
        );
        // Keep confirmation open on error so user can retry
        setShowDeleteConfirm(true);
      },
    });
  };

  return (
    <AuthGuard allowedRoles={['provider']}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Loading provider profile...
        </div>
      ) : isError || !status ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Unable to load provider profile. Please try again later.
        </div>
      ) : status !== 'approved' ? (
        <ProviderPendingNotice
          onLogout={() =>
            logoutMutation.mutate(undefined, { onSuccess: () => router.push('/') })
          }
          isLoggingOut={logoutMutation.isPending}
        />
      ) : spaceQuery.isLoading ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Loading space details...
        </div>
      ) : spaceQuery.isError || !space ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Unable to load this space. It may have been removed.
        </div>
      ) : (
        <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
          <div className="mb-8 sm:mb-12">
            <button
              type="button"
              onClick={(e) => {
                if (deleteSpaceMutation.isPending || showDeleteConfirm) {
                  e.preventDefault();
                  return;
                }
                router.push('/provider/spaces');
              }}
              className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
              disabled={deleteSpaceMutation.isPending}
            >
              ← Back to Spaces
            </button>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              Edit Parking Space
            </h1>
            <p className="text-base sm:text-lg text-white/70">
              Update your parking space listing
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              // Prevent form submission if delete is in progress
              if (deleteSpaceMutation.isPending || showDeleteConfirm) {
                e.preventDefault();
                return;
              }
              handleSubmit(e);
            }} 
            className="space-y-8"
          >
            {generalError && (
              <Card className="p-4 border-red-500/40 bg-red-500/10 text-red-100 text-sm">
                {generalError}
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
                  <div className="space-y-4">
                    <Input
                      label="Location Name"
                      type="text"
                      value={formData.location}
                      onChange={(e) => {
                        clearErrors('location');
                        setFormData({ ...formData, location: e.target.value });
                      }}
                      error={formErrors.location}
                    />

                    <Input
                      label="Street Address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => {
                        clearErrors('address');
                        setFormData({ ...formData, address: e.target.value });
                      }}
                      error={formErrors.address}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        type="text"
                        value={formData.city}
                        onChange={(e) => {
                          clearErrors('city');
                          setFormData({ ...formData, city: e.target.value });
                        }}
                        error={formErrors.city}
                      />

                      <Input
                        label="State"
                        type="text"
                        value={formData.state}
                        onChange={(e) => {
                          clearErrors('state');
                          setFormData({ ...formData, state: e.target.value });
                        }}
                        error={formErrors.state}
                      />

                      <Input
                        label="Postcode"
                        type="text"
                        inputMode="numeric"
                        placeholder="4-10 digits"
                        value={formData.zipCode}
                        onChange={(e) => {
                          clearErrors('zipCode');
                          setFormData({ ...formData, zipCode: filterDigits(e.target.value, 10) });
                        }}
                        error={formErrors.zipCode}
                      />
                    </div>

                    <div>
                      <label className="block text-white/95 text-sm font-semibold mb-2">
                        Description
                      </label>
                      <textarea
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: '#ffffff',
                          border: formErrors.description ? '1px solid rgba(248, 113, 113, 0.7)' : '1px solid rgba(255, 255, 255, 0.2)',
                          resize: 'none',
                          outline: 'none'
                        }}
                        rows={4}
                        value={formData.description}
                        onChange={(e) => {
                          clearErrors('description');
                          setFormData({ ...formData, description: e.target.value });
                        }}
                      />
                      {formErrors.description && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Pricing</h2>
                  <p className="text-sm text-white/65 mb-4">
                    Saving updates this listing to <strong className="text-white/90">24/7</strong> availability with{' '}
                    <strong className="text-white/90">one vehicle</strong> at a time (any previous custom hours are
                    replaced).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Price per Hour"
                      type="text"
                      inputMode="decimal"
                      value={formData.price}
                      onChange={(e) => {
                        clearErrors('price');
                        setFormData({ ...formData, price: filterPriceInput(e.target.value) });
                      }}
                      error={formErrors.price}
                    />

                    <Input
                      label="Price per Day"
                      type="text"
                      inputMode="decimal"
                      value={formData.dailyPrice}
                      onChange={(e) => {
                        clearErrors('dailyPrice');
                        setFormData({ ...formData, dailyPrice: filterPriceInput(e.target.value) });
                      }}
                      error={formErrors.dailyPrice}
                    />

                    <div>
                      <label className="block text-white/95 text-sm font-semibold mb-2">Currency</label>
                      <select
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          outline: 'none'
                        }}
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      >
                        {currencyOptions.map((option) => (
                          <option key={option} value={option} className="bg-slate-900 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenityOptions.map((amenity) => {
                      const isSelected = selectedAmenities.has(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          style={{
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            border: isSelected ? '2px solid rgba(59, 130, 246, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            color: '#ffffff',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                        >
                          <div className="font-semibold text-sm">{amenity}</div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-6">
                  <SpaceImageUploader
                    images={formData.images}
                    onChange={(urls) => {
                      clearErrors('images');
                      setFormData((prev) => ({ ...prev, images: urls }));
                    }}
                  />
                  {formErrors.images && <p className="text-xs text-red-300 mt-2">{formErrors.images}</p>}
                </Card>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    disabled={updateSpaceMutation.isPending}
                  >
                    {updateSpaceMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={updateSpaceMutation.isPending || deleteSpaceMutation.isPending}
                    onClick={(e) => {
                      if (deleteSpaceMutation.isPending || showDeleteConfirm) {
                        e.preventDefault();
                        return;
                      }
                      router.push('/provider/spaces');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Space Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Status</span>
                      <span
                        className="px-3 py-1 rounded text-xs font-medium"
                        style={{
                          background:
                            space.status === 'approved'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : space.status === 'pending'
                              ? 'rgba(251, 191, 36, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            space.status === 'approved'
                              ? '#86efac'
                              : space.status === 'pending'
                              ? '#fde047'
                              : '#fca5a5',
                        }}
                      >
                        {space.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Activation</span>
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        {space.isActive ? 'Active' : 'Inactive'}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggleActivation.isPending}
                          onClick={() =>
                            toggleActivation.mutate({
                              spaceId: space.id,
                              isActive: !space.isActive,
                            })
                          }
                        >
                          {toggleActivation.isPending ? 'Updating...' : space.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Created</span>
                      <span className="text-sm font-bold text-white">
                        {new Date(space.createdAt).toLocaleDateString('en-AU', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Actions</h3>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleActivation.mutate({
                          spaceId: space.id,
                          isActive: !space.isActive,
                        });
                      }}
                      disabled={toggleActivation.isPending}
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5',
                        opacity: toggleActivation.isPending ? 0.6 : 1,
                      }}
                    >
                      {toggleActivation.isPending
                        ? 'Updating...'
                        : space.isActive
                        ? 'Deactivate Space'
                        : 'Activate Space'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDeleteConfirm((prev) => !prev);
                      }}
                      disabled={deleteSpaceMutation.isPending}
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5',
                        opacity: deleteSpaceMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {showDeleteConfirm ? 'Cancel Delete' : deleteSpaceMutation.isPending ? 'Deleting...' : 'Delete Space'}
                    </Button>
                    {showDeleteConfirm && (
                      <div className="border border-red-500/40 bg-red-500/10 rounded-lg p-4 space-y-3">
                        <p className="text-sm text-red-100">
                          {deleteSpaceMutation.isPending 
                            ? 'Deleting space... Please wait.'
                            : 'This will remove the listing from your dashboard. You cannot undo this action.'}
                        </p>
                        {deleteSpaceMutation.isPending && (
                          <div className="flex items-center justify-center py-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-300"></div>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            style={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
                            disabled={deleteSpaceMutation.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowDeleteConfirm(false);
                            }}
                          >
                            Keep Listing
                          </Button>
                          <Button
                            type="button"
                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '9999px', fontWeight: 500 }}
                            disabled={deleteSpaceMutation.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSpace(e);
                            }}
                          >
                            {deleteSpaceMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </form>
        </div>
      )}
    </AuthGuard>
  );
}

