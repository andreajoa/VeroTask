import { eq } from 'drizzle-orm';
import { getTransactionalDb } from '@/db';
import { businessCategories, businesses, users } from '@/db/schema';
import type { ProviderAtomicInput } from '@/lib/provider-signup-model';

/** Existing PostgreSQL serializable provider creation, retained for production. */
export async function createProviderAtomic(input: ProviderAtomicInput): Promise<{id:string}> {
  return getTransactionalDb().transaction(async tx => {
    // Serialize concurrent tabs of this owner in PostgreSQL.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, input.ownerUserId)).for('update');
    const [previous] = await tx.select({id:businesses.id}).from(businesses).where(eq(businesses.ownerUserId,input.ownerUserId)).limit(1);
    if (previous) return previous;
    const [business] = await tx.insert(businesses).values({
      id: input.businessId,
      ownerUserId:input.ownerUserId,name:input.name,slug:input.slug,
      description:input.description,publicPhone:input.phone,publicEmail:input.email,
      addressLine1:input.addressLine1,city:input.city,state:'FL',postalCode:input.postalCode,country:'US',
      latitude:input.latitude,longitude:input.longitude,serviceRadiusMiles:input.serviceRadiusMiles,
      status:'active',plan:'free',importedFromPublicSource:false,active:true
    }).returning({id:businesses.id});
    await tx.insert(businessCategories).values({businessId:business.id,categoryId:input.categoryId,featured:true}).onConflictDoNothing();
    await tx.update(users).set({role:'provider',phone:input.phone,updatedAt:new Date()}).where(eq(users.id,input.ownerUserId));
    return business;
  });
}
