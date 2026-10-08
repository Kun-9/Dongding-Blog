/**
 * 그림 모션 — 그림 블록·```figure·본문 SVG 가 같이 쓰는 런타임(Motion).
 *
 * 그림 안의 `data-anim` 칸을 `--i` 차례로 묶고, 차례마다 첫 칸이 화면의 읽는 높이
 * (아래에서 4분의 1)를 넘어오거나 화면에 잠깐 머물면 한 번 재생한다. 그림이 화면 아래로
 * 막 들어올 때 끝나 버리면 눈이 닿기 전이라 아무도 못 본다. 이미 화면에 있거나 지나간
 * 칸은 그대로 둔다.
 *
 * `data-loop` 반복과 강조 칸 숨쉬기는 globals.css 가 그린다. 여기서는 그림이
 * 화면에 있을 때만 `data-live` 를 붙인다.
 *
 * 최종 상태는 서버가 그린 그대로다. 움직임 줄이기 설정이면 아무것도 안 한다.
 * 표준은 .claude/skills/blog-figures 의 "애니메이션".
 *
 * 브라우저 DOM 을 쓴다. 클라이언트에서만 부른다(components/prose/diagram/Motion).
 */
import { animate, inView, type DOMKeyframesDefinition } from "motion";
import { ANIMS, type Anim } from "./html-figure";

/** 읽는 높이 — 화면 아래 25% 를 뺀 곳에 들어오면 재생한다. */
const READ_LINE = "0px 0px -25% 0px";
/** 같이 걸린 차례 사이(초). */
const STAGGER = 0.09;
/** 읽는 높이에 못 미쳐도 화면에 이만큼(ms) 머물면 재생한다. */
const DWELL = 600;
/** 종류별 길이·지연(초). 1초 안에 끝나야 읽기를 막지 않는다. */
const TIMING: Record<Exclude<Anim, "none">, { d: number; delay: number }> = {
  rise: { d: 0.6, delay: 0 },
  fade: { d: 0.6, delay: 0 },
  pop: { d: 0.45, delay: 0.12 },
  draw: { d: 0.5, delay: 0 },
  "draw-back": { d: 0.5, delay: 0 },
  grow: { d: 0.8, delay: 0.1 },
  count: { d: 0.9, delay: 0.15 },
};
const EASE = [0.2, 0.7, 0.2, 1] as const;
const RISE = 16;
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

type Plan =
  | { el: Element; kind: Exclude<Anim, "none">; from: Record<string, string | number>; to: Record<string, string | number> }
  | { el: Element; kind: Exclude<Anim, "none">; count: { from: number; to: number; show: (v: number) => string } };

/** 한 칸이 어디서(from) 어디로(to) 움직이는가. */
function plan(el: Element, kind: Exclude<Anim, "none">): Plan {
  const svg = el instanceof SVGElement;
  // SVG 의 transform 속성은 CSS transform 이 덮어쓴다 — 자리가 튄다.
  const still = svg && el.hasAttribute("transform");
  const p = (from: Record<string, string | number>, to: Record<string, string | number>): Plan => ({ el, kind, from, to });
  const appear = p({ opacity: 0 }, { opacity: 1 });

  switch (kind) {
    case "rise":
      return still ? appear : p({ opacity: 0, transform: `translateY(${RISE}px)` }, { opacity: 1, transform: "translateY(0px)" });
    case "pop":
      return still ? appear : p({ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "scale(1)" });
    case "fade":
      return appear;
    case "draw":
    case "draw-back":
      if (svg) {
        // 점선은 경로 길이로 그리면 무늬가 깨진다 — 나타나기만. 그릴 때도 같이
        // 나타나게 해서 화살촉(marker)이 선보다 먼저 떠 있지 않게 한다.
        const line = el instanceof SVGGeometryElement && getComputedStyle(el).strokeDasharray === "none";
        return line ? p({ pathLength: 0, opacity: 0 }, { pathLength: 1, opacity: 1 }) : appear;
      }
      return p({ clipPath: clipFrom(el as HTMLElement, kind === "draw-back") }, { clipPath: CLIP_TO });
    case "grow":
      // fig-bar 는 회색 바탕은 두고 채움(::after)만 키운다.
      if (el.classList.contains("fig-bar")) return p({ "--fig-grow": 0 }, { "--fig-grow": 1 });
      return p({ clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: CLIP_TO });
    case "count": {
      // 글자를 통째로 바꾸므로 안에 다른 요소(<tspan> 등)가 있으면 세지 않는다.
      const c = el.childElementCount ? null : countable(el.textContent ?? "");
      if (!c) return appear;
      return { el, kind, count: { from: Number(el.getAttribute("data-from") ?? 0) || 0, ...c } };
    }
  }
}

/** 재생 전 자리. */
function hide(x: Plan) {
  if ("count" in x) x.el.textContent = x.count.show(x.count.from);
  else animate(x.el, x.from as DOMKeyframesDefinition, { duration: 0 });
}

function play(x: Plan, delay: number) {
  const t = { duration: TIMING[x.kind].d, delay: delay + TIMING[x.kind].delay, ease: EASE };
  if ("count" in x) {
    const { from, to, show } = x.count;
    animate(from, to, { ...t, onUpdate: (v) => (x.el.textContent = show(v)) });
    return;
  }
  const keyframes = Object.fromEntries(Object.keys(x.to).map((k) => [k, [x.from[k], x.to[k]]]));
  animate(x.el, keyframes as DOMKeyframesDefinition, t);
}

/**
 * 그림 하나에 모션을 붙인다. 돌려준 함수를 부르면 푼다. 움직인 흔적을
 * 되돌리지는 않는다 — 그림이 바뀌면 판을 새로 그린다(Motion.tsx).
 *
 * 순서: `--i`(같으면 함께, 소수 가능). 없으면 가장 가까운 움직이는 조상과
 * 함께, 그것도 없으면 문서 순서로 앞 칸 다음. 지금 화면 폭에서 안 보이는
 * 쌍둥이(넓은 화면용 고리 등)는 빼서 차례를 차지하지 않게 한다.
 */
export function attachFigureMotion(root: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const order = new Map<Element, number>();
  const slots = new Map<number, Plan[]>();
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
    slots.set(key, [...(slots.get(key) ?? []), plan(el, kind)]);
  }

  const stops: (() => void)[] = [];
  const vh = window.innerHeight;
  let lastStart = 0;
  // 같은 프레임에 걸린 차례는 모았다가 차례 순서로 튼다. 관찰 콜백 순서는 뒤섞여 온다.
  const pending: number[] = [];
  const flush = () => {
    const now = performance.now() / 1000;
    for (const key of pending.sort((a, b) => a - b)) {
      const start = Math.max(now, lastStart + STAGGER);
      lastStart = start;
      slots.get(key)!.forEach((x) => play(x, start - now));
    }
    pending.length = 0;
  };
  for (const key of [...slots.keys()].sort((a, b) => a - b)) {
    const plans = slots.get(key)!;
    const anchor = plans[0].el;
    const top = anchor.getBoundingClientRect().top;
    // 이미 화면에 있거나 지나간 칸은 그대로 둔다. 숨겼다 다시 보이면 깜빡인다.
    if (top < vh) continue;
    plans.forEach(hide);
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      offLine();
      offDwell();
      if (!pending.length) requestAnimationFrame(flush);
      pending.push(key);
    };
    // 읽는 높이를 넘거나, 화면 아래쪽에 멈춰 DWELL 만큼 머물면 재생한다. 앞의 것만
    // 걸면 스크롤을 멈춘 자리(화면 아래 4분의 1, 페이지 끝)에서 칸이 빈칸으로 남는다.
    const offLine = inView(anchor, fire, { margin: READ_LINE });
    const offDwell = inView(anchor, () => {
      const t = setTimeout(fire, DWELL);
      return () => clearTimeout(t);
    });
    stops.push(offLine, offDwell);
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
