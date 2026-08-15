'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useRegister } from '@/features/auth/hooks';
import {
  filterDigits,
  isValidBankAccountDigits,
  isValidEmail,
  isValidPersonOrPlaceName,
  isValidPhoneDigits,
  isValidTaxIdDigits,
  isValidZipDigits,
} from '@/lib/validation/registerForm';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { PremiumRoleIcon } from '@/components/register/PremiumRoleIcon';

type UserRole = 'consumer' | 'provider' | null;

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [step, setStep] = useState(1); // For provider multi-step form
  const [formData, setFormData] = useState({
    // Consumer form
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Provider form - Step 1
    companyName: '',
    contactName: '',
    providerEmail: '',
    providerPhone: '',
    // Provider form - Step 2
    address: '',
    city: '',
    state: '',
    zipCode: '',
    businessType: 'company' as 'individual' | 'company',
    // Provider form - Step 3
    bankAccount: '',
    taxId: '',
    // Provider form - Step 4
    providerPassword: '',
    providerConfirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const router = useRouter();
  const registerMutation = useRegister();

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

  // Consumer form submission
  const handleConsumerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    
    if (!trimmedFirstName) {
      newErrors.firstName = 'First name is required';
    } else if (!isValidPersonOrPlaceName(trimmedFirstName)) {
      newErrors.firstName = 'First name must be 2-50 characters and contain only letters';
    }
    
    if (!trimmedLastName) {
      newErrors.lastName = 'Last name is required';
    } else if (!isValidPersonOrPlaceName(trimmedLastName)) {
      newErrors.lastName = 'Last name must be 2-50 characters and contain only letters';
    }
    
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!trimmedPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!isValidPhoneDigits(trimmedPhone)) {
      newErrors.phone = 'Enter 10–15 digits only (no spaces or symbols)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setGeneralError(null);
      registerMutation.mutate(
        {
          fullName: `${trimmedFirstName} ${trimmedLastName}`.trim(),
          email: trimmedEmail,
          password: formData.password,
          phone: trimmedPhone,
          role: 'consumer',
        },
        {
          onSuccess: () => {
            router.push('/');
          },
          onError: (error) => {
            setGeneralError(error instanceof Error ? error.message : 'Registration failed');
          },
        },
      );
    }
  };

  // Provider form navigation
  const handleProviderNext = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const trimmedCompanyName = formData.companyName.trim();
      const trimmedContactName = formData.contactName.trim();
      const trimmedEmail = formData.providerEmail.trim();
      const trimmedPhone = formData.providerPhone.trim();

      if (!trimmedCompanyName) {
        newErrors.companyName = 'Company/Name is required';
      } else if (trimmedCompanyName.length < 2) {
        newErrors.companyName = 'Company/Name must be at least 2 characters';
      } else if (trimmedCompanyName.length > 100) {
        newErrors.companyName = 'Company/Name must be less than 100 characters';
      }

      if (!trimmedContactName) {
        newErrors.contactName = 'Contact name is required';
      } else if (!isValidPersonOrPlaceName(trimmedContactName)) {
        newErrors.contactName = 'Contact name must be 2-50 characters and contain only letters';
      }

      if (!trimmedEmail) {
        newErrors.providerEmail = 'Email is required';
      } else if (!isValidEmail(trimmedEmail)) {
        newErrors.providerEmail = 'Please enter a valid email address';
      }

      if (!trimmedPhone) {
        newErrors.providerPhone = 'Phone is required';
      } else if (!isValidPhoneDigits(trimmedPhone)) {
        newErrors.providerPhone = 'Enter 10–15 digits only (no spaces or symbols)';
      }
    } else if (step === 2) {
      const trimmedAddress = formData.address.trim();
      const trimmedCity = formData.city.trim();
      const trimmedState = formData.state.trim();
      const trimmedZipCode = formData.zipCode.trim();

      if (!trimmedAddress) {
        newErrors.address = 'Address is required';
      } else if (trimmedAddress.length < 5) {
        newErrors.address = 'Address must be at least 5 characters';
      }

      if (!trimmedCity) {
        newErrors.city = 'City is required';
      } else if (!isValidPersonOrPlaceName(trimmedCity)) {
        newErrors.city = 'City must be 2-50 characters and contain only letters';
      }

      if (!trimmedState) {
        newErrors.state = 'State is required';
      } else if (trimmedState.length < 2 || trimmedState.length > 50) {
        newErrors.state = 'State must be 2-50 characters';
      }

      if (!trimmedZipCode) {
        newErrors.zipCode = 'Zip code is required';
      } else if (!isValidZipDigits(trimmedZipCode)) {
        newErrors.zipCode = 'Enter 5 or 9 digits (US ZIP / ZIP+4, digits only)';
      }
    } else if (step === 3) {
      const trimmedTaxId = formData.taxId.trim();

      if (!formData.bankAccount.trim()) {
        newErrors.bankAccount = 'Bank account is required';
      } else if (!isValidBankAccountDigits(formData.bankAccount)) {
        newErrors.bankAccount = 'Enter 10–19 digits only';
      }

      if (!trimmedTaxId) {
        newErrors.taxId = 'Tax ID is required';
      } else if (!isValidTaxIdDigits(trimmedTaxId)) {
        newErrors.taxId = 'Enter 8–15 digits only (EIN, no dashes)';
      }
    } else if (step === 4) {
      if (!formData.providerPassword) {
        newErrors.providerPassword = 'Password is required';
      } else if (formData.providerPassword.length < 8) {
        newErrors.providerPassword = 'Password must be at least 8 characters';
      }

      if (!formData.providerConfirmPassword) {
        newErrors.providerConfirmPassword = 'Please confirm your password';
      } else if (formData.providerPassword !== formData.providerConfirmPassword) {
        newErrors.providerConfirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && step < 4) {
      setStep(step + 1);
    } else if (step === 4 && Object.keys(newErrors).length === 0) {
      setGeneralError(null);
      registerMutation.mutate(
        {
          fullName: formData.companyName.trim(),
          email: formData.providerEmail.trim(),
          password: formData.providerPassword,
          phone: formData.providerPhone.trim(),
          role: 'provider',
          providerProfile: {
            businessName: formData.companyName.trim(),
            contactName: formData.contactName.trim(),
            phone: formData.providerPhone.trim(),
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            zipCode: formData.zipCode.trim(),
            taxId: formData.taxId.trim(),
            bankAccount: formData.bankAccount.trim(),
            businessType: formData.businessType,
          },
        },
        {
          onSuccess: () => {
            router.push('/provider/dashboard');
          },
          onError: (error) => {
            setGeneralError(error instanceof Error ? error.message : 'Registration failed');
          },
        },
      );
    }
  };

  const handleProviderBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
        <div className="w-full animate-fade-in-up" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '2rem', margin: '0 auto' }}>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Create Your Account
            </h1>
            <p className="text-base sm:text-lg text-white/80">Choose your account type to get started</p>
          </div>

          <Card className="p-6 sm:p-8">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="text-center mb-8">
                <p className="text-white/90 text-lg font-medium mb-6">
                  How would you like to use ParkSpace?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Consumer Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('consumer')}
                  className="p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105 text-left"
                  style={{
                    borderColor: selectedRole === 'consumer' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                    background: selectedRole === 'consumer' 
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  }}
                >
                  <div className="mb-5 flex justify-center">
                    <PremiumRoleIcon variant="consumer" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    I want to book spaces (Consumer)
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Find and book parking spaces easily. Perfect for drivers looking for convenient parking.
                  </p>
                </button>

                {/* Provider Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('provider')}
                  className="p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105 text-left"
                  style={{
                    borderColor: selectedRole === 'provider' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                    background: selectedRole === 'provider' 
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  }}
                >
                  <div className="mb-5 flex justify-center">
                    <PremiumRoleIcon variant="provider" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    I want to list spaces (Provider)
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    List your parking spaces and earn money. Perfect for property owners and businesses.
                  </p>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/20 text-center">
                <p className="text-white/80 text-sm">
                  Already have an account?{' '}
                  <Link href="/login" className="text-white font-semibold hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Consumer Registration Form
  if (selectedRole === 'consumer') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
        <div className="w-full animate-fade-in-up" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '2rem', margin: '0 auto' }}>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Create Your Account
            </h1>
            <p className="text-base sm:text-lg text-white/80">Join ParkSpace and start booking parking spaces</p>
          </div>

          <Card className="p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="mb-4 text-black/80 hover:text-white text-sm font-medium flex items-center gap-2"
            >
              ← Back
            </button>

            <form onSubmit={handleConsumerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {generalError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {generalError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="First Name"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => {
                    clearErrors('firstName');
                    setFormData({ ...formData, firstName: e.target.value });
                  }}
                  error={errors.firstName}
                />

                <Input
                  label="Last Name"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => {
                    clearErrors('lastName');
                    setFormData({ ...formData, lastName: e.target.value });
                  }}
                  error={errors.lastName}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => {
                  clearErrors('email');
                  setFormData({ ...formData, email: e.target.value });
                }}
                error={errors.email}
              />

              <Input
                label="Phone Number"
                type="text"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="15551234567 (10–15 digits)"
                value={formData.phone}
                onChange={(e) => {
                  clearErrors('phone');
                  setFormData({ ...formData, phone: filterDigits(e.target.value, 15) });
                }}
                error={errors.phone}
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={(e) => {
                  clearErrors('password', 'confirmPassword');
                  setFormData({ ...formData, password: e.target.value });
                }}
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  clearErrors('password', 'confirmPassword');
                  setFormData({ ...formData, confirmPassword: e.target.value });
                }}
                error={errors.confirmPassword}
              />

              <div className="flex items-start pt-2">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded bg-white/10 border border-white/20 text-blue-600 focus:ring-blue-500 focus:ring-1 cursor-pointer"
                  required
                />
                <label className="ml-2 text-sm text-white/80 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-white font-semibold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-white font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button type="submit" fullWidth size="lg" className="mt-4" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/20 text-center">
              <p className="text-white/80 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-white font-semibold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Provider Registration Form (Multi-step)
  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="w-full animate-fade-in-up" style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '2rem', margin: '0 auto' }}>
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            Provider Registration
          </h1>
          <p className="text-base sm:text-lg text-white/80">Create your provider profile to list parking spaces</p>
        </div>

        {/* Progress Steps - Stepper */}
        <div className="w-full max-w-4xl mx-auto mb-8 px-4">
          <div className="flex items-start justify-between relative">
            {/* Connecting Lines Background */}
            <div className="absolute top-5 sm:top-6 left-12 right-12 h-1 bg-white/10 rounded-full z-0 hidden sm:block" />
            <div 
              className="absolute top-5 sm:top-6 left-12 h-1 bg-blue-500 rounded-full z-10 transition-all duration-500 hidden sm:block"
              style={{ 
                width: `${((step - 1) / 3) * 100}%`,
                maxWidth: 'calc(100% - 6rem)',
              }}
            />
            
            {/* Steps */}
            {[
              { number: 1, label: 'Company Info', description: 'Basic Details' },
              { number: 2, label: 'Location', description: 'Business Address' },
              { number: 3, label: 'Payment', description: 'Bank Details' },
              { number: 4, label: 'Password', description: 'Security' },
            ].map((stepInfo) => {
              const isActive = step === stepInfo.number;
              const isCompleted = step > stepInfo.number;
              
              return (
                <div key={stepInfo.number} className="flex flex-col items-center relative z-20 flex-1 min-w-0">
                  {/* Step Circle */}
                  <div
                    className={`rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-lg transition-all duration-300 mb-2 ${
                      isActive
                        ? 'bg-blue-500 text-white scale-110 ring-4 ring-blue-500/30'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white/60'
                    }`}
                    style={{ width: '48px', height: '48px' }}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{stepInfo.number}</span>
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <div className="text-center px-1">
                    <div
                      className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 transition-colors duration-300 ${
                        isActive
                          ? 'text-white'
                          : isCompleted
                          ? 'text-green-400'
                          : 'text-white/50'
                      }`}
                    >
                      <span className="hidden sm:inline">{stepInfo.label}</span>
                      <span className="sm:hidden">{stepInfo.number}</span>
                    </div>
                    <div
                      className={`text-[10px] sm:text-xs transition-colors duration-300 hidden sm:block ${
                        isActive
                          ? 'text-white/80'
                          : isCompleted
                          ? 'text-green-400/70'
                          : 'text-white/40'
                      }`}
                    >
                      {stepInfo.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="p-6 sm:p-8 lg:p-10">
          <button
            type="button"
            onClick={() => {
              setSelectedRole(null);
              setStep(1);
              setErrors({});
            }}
            className="mb-4 text-black/80 hover:text-white text-sm font-medium flex items-center gap-2"
          >
            ← Back
          </button>

          {generalError && (
            <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {generalError}
            </div>
          )}

          {/* Step 1: Company/Personal Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Company Information</h2>
              
              <Input
                label={formData.businessType === 'company' ? 'Personal Name' : 'Full Name'}
                type="text"
                placeholder={formData.businessType === 'company' ? 'Enter your name' : 'Enter your name'}
                value={formData.companyName}
                onChange={(e) => {
                  clearErrors('companyName');
                  setFormData({ ...formData, companyName: e.target.value });
                }}
                error={errors.companyName}
              />

              <Input
                label="Contact Name"
                type="text"
                placeholder="contact name"
                value={formData.contactName}
                onChange={(e) => {
                  clearErrors('contactName');
                  setFormData({ ...formData, contactName: e.target.value });
                }}
                error={errors.contactName}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="contact@example.com"
                value={formData.providerEmail}
                onChange={(e) => {
                  clearErrors('providerEmail');
                  setFormData({ ...formData, providerEmail: e.target.value });
                }}
                error={errors.providerEmail}
              />

              <Input
                label="Phone Number"
                type="text"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="15551234567 (10–15 digits)"
                value={formData.providerPhone}
                onChange={(e) => {
                  clearErrors('providerPhone');
                  setFormData({ ...formData, providerPhone: filterDigits(e.target.value, 15) });
                }}
                error={errors.providerPhone}
              />
            </div>
          )}

          {/* Step 2: Business Location */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Business Location</h2>

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

              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
                <Input
                  label="City"
                  type="text"
                  placeholder="New York"
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
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => {
                    clearErrors('state');
                    setFormData({ ...formData, state: e.target.value });
                  }}
                  error={errors.state}
                />

                <Input
                  label="Zip Code"
                  type="text"
                  inputMode="numeric"
                  placeholder="10001 or 100011234 (5 or 9 digits)"
                  value={formData.zipCode}
                  onChange={(e) => {
                    clearErrors('zipCode');
                    setFormData({ ...formData, zipCode: filterDigits(e.target.value, 9) });
                  }}
                  error={errors.zipCode}
                />
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Payment Details</h2>

              <Input
                label="Bank Account Number"
                type="text"
                inputMode="numeric"
                placeholder="10–19 digits only"
                value={formData.bankAccount}
                onChange={(e) => {
                  clearErrors('bankAccount');
                  setFormData({ ...formData, bankAccount: filterDigits(e.target.value, 19) });
                }}
                error={errors.bankAccount}
              />

              <Input
                label="Tax ID / EIN"
                type="text"
                inputMode="numeric"
                placeholder="123456789 (8–15 digits, no dashes)"
                value={formData.taxId}
                onChange={(e) => {
                  clearErrors('taxId');
                  setFormData({ ...formData, taxId: filterDigits(e.target.value, 15) });
                }}
                error={errors.taxId}
              />

              <div className="bg-blue-500/20 border-2 border-blue-400/30 rounded-xl p-6 backdrop-blur-sm">
                <p className="text-white/90 text-sm leading-relaxed flex items-start gap-3">
                  <Lightbulb className="h-6 w-6 shrink-0 text-amber-200/90 mt-0.5" aria-hidden />
                  <span>Your payment details are securely encrypted. Funds will be transferred to your account after each successful booking.</span>
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Password */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Create Password</h2>

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.providerPassword}
                onChange={(e) => {
                  clearErrors('providerPassword', 'providerConfirmPassword');
                  setFormData({ ...formData, providerPassword: e.target.value });
                }}
                error={errors.providerPassword}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                value={formData.providerConfirmPassword}
                onChange={(e) => {
                  clearErrors('providerPassword', 'providerConfirmPassword');
                  setFormData({ ...formData, providerConfirmPassword: e.target.value });
                }}
                error={errors.providerConfirmPassword}
              />

              <div className="bg-yellow-500/20 border-2 border-yellow-400/30 rounded-xl p-6 backdrop-blur-sm">
                <p className="text-white/90 text-sm leading-relaxed flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-300 mt-0.5" aria-hidden />
                  <span>
                    Your account will be pending admin approval. You&apos;ll receive an email once your
                    account is verified.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-6 mt-8 pt-6 border-t border-white/20">
            <Button
              type="button"
              variant="outline"
              onClick={handleProviderBack}
              disabled={step === 1}
              className="min-w-[120px]"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleProviderNext}
              className="min-w-[140px]"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? "Submitting..."
                : step === 4
                ? "Submit"
                : "Next →"}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              Already have a provider account?{' '}
              <Link href="/login" className="text-white font-semibold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
