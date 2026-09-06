import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VeroTask",
    short_name: "VeroTask",
    description: "Trusted local services with verified work and protected marketplace payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#126a4b",
    categories: ["business", "lifestyle", "utilities"]
  };
}
