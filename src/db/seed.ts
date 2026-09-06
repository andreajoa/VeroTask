import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { businessCategories, businesses, categories } from "./schema";

const categorySeed = [
  ["vacation-rental-cleaning", "Vacation Rental Cleaning", "Limpeza de aluguel por temporada", "Limpieza de alquiler vacacional", true, true],
  ["house-cleaning", "House Cleaning", "Limpeza residencial", "Limpieza del hogar", true, true],
  ["deep-cleaning", "Deep Cleaning", "Limpeza pesada", "Limpieza profunda", true, true],
  ["pool-service", "Pool Service", "Serviço de piscina", "Servicio de piscina", true, true],
  ["hvac", "HVAC", "Ar-condicionado e climatização", "Climatización HVAC", false, true],
  ["plumbing", "Plumbing", "Encanamento", "Plomería", false, true],
  ["handyman", "Handyman", "Manutenção e reparos", "Mantenimiento y reparaciones", true, true],
  ["furniture-assembly", "Furniture Assembly", "Montagem de móveis", "Montaje de muebles", false, true],
  ["mounting", "Mounting", "Instalações em parede", "Montaje en pared", false, true],
  ["tv-mounting", "TV Mounting", "Instalação de TV", "Montaje de TV", false, true],
  ["moving-help", "Moving Help", "Ajuda com mudança", "Ayuda con mudanza", false, true],
  ["packing", "Packing & Unpacking", "Empacotar e desempacotar", "Empacar y desempacar", false, true],
  ["furniture-removal", "Furniture Removal", "Remoção de móveis", "Retiro de muebles", true, true],
  ["delivery-errands", "Delivery & Errands", "Entregas e recados", "Entregas y recados", false, false],
  ["shopping", "Shopping Help", "Ajuda com compras", "Ayuda con compras", false, false],
  ["personal-assistant", "Personal Assistant", "Assistente pessoal", "Asistente personal", false, false],
  ["home-organization", "Home Organization", "Organização residencial", "Organización del hogar", true, true],
  ["waiting-in-line", "Waiting in Line", "Aguardar em fila", "Esperar en fila", false, false],
  ["laundry-ironing", "Laundry & Ironing", "Lavanderia e passar roupas", "Lavandería y planchado", false, true],
  ["painting", "Painting", "Pintura", "Pintura", true, true],
  ["window-cleaning", "Window Cleaning", "Limpeza de janelas", "Limpieza de ventanas", true, true],
  ["smart-home-installation", "Smart Home Installation", "Instalação de casa inteligente", "Instalación de hogar inteligente", false, true],
  ["pest-control", "Pest Control", "Controle de pragas", "Control de plagas", false, true],
  ["lawn-care", "Lawn Care", "Jardinagem e gramado", "Cuidado del césped", true, true],
  ["appliance-repair", "Appliance Repair", "Reparo de eletrodomésticos", "Reparación de electrodomésticos", false, true],
  ["pressure-washing", "Pressure Washing", "Lavagem de alta pressão", "Lavado a presión", true, true]
] as const;

const businessSeed = [
  {
    name: "HighLux Property Care",
    slug: "highlux-property-care",
    city: "Orlando",
    state: "FL",
    publicPhone: "+13528901610",
    publicEmail: "info@highluxpropertycare.com",
    websiteUrl: "https://www.highluxpropertycare.com/",
    sourceUrl: "https://www.highluxpropertycare.com/",
    description: "Complete property care for vacation rentals across Central Florida, including turnover cleaning, inspections, maintenance, pool service, HVAC and pressure washing.",
    categories: ["vacation-rental-cleaning", "handyman", "pool-service", "hvac", "pressure-washing"]
  },
  {
    name: "Blue Bunny",
    slug: "blue-bunny-vacation-rental-cleaning",
    city: "Orlando",
    state: "FL",
    publicPhone: "+19047385631",
    websiteUrl: "https://gobluebunny.com/",
    sourceUrl: "https://gobluebunny.com/",
    description: "Vacation rental turnover cleaning serving the Orlando market with onboarding for short-term rental properties.",
    categories: ["vacation-rental-cleaning"]
  },
  {
    name: "Pool USA",
    slug: "pool-usa-orlando",
    city: "Orlando",
    state: "FL",
    postalCode: "32819",
    publicPhone: "+14076370807",
    description: "Pool cleaning, maintenance, pump and plumbing repair, leak detection and pool heater service in Central Florida.",
    categories: ["pool-service", "plumbing"]
  },
  {
    name: "Reis USA",
    slug: "reis-usa-pool-service",
    city: "Orlando",
    state: "FL",
    postalCode: "32827",
    publicPhone: "+14075802521",
    description: "Pool and hot tub service with pool plumbing, maintenance and repair coverage across Orlando and nearby Central Florida cities.",
    categories: ["pool-service", "plumbing"]
  },
  {
    name: "QUICK AIR USA - HVAC Services",
    slug: "quick-air-usa-hvac-services",
    city: "Orlando",
    state: "FL",
    postalCode: "32806",
    addressLine1: "3555 Ontario Ave",
    publicPhone: "+14078152550",
    description: "Air conditioning repair and HVAC services in Orlando.",
    categories: ["hvac"]
  },
  {
    name: "Emerald Plumbing",
    slug: "emerald-plumbing-orlando",
    city: "Orlando",
    state: "FL",
    addressLine1: "2311 Henderson Dr Unit A",
    publicPhone: "+14078983538",
    description: "Orlando plumbing service with 24-hour availability shown in its public business listing.",
    categories: ["plumbing"]
  },
  {
    name: "El Plomero Latino",
    slug: "el-plomero-latino-orlando",
    city: "Orlando",
    state: "FL",
    addressLine1: "25 Drennen Rd #1",
    publicPhone: "+14073627654",
    description: "Local Orlando plumbing service.",
    categories: ["plumbing"]
  },
  {
    name: "Five Star Services USA",
    slug: "five-star-services-usa",
    city: "Orlando",
    state: "FL",
    postalCode: "32825",
    publicPhone: "+19544703499",
    description: "Handyman services and residential repair work serving Orlando and surrounding areas.",
    categories: ["handyman"]
  },
  {
    name: "Orlando Pest Control",
    slug: "orlando-pest-control",
    city: "Winter Park",
    state: "FL",
    postalCode: "32792",
    addressLine1: "2431 Aloma Ave, Ste 227B",
    publicPhone: "+14078097378",
    description: "Pest control service serving the greater Orlando area.",
    categories: ["pest-control"]
  },
  {
    name: "Just Grass USA",
    slug: "just-grass-usa",
    city: "Orlando",
    state: "FL",
    postalCode: "32809",
    addressLine1: "2478 Sand Lake Rd",
    publicPhone: "+14078429363",
    description: "Lawn care service in Orlando.",
    categories: ["lawn-care"]
  },
  {
    name: "Appliances USA Pro",
    slug: "appliances-usa-pro",
    city: "Orlando",
    state: "FL",
    postalCode: "32839",
    addressLine1: "2429 Americana Blvd",
    publicPhone: "+16892106371",
    description: "Appliance and refrigerator repair service in Orlando.",
    categories: ["appliance-repair"]
  },
  {
    name: "USA Washers LLC",
    slug: "usa-washers-llc",
    city: "Orlando",
    state: "FL",
    postalCode: "32824",
    addressLine1: "9602 Sidney Hayes Rd",
    publicPhone: "+14079069303",
    description: "Pressure washing service in Orlando.",
    categories: ["pressure-washing"]
  }
] as const;

async function seed() {
  const db = getDb();

  for (const [slug, nameEn, namePtBr, nameEs, before, after] of categorySeed) {
    await db.insert(categories).values({
      slug,
      nameEn,
      namePtBr,
      nameEs,
      requiresBeforePhotos: before,
      requiresAfterPhotos: after,
      requiresChecklist: true
    }).onConflictDoNothing();
  }

  for (const item of businessSeed) {
    await db.insert(businesses).values({
      name: item.name,
      slug: item.slug,
      description: item.description,
      publicPhone: item.publicPhone,
      publicEmail: "publicEmail" in item ? item.publicEmail : undefined,
      websiteUrl: "websiteUrl" in item ? item.websiteUrl : undefined,
      sourceUrl: "sourceUrl" in item ? item.sourceUrl : undefined,
      addressLine1: "addressLine1" in item ? item.addressLine1 : undefined,
      city: item.city,
      state: item.state,
      postalCode: "postalCode" in item ? item.postalCode : undefined,
      status: "unclaimed",
      plan: "free",
      importedFromPublicSource: true
    }).onConflictDoNothing();

    const [business] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, item.slug)).limit(1);
    if (!business) continue;

    for (const categorySlug of item.categories) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (!category) continue;
      await db.insert(businessCategories).values({ businessId: business.id, categoryId: category.id }).onConflictDoNothing();
    }
  }

  console.log(`VeroTask seed complete: ${categorySeed.length} categories and ${businessSeed.length} unclaimed public business profiles.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
