import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { createSessionResponse } from "@/lib/auth/session";
import {
  createUser,
  ensureUserIndexes,
  findUserByEmail,
  UserRole,
} from "@/lib/repositories/users";
import {
  createProviderProfile,
  ensureProviderProfileIndexes,
} from "@/lib/repositories/providerProfiles";
import { recordAdminActivity } from "@/lib/repositories/adminActivities";
import {
  isValidBankAccountDigits,
  isValidPhoneDigits,
  isValidTaxIdDigits,
  isValidZipDigits,
} from "@/lib/validation/registerForm";

type ProviderProfileInput = {
  businessName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  bankAccount?: string;
  businessType?: "individual" | "company";
};

type RegisterBody = {
  fullName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
  providerProfile?: ProviderProfileInput;
};

const ALLOWED_ROLES: UserRole[] = ["consumer", "provider"];

export async function POST(request: Request) {
  let payload: RegisterBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fullName, email, password, role, phone, providerProfile } = payload;

  if (!fullName || !email || !password || !role) {
    return NextResponse.json(
      { error: "fullName, email, password, and role are required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Only consumer or provider registrations are allowed" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 },
    );
  }

  const trimmedPhone = phone?.trim();
  if (trimmedPhone && !isValidPhoneDigits(trimmedPhone)) {
    return NextResponse.json(
      { error: "Phone must be 10-15 digits only" },
      { status: 400 },
    );
  }

  if (role === "provider") {
    if (!providerProfile) {
      return NextResponse.json(
        { error: "Provider profile is required" },
        { status: 400 },
      );
    }
    const providerPhone =
      providerProfile.phone?.trim() || trimmedPhone || "";
    if (!isValidPhoneDigits(providerPhone)) {
      return NextResponse.json(
        { error: "Provider phone must be 10-15 digits only" },
        { status: 400 },
      );
    }
    const zipCode = providerProfile.zipCode?.trim() ?? "";
    if (!isValidZipDigits(zipCode)) {
      return NextResponse.json(
        { error: "Zip code must be 5 or 9 digits" },
        { status: 400 },
      );
    }
    const bankDigits = (providerProfile.bankAccount ?? "").replace(/\D/g, "");
    if (!isValidBankAccountDigits(bankDigits)) {
      return NextResponse.json(
        { error: "Bank account must be 10-19 digits" },
        { status: 400 },
      );
    }
    const taxDigits = (providerProfile.taxId ?? "").replace(/\D/g, "");
    if (!isValidTaxIdDigits(taxDigits)) {
      return NextResponse.json(
        { error: "Tax ID must be 8-15 digits" },
        { status: 400 },
      );
    }
  }

  try {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "fullName cannot be empty" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "email cannot be empty" },
        { status: 400 },
      );
    }
    const sanitizedPhone = trimmedPhone;
    const passwordHash = await hashPassword(password);

    await ensureUserIndexes();

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const createdUser = await createUser({
      fullName: trimmedName,
      email: normalizedEmail,
      passwordHash,
      role,
    });

    if (!createdUser._id) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 },
      );
    }

    if (role === "provider") {
      await ensureProviderProfileIndexes();
      const businessName = providerProfile?.businessName?.trim() || trimmedName;
      const contactName = providerProfile?.contactName?.trim() || trimmedName;
      const providerPhone =
        providerProfile?.phone?.trim() || sanitizedPhone || undefined;
      const address = providerProfile?.address?.trim();
      const city = providerProfile?.city?.trim();
      const state = providerProfile?.state?.trim();
      const zipCode = providerProfile?.zipCode?.trim();
      const taxId =
        providerProfile?.taxId?.replace(/\D/g, "") || undefined;
      const bankAccount =
        providerProfile?.bankAccount?.replace(/\D/g, "") || undefined;
      const bankAccountLast4 = bankAccount ? bankAccount.slice(-4) : undefined;

      await createProviderProfile({
        userId: createdUser._id,
        businessName,
        contactName,
        phone: providerPhone,
        address,
        city,
        state,
        zipCode,
        taxId,
        bankAccountLast4,
        businessType: providerProfile?.businessType,
        status: "pending",
      });
      await recordAdminActivity({
        type: "provider_account_created",
        actorLabel: trimmedName,
        actionLabel: "Created a provider account",
        contextLabel: normalizedEmail,
        status: "info",
        entityId: createdUser._id.toString(),
      });
    }

    await recordAdminActivity({
      type: "user_registered",
      actorLabel: trimmedName,
      actionLabel: "Registered a new account",
      contextLabel: role,
      status: "success",
      entityId: createdUser._id.toString(),
    });

    return createSessionResponse(
      {
        user: {
          id: createdUser._id.toString(),
          fullName: createdUser.fullName,
          email: createdUser.email,
          role: createdUser.role,
          createdAt: createdUser.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user account", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

