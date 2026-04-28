import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_COLORS, OG_SIZE } from "@/lib/og-tokens";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = site.title;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: OG_COLORS.bg,
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: OG_COLORS.inkMuted,
            fontSize: 22,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: OG_COLORS.ink,
              color: OG_COLORS.inkInverse,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            동
          </div>
          <span>{site.og.label}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {site.og.headline.map((line) => (
            <div
              key={line}
              style={{
                fontSize: 84,
                fontWeight: 700,
                color: OG_COLORS.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
              }}
            >
              {line}
            </div>
          ))}
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              color: OG_COLORS.inkMuted,
              lineHeight: 1.5,
            }}
          >
            {site.og.tagline}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
