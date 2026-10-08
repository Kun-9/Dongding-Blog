/**
 * 그림 모션 — 그림 블록·```figure·본문 SVG 가 같이 쓰는 런타임(Motion).
 *
 * 그림 안의 `data-anim` 칸을 `--i` 순서대로 한 시퀀스로 묶고, 그 진행을
 * 그림이 화면 아래에서 들어오는 스크롤에 묶는다. 그림이 화면에 다 들어오면
 * 완성, 올리면 되감긴다. ViewTimeline 이 있는 브라우저는 네이티브로 돌고,
 * 없으면(Firefox) Motion 이 스크롤마다 JS 로 맞춘다.
 *
 * `data-loop` 반복과 강조 칸 숨쉬기는 globals.css 가 그린다. 여기서는 그림이
 * 화면에 있을 때만 `data-live` 를 붙인다.
 *
 * 최종 상태는 서버가 그린 그대로다. 움직임 줄이기 설정이면 아무것도 안 한다.
 * 표준은 .claude/skills/blog-figures 의 "애니메이션".
 *
 * 브라우저 DOM 을 쓴다. 클라이언트에서만 부른다(components/prose/diagram/Motion).
 */
import { animate, inView, scroll, type AnimationSequence } from "motion";
import { ANIMS, type Anim } from "./html-figure";

/** 순서 한 칸 사이 간격과 종류별 길이·지연(초). 스크롤에 묶이면 비율만 남는다. */
const GAP = 0.22;
const TIMING: Record<Exclude<Anim, "none">, { d: number; delay: number }> = {
  rise: { d: 0.5, delay: 0 },
  fade: { d: 0.5, delay: 0 },
  pop: { d: 0.35, delay: 0.15 },
  draw: { d: 0.45, delay: 0 },
  "draw-back": { d: 0.45, delay: 0 },
  grow: { d: 0.6, delay: 0.1 },
  count: { d: 0.7, delay: 0.15 },
};
const EASE = [0.2, 0.7, 0.2, 1] as const;
// 끝값은 항등 변환으로 적는다. Motion 은 "none" 을 상대 값의 0 으로 바꿔서
// scale(0.6) → none 이 scale(0) 으로 끝난다.

/** figure 키트 클래스의 기본 모션. `data-anim` 이 있으면 그게 이긴다. */
const KIT: [string, Anim][] = [
  [".fig-box, tr", "rise"],
  [".fig-arrow", "draw"],
  [".fig-bar", "grow"],
  [".fig-num, .fig-ok, .fig-no, .fig-part, .fig-dot, .fig-chip", "pop"],
  [".fig-big", "count"],
];
const KIT_SELECTOR = KIT.flatMap(([s]) => s.split(",").map((x) => `.fig-html ${x.trim()}`)).join(", ");

function kindOf(el: Element): Anim | null {
  const a = el.getAttribute("data-anim");
  if (a) return (ANIMS as readonly string[]).includes(a) ? (a as Anim) : null;
  return KIT.find(([s]) => el.matches(s))?.[1] ?? null;
}

/**
 * "86%"·"1.2s"·"2,400건"·"-12%" 처럼 숫자가 하나인 글자만 센다. "v2.1.283" 이나
 * 다시 쓰면 모양이 달라지는 "007" 은 안 센다 — 다 센 글자가 원문과 같아야 한다.
 */
const COUNTABLE = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/;

function countable(text: string) {
  const m = text.trim().match(COUNTABLE);
  if (!m) return null;
  const decimals = m[2].split(".")[1]?.length ?? 0;
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[2].includes(","),
  });
  const to = Number(m[2].replace(/,/g, ""));
  const show = (v: number) => `${m[1]}${fmt.format(v)}${m[3]}`;
  return show(to) === text.trim() ? { to, show } : null;
}

/**
 * 선은 긴 쪽 방향으로 그린다(↓ 화살표는 세로). back 이면 오른쪽(아래)에서 시작.
 * ponytail: 방향은 붙일 때 한 번 잰다 — 브레이크포인트를 넘으면 옛 방향으로 그려진다(완성 모양은 같다).
 */
function clipFrom(el: HTMLElement, back: boolean) {
  const across = !el.classList.contains("fig-down") && el.offsetWidth >= el.offsetHeight;
  if (across) return back ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
  return back ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";
}
const CLIP_TO = "inset(0% 0% 0% 0%)";

/** 한 칸의 시퀀스 조각. */
function segment(el: Element, kind: Exclude<Anim, "none">, at: number): AnimationSequence {
  const t = { at: at + TIMING[kind].delay, duration: TIMING[kind].d, ease: EASE };
  const svg = el instanceof SVGElement;
  // SVG 의 transform 속성은 CSS transform 이 덮어쓴다 — 자리가 튄다.
  const still = svg && el.hasAttribute("transform");

  switch (kind) {
    case "rise":
      if (still) return [[el, { opacity: [0, 1] }, t]];
      return [[el, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] }, t]];
    case "pop":
      if (still) return [[el, { opacity: [0, 1] }, t]];
      return [[el, { opacity: [0, 1], transform: ["scale(0.6)", "scale(1)"] }, t]];
    case "fade":
      return [[el, { opacity: [0, 1] }, t]];
    case "draw":
    case "draw-back":
      if (svg) {
        // 점선은 경로 길이로 그리면 무늬가 깨진다 — 나타나기만. 그릴 때도 같이
        // 나타나게 해서 화살촉(marker)이 선보다 먼저 떠 있지 않게 한다.
        const line = el instanceof SVGGeometryElement && getComputedStyle(el).strokeDasharray === "none";
        return [[el, line ? { pathLength: [0, 1], opacity: [0, 1] } : { opacity: [0, 1] }, t]];
      }
      return [[el, { clipPath: [clipFrom(el as HTMLElement, kind === "draw-back"), CLIP_TO] }, t]];
    case "grow":
      // fig-bar 는 회색 바탕은 두고 채움(::after)만 키운다.
      if (el.classList.contains("fig-bar")) return [[el, { "--fig-grow": [0, 1] }, t]];
      return [[el, { clipPath: ["inset(0% 100% 0% 0%)", CLIP_TO] }, t]];
    case "count": {
      // 글자를 통째로 바꾸므로 안에 다른 요소(<tspan> 등)가 있으면 세지 않는다.
      const c = el.childElementCount ? null : countable(el.textContent ?? "");
      if (!c) return [[el, { opacity: [0, 1] }, t]];
      const from = Number(el.getAttribute("data-from") ?? 0) || 0;
      return [[(v: number) => (el.textContent = c.show(v)), [from, c.to], t]];
    }
  }
}

/**
 * 그림 하나를 스크롤에 묶는다. 돌려준 함수를 부르면 푼다. 움직인 흔적을
 * 되돌리지는 않는다 — 그림이 바뀌면 판을 새로 그린다(Motion.tsx).
 *
 * 순서: `--i`(같으면 함께, 소수 가능). 없으면 가장 가까운 움직이는 조상과
 * 함께, 그것도 없으면 문서 순서로 앞 칸 다음. 지금 화면 폭에서 안 보이는
 * 쌍둥이(넓은 화면용 고리 등)는 빼서 차례를 차지하지 않게 한다.
 */
export function attachFigureMotion(root: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const order = new Map<Element, number>();
  const items: { el: Element; kind: Exclude<Anim, "none"> }[] = [];
  let last = -1;
  for (const el of root.querySelectorAll(`[data-anim], ${KIT_SELECTOR}`)) {
    const kind = kindOf(el);
    if (!kind || kind === "none" || !el.getClientRects().length) continue;
    const own = parseFloat((el as HTMLElement | SVGElement).style.getPropertyValue("--i"));
    let key = own;
    if (Number.isNaN(key)) {
      let up = el.parentElement;
      while (up && up !== root && !order.has(up)) up = up.parentElement;
      key = up && order.has(up) ? order.get(up)! : last + 1;
    }
    order.set(el, key);
    last = Math.max(last, key);
    items.push({ el, kind });
  }

  const stops: (() => void)[] = [];

  if (items.length) {
    const slots = [...new Set(order.values())].sort((a, b) => a - b);
    const sequence = items.flatMap(({ el, kind }) => segment(el, kind, slots.indexOf(order.get(el)!) * GAP));
    // 그림 위쪽이 화면 아래에 닿을 때 시작, 그림 아래쪽까지 들어오면 끝.
    stops.push(scroll(animate(sequence), { target: root, offset: ["start end", "end end"] }));
  }

  if (root.querySelector("[data-loop], .dg-accent, .fig-box.fig-accent")) {
    stops.push(
      inView(
        root,
        () => {
          root.setAttribute("data-live", "");
          return () => root.removeAttribute("data-live");
        },
        { amount: 0.2 },
      ),
      () => root.removeAttribute("data-live"),
    );
  }

  return () => stops.forEach((s) => s());
}
