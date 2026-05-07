import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://contactomedico.com.co";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/web"],
      disallow: ["/4dnn1n/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
