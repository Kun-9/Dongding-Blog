/**
 * Umami analytics — privacy-friendly, cookie-free.
 * Activates only when NEXT_PUBLIC_UMAMI_WEBSITE_ID is set.
 */
import Script from "next/script";

export function Umami() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  if (!websiteId || !src) return null;
  return (
    <Script
      defer
      data-website-id={websiteId}
      src={src}
      strategy="afterInteractive"
    />
  );
}
