// Deterministic request classification: no API, tokens or external billing.
const aliases: Record<string, string[]> = {
  "house-cleaning": ["house cleaning", "home cleaning", "limpeza residencial", "limpar casa", "limpieza del hogar"],
  "vacation-rental-cleaning": ["airbnb", "turnover", "vacation rental", "temporada", "vacacional"],
  "deep-cleaning": ["deep clean", "limpeza pesada", "limpieza profunda"],
  "pool-service": ["pool", "piscina"],
  "hvac": ["hvac", "air conditioning", "ac repair", "ar condicionado", "aire acondicionado"],
  "plumbing": ["plumb", "leak", "encan", "vazamento", "plomer", "tuberi"],
  "handyman": ["handyman", "home repair", "reparo", "manutencao", "mantenimiento"],
  "furniture-assembly": ["assembl", "flat pack", "montagem", "montar mov", "armar mueble"],
  "tv-mounting": ["tv", "television", "televisao"],
  "mounting": ["mounting", "wall mount", "instalar prateleira"],
  "moving-help": ["moving", "move house", "mudanca", "mudanza"],
  "packing": ["packing", "empacot", "empacar"],
  "furniture-removal": ["junk removal", "furniture removal", "remocao de moveis", "retirar muebles"],
  "delivery-errands": ["delivery", "errand", "entrega", "recado", "mandado"],
  "lawn-care": ["lawn", "yard", "garden", "gramado", "jardin", "jardim"],
  "pressure-washing": ["pressure wash", "power wash", "alta pressao", "presion"],
  "pest-control": ["pest", "praga", "plaga", "dedetiz"],
  "appliance-repair": ["appliance", "refrigerator", "eletrodomestico", "geladeira", "lavadora"],
  "home-organization": ["organization", "organiza", "declutter", "closet"],
  "personal-assistant": ["assistant", "assistente", "asistente"],
  "painting": ["paint", "pintura", "pintar"],
  "window-cleaning": ["window clean", "limpeza de janela", "limpieza de ventana"]
};
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-_/]/g, " ").replace(/\s+/g, " ").trim();
}
export function classifyServiceRequest(value: string) {
  const query = normalizeSearch(value).slice(0, 500);
  if (!query) return [];
  const matches = Object.entries(aliases).filter(([, terms]) => terms.some((term) => new RegExp(`\\b${term}`).test(query))).map(([slug]) => slug);
  if (!matches.length && /\b(clean|cleaning|limpeza|limpiar|limpieza)\b/.test(query)) return ["house-cleaning", "deep-cleaning", "vacation-rental-cleaning"];
  return matches;
}
export function parseSearchLocation(value: string) {
  const query = value.trim().replace(/\s+/g, " ").slice(0, 120);
  if (/^\d{5}(?:-\d{4})?$/.test(query)) return { postalCode: query.slice(0, 5), city: "", state: "" };
  const match = query.match(/^(.*?)(?:,?\s+(FL|Florida))$/i);
  return { postalCode: "", city: (match ? match[1] : query).replace(/,$/, "").trim(), state: match ? "FL" : "" };
}
