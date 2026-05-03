import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialise Firebase Admin (only once across hot reloads)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const BASE_URL = "https://www.urbandhage.in";

const STATIC_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/size-guide", priority: "0.5", changefreq: "monthly" },
  { loc: "/returns", priority: "0.5", changefreq: "monthly" },
  { loc: "/shipping", priority: "0.5", changefreq: "monthly" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getFirestore();
    const snap = await db.collection("products").where("inStock", "==", true).get();

    const productUrls = snap.docs.map((doc) => ({
      loc: `/product/${doc.id}`,
      priority: "0.8",
      changefreq: "weekly",
    }));

    const allPages = [...STATIC_PAGES, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
    res.status(200).send(xml);
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    res.status(500).send("Failed to generate sitemap");
  }
}
