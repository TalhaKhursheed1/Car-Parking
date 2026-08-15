'use client';

import { create } from "zustand";
import { AuthUser } from "@/features/auth/api";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) =>
    set(() => ({
      user,
      isAuthenticated: Boolean(user),
    })),
  clearUser: () =>
    set(() => ({
      user: null,
      isAuthenticated: false,
    })),
}));

