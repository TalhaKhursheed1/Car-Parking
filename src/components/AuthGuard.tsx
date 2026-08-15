'use client';

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/authStore";
import { useCurrentUser } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/api";

type AuthGuardProps = {
  allowedRoles?: UserRole[];
  redirectTo?: string;
  children: ReactNode;
};

export function AuthGuard({
  allowedRoles,
  redirectTo = "/login",
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, allowedRoles, user, router, redirectTo]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Checking permissions...
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

