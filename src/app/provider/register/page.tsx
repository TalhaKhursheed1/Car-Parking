'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { AlertTriangle, Check, Lightbulb, User } from 'lucide-react';
import { PremiumRoleIcon } from '@/components/register/PremiumRoleIcon';

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Personal/Company Info
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    // Step 2: Business Details
    address: '',
    city: '',
    state: '',
    zipCode: '',
    businessType: 'company', // individual or company
    // Step 3: Payment Details
    bankAccount: '',
    taxId: '',
    // Step 4: Password
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
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

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const company = formData.companyName.trim();
      const contact = formData.contactName.trim();
      const email = formData.email.trim();
      const phone = formData.phone.trim();

      if (!company) newErrors.companyName = 'Company/Name is required';
      else if (company.length < 2) newErrors.companyName = 'Company/Name must be at least 2 characters';
      else if (company.length > 100) newErrors.companyName = 'Company/Name must be less than 100 characters';

      if (!contact) newErrors.contactName = 'Contact name is required';
      else if (!isValidPersonOrPlaceName(contact)) {
        newErrors.contactName = 'Contact name must be 2-50 characters and contain only letters';
      }

      if (!email) newErrors.email = 'Email is required';
      else if (!isValidEmail(email)) newErrors.email = 'Please enter a valid email address';

      if (!phone) newErrors.phone = 'Phone is required';
      else if (!isValidPhoneDigits(phone)) {
        newErrors.phone = 'Enter 10–15 digits only (no spaces or symbols)';
      }
    } else if (step === 2) {
      const address = formData.address.trim();
      const city = formData.city.trim();
      const state = formData.state.trim();
      const zip = formData.zipCode.trim();

      if (!address) newErrors.address = 'Address is required';
      else if (address.length < 5) newErrors.address = 'Address must be at least 5 characters';

      if (!city) newErrors.city = 'City is required';
      else if (!isValidPersonOrPlaceName(city)) {
        newErrors.city = 'City must be 2-50 characters and contain only letters';
      }

      if (!state) newErrors.state = 'State is required';
      else if (state.length < 2 || state.length > 50) {
        newErrors.state = 'State must be 2-50 characters';
      }

      if (!zip) newErrors.zipCode = 'Zip code is required';
      else if (!isValidZipDigits(zip)) {
        newErrors.zipCode = 'Enter 5 or 9 digits (US ZIP / ZIP+4, digits only)';
      }
    } else if (step === 3) {
      const tax = formData.taxId.trim();
      if (!formData.bankAccount.trim()) newErrors.bankAccount = 'Bank account is required';
      else if (!isValidBankAccountDigits(formData.bankAccount)) {
        newErrors.bankAccount = 'Enter 10–19 digits only';
      }

      if (!tax) newErrors.taxId = 'Tax ID is required';
      else if (!isValidTaxIdDigits(tax)) {
        newErrors.taxId = 'Enter 8–15 digits only (EIN, no dashes)';
      }
    } else if (step === 4) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
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
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          role: 'provider',
          providerProfile: {
            businessName: formData.companyName.trim(),
            contactName: formData.contactName.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            zipCode: formData.zipCode.trim(),
            taxId: formData.taxId.trim(),
            bankAccount: formData.bankAccount.trim(),
            businessType: formData.businessType as 'individual' | 'company',
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

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-28 sm:py-36 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="w-full max-w-5xl space-y-16 animate-fade-in-up">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <PremiumRoleIcon variant="provider" compact />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-8">
            Provider Registration
          </h1>
          <p className="text-2xl sm:text-3xl text-white/80">Create your provider profile to list parking spaces</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-20">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-xl shadow-xl transition-all duration-300 ${
                  s === step
                    ? 'bg-blue-500 text-white scale-110'
                    : s < step
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white/60'
                }`}
              >
                {s < step ? <Check className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2.5} aria-hidden /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-16 sm:w-24 h-2 mx-3 sm:mx-4 rounded-full transition-all duration-300 ${
                    s < step ? 'bg-green-500' : 'bg-white/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="p-14 sm:p-16 lg:p-20">
          {generalError && (
            <div className="mb-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {generalError}
            </div>
          )}
          {/* Step 1: Company/Personal Info */}
          {step === 1 && (
            <div className="space-y-12">
              <h2 className="text-4xl font-bold text-white mb-12">Company Information</h2>
              
              {/* <div>
                <label className="block text-white/95 text-base font-semibold mb-10 tracking-wide">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-10">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, businessType: 'individual' })}
                    className={`p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                      formData.businessType === 'individual'
                        ? 'border-white/50 bg-white/15 shadow-xl scale-105'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    } text-white`}
                  >
                    <div className="mb-4 flex justify-center">
                      <User className="h-12 w-12 text-white" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="font-bold text-xl">Individual</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, businessType: 'company' })}
                    className={`p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                      formData.businessType === 'company'
                        ? 'border-white/50 bg-white/15 shadow-xl scale-105'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    } text-white`}
                  >
                    <div className="mb-4 flex justify-center">
                      <Building2 className="h-12 w-12 text-white" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="font-bold text-xl">Company</div>
                  </button>
                </div>
              </div> */}

              <Input
                label={formData.businessType === 'company' ? 'Company Name' : 'Full Name'}
                type="text"
                placeholder={formData.businessType === 'company' ? 'ABC Parking Inc.' : 'John Doe'}
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
                placeholder="John Doe"
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
            </div>
          )}

          {/* Step 2: Business Location */}
          {step === 2 && (
            <div className="space-y-10">
              <h2 className="text-4xl font-bold text-white mb-10">Business Location</h2>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="space-y-10">
              <h2 className="text-4xl font-bold text-white mb-10">Payment Details</h2>

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

              <div className="bg-blue-500/20 border-2 border-blue-400/30 rounded-2xl p-8 backdrop-blur-sm">
                <p className="text-white/90 text-lg leading-relaxed flex items-start gap-4">
                  <Lightbulb className="h-8 w-8 shrink-0 text-amber-200/90 mt-0.5" aria-hidden />
                  <span>Your payment details are securely encrypted. Funds will be transferred to your account after each successful booking.</span>
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Password */}
          {step === 4 && (
            <div className="space-y-10">
              <h2 className="text-4xl font-bold text-white mb-10">Create Password</h2>

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

              <div className="bg-yellow-500/20 border-2 border-yellow-400/30 rounded-2xl p-8 backdrop-blur-sm">
                <p className="text-white/90 text-lg leading-relaxed flex items-start gap-4">
                  <AlertTriangle className="h-8 w-8 shrink-0 text-amber-300 mt-0.5" aria-hidden />
                  <span>
                    Your account will be pending admin approval. You&apos;ll receive an email once your
                    account is verified.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-6 mt-12 pt-10 border-t-2 border-white/20">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="min-w-[160px]"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              className="min-w-[180px]"
            >
              {registerMutation.isPending
                ? "Submitting..."
                : step === 4
                ? "Submit"
                : "Next →"}
            </Button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-white/80 text-base">
              Already have a provider account?{' '}
              <Link href="/login" className="text-white font-bold hover:underline text-lg">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

