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
    image: "https://images.pexels.com/photos/6195949/pexels-photo-6195949.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "House cleaning"
  },
  {
    slug: "handyman",
    label: "Handyman & Home Repairs",
    shortLabel: "Home repairs",
    description: "Repairs, installations and small home projects.",
    image: "https://images.pexels.com/photos/6474122/pexels-photo-6474122.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "Handyman"
  },
  {
    slug: "furniture-assembly",
    label: "Furniture Assembly",
    shortLabel: "Assembly",
    description: "Beds, desks, shelves, cribs and flat-pack furniture.",
    image: "https://images.pexels.com/photos/5217135/pexels-photo-5217135.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "Furniture assembly"
  },
  {
    slug: "moving-help",
    label: "Moving Help",
    shortLabel: "Moving",
    description: "Packing, lifting, loading, unloading and in-home moves.",
    image: "https://images.pexels.com/photos/6647005/pexels-photo-6647005.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "Moving help"
  },
  {
    slug: "lawn-care",
    label: "Lawn & Outdoor Help",
    shortLabel: "Outdoor help",
    description: "Lawn care, yard work and outdoor maintenance.",
    image: "https://images.pexels.com/photos/9029162/pexels-photo-9029162.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "Lawn care"
  },
  {
    slug: "delivery-errands",
    label: "Delivery & Errands",
    shortLabel: "Errands",
    description: "Pickups, local delivery, shopping and everyday errands.",
    image: "https://images.pexels.com/photos/4174744/pexels-photo-4174744.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "Delivery and errands"
  },
  {
    slug: "personal-assistant",
    label: "Personal Assistant",
    shortLabel: "Assistant",
    description: "Local or remote help with organization and admin tasks.",
    image: "https://images.pexels.com/photos/6077067/pexels-photo-6077067.jpeg?auto=compress&cs=tinysrgb&w=1200",
    query: "Personal assistant"
  },
  {
    slug: "home-organization",
    label: "Home Organization",
    shortLabel: "Organization",
    description: "Closets, rooms, decluttering and household organization.",
    image: "https://images.pexels.com/photos/8454352/pexels-photo-8454352.jpeg?auto=compress&cs=tinysrgb&w=1200",
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
    title: "From a quick clean to a full turnover, find the right pro.",
    image: MARKETPLACE_CATEGORIES[0].image,
    query: "House cleaning"
  },
  {
    eyebrow: "Assembly",
    title: "Furniture in boxes. Help can be on the way.",
    image: MARKETPLACE_CATEGORIES[2].image,
    query: "Furniture assembly"
  },
  {
    eyebrow: "Everyday help",
    title: "Need an extra pair of hands? VeroTask can match the task.",
    image: MARKETPLACE_CATEGORIES[5].image,
    query: "Delivery and errands"
  }
] as const;
