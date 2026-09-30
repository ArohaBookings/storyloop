import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        // Robots rules match by prefix: a bare "/today" also blocked the public
        // guide /today-loop-ece, so the private page is matched exactly.
        "/today$",
        "/today?",
        "/today/",
        "/generate",
        "/children",
        "/history",
        "/insights",
        "/planning",
        "/centre-tools",
        "/roi",
        "/billing",
        "/support",
        "/feedback",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/api",
      ],
    },
    sitemap: "https://storyloop.space/sitemap.xml",
  };
}
