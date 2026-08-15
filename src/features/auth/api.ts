'use client';

import { apiFetch } from "@/lib/api-client";

export type UserRole = "admin" | "consumer" | "provider";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type ProviderProfilePayload = {
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

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  role: "consumer" | "provider";
  phone?: string;
  providerProfile?: ProviderProfilePayload;
};

type RegisterResponse = {
  user: AuthUser;
};

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  user: AuthUser;
};

type MeResponse = {
  user: AuthUser;
};

type LogoutResponse = {
  message: string;
};

export function registerUser(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function loginUser(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function logoutUser() {
  return apiFetch<LogoutResponse>("/api/auth/logout", {
    method: "POST",
  });
}

export function fetchCurrentUser() {
  return apiFetch<MeResponse>("/api/auth/me");
}

