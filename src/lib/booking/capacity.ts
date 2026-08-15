/**
 * Product rule: one concurrent booking per listing (overlapping window).
 * Stored `capacity` on a space is ignored for overlap checks so legacy rows cannot multi-book.
 */
export function effectiveBookingCapacity(_space: { capacity?: number | null }): number {
  return 1;
}
