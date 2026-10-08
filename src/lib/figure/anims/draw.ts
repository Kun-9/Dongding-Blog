import { appear, fromTo } from "./keyframes";
import type { AnimModule } from "./types";

const CLIP_TO = "inset(0% 0% 0% 0%)";

/**
 * 선은 긴 쪽 방향으로 그린다(↓ 화살표는 세로). back 이면 오른쪽(아래)에서 시작.
 * ponytail: 방향은 붙일 때 한 번 잰다 — 브레이크포인트를 넘으면 옛 방향으로 그려진다(완성 모양은 같다).
 */
function clipFrom(el: HTMLElement, back: boolean) {
  const across = !el.classList.contains("fig-down") && el.offsetWidth >= el.offsetHeight;
  if (across) return back ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
  return back ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";
}

function drawing(name: string, back: boolean, doc: AnimModule["doc"]): AnimModule {
  return {
    name,
    timing: { d: 0.5, delay: 0 },
    doc,
    prepare(el, rt, t) {
      if (el instanceof SVGElement) {
        // 점선은 경로 길이로 그리면 무늬가 깨진다 — 나타나기만. 그릴 때도 같이
        // 나타나게 해서 화살촉(marker)이 선보다 먼저 떠 있지 않게 한다.
        const line = el instanceof SVGGeometryElement && getComputedStyle(el).strokeDasharray === "none";
        return line ? fromTo(el, rt, t, { pathLength: 0, opacity: 0 }, { pathLength: 1, opacity: 1 }) : appear(el, rt, t);
      }
      return fromTo(el, rt, t, { clipPath: clipFrom(el as HTMLElement, back) }, { clipPath: CLIP_TO });
    },
  };
}

export const draw = drawing("draw", false, {
  motion: "선이 그려짐. HTML 은 긴 쪽 방향(왼→오, 위→아래), SVG 는 경로를 따라",
  use: "연결선·화살표·타임라인 선",
});
export const drawBack = drawing("draw-back", true, { motion: "`draw` 의 반대 방향(오→왼, 아래→위)", use: "되돌아오는 메시지·응답" });
