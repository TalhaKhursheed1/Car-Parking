'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AuthGuard } from '@/components/AuthGuard';
import { useProviderProfile, useCreateProviderSpace } from '@/features/provider/hooks';
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
import { AlertTriangle, CreditCard } from 'lucide-react';

const amenityOptions = [
  'Covered',
  'Security Camera',
  'Lighting',
  'EV Charging',
  'Nearby Restrooms',
  'Wheelchair Accessible',
];

type NewSpaceFormState = {
  location: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: string;
  dailyPrice: string;
  description: string;
  amenities: string[];
  images: string[];
};

export default function NewSpacePage() {
  const [formData, setFormData] = useState<NewSpaceFormState>({
    location: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    dailyPrice: '',
    description: '',
    amenities: [],
    images: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const clearErrors = (...fields: string[]) => {
    setErrors((prev) => {
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
  const createSpaceMutation = useCreateProviderSpace();

  const status = data?.profile.status;
  const stripeReady = data?.profile.stripeConnect?.readyForPayments === true;

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const selectedAmenitySet = useMemo(() => new Set(formData.amenities), [formData.amenities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.images.length < 2) newErrors.images = 'Please upload at least two photos of your space';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setGeneralError(null);
    createSpaceMutation.mutate(
      {
        title: formData.location.trim(),
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        description: formData.description.trim(),
        hourlyRate: Number(formData.price),
        dailyRate: formData.dailyPrice ? Number(formData.dailyPrice) : undefined,
        currency: 'AUD',
        amenities: formData.amenities,
        availabilityType: '24_7',
        customAvailability: [],
        images: formData.images,
        isActive: false,
      },
      {
        onSuccess: () => {
          router.push('/provider/spaces');
        },
        onError: (error) => {
          setGeneralError(error instanceof Error ? error.message : 'Failed to create space');
        },
      },
    );
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
      ) : !stripeReady ? (
        <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
          <div className="mb-8">
            <Link
              href="/provider/spaces"
              className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
            >
              ← Back to Spaces
            </Link>
          </div>
          <Card className="p-8 max-w-lg mx-auto border-amber-400/30 bg-amber-500/5">
            <div className="mb-4 flex justify-center">
              <CreditCard className="h-12 w-12 text-amber-300" strokeWidth={1.5} aria-hidden />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Complete Stripe setup first</h1>
            <p className="text-white/75 leading-relaxed mb-6">
              Connect your Stripe account and finish identity verification on your profile before you
              can list a parking space. That way guests can pay when bookings are confirmed.
            </p>
            <Link href="/provider/profile">
              <Button variant="primary" className="w-full sm:w-auto">
                Go to profile & payments
              </Button>
            </Link>
          </Card>
        </div>
      ) : (
        <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
          <div className="mb-8 sm:mb-12">
            <Link
              href="/provider/spaces"
              className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
            >
              ← Back to Spaces
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              Add New Parking Space
            </h1>
            <p className="text-base sm:text-lg text-white/70">
              Create a new listing for your parking space
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
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
                      placeholder="e.g., Downtown Central Parking"
                      value={formData.location}
                      onChange={(e) => {
                        clearErrors('location');
                        setFormData({ ...formData, location: e.target.value });
                      }}
                      error={errors.location}
                    />

                    <Input
                      label="Street Address"
                      type="text"
                      placeholder="123 Main Street"
                      value={formData.address}
                      onChange={(e) => {
                        clearErrors('address');
                        setFormData({ ...formData, address: e.target.value });
                      }}
                      error={errors.address}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        type="text"
                        placeholder="Sydney"
                        value={formData.city}
                        onChange={(e) => {
                          clearErrors('city');
                          setFormData({ ...formData, city: e.target.value });
                        }}
                        error={errors.city}
                      />

                      <Input
                        label="State"
                        type="text"
                        placeholder="NSW"
                        value={formData.state}
                        onChange={(e) => {
                          clearErrors('state');
                          setFormData({ ...formData, state: e.target.value });
                        }}
                        error={errors.state}
                      />

                      <Input
                        label="Postcode"
                        type="text"
                        inputMode="numeric"
                        placeholder="2000 (4-10 digits)"
                        value={formData.zipCode}
                        onChange={(e) => {
                          clearErrors('zipCode');
                          setFormData({ ...formData, zipCode: filterDigits(e.target.value, 10) });
                        }}
                        error={errors.zipCode}
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
                          border: errors.description ? '1px solid rgba(248, 113, 113, 0.7)' : '1px solid rgba(255, 255, 255, 0.2)',
                          resize: 'none',
                          outline: 'none'
                        }}
                        rows={4}
                        placeholder="Describe your parking space, nearby landmarks, and any important details..."
                        value={formData.description}
                        onChange={(e) => {
                          clearErrors('description');
                          setFormData({ ...formData, description: e.target.value });
                        }}
                      />
                      {errors.description && (
                        <p className="text-red-400 text-xs mt-1">{errors.description}</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Pricing</h2>
                  <p className="text-sm text-white/65 mb-4">
                    Listings are <strong className="text-white/90">24/7</strong> with{' '}
                    <strong className="text-white/90">one vehicle</strong> at a time per space (overlapping
                    bookings are not allowed).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Price per Hour"
                      type="text"
                      inputMode="decimal"
                      placeholder="5.00"
                      value={formData.price}
                      onChange={(e) => {
                        clearErrors('price');
                        setFormData({ ...formData, price: filterPriceInput(e.target.value) });
                      }}
                      error={errors.price}
                    />

                    <Input
                      label="Price per Day"
                      type="text"
                      inputMode="decimal"
                      placeholder="30.00 (optional)"
                      value={formData.dailyPrice}
                      onChange={(e) => {
                        clearErrors('dailyPrice');
                        setFormData({ ...formData, dailyPrice: filterPriceInput(e.target.value) });
                      }}
                      error={errors.dailyPrice}
                    />

                    <div>
                      <span className="block text-white/95 text-sm font-semibold mb-2">Currency</span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.07)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                        aria-readonly
                      >
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-lg font-semibold tracking-tight tabular-nums">AUD</span>
                          <span className="text-sm text-white/55 truncate">
                            Australian dollars
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] uppercase tracking-wider text-white/40 px-2 py-0.5 rounded border border-white/15 bg-black/20">
                          Fixed
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-white/45">
                        All listings and Stripe payouts use AUD only.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenityOptions.map((amenity) => {
                      const isSelected = selectedAmenitySet.has(amenity);
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
                  {errors.images && (
                    <p className="text-xs text-red-300 mt-2">{errors.images}</p>
                  )}
                </Card>

                <div className="flex gap-4">
                  <Button type="submit" variant="secondary" size="lg" disabled={createSpaceMutation.isPending}>
                    {createSpaceMutation.isPending ? 'Creating...' : 'Create Space'}
                  </Button>
                  <Link href="/provider/spaces">
                    <Button type="button" variant="outline" size="lg" disabled={createSpaceMutation.isPending}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Listing Tips</h3>
                  <ul className="space-y-3 text-sm text-white/70">
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Use clear, descriptive location names</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Include nearby landmarks in description</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Set competitive pricing based on area</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Highlight all available amenities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Spaces are bookable 24/7; only one booking can overlap at a time</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Approval Process</h3>
                  <p className="text-sm text-white/70 mb-4">
                    New space listings require admin approval before they become active. This typically takes 24-48 hours.
                  </p>
                  <div className="bg-yellow-500/20 border-2 border-yellow-400/30 rounded-lg p-4">
                    <p className="text-white/90 text-xs leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" aria-hidden />
                      <span>
                        Your space will be reviewed to ensure it meets our quality standards before being published.
                      </span>
                    </p>
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

