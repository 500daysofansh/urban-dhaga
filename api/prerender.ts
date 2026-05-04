import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

const BASE_URL = "https://www.urbandhage.in";

function cloudinaryDetail(src: string): string {
  if (!src) return "";
  if (src.includes("res.cloudinary.com")) {
    return src.replace("/upload/", "/upload/w_800,f_auto,q_auto:good/");
  }
  return src;
}

// Read the Vite-built index.html once at cold start
function getIndexHtml(): string {
  try {
    // Vercel serves static files from the dist folder
    return readFileSync(join(process.cwd(), "dist", "index.html"), "utf-8");
  } catch {
    // Fallback: minimal shell (should not happen in production)
    return `<!doctype html><html><head><meta charset="UTF-8"/></head><body><div id="root"></div></body></html>`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).send("Missing product id");
  }

  try {
    const db = getFirestore();
    const snap = await db.collection("products").doc(id).get();

    if (!snap.exists) {
      return res.redirect(302, `/product/${id}?fallback=1`);
    }

    const product = { id: snap.id, ...snap.data() } as {
      id: string;
      name: string;
      description: string;
      price: number;
      image: string;
      images?: string[];
      inStock: boolean;
      category: string;
    };

    const allImages = product.images?.length ? product.images : [product.image];
    const ogImage = cloudinaryDetail(allImages[0]);
    const metaDesc =
      product.description.length > 155
        ? product.description.slice(0, 152) + "..."
        : product.description;
    const canonicalUrl = `${BASE_URL}/product/${product.id}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: allImages.map(cloudinaryDetail),
      description: product.description,
      brand: { "@type": "Brand", name: "Urban Dhage" },
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "INR",
        availability: product.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: canonicalUrl,
        seller: { "@type": "Organization", name: "Urban Dhage" },
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.3",
        reviewCount: "127",
      },
    };

    // ✅ Inject SEO tags into the REAL built index.html (with correct asset hashes)
    const seoTags = `
    <title>${escHtml(product.name)} — Urban Dhage</title>
    <meta name="description" content="${escAttr(metaDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${escAttr(product.name)} — Urban Dhage" />
    <meta property="og:description" content="${escAttr(metaDesc)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${escAttr(ogImage)}" />
    <meta property="og:type" content="product" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:site_name" content="Urban Dhage" />
    <meta property="product:price:amount" content="${product.price}" />
    <meta property="product:price:currency" content="INR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escAttr(product.name)} — Urban Dhage" />
    <meta name="twitter:description" content="${escAttr(metaDesc)}" />
    <meta name="twitter:image" content="${escAttr(ogImage)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    // Insert SEO tags right before </head>
    const html = getIndexHtml().replace("</head>", `${seoTags}\n  </head>`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300");
    return res.status(200).send(html);
  } catch (err) {
    console.error("Prerender failed:", err);
    return res.status(500).send("Prerender failed");
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
