import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderAtomic } from '../cloudflare/worker/provider-onboarding';

const ownerUserId='a5555555-5555-4555-8555-555555555555';
const businessId='b6666666-6666-4666-8666-666666666666';
const categoryId='e4444444-4444-4444-8444-444444444444';
const valid={
  ownerUserId,businessId,categoryId,slug:'provider-test-20261022',
  name:'Verified Provider',description:'Provider description for staging testing only.',
  phone:'4075550100',email:'synthetic@example.invalid',addressLine1:'123 Fake Street',
  city:'Orlando',postalCode:'32801',latitude:28.54,longitude:-81.37,serviceRadiusMiles:15
};

test('D1 provider onboarding rejects malformed and out-of-region data before database use',async()=>{
  const db={prepare():never{throw new Error('database_access_not_expected')},batch():never{throw new Error('batch_not_expected')}};
  assert.equal((await createProviderAtomic(db,{...valid,latitude:100})).status,400);
  assert.equal((await createProviderAtomic(db,{...valid,postalCode:'1234'})).status,400);
  assert.equal((await createProviderAtomic(db,{...valid,ownerUserId:'not-an-id'})).status,400);
});

test('D1 provider onboarding rejects a mismatch between logged-in user and persisted email',async()=>{
  const statement={bind(){return this},async raw<T=unknown>():Promise<T[][]>{return [['other@example.invalid']] as unknown as T[][]}};
  const db={prepare(){return statement},batch():never{throw new Error('batch_not_expected')}};
  const result=await createProviderAtomic(db,valid);
  assert.equal(result.status,403);
  assert.equal(result.body.outcome,'owner_mismatch');
});
