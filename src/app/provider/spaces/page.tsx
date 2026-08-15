"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AuthGuard } from "@/components/AuthGuard";
import {
  useProviderProfile,
  useProviderSpaces,
  useToggleProviderSpaceActivation,
} from "@/features/provider/hooks";
import { ProviderPendingNotice } from "@/components/ProviderPendingNotice";
import { useLogout } from "@/features/auth/hooks";
import type { ProviderSpaceSummary } from "@/features/provider/api";
import { Car } from "lucide-react";

type FilterKey = "all" | "active" | "pending" | "inactive";

function getStatusMeta(space: ProviderSpaceSummary) {
  if (!space.isActive) {
    return {
      label: "Inactive",
      bg: "rgba(148, 163, 184, 0.2)",
      color: "#cbd5f5",
    };
  }

  switch (space.status) {
    case "approved":
      return {
        label: "Active",
        bg: "rgba(34, 197, 94, 0.2)",
        color: "#86efac",
      };
    case "pending":
      return {
        label: "Pending approval",
        bg: "rgba(251, 191, 36, 0.2)",
        color: "#fde047",
      };
    case "rejected":
      return {
        label: "Rejected",
        bg: "rgba(239, 68, 68, 0.2)",
        color: "#fca5a5",
      };
    default:
      return {
        label: space.status,
        bg: "rgba(148, 163, 184, 0.2)",
        color: "#cbd5f5",
      };
  }
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value}`;
  }
}

export default function SpacesPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const router = useRouter();
  const { data, isLoading, isError } = useProviderProfile();
  const spacesQuery = useProviderSpaces();
  const logoutMutation = useLogout();
  const toggleActivation = useToggleProviderSpaceActivation();

  const status = data?.profile.status;
  const stripeReady = data?.profile.stripeConnect?.readyForPayments === true;
  const spaces = spacesQuery.data ?? [];

  const filteredSpaces = useMemo(() => {
    switch (filter) {
      case "active":
        return spaces.filter(
          (space) => space.status === "approved" && space.isActive
        );
      case "pending":
        return spaces.filter((space) => space.status === "pending");
      case "inactive":
        return spaces.filter((space) => !space.isActive);
      default:
        return spaces;
    }
  }, [spaces, filter]);

  const filterTabs: Array<{ key: FilterKey; label: string; count: number }> =
    useMemo(() => {
      const counts: Record<FilterKey, number> = {
        all: spaces.length,
        active: spaces.filter(
          (space) => space.status === "approved" && space.isActive
        ).length,
        pending: spaces.filter((space) => space.status === "pending").length,
        inactive: spaces.filter((space) => !space.isActive).length,
      };

      return [
        { key: "all", label: "All Spaces", count: counts.all },
        { key: "active", label: "Active", count: counts.active },
        { key: "pending", label: "Pending", count: counts.pending },
        { key: "inactive", label: "Inactive", count: counts.inactive },
      ];
    }, [spaces]);

  return (
    <AuthGuard allowedRoles={["provider"]}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Loading provider spaces...
        </div>
      ) : isError || !status ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Unable to load provider profile. Please try again later.
        </div>
      ) : status !== "approved" ? (
        <ProviderPendingNotice
          onLogout={() =>
            logoutMutation.mutate(undefined, {
              onSuccess: () => router.push("/"),
            })
          }
          isLoggingOut={logoutMutation.isPending}
        />
      ) : (
        <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
          <div className="mb-8 sm:mb-12">
            <Link
              href="/provider/dashboard"
              className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: '1rem' }}>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
                  Manage Parking Spaces
                </h1>
                <p className="text-base sm:text-lg text-white/70">
                  View and manage your parking space listings
                </p>
              </div>
              {stripeReady ? (
                <Link href="/provider/spaces/new">
                  <Button variant="secondary">Add New Space</Button>
                </Link>
              ) : (
                <Link href="/provider/profile">
                  <Button variant="secondary" title="Complete Stripe Connect on your profile first">
                    Complete payments setup to add a space
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex mb-8 overflow-x-auto" style={{ gap: '1rem' }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="font-semibold text-sm whitespace-nowrap transition-all"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: filter === tab.key ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                  color: filter === tab.key ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {spacesQuery.isLoading ? (
            <div className="min-h-[200px] flex items-center justify-center text-white/70">
              Loading spaces...
            </div>
          ) : spacesQuery.isError ? (
            <Card className="p-8 text-center text-red-200 border-red-500/40 bg-red-500/10">
              Unable to load spaces. Please try again later.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
                {filteredSpaces.map((space) => {
                  const statusMeta = getStatusMeta(space);
                  const previewImage = space.images?.[0];
                  return (
                    <Card key={space.id} className="p-6">
                      {previewImage ? (
                        <div className="mb-4 rounded-lg overflow-hidden border border-white/10">
                          <Image
                            src={previewImage}
                            alt={`${space.title} preview`}
                            width={640}
                            height={360}
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mb-4 h-40 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <Car className="h-16 w-16 text-white/40" strokeWidth={1.25} aria-hidden />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {space.title}
                          </h3>
                          <p className="text-sm text-white/60">
                            {[space.city, space.state]
                              .filter(Boolean)
                              .join(", ") || "Location TBD"}
                          </p>
                        </div>
                        <span
                          className="whitespace-nowrap font-medium"
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            background: statusMeta.bg,
                            color: statusMeta.color,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 mb-4" style={{ gap: '1rem' }}>
                        <div>
                          <div className="text-xs text-white/60 mb-1">
                            Hourly rate
                          </div>
                          <div className="text-lg font-bold text-white">
                            {formatCurrency(space.hourlyRate, space.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60 mb-1">
                            Created
                          </div>
                          <div className="text-sm font-medium text-white/80">
                            {new Date(space.createdAt).toLocaleDateString(
                              "en-AU",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row pt-4 border-t border-white/10" style={{ gap: '1rem' }}>
                        <Link
                          href={`/provider/spaces/${space.id}`}
                          className="flex sm:flex-1"
                        >
                          <Button variant="outline" fullWidth size="sm">
                            View Details
                          </Button>
                        </Link>

                        <Link
                          href={`/provider/spaces/${space.id}/edit`}
                          className="flex sm:flex-1"
                        >
                          <Button variant="outline" fullWidth size="sm">
                            Edit
                          </Button>
                        </Link>

                        <button
                          className="flex sm:flex-1 items-center justify-center font-medium transition-all"
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#ffffff',
                            background: space.isActive
                              ? "linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%)"
                              : "linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.2) 100%)",
                            border: `1px solid ${
                              space.isActive
                                ? "rgba(239, 68, 68, 0.3)"
                                : "rgba(34, 197, 94, 0.3)"
                            }`,
                            opacity: toggleActivation.isPending ? 0.6 : 1,
                            cursor: toggleActivation.isPending
                              ? "wait"
                              : "pointer",
                          }}
                          disabled={toggleActivation.isPending}
                          onClick={() =>
                            toggleActivation.mutate({
                              spaceId: space.id,
                              isActive: !space.isActive,
                            })
                          }
                        >
                          {toggleActivation.isPending
                            ? "Processing..."
                            : space.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {filteredSpaces.length === 0 && (
                <Card className="p-12 text-center mt-10">
                  <div className="mb-4 flex justify-center">
                    <Car className="h-14 w-14 text-white/70" strokeWidth={1.25} aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No spaces found
                  </h3>
                  <p className="text-white/70 mb-6">
                    {filter === "all"
                      ? "You haven't listed any parking spaces yet."
                      : `No ${filter} spaces found.`}
                  </p>
                  {stripeReady ? (
                    <Link href="/provider/spaces/new">
                      <Button variant="secondary">Add Your First Space</Button>
                    </Link>
                  ) : (
                    <Link href="/provider/profile">
                      <Button variant="secondary">Complete Stripe setup on profile</Button>
                    </Link>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </AuthGuard>
  );
}
