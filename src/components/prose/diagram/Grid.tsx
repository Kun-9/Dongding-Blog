/**
 * grid — 격자. 미로·BFS 거리·DP 표처럼 칸이 차례로 차는 풀이를 그린다.
 * 칸 모양은 globals.css 의 `.dg-grid`·`.dg-gc`(벽·빈 칸·찬 칸·강조·흐림). 장면은 diagram/Scene 의 GridScene.
 */
import type { CSSProperties } from "react";
import type { GridCell } from "@/lib/diagram";
import { cx, step } from "./parts";

/** 칸 상태 클래스 — 정지 그림과 장면이 같이 쓴다. */
export function cellClass(c: GridCell): string {
  return cx("dg-gc", c.wall ? "is-wall" : c.text ? "is-full" : "is-empty", c.accent && "is-acc", c.muted && "is-mut");
}

export function GridBoard({ rows, axis, still }: { rows: GridCell[][]; axis: boolean; still?: boolean }) {
  const cols = rows[0]?.length ?? 0;
  return (
    <div className="dg-grid" style={{ "--cols": cols + (axis ? 1 : 0) } as CSSProperties}>
      {axis ? (
        <>
          <span className="dg-gx" />
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className="dg-gx">
              {c + 1}
            </span>
          ))}
        </>
      ) : null}
      {rows.map((row, r) => (
        <div key={r} className="contents">
          {axis ? <span className="dg-gx">{r + 1}</span> : null}
          {row.map((c, k) => (
            <span
              key={k}
              data-r={r}
              data-c={k}
              data-anim={still ? undefined : "rise"}
              className={cellClass(c)}
              style={still ? undefined : step(r)}
            >
              {c.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
