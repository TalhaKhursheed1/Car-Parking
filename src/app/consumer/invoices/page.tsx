'use client';

import Link from 'next/link';

import { AuthGuard } from '@/components/AuthGuard';
import Card from '@/components/ui/Card';
import { useConsumerInvoices } from '@/features/bookings/hooks';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function ConsumerInvoicesPage() {
  const { data: rows, isLoading, isError } = useConsumerInvoices(true);

  return (
    <AuthGuard allowedRoles={['consumer']}>
      <div className="min-h-screen py-8 sm:py-12 px-6 sm:px-8 lg:px-12 max-w-3xl mx-auto space-y-8">
        <div>
          <Link
            href="/consumer/bookings"
            className="text-sm text-white hover:text-white mb-2 inline-block underline-offset-2 hover:underline"
          >
            ← My bookings
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Invoices</h1>
          <p className="text-white mt-2 text-sm">
            Confirmed bookings include a PDF invoice. After payment, we also email a copy when Resend is configured.
          </p>
        </div>

        {isLoading ? (
          <p className="text-white">Loading invoices…</p>
        ) : isError ? (
          <p className="text-white">Could not load invoices.</p>
        ) : !rows?.length ? (
          <Card className="p-8 border-white/10 bg-white/5 text-center text-white">
            No invoices yet. Complete payment on a booking to see it here.{' '}
            <Link href="/consumer/bookings" className="text-white underline-offset-2 hover:underline">
              Go to bookings
            </Link>
          </Card>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.bookingId}>
                <Card className="p-5 border-white/10 bg-white/5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white text-lg">{row.spaceTitle}</p>
                      <p className="text-xs text-white/70 mt-1">{row.providerLabel}</p>
                      <p className="text-xs text-white font-mono mt-0.5">{row.bookingId}</p>
                    </div>
                    <div className="text-right text-xs text-white/90 space-y-0.5">
                      <p className="font-medium">{formatMoney(row.totalAmount, row.currency)}</p>
                      {row.invoiceNumber ? (
                        <p className="text-emerald-200/90">{row.invoiceNumber}</p>
                      ) : (
                        <p className="text-amber-200/90">Reference pending</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white">
                    Rental:{' '}
                    {new Date(row.rentalStartAt).toLocaleString('en-AU', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    →{' '}
                    {new Date(row.rentalEndAt).toLocaleString('en-AU', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a href={row.pdfUrl} className="btn-base btn-primary btn-sm inline-block text-center">
                      Download PDF
                    </a>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthGuard>
  );
}
