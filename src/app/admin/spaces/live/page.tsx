"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { AuthGuard } from "@/components/AuthGuard";
import {
  useAdminLiveSpaces,
  useAdminSpaceQuickAction,
} from "@/features/admin/spaces/hooks";
import {
  buildAdminLiveQuery,
  parseAdminLiveFilters,
} from "@/features/admin/spaces/filter-utils";

const statusOptions = [
  { value: undefined, label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
];

function AdminLiveSpacesPageFallback() {
  return (
    <div className="min-h-screen py-8 sm:py-12 px-6 sm:px-8 lg:px-12 w-full">
      <p className="text-white/70">Loading spaces…</p>
    </div>
  );
}

function AdminLiveSpacesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsed = useMemo(
    () => parseAdminLiveFilters(searchParams),
    [searchParams]
  );
  const [city, setCity] = useState(parsed.city ?? "");
  const [state, setState] = useState(parsed.state ?? "");
  const [status, setStatus] = useState<"approved" | "archived" | undefined>(
    parsed.status
  );
  const [providerQuery, setProviderQuery] = useState(parsed.provider ?? "");
  const [search, setSearch] = useState(parsed.search ?? "");

  useEffect(() => {
    setCity(parsed.city ?? "");
    setState(parsed.state ?? "");
    setStatus(parsed.status);
    setProviderQuery(parsed.provider ?? "");
    setSearch(parsed.search ?? "");
  }, [parsed]);

  const filters = useMemo(
    () => ({
      page: parsed.page,
      city: parsed.city,
      state: parsed.state,
      status: parsed.status,
      provider: parsed.provider,
      search: parsed.search,
      pageSize: 10,
    }),
    [parsed]
  );

  const { data, isLoading, isError } = useAdminLiveSpaces(filters);
  const spaces = data?.data ?? [];
  const pagination = data?.pagination;
  const quickAction = useAdminSpaceQuickAction();

  const handleApplyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuery = buildAdminLiveQuery({
      page: 1,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      status,
      provider: providerQuery.trim() || undefined,
      search: search.trim() || undefined,
    });
    router.push(`/admin/spaces/live${nextQuery}`);
  };

  const handleReset = () => {
    router.push("/admin/spaces/live");
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-blue-300 hover:text-blue-200 w-fit transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between" style={{ gap: '1rem' }}>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Live Spaces
              </h1>
              <p className="text-white/70 max-w-3xl">
                Browse and correct active or archived listings. Use the filters
                below to narrow by location, status, or provider.
              </p>
            </div>
            <div className="text-sm text-white/60">
              <span className="font-semibold text-white">
                {pagination?.total ?? 0}
              </span>{" "}
              total spaces
            </div>
          </div>
        </div>

        <Card className="p-6 bg-white/5 border border-white/10">
          <form
            onSubmit={handleApplyFilters}
            className="grid grid-cols-1 lg:grid-cols-4" style={{ gap: '1rem' }}
          >
            <Input
              label="City"
              placeholder="e.g., Sydney"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="State"
              placeholder="e.g., NSW"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
            <Input
              label="Provider"
              placeholder="Name or email"
              value={providerQuery}
              onChange={(e) => setProviderQuery(e.target.value)}
            />
            <Input
              label="Search"
              placeholder="Title or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="lg:col-span-2">
              <label className="block text-sm text-white/70 mb-1">Status</label>
              <select
                value={status ?? ""}
                onChange={(e) =>
                  setStatus(
                    e.target.value
                      ? (e.target.value as "approved" | "archived")
                      : undefined
                  )
                }
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                className="w-full px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.label}
                    value={option.value ?? ""}
                    className="bg-slate-900"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end" style={{ gap: '1rem' }}>
              <Button type="submit">Apply</Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-0 overflow-hidden border border-white/10 bg-white/5">
          {isLoading ? (
            <div className="p-6 text-white/70">Loading spaces…</div>
          ) : isError ? (
            <div className="p-6 text-red-200">
              Failed to load spaces. Please try again later.
            </div>
          ) : spaces.length === 0 ? (
            <div className="p-6 text-white/70">
              No spaces match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-white/60 text-xs uppercase">
                    <th className="px-4 py-3 font-semibold">Space</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Rate</th>
                    <th className="px-4 py-3 font-semibold">Provider</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((entry) => (
                    <tr
                      key={entry.space.id}
                      className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/spaces/live/${entry.space.id}`)
                      }
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">
                          {entry.space.title}
                        </div>
                        <div className="text-xs text-white/60">
                          ID: {entry.space.id}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {[entry.space.city, entry.space.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-4">
                        {new Intl.NumberFormat("en-AU", {
                          style: "currency",
                          currency: entry.space.currency,
                          minimumFractionDigits: 0,
                        }).format(entry.space.hourlyRate)}
                        <span className="text-xs text-white/60"> /hr</span>
                      </td>
                      <td className="px-4 py-4">
                        {entry.provider ? (
                          <div>
                            <div className="font-medium text-white">
                              {entry.provider.fullName}
                            </div>
                            <div className="text-xs text-white/60">
                              {entry.provider.email}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center justify-center
             px-4 py-1.5 min-w-[80px]
             rounded-full text-xs font-semibold capitalize"
                          style={{
                            backgroundColor:
                              entry.space.status === "archived"
                                ? "rgba(239, 68, 68, 0.18)"
                                : entry.space.isActive
                                ? "rgba(34, 197, 94, 0.18)"
                                : "rgba(148, 163, 184, 0.18)",
                            color:
                              entry.space.status === "archived"
                                ? "#fca5a5"
                                : entry.space.isActive
                                ? "#86efac"
                                : "#cbd5f5",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        >
                          {entry.space.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-white/70">
                        {new Date(entry.space.updatedAt).toLocaleString(
                          "en-AU"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickAction.mutate({
                                spaceId: entry.space.id,
                                payload: { isActive: !entry.space.isActive },
                              });
                            }}
                            disabled={quickAction.isPending}
                          >
                            {quickAction.isPending
                              ? "Updating..."
                              : entry.space.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </Button>
                          {entry.space.status === "archived" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                quickAction.mutate({
                                  spaceId: entry.space.id,
                                  payload: { status: "approved" },
                                });
                              }}
                              disabled={quickAction.isPending}
                            >
                              Restore
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                quickAction.mutate({
                                  spaceId: entry.space.id,
                                  payload: {
                                    status: "archived",
                                    isActive: false,
                                  },
                                });
                              }}
                              disabled={quickAction.isPending}
                            >
                              Archive
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/admin/spaces/live/${entry.space.id}`
                              );
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-white/70" style={{ gap: '0.75rem' }}>
          <div>
            Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
          </div>
          <div className="flex" style={{ gap: '1rem' }}>
            <Button
              type="button"
              variant="outline"
              disabled={!pagination || pagination.page <= 1}
              onClick={() => {
                if (!pagination) return;
                const prevPage = Math.max(pagination.page - 1, 1);
                const nextQuery = buildAdminLiveQuery({
                  ...parsed,
                  page: prevPage,
                });
                router.push(`/admin/spaces/live${nextQuery}`);
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                !pagination || pagination.page >= (pagination.totalPages || 1)
              }
              onClick={() => {
                if (!pagination) return;
                const nextPage = Math.min(
                  pagination.page + 1,
                  pagination.totalPages
                );
                const nextQuery = buildAdminLiveQuery({
                  ...parsed,
                  page: nextPage,
                });
                router.push(`/admin/spaces/live${nextQuery}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
  );
}

export default function AdminLiveSpacesPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <Suspense fallback={<AdminLiveSpacesPageFallback />}>
        <AdminLiveSpacesPageContent />
      </Suspense>
    </AuthGuard>
  );
}
