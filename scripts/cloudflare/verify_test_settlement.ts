/** D1 sandbox integration. Requires dedicated synthetic fixture and HMAC secret.
 * Never charges money or accepts a live Stripe payment intent. */
import { createHmac } from 'node:crypto';
import { strict as assert } from 'node:assert';

const host = process.env.D1_STAGING_HTTP_URL;
const secret = process.env.D1_STAGING_BRIDGE_SECRET;
if (!host || !secret) throw new Error('staging_configuration_missing');
const bookingId = 'c3333333-3333-4333-8333-333333333333';
const input = { bookingId, paymentIntentId: 'pi_test_synthetic_20261022',chargeId:'ch_test_synthetic_20261022',amountCents:1500,currency:'usd' };

async function signedRequest(path:string,payload:unknown) {
  const body=JSON.stringify(payload);
  const timestamp=String(Date.now());
  const signature=createHmac('sha256',secret!).update(timestamp+'\n'+body).digest('hex');
  const response=await fetch(host+path,{method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},body});
  return { status: response.status, data:await response.json() as Record<string,unknown> };
}
async function main(){
  const path='/internal/test-settle-booking';
  const absent =await fetch(host+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
  assert.equal(absent.status,401);
  assert.equal((await signedRequest(path,{...input,paymentIntentId:'pi_live_never'})).status,400);
  assert.equal((await signedRequest(path,{...input,amountCents:1400})).status,409);
  const competing=await Promise.all([signedRequest(path,input),signedRequest(path,input)]);
  assert.deepEqual(competing.map(x=>x.status),[200,200]);
  assert.deepEqual(competing.map(x=>x.data.disposition).sort(),['already_processed','scheduled']);
  assert.equal((await signedRequest(path,{...input,paymentIntentId:'pi_test_different_20261022'})).status,409);
  const record=await signedRequest('/internal/sqlite-read',{query:{sql:'SELECT status,stripe_payment_intent_id FROM bookings WHERE id=?',params:[bookingId],method:'all'}});
  assert.equal(record.status,200);
  assert.deepEqual(record.data.rows,[['scheduled',input.paymentIntentId]]);
  const events=await signedRequest('/internal/sqlite-read',{query:{sql:'SELECT event_type FROM booking_events WHERE booking_id=?',params:[bookingId],method:'all'}});
  assert.equal(events.status,200);
  assert.deepEqual(events.data.rows,[['payment_succeeded']]);
  const checkout=await signedRequest('/internal/sqlite-read',{query:{sql:'SELECT status FROM booking_checkout_sessions WHERE booking_id=?',params:[bookingId],method:'all'}});
  assert.equal(checkout.status,200);
  assert.deepEqual(checkout.data.rows,[['complete']]);
  console.log('SANDBOX PASS: HMAC auth, test-mode-only payment identifiers, exact fee, 2 competing settlements, 1 atomic event, checkout complete, replay idempotent, different payment rejected');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
