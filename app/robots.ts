import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/generate", "/history", "/billing", "/support", "/feedback", "/planning", "/api"],
    },
    sitemap: "https://storyloop.space/sitemap.xml",
  };
}
