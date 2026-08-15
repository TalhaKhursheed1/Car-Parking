import PDFDocument from '@react-pdf/pdfkit';

export type ConsumerInvoicePdfInput = {
  invoiceNumber: string;
  bookingId: string;
  paidAtIso: string;
  rentalStartIso: string;
  rentalEndIso: string;
  consumerName: string;
  consumerEmail: string;
  providerLabel: string;
  spaceTitle: string;
  spaceAddressLine?: string;
  totalAmount: number;
  currency: string;
  platformFeeAmount: number;
  stripeCheckoutSessionId: string | null;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function buildConsumerInvoicePdfBuffer(input: ConsumerInvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text('Tax invoice / Receipt', { align: 'center' });
    doc.moveDown(0.75);
    doc.fontSize(10).fillColor('#333333');
    doc.text(`Invoice reference: ${input.invoiceNumber}`, { continued: false });
    doc.text(`Booking ID: ${input.bookingId}`);
    doc.text(`Date paid (approx.): ${input.paidAtIso}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#000000').text('Bill to', { underline: true });
    doc.fontSize(10).fillColor('#333333');
    doc.text(input.consumerName);
    doc.text(input.consumerEmail);
    doc.moveDown();

    doc.fontSize(11).fillColor('#000000').text('Provider', { underline: true });
    doc.fontSize(10).fillColor('#333333');
    doc.text(input.providerLabel);
    doc.moveDown();

    doc.fontSize(11).fillColor('#000000').text('Parking space', { underline: true });
    doc.fontSize(10).fillColor('#333333');
    doc.text(input.spaceTitle);
    if (input.spaceAddressLine?.trim()) {
      doc.text(input.spaceAddressLine.trim());
    }
    doc.text(`Rental: ${input.rentalStartIso} → ${input.rentalEndIso}`);
    doc.moveDown();

    doc.fontSize(11).text('Charges', { underline: true });
    doc.moveDown(0.25);
    doc.fontSize(10);
    doc.text(`Parking rental (${input.currency})`, { continued: true });
    doc.text(formatMoney(input.totalAmount, input.currency), { align: 'right' });
    doc.text(`Platform fee (${input.currency})`, { continued: true });
    doc.text(formatMoney(input.platformFeeAmount, input.currency), { align: 'right' });
    doc.moveDown();
    doc.fontSize(11).text('Total paid', { continued: true });
    doc.text(formatMoney(input.totalAmount, input.currency), { align: 'right' });
    doc.moveDown();

    doc.fontSize(9).fillColor('#555555');
    doc.text(
      'Total paid is the amount charged for this booking. Platform fees support the marketplace.',
      { align: 'left' },
    );
    doc.moveDown();
    if (input.stripeCheckoutSessionId) {
      doc.text(`Stripe Checkout Session: ${input.stripeCheckoutSessionId}`);
    }

    doc.end();
  });
}
