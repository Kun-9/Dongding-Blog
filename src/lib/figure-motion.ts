/**
 * 그림 모션 — 그림 블록·```figure·본문 SVG 가 같이 쓰는 런타임(Motion).
 *
 * 그림 안의 `data-anim` 칸을 `--i` 차례로 묶고, 차례마다 첫 칸이 화면의 읽는 높이
 * (아래에서 4분의 1)를 넘어오거나 화면에 잠깐 머물면 한 번 재생한다. 그림이 화면 아래로
 * 막 들어올 때 끝나 버리면 눈이 닿기 전이라 아무도 못 본다. 이미 화면에 있거나 지나간
 * 칸은 그대로 둔다.
 *
 * 무엇이 어떻게 움직이는지는 모션 모듈(lib/figure/anims)이, 키트 클래스의 기본 모션과
 * 반복을 켤 자리는 키트 모듈(lib/figure/kits)이 정한다. 여기는 차례를 매기고 언제 틀지만 정한다.
 *
 * `data-loop` 반복과 강조 칸 숨쉬기는 globals.css 가 그린다. 여기서는 그림이
 * 화면에 있을 때만 `data-live` 를 붙인다.
 *
 * 최종 상태는 서버가 그린 그대로다. 움직임 줄이기 설정이면 아무것도 안 한다.
 * 장면(scene: on)은 여기를 거치지 않는다(components/prose/diagram/Scene).
 * 표준은 .claude/skills/blog-figures 의 "애니메이션".
 *
 * 브라우저 DOM 을 쓴다. 클라이언트에서만 부른다(components/prose/diagram/Motion).
 */
import { animate, inView } from "motion";
import { animByName, type AnimModule, type Prepared } from "./figure/anims";
import { kitLive, kitMotion } from "./figure/kits";

/** 읽는 높이 — 화면 아래 25% 를 뺀 곳에 들어오면 재생한다. */
const READ_LINE = "0px 0px -25% 0px";
/** 같이 걸린 차례 사이(초). */
const STAGGER = 0.09;
/** 읽는 높이에 못 미쳐도 화면에 이만큼(ms) 머물면 재생한다. */
const DWELL = 600;

const RUNTIME = { animate };
/** 키트 클래스의 기본 모션. `data-anim` 이 있으면 그게 이긴다. */
const KIT = kitMotion();
const KIT_SELECTOR = KIT.flatMap(([s]) => s.split(",").map((x) => `.fig-html ${x.trim()}`)).join(", ");
const LIVE_SELECTOR = ["[data-loop]", ".dg-accent", ...kitLive()].join(", ");

function moduleOf(el: Element): AnimModule | null {
  const a = el.getAttribute("data-anim");
  if (a) return a === "none" ? null : (animByName(a) ?? null);
  const kit = KIT.find(([s]) => el.matches(s));
  return kit ? (animByName(kit[1]) ?? null) : null;
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
  const slots = new Map<number, Prepared[]>();
  let last = -1;
  for (const el of root.querySelectorAll(`[data-anim], ${KIT_SELECTOR}`)) {
    const mod = moduleOf(el);
    if (!mod || !el.getClientRects().length) continue;
    const own = parseFloat((el as HTMLElement | SVGElement).style.getPropertyValue("--i"));
    let key = own;
    if (Number.isNaN(key)) {
      let up = el.parentElement;
      while (up && up !== root && !order.has(up)) up = up.parentElement;
      key = up && order.has(up) ? order.get(up)! : last + 1;
    }
    order.set(el, key);
    last = Math.max(last, key);
    slots.set(key, [...(slots.get(key) ?? []), mod.prepare(el, RUNTIME, mod.timing)]);
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
      slots.get(key)!.forEach((x) => x.play(start - now));
    }
    pending.length = 0;
  };
  for (const key of [...slots.keys()].sort((a, b) => a - b)) {
    const plans = slots.get(key)!;
    const anchor = plans[0].el;
    const top = anchor.getBoundingClientRect().top;
    // 이미 화면에 있거나 지나간 칸은 그대로 둔다. 숨겼다 다시 보이면 깜빡인다.
    if (top < vh) continue;
    plans.forEach((x) => x.hide());
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

  if (root.querySelector(LIVE_SELECTOR)) {
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
