export type MarketplaceCategory = {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  image: string;
  query: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    slug: "cleaning",
    label: "Cleaning",
    shortLabel: "Cleaning",
    description: "Home, move-out and vacation-rental cleaning.",
    image: "https://images.pexels.com/photos/6197117/pexels-photo-6197117.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "House cleaning"
  },
  {
    slug: "handyman",
    label: "Handyman & Home Repairs",
    shortLabel: "Home repairs",
    description: "Repairs, installations and small home projects.",
    image: "https://images.pexels.com/photos/5767926/pexels-photo-5767926.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Handyman"
  },
  {
    slug: "furniture-assembly",
    label: "Furniture Assembly",
    shortLabel: "Assembly",
    description: "Beds, desks, shelves, cribs and flat-pack furniture.",
    image: "https://images.pexels.com/photos/4554423/pexels-photo-4554423.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Furniture assembly"
  },
  {
    slug: "moving-help",
    label: "Moving Help",
    shortLabel: "Moving",
    description: "Packing, lifting, loading, unloading and in-home moves.",
    image: "https://images.pexels.com/photos/7489130/pexels-photo-7489130.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Moving help"
  },
  {
    slug: "lawn-care",
    label: "Lawn & Outdoor Help",
    shortLabel: "Outdoor help",
    description: "Lawn care, yard work and outdoor maintenance.",
    image: "https://images.pexels.com/photos/9029162/pexels-photo-9029162.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Lawn care"
  },
  {
    slug: "delivery-errands",
    label: "Delivery & Errands",
    shortLabel: "Errands",
    description: "Pickups, local delivery, shopping and everyday errands.",
    image: "https://images.pexels.com/photos/4174744/pexels-photo-4174744.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Delivery and errands"
  },
  {
    slug: "personal-assistant",
    label: "Personal Assistant",
    shortLabel: "Assistant",
    description: "Local or remote help with organization and admin tasks.",
    image: "https://images.pexels.com/photos/6077067/pexels-photo-6077067.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Personal assistant"
  },
  {
    slug: "home-organization",
    label: "Home Organization",
    shortLabel: "Organization",
    description: "Closets, rooms, decluttering and household organization.",
    image: "https://images.pexels.com/photos/8454352/pexels-photo-8454352.jpeg?auto=compress&cs=tinysrgb&w=1400",
    query: "Home organization"
  }
];

export const HERO_SCENES = [
  {
    eyebrow: "Home repairs",
    title: "Get trusted help for the things that need doing.",
    image: MARKETPLACE_CATEGORIES[1].image,
    query: "Handyman"
  },
  {
    eyebrow: "Cleaning",
    title: "A fresh home starts with the right pair of hands.",
    image: MARKETPLACE_CATEGORIES[0].image,
    query: "House cleaning"
  },
  {
    eyebrow: "Assembly",
    title: "From boxes to finished. Find help that gets it done.",
    image: MARKETPLACE_CATEGORIES[2].image,
    query: "Furniture assembly"
  },
  {
    eyebrow: "Moving help",
    title: "Big move or one heavy item, get an extra pair of hands.",
    image: MARKETPLACE_CATEGORIES[3].image,
    query: "Moving help"
  },
  {
    eyebrow: "Everyday help",
    title: "Busy day? Find local help for errands and everyday tasks.",
    image: MARKETPLACE_CATEGORIES[5].image,
    query: "Delivery and errands"
  }
] as const;