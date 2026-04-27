import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = site.title;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7f4ed",
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
            color: "#5f5f5d",
            fontSize: 22,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: "#1c1c1c",
              color: "#fcfbf8",
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
                color: "#1c1c1c",
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
              color: "#5f5f5d",
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
