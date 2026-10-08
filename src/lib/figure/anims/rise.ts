import { appear, fromTo, still } from "./keyframes";
import type { AnimModule } from "./types";

/** 아래에서 올라오며 나타남 — 칸·카드·행의 기본. */
export const rise: AnimModule = {
  name: "rise",
  timing: { d: 0.6, delay: 0 },
  doc: { motion: "16px 아래에서 올라오며 나타남", use: "칸·카드·행. 기본" },
  prepare: (el, rt, t) =>
    still(el) ? appear(el, rt, t) : fromTo(el, rt, t, { opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0px)" }),
};
