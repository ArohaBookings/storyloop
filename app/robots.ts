import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/today",
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
