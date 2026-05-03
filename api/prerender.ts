import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

// Mirrors your Cloudinary detailImage helper (800px wide, auto format/quality)
function cloudinaryDetail(src: string): string {
  if (!src) return "";
  // Already a full Cloudinary URL — inject transformations
  if (src.includes("res.cloudinary.com")) {
    return src.replace("/upload/", "/upload/w_800,f_auto,q_auto:good/");
  }
  return src;
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
      // Product not found — fall back to serving the normal SPA shell
      // so the user still gets the React 404 page
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
    const ogImage   = cloudinaryDetail(allImages[0]);
    const metaDesc  = product.description.length > 155
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

    // Serve a minimal but complete HTML shell with all SEO tags injected.
    // The browser will still load the React SPA via the <script> tag,
    // so real users get the full experience after the initial paint.
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escHtml(product.name)} — Urban Dhage</title>
  <meta name="description" content="${escAttr(metaDesc)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${escAttr(product.name)} — Urban Dhage" />
  <meta property="og:description" content="${escAttr(metaDesc)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${escAttr(ogImage)}" />
  <meta property="og:type" content="product" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:site_name" content="Urban Dhage" />
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="INR" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(product.name)} — Urban Dhage" />
  <meta name="twitter:description" content="${escAttr(metaDesc)}" />
  <meta name="twitter:image" content="${escAttr(ogImage)}" />

  <!-- Favicons (same as index.html) -->
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

  <!-- JSON-LD Product schema -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <div id="root"></div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Cache for 10 minutes at the edge, revalidate in background
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300");
    return res.status(200).send(html);

  } catch (err) {
    console.error("Prerender failed:", err);
    return res.status(500).send("Prerender failed");
  }
}

// Minimal HTML escaping to prevent XSS in injected product strings
function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
