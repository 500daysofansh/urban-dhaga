export function extractMeeshoId(url: string): string | null {
  const clean = url.trim().replace(/['"', ]/g, "");
  const match = clean.match(/\/(?:p|product)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  try {
    return String(parseInt(match[1], 36));
  } catch {
    return null;
  }
}

export async function fetchMeeshoProduct(productId: string) {
  const url = `https://prod.meeshoapi.com/api/3.0/product/static?id=${productId}&context=main&ad_active=false`;

  const headers = {
    "authorization": "32c4d8137cn9eb493a1921f203173080",
    "app-version": "27.6",
    "application-id": "com.meesho.supply",
    "country-iso": "in",
    "app-client-id": "android",
    "xo": "eyJ0eXBlIjoiY29tcG9zaXRlIn0=.eyJqd3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0ltaDBkSEJ6T2k4dmJXVmxjMmh2TG1OdmJTOXBjMjlmWTI5MWJuUnllVjlqYjJSbElqb2lTVTRpTENKb2RIUndjem92TDIxbFpYTm9ieTVqYjIwdmVtbHZiaTVqYjIwdmRtVnljMmx2YmlJNklqRWlMQ0owZVhBaU9pSktWMVFpZlEuZXlKbGVIQWlPakU1TXpRME5qRTROelVzSW1oMGRIQnpPaTh2YldWbGMyaHZMbU52YlM5aWJtOXVlVzF2ZFhOZmRYTmxjbDlwWkNJNkltSXhOek0wTVRCaUxUWmhZalF0TkRZd01DMWlNV1kzTFdNMU56bGtPVEk0WXpVM01pSXNJbWgwZEhCek9pOHZiV1ZsYzJodkxtTnZiUzlwYm5OMFlXNWpaVjlwWkNJNkltTmtOR0ZtWXpsbU5XWTVPVFJpWVdKaE5UVTJabVkyTjJZMlpUVTBNelE0SWl3aWFXRjBJam94TnpjMk56Z3hPRGMxZlEud2lQRWhRMWZUWGd0ZFprQUtVSGswZTBrWE5BaWxhaENGRG1hcERPcmlEcyIsInhvIjoiIn0=",
    "user-agent": "okhttp/4.9.0",
    "accept-encoding": "gzip",
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Meesho API error: ${response.status}`);
  }

  const data = await response.json();
  const catalog = data?.catalog;
  const product = catalog?.products?.[0];

  if (!product) throw new Error("No product found in response.");

  // Extract all images from variants
  const images: string[] = [];
  const simImages = catalog?.images || [];
  simImages.forEach((img: any) => {
    const url = img?.url || img?.image_url;
    if (url && !images.includes(url)) images.push(url);
  });

  // Fallback: images from product directly
  if (images.length === 0) {
    const prodImages = product?.images || [];
    prodImages.forEach((img: any) => {
      const u = img?.url || img?.image_url || img;
      if (u && typeof u === "string") images.push(u);
    });
  }

  // Extract sizes from inventory
  const sizes: string[] = [];
  const inventory = product?.inventory || [];
  inventory.forEach((item: any) => {
    const varName = item?.variation?.name;
    if (varName && !sizes.includes(varName)) sizes.push(varName);
  });

  // Extract description
  const descSections = catalog?.description?.sections || [];
  const description = descSections
    .map((s: any) => s?.description || "")
    .filter(Boolean)
    .join(" ")
    .trim() || product?.name || "";

  return {
    name: product.name || "Unnamed Product",
    price: product.min_price || 0,
    description,
    image: images[0] || "",
    images,
    sizes,
    inStock: product.in_stock ?? true,
    quan
