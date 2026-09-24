import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StoryLoop",
    short_name: "StoryLoop",
    description: "Learning story drafts for early childhood educators in Aotearoa New Zealand and Australia.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#6f4930",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/storyloop-icon.png", sizes: "512x512", type: "image/png" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
