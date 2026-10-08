import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/experts", "/partners", "/join", "/apply-expert", "/apply-partner", "/free-kit"];
  return routes.map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
