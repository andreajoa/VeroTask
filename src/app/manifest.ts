import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VeroTask",
    short_name: "VeroTask",
    description: "Local services marketplace for Orlando and Central Florida, United States, with protected quote requests and booking coordination.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#123b56",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
