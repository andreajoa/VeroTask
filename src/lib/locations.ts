export const LAUNCH_LOCATIONS = [
  { slug: "orlando-fl", city: "Orlando", state: "FL", label: "Orlando, FL" },
  { slug: "kissimmee-fl", city: "Kissimmee", state: "FL", label: "Kissimmee, FL" },
  { slug: "davenport-fl", city: "Davenport", state: "FL", label: "Davenport, FL" },
  { slug: "celebration-fl", city: "Celebration", state: "FL", label: "Celebration, FL" },
  { slug: "clermont-fl", city: "Clermont", state: "FL", label: "Clermont, FL" },
  { slug: "winter-garden-fl", city: "Winter Garden", state: "FL", label: "Winter Garden, FL" },
  { slug: "lake-buena-vista-fl", city: "Lake Buena Vista", state: "FL", label: "Lake Buena Vista, FL" },
  { slug: "windermere-fl", city: "Windermere", state: "FL", label: "Windermere, FL" },
  { slug: "st-cloud-fl", city: "St. Cloud", state: "FL", label: "St. Cloud, FL" }
] as const;

export type LaunchLocation = typeof LAUNCH_LOCATIONS[number];

export function locationBySlug(slug: string) {
  return LAUNCH_LOCATIONS.find((location) => location.slug === slug) ?? null;
}
