import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dong-Ding · 백엔드 노트";

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
          <span>Dong-Ding</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "#1c1c1c",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            백엔드 노트,
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "#1c1c1c",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            다시 짓다.
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              color: "#5f5f5d",
              lineHeight: 1.5,
            }}
          >
            자바 · 스프링 · DB를 깊이, 천천히 따라가는 1인 기술 블로그
          </div>
        </div>
      </div>
    ),
    size,
  );
}
