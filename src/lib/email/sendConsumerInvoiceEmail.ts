import { Resend } from 'resend';

export async function sendConsumerInvoiceEmail(params: {
  to: string;
  invoiceNumber: string;
  consumerFirstName: string;
  pdfBuffer: Buffer;
  bookingId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey) {
    return { ok: false, message: 'RESEND_API_KEY is not configured' };
  }
  if (!from) {
    return { ok: false, message: 'RESEND_FROM is not configured' };
  }

  const resend = new Resend(apiKey);
  const filename = `invoice-${params.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Your invoice ${params.invoiceNumber}`,
    html: `
      <p>Hi ${escapeHtml(params.consumerFirstName)},</p>
      <p>Thanks for your payment. Your invoice <strong>${escapeHtml(params.invoiceNumber)}</strong> for booking <code>${escapeHtml(params.bookingId)}</code> is attached as a PDF.</p>
      <p>You can also download invoices anytime from <strong>My bookings</strong> or <strong>Invoices</strong> in your account.</p>
      <p style="color:#666;font-size:12px;">ParkSpace — Car space renting</p>
    `,
    attachments: [
      {
        filename,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) {
    return { ok: false, message: error.message ?? 'Resend API error' };
  }
  if (!data?.id) {
    return { ok: false, message: 'Resend returned no message id' };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
