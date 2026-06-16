import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing product id" });

  const url = `https://prod.meeshoapi.com/api/3.0/product/static?id=${id}&context=main&ad_active=false`;

  try {
    const response = await fetch(url, {
      headers: {
        authorization: "32c4d8137cn9eb493a1921f203173080",
        "app-version": "27.6",
        "application-id": "com.meesho.supply",
        "country-iso": "in",
        "app-client-id": "android",
        xo: "eyJ0eXBlIjoiY29tcG9zaXRlIn0=.eyJqd3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0ltaDBkSEJ6T2k4dmJXVmxjMmh2TG1OdmJTOXBjMjlmWTI5MWJuUnllVjlqYjJSbElqb2lTVTRpTENKb2RIUndjem92TDIxbFpYTm9ieTVqYjIwdmVtbHZiaTVqYjIwdmRtVnljMmx2YmlJNklqRWlMQ0owZVhBaU9pSktWMVFpZlEuZXlKbGVIQWlPakU1TXpRME5qRTROelVzSW1oMGRIQnpPaTh2YldWbGMyaHZMbU52YlM5aWJtOXVlVzF2ZFhOZmRYTmxjbDlwWkNJNkltSXhOek0wTVRCaUxUWmhZalF0TkRZd01DMWlNV1kzTFdNMU56bGtPVEk0WXpVM01pSXNJbWgwZEhCek9pOHZiV1ZsYzJodkxtTnZiUzlwYm5OMFlXNWpaVjlwWkNJNkltTmtOR0ZtWXpsbU5XWTVPVFJpWVdKaE5UVTJabVkyTjJZMlpUVTBNelE0SWl3aWFXRjBJam94TnpjMk56Z3hPRGMxZlEud2lQRWhRMWZUWGd0ZFprQUtVSGswZTBrWE5BaWxhaENGRG1hcERPcmlEcyIsInhvIjoiIn0=",
        "user-agent": "okhttp/4.9.0",
      },
    });

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
