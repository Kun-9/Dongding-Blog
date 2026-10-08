import { appear } from "./keyframes";
import type { AnimModule } from "./types";

/** 자리마다 늦게 출발하는 간격(초)과 끝 곡선. 띠 한 칸 높이는 roll.css 의 .dg-roll 과 같다. */
const STAGGER = 0.09;
const EASE = [0.16, 0.84, 0.24, 1] as const;
const CELL_EM = 1.1;

/** 숫자 자리마다 0~9 띠를 두 벌 이어 붙인다. 화면 낭독기에는 숨긴 원문을 준다. */
function strips(el: Element, text: string) {
  const sr = document.createElement("span");
  sr.className = "dg-roll-sr";
  sr.textContent = text;
  el.replaceChildren(
    sr,
    ...[...text].map((ch) => {
      const cell = document.createElement("span");
      cell.setAttribute("aria-hidden", "true");
      if (!/\d/.test(ch)) {
        cell.textContent = ch;
        return cell;
      }
      cell.className = "dg-roll";
      cell.dataset.d = ch;
      const band = document.createElement("span");
      for (const x of "01234567890123456789") {
        const c = document.createElement("span");
        c.textContent = x;
        band.append(c);
      }
      cell.append(band);
      return cell;
    }),
  );
}

/** 숫자 자리마다 굴러서 멈춘다 — 핵심 숫자 카드에만. */
export const roll: AnimModule = {
  name: "roll",
  timing: { d: 1.5, delay: 0 },
  doc: {
    motion: "숫자 자리마다 0~9 띠가 두 바퀴 돌아 제 숫자에 멈춤(1.5초, 자리마다 0.09초씩 늦게). 다 돌면 원래 글자로 돌아간다",
    use: "글의 핵심 숫자 카드. stats 값이 쓴다. 남용하지 않는다",
  },
  prepare(el, rt, t) {
    // 안에 다른 요소가 없고 숫자가 있는 HTML 글자만. 나머지는 나타나기만 한다.
    const text = el.textContent ?? "";
    if (el instanceof SVGElement || el.childElementCount || !/\d/.test(text)) return appear(el, rt, t);
    return {
      el,
      hide: () => strips(el, text),
      play(delay) {
        // 두 바퀴째의 제 숫자에서 멈추고, 다 돌거나 취소되면 원래 글자로 되돌린다.
        const runs = [...el.querySelectorAll<HTMLElement>(".dg-roll")].map((cell, i) =>
          rt.animate(
            cell.firstElementChild!,
            { transform: ["translateY(0em)", `translateY(${-(10 + Number(cell.dataset.d)) * CELL_EM}em)`] },
            { duration: t.d, delay: delay + t.delay + i * STAGGER, ease: EASE },
          ),
        );
        Promise.all(runs.map((r) => r.finished))
          .catch(() => {})
          .finally(() => (el.textContent = text));
      },
    };
  },
};
