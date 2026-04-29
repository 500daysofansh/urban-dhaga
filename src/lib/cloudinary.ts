export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env variables are not set.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to upload image to Cloudinary");
  }

  const data = await response.json();
  return data.secure_url;
};

/**
 * Optimizes a Cloudinary image URL for the given display width.
 * - f_auto: serves WebP/AVIF automatically to supported browsers (phones get WebP)
 * - q_auto:good: intelligent compression, good quality/size balance
 * - w_{width}: resizes to the requested width, preserves aspect ratio
 * - c_limit: never upscales, only downscales
 *
 * Non-Cloudinary URLs are returned as-is.
 */
export const optimizeImage = (url: string, width: number): string => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},f_auto,q_auto:good,c_limit/`);
};

/**
 * Convenience presets for the two main display contexts in the app.
 * Card: 400px wide (2-col grid on phone = ~190px, but 2x for retina)
 * Detail: 800px wide (full width on phone, half on desktop)
 */
export const cardImage = (url: string) => optimizeImage(url, 400);
export const detailImage = (url: string) => optimizeImage(url, 800);
