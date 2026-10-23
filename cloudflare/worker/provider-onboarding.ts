/** D1 staging-only atomic provider onboarding proof.
 * Receives prevalidated synthetic identifiers. Never accepts real customers.
 */
interface Prepared {
  bind(...args: (string | number | null)[]): Prepared;
  raw<T = unknown>(): Promise<T[][]>;
}
interface DB { prepare(sql: string): Prepared; batch(statements: Prepared[]): Promise<unknown[]> }
type Result = { status: number; body: {ok: boolean; outcome: string; businessId?: string} };

const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sampleId = (s: unknown): s is string => typeof s === 'string' && validUuid.test(s);

export async function createSyntheticProvider(db: DB, input: unknown): Promise<Result> {
  if (!input || typeof input !== 'object') return {status:400,body:{ok:false,outcome:'invalid_request'}};
  const {ownerId,businessId,categoryId,slug} = input as Record<string,unknown>;
  // No arbitrary names, emails, phone numbers or addresses accepted here.
  if (![ownerId,businessId,categoryId].every(sampleId) ||
      typeof slug!=='string' || !/^d1-synthetic-[a-z0-9-]{5,64}$/.test(slug)) {
    return {status:400,body:{ok:false,outcome:'synthetic_only'}};
  }
  const user = await db.prepare('SELECT email FROM users WHERE id=? LIMIT 1').bind(ownerId as string).raw<string>();
  if (!user[0]?.[0]?.endsWith('@example.invalid')) return {status:403,body:{ok:false,outcome:'synthetic_only'}};
  const category = await db.prepare('SELECT id FROM categories WHERE id=? LIMIT 1').bind(categoryId as string).raw<string>();
  if (!category[0]) return {status:409,body:{ok:false,outcome:'category_missing'}};

  const existing = async () => db.prepare('SELECT id FROM businesses WHERE owner_user_id=? LIMIT 1').bind(ownerId as string).raw<string>();
  const previous = await existing();
  if (previous.length) return {status:200,body:{ok:true,outcome:'already_exists',businessId:previous[0][0]}};

  const statements = [
    db.prepare('INSERT INTO businesses (id,owner_user_id,name,slug,city,state,country,status,plan,active) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(businessId as string,ownerId as string,'D1 Synthetic Test Provider',slug,'Orlando','FL','US','active','free',1),
    db.prepare('INSERT INTO business_categories (business_id,category_id,featured) VALUES (?,?,1)')
      .bind(businessId as string,categoryId as string),
    db.prepare("UPDATE users SET role='provider',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?")
      .bind(ownerId as string)
  ];
  try {
    await db.batch(statements);
    return {status:201,body:{ok:true,outcome:'created',businessId:businessId as string}};
  } catch {
    const latest = await existing();
    if (latest.length) return {status:200,body:{ok:true,outcome:'already_exists',businessId:latest[0][0]}};
    return {status:409,body:{ok:false,outcome:'atomic_onboarding_failed'}};
  }
}

/** Future real provider onboarding. Disabled by default by the Worker flag;
 * the calling Next server must authenticate the user and verify geocoding.
 * This server-to-server RPC never bypasses database uniqueness constraints.
 */
export async function createProviderAtomic(db:DB, request:unknown):Promise<Result>{
  if (!request || typeof request!=='object') return {status:400,body:{ok:false,outcome:'invalid_request'}};
  const p=request as Record<string,unknown>;
  if (![p.ownerUserId,p.businessId,p.categoryId].every(sampleId)
    || typeof p.slug!=='string' || !/^[a-z0-9-]{3,200}$/.test(p.slug)
    || typeof p.name!=='string' || p.name.length<2 || p.name.length>220
    || typeof p.description!=='string' || p.description.length<20 || p.description.length>1200
    || typeof p.phone!=='string' || p.phone.length<7 || p.phone.length>32
    || typeof p.email!=='string' || p.email.length>320 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)
    || typeof p.addressLine1!=='string' || p.addressLine1.length<5 || p.addressLine1.length>220
    || typeof p.city!=='string' || p.city.length<2 || p.city.length>120
    || typeof p.postalCode!=='string' || !/^\d{5}(?:-\d{4})?$/.test(p.postalCode)
    || typeof p.serviceRadiusMiles!=='number' || !Number.isInteger(p.serviceRadiusMiles) || p.serviceRadiusMiles<5 || p.serviceRadiusMiles>50
    || typeof p.latitude!=='number' || !Number.isFinite(p.latitude) || p.latitude<24 || p.latitude>32
    || typeof p.longitude!=='number' || !Number.isFinite(p.longitude) || p.longitude> -79 || p.longitude< -88
  ) return {status:400,body:{ok:false,outcome:'invalid_provider_details'}};
  const ownerId=p.ownerUserId as string;
  const current=await db.prepare('SELECT email FROM users WHERE id=? LIMIT 1').bind(ownerId).raw<string>();
  if (!current[0] || current[0][0]?.toLowerCase()!==(p.email as string).toLowerCase()) {
    return {status:403,body:{ok:false,outcome:'owner_mismatch'}};
  }
  const category=await db.prepare('SELECT id FROM categories WHERE id=? AND active=1 LIMIT 1').bind(p.categoryId as string).raw();
  if (!category[0]) return {status:409,body:{ok:false,outcome:'category_missing'}};
  const lookup=async()=>db.prepare('SELECT id FROM businesses WHERE owner_user_id=? LIMIT 1').bind(ownerId).raw<string>();
  const existing=await lookup();
  if(existing[0]) return {status:200,body:{ok:true,outcome:'already_exists',businessId:existing[0][0]}};
  const statements=[
    db.prepare('INSERT INTO businesses (id,owner_user_id,name,slug,description,public_phone,public_email,address_line_1,city,state,postal_code,country,latitude,longitude,service_radius_miles,status,plan,imported_from_public_source,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(p.businessId as string,ownerId,p.name as string,p.slug as string,p.description as string,p.phone as string,p.email as string,p.addressLine1 as string,p.city as string,'FL',p.postalCode as string,'US',p.latitude as number,p.longitude as number,p.serviceRadiusMiles as number,'active','free',0,1),
    db.prepare('INSERT INTO business_categories (business_id,category_id,featured) VALUES (?,?,1)')
      .bind(p.businessId as string,p.categoryId as string),
    db.prepare("UPDATE users SET role='provider',phone=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?")
      .bind(p.phone as string,ownerId)
  ];
  try {
    await db.batch(statements);
    return {status:201,body:{ok:true,outcome:'created',businessId:p.businessId as string}};
  } catch {
    const latest=await lookup();
    if(latest[0]) return {status:200,body:{ok:true,outcome:'already_exists',businessId:latest[0][0]}};
    return {status:409,body:{ok:false,outcome:'atomic_onboarding_failed'}};
  }
}
