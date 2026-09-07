export const LAUNCH_LOCATIONS = [
  { slug: "sao-paulo-sp", city: "São Paulo", state: "SP", label: "São Paulo, SP" },
  { slug: "guarulhos-sp", city: "Guarulhos", state: "SP", label: "Guarulhos, SP" },
  { slug: "osasco-sp", city: "Osasco", state: "SP", label: "Osasco, SP" },
  { slug: "santo-andre-sp", city: "Santo André", state: "SP", label: "Santo André, SP" },
  { slug: "sao-bernardo-do-campo-sp", city: "São Bernardo do Campo", state: "SP", label: "São Bernardo do Campo, SP" },
  { slug: "diadema-sp", city: "Diadema", state: "SP", label: "Diadema, SP" },
  { slug: "campinas-sp", city: "Campinas", state: "SP", label: "Campinas, SP" },
  { slug: "jundiai-sp", city: "Jundiaí", state: "SP", label: "Jundiaí, SP" },
  { slug: "sorocaba-sp", city: "Sorocaba", state: "SP", label: "Sorocaba, SP" }
] as const;

export type LaunchLocation = typeof LAUNCH_LOCATIONS[number];

export function locationBySlug(slug: string) {
  return LAUNCH_LOCATIONS.find((location) => location.slug === slug) ?? null;
}
