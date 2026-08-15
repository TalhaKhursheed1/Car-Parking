'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import { AuthGuard } from '@/components/AuthGuard';
import {
  BarChart3,
  DollarSign,
  LineChart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type ReportLink = {
  title: string;
  description: string;
  href: string;
  icon: typeof BarChart3;
  ctaLabel: string;
};

const REPORTS: ReportLink[] = [
  {
    title: 'Earnings report',
    description:
      'Group confirmed payments by day, week, month, provider or city. Filter by date range and export to CSV for finance.',
    href: '/admin/reports/earnings',
    icon: DollarSign,
    ctaLabel: 'Open earnings report →',
  },
  {
    title: 'System metrics',
    description:
      'KPIs for users, bookings, conversion, reviews and likes — plus the top revenue spaces and providers in the selected window.',
    href: '/admin/reports/metrics',
    icon: TrendingUp,
    ctaLabel: 'Open metrics dashboard →',
  },
  {
    title: 'Income tracker',
    description:
      'Row-level breakdown of every confirmed payment with platform commission, provider share, and Stripe references.',
    href: '/admin/income',
    icon: BarChart3,
    ctaLabel: 'Open income tracker →',
  },
  {
    title: 'Recommendations',
    description:
      'Promote highly-rated spaces to the consumer browse page using a Bayesian weighted ranking.',
    href: '/admin/recommendations',
    icon: Sparkles,
    ctaLabel: 'Manage recommendations →',
  },
];

export default function ReportsPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
        <div className="mb-8 sm:mb-12">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            Reports & Analytics
          </h1>
          <p className="text-base sm:text-lg text-white/70">
            Generate earning reports and analyse system-wide metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
          {REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.href} href={report.href} className="block">
                <Card hover className="p-6 h-full flex flex-col">
                  <Icon
                    className="h-10 w-10 text-white/90 mb-4"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <h3 className="text-xl font-bold text-white mb-2">{report.title}</h3>
                  <p className="text-sm text-white/70 mb-6 flex-1">{report.description}</p>
                  <span className="inline-flex items-center text-sm text-blue-300">
                    {report.ctaLabel}
                  </span>
                </Card>
              </Link>
            );
          })}

          <Card className="p-6 h-full flex flex-col border-dashed border-white/15">
            <LineChart
              className="h-10 w-10 text-white/40 mb-4"
              strokeWidth={1.5}
              aria-hidden
            />
            <h3 className="text-xl font-bold text-white/70 mb-2">More coming soon</h3>
            <p className="text-sm text-white/50">
              Provider payouts, cohort retention, and incident reports are planned for upcoming sprints.
            </p>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
