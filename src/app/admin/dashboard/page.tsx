"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AuthGuard } from "@/components/AuthGuard";
import { apiFetch } from "@/lib/api-client";
import { useAdminActiveBookingsSummary, useAdminPlatformIncomeSummary } from "@/features/admin/income/hooks";
import { usePendingProviders } from "@/features/admin/providers/hooks";
import { usePendingSpaces, useAllSpacesCount } from "@/features/admin/spaces/hooks";
import { useAdminActivities } from "@/features/admin/activities/hooks";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Car,
  DollarSign,
  FolderOpen,
  Hourglass,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

function activityTypeIcon(type: string) {
  const className = "h-5 w-5 text-white/85 shrink-0";
  switch (type) {
    case "booking_created":
    case "booking_confirmed":
    case "booking_cancelled":
    case "booking_expired":
      return <Calendar className={className} aria-hidden />;
    case "user_registered":
    case "provider_account_created":
    case "provider_account_approved":
    case "provider_account_rejected":
      return <User className={className} aria-hidden />;
    case "provider_space_created":
      return <Car className={className} aria-hidden />;
    default:
      return <Calendar className={className} aria-hidden />;
  }
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(Math.floor(ms / 60000), 0);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatAud(amount: number) {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

const quickAccessItems: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  bgGradient: string;
  borderColor: string;
}[] = [
  {
    title: "Live Spaces",
    description: "Review and edit approved listings",
    icon: FolderOpen,
    href: "/admin/spaces/live",
    bgGradient:
      "linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)",
    borderColor: "rgba(14, 165, 233, 0.3)",
  },
  {
    title: "Income tracker",
    description: "Payments received, platform commission, and net to providers",
    icon: DollarSign,
    href: "/admin/income",
    bgGradient:
      "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.12) 100%)",
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  // {
  //   title: "Reports",
  //   description: "View detailed analytics and reports",
  //   icon: BarChart3,
  //   href: "/admin/reports",
  //   bgGradient:
  //     "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)",
  //   borderColor: "rgba(59, 130, 246, 0.3)",
  // },
  // {
  //   title: "User Activities",
  //   description: "Monitor user actions and activities",
  //   icon: Users,
  //   href: "/admin/users",
  //   bgGradient:
  //     "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)",
  //   borderColor: "rgba(139, 92, 246, 0.3)",
  // },
  {
    title: "Recommendations",
    description: "Promote highly-rated spaces to the consumer browse page",
    icon: Sparkles,
    href: "/admin/recommendations",
    bgGradient:
      "linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.12) 100%)",
    borderColor: "rgba(234, 179, 8, 0.35)",
  },
  {
    title: "Reports & analytics",
    description: "Earnings reports, system metrics, and CSV exports",
    icon: TrendingUp,
    href: "/admin/reports",
    bgGradient:
      "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  {
    title: "System Settings",
    description: "Manage system configuration",
    icon: Settings,
    href: "/admin/settings",
    bgGradient:
      "linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(13, 148, 136, 0.1) 100%)",
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
];

export default function AdminDashboard() {
  const { data: pendingProvidersData, isLoading: loadingProviders } =
    usePendingProviders();

  const pendingProvidersCount = pendingProvidersData?.providers?.length || 0;

  // Fetch total count of ALL spaces (including pending, approved, archived, rejected)
  const { data: allSpacesCountData, isLoading: loadingAllSpacesCount } = useAllSpacesCount();
  const totalSpaces = allSpacesCountData?.total ?? 0;

  // Fetch pending spaces count
  const { data: pendingSpacesData, isLoading: loadingPendingSpaces } = usePendingSpaces();
  const pendingSpacesCount = pendingSpacesData?.length || 0;

  const { data: platformIncome, isLoading: loadingPlatformIncome } = useAdminPlatformIncomeSummary();
  const { data: activeBookingsData, isLoading: loadingActiveBookings } = useAdminActiveBookingsSummary();
  const { data: activitiesData, isLoading: loadingActivities } = useAdminActivities(8, 0);
  const recentActivities = (activitiesData?.data ?? []).filter((row) => row.type !== "booking_expired");
  const { data: userCountData, isLoading: loadingUsersCount } = useQuery({
    queryKey: ["admin", "users", "count"],
    queryFn: () => apiFetch<{ total: number }>("/api/admin/users/count"),
    retry: false,
  });

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
        {/* Header Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-base sm:text-lg text-white/70">
                Monitor and manage operations efficiently
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-8">
              {/* Pending Provider Registrations Notification */}
              {!loadingProviders && (
                <Link
                  href="/admin/providers/pending"
                  className="relative shrink-0"
                  style={{ display: 'inline-block', width: '40px', height: '40px' }}
                  title={
                    pendingProvidersCount > 0
                      ? `${pendingProvidersCount} pending provider registration${
                          pendingProvidersCount !== 1 ? "s" : ""
                        }`
                      : "No pending provider registrations"
                  }
                >
                  <div
                    className="relative inline-flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg"
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>

                  {/* Badge on top-right of icon */}
                  {pendingProvidersCount > 0 && (
                    <span
                      className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white transform translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        border: "2px solid rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {pendingProvidersCount > 99 ? "99+" : pendingProvidersCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Pending Spaces Notification */}
              {!loadingPendingSpaces && (
                <Link
                  href="/admin/spaces/pending"
                  className="relative shrink-0"
                  style={{ display: 'inline-block', width: '40px', height: '40px' }}
                  title={
                    pendingSpacesCount > 0
                      ? `${pendingSpacesCount} pending space${pendingSpacesCount !== 1 ? "s" : ""}`
                      : "No pending spaces"
                  }
                >
                  <div
                    className="relative inline-flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg"
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  {/* Badge on top-right of icon */}
                  {pendingSpacesCount > 0 && (
                    <span
                      className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white transform translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        border: "2px solid rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {pendingSpacesCount > 99 ? "99+" : pendingSpacesCount}
                    </span>
                  )}
                </Link>
              )}

              {/* <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
                }}
              >
                <option value="today" className="bg-slate-900">
                  Today
                </option>
                <option value="week" className="bg-slate-900">
                  This Week
                </option>
                <option value="month" className="bg-slate-900">
                  This Month
                </option>
                <option value="year" className="bg-slate-900">
                  This Year
                </option>
              </select> */}
              <Link href="/admin/login">
                <Button variant="outline" size="sm">
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8 sm:mb-12" style={{ gap: '1.5rem' }}>
          <Card hover className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
              <div className="text-xs sm:text-sm text-white/60">Users</div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {loadingUsersCount ? "..." : (userCountData?.total ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-green-400">Total users</div>
          </Card>

          <Card hover className="p-4 sm:p-6">
            <Link href="/admin/spaces/live" className="block">
              <div className="flex items-center justify-between mb-2">
                <Car className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
                <div className="text-xs sm:text-sm text-white/60">Spaces</div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {loadingAllSpacesCount ? "..." : totalSpaces.toLocaleString()}
              </div>
              <div className="text-xs text-yellow-400">
                {pendingSpacesCount > 0
                  ? `${pendingSpacesCount} pending review →`
                  : "View all spaces →"}
              </div>
            </Link>
          </Card>

          <Card hover className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
              <div className="text-xs sm:text-sm text-white/60">Bookings</div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1 tabular-nums">
              {loadingActiveBookings ? "…" : (activeBookingsData?.activeCount ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-blue-400/90">Active now · paid & in rental window</div>
          </Card>

          <Card hover className="p-4 sm:p-6">
            <Link href="/admin/income" className="block">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
                <div className="text-xs sm:text-sm text-white/60">Platform profit</div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 tabular-nums">
                {loadingPlatformIncome ? "…" : formatAud(platformIncome?.platformCommissionAud ?? 0)}
              </div>
              <div className="text-xs text-emerald-400/90">
                {loadingPlatformIncome
                  ? "Loading…"
                  : `${platformIncome?.confirmedBookingCount ?? 0} paid booking${
                      (platformIncome?.confirmedBookingCount ?? 0) === 1 ? "" : "s"
                    } · all-time commission`}
              </div>
              <div className="text-xs text-white/45 mt-1">Income tracker →</div>
            </Link>
          </Card>

          <Card hover className="p-4 sm:p-6">
            <Link href="/admin/providers/pending" className="block">
              <div className="flex items-center justify-between mb-2">
                <Hourglass className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
                <div className="text-xs sm:text-sm text-white/60">Pending provider accounts</div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {loadingProviders ? "..." : pendingProvidersCount}
              </div>
              <div className="text-xs text-yellow-400">
                {pendingProvidersCount > 0
                  ? `${pendingProvidersCount} provider registration${
                      pendingProvidersCount !== 1 ? "s" : ""
                    }`
                  : "All clear!"}
              </div>
            </Link>
          </Card>

          {/* <Card hover className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-400" strokeWidth={1.5} aria-hidden />
              <div className="text-xs sm:text-sm text-white/60">Status</div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Online
            </div>
            <div className="text-xs text-green-400">Operational</div>
          </Card> */}
        </div>

        {/* Quick Access Cards */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
            {quickAccessItems.map((item, index) => {
              const QIcon = item.icon;
              return (
              <Link key={index} href={item.href}>
                <Card
                  hover
                  className="p-6 cursor-pointer"
                  style={{
                    borderColor: item.borderColor,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-xl flex items-center justify-center"
                      style={{
                        background: item.bgGradient,
                      }}
                    >
                      <QIcon className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-white/70 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activities and System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '2rem' }}>
          {/* Recent Activities */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Recent Activities
              </h2>
              <Link
                href="/admin/activities"
                className="text-sm text-blue-300 hover:text-blue-400 transition-colors"
              >
                View All →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loadingActivities ? (
                <p className="text-sm text-white/70">Loading activities…</p>
              ) : !recentActivities.length ? (
                <p className="text-sm text-white/70">No recent activity yet.</p>
              ) : (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {activityTypeIcon(activity.type)}
                          <span className="font-semibold text-white text-sm">
                            {activity.actorLabel}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 mb-1">
                          {activity.actionLabel}
                        </p>
                        {activity.contextLabel ? (
                          <p className="text-xs text-white/60">{activity.contextLabel}</p>
                        ) : null}
                      </div>
                      <span className="text-xs text-white/90 whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* System Monitoring */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              System Monitoring
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* System Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">
                    System Health
                  </span>
                  <span className="text-xs text-white bg-green-500/20 px-2 py-1 rounded">
                    Healthy
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: "98%" }}
                  />
                </div>
              </div>

              {/* Server Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">
                    Server Uptime
                  </span>
                  <span className="text-xs text-white/60">99.9%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: "99.9%" }}
                  />
                </div>
              </div>

              {/* Database Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">
                    Database
                  </span>
                  <span className="text-xs text-white bg-green-500/20 px-2 py-1 rounded">
                    Connected
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* API Response Time */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">
                    API Response Time
                  </span>
                  <span className="text-xs text-white/60">120ms</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: "95%" }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                  <Link href="/admin/reports">
                    <button
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.3) 100%)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)";
                      }}
                    >
                      Generate Report
                    </button>
                  </Link>
                  <Link href="/admin/settings">
                    <button
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.2) 100%)",
                        border: "1px solid rgba(20, 184, 166, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, rgba(20, 184, 166, 0.4) 0%, rgba(13, 148, 136, 0.3) 100%)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.2) 100%)";
                      }}
                    >
                      System Settings
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
