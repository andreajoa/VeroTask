/** Server-verified provider details, shared by PostgreSQL and D1 backends. */
export type ProviderAtomicInput = {
  ownerUserId: string;
  categoryId: string;
  businessId: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  serviceRadiusMiles: number;
};
