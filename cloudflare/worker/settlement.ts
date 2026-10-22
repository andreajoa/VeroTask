/** Test-mode D1 booking-fee settlement. Never accepts live Stripe identifiers.
 * The caller must authenticate via Worker HMAC. Only a verified Stripe webhook
 * may use a future production variant after a full payment reconciliation review.
 */
interface Query { bind(...params: (string | number | null)[]): Query; raw<T = unknown>(): Promise<T[][]> }
export interface SettlementDB { prepare(sql: string): Query }
export type SettlementResult = { status: number; body: { ok: boolean; disposition: string } };

export async function settleTestBooking(db: SettlementDB, request: unknown): Promise<SettlementResult> {
  const packet = request as Record<string, unknown> | null;
  if (!packet || typeof packet !== 'object') return { status: 400, body: {ok:false,disposition:'invalid_request'} };
  const {bookingId, paymentIntentId, chargeId, amountCents, currency} = packet;
  if (typeof bookingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(bookingId) ||
      typeof paymentIntentId !== 'string' || !/^pi_test_[a-zA-Z0-9_]{4,96}$/.test(paymentIntentId) ||
      typeof chargeId !== 'string' || !/^ch_test_[a-zA-Z0-9_]{4,96}$/.test(chargeId) ||
      typeof amountCents !== 'number' || !Number.isSafeInteger(amountCents) || amountCents < 50 || amountCents > 100_000_000 ||
      currency !== 'usd') {
    return { status: 400, body: {ok:false,disposition:'invalid_test_payment'} };
  }

  // Atomic conditional UPDATE: only transitions an unpaid, quoted booking with
  // an exact booking fee. SQLite triggers record the event and close checkout
  // in the same DB transaction. Competing calls cannot both move the state.
  const changed = await db.prepare(`
    UPDATE bookings
    SET status='scheduled', stripe_payment_intent_id=?, stripe_charge_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND status IN ('accepted','payment_authorized')
      AND marketplace_fee_cents=? AND currency='usd'
      AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=?)
    RETURNING id
  `).bind(paymentIntentId, chargeId, bookingId, amountCents, paymentIntentId).raw<string>();
  if (changed.length === 1) return { status: 200, body: {ok:true,disposition:'scheduled'} };
  const current = await db.prepare('SELECT status, stripe_payment_intent_id, marketplace_fee_cents, currency FROM bookings WHERE id=? LIMIT 1').bind(bookingId).raw();
  const row = current[0];
  if (!row) return { status: 404, body: {ok:false,disposition:'booking_not_found'} };
  if (row[0] === 'scheduled' && row[1] === paymentIntentId && row[2] === amountCents && row[3] === 'usd') {
    return { status: 200, body: {ok:true,disposition:'already_processed'} };
  }
  return { status: 409, body: {ok:false,disposition:'refund_or_manual_review_required'} };
}
