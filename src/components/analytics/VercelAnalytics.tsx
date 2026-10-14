/**
 * Vercel Web Analytics. Umami 와 같은 운영 화면(/admin, /settings, /studio)은
 * beforeSend 에서 null 을 돌려 집계에서 뺀다.
 */
"use client";

import { Analytics } from "@vercel/analytics/next";
import { isExcluded } from "./Umami";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) =>
        isExcluded(new URL(event.url).pathname) ? null : event
      }
    />
  );
}
