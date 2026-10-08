import { fromTo } from "./keyframes";
import type { AnimModule } from "./types";

/** 왼쪽에서 자람 — 막대. fig-bar 는 회색 바탕은 두고 채움(::after)만 키운다. */
export const grow: AnimModule = {
  name: "grow",
  timing: { d: 0.8, delay: 0.1 },
  doc: { motion: "왼쪽에서 자람", use: "막대" },
  prepare: (el, rt, t) =>
    el.classList.contains("fig-bar")
      ? fromTo(el, rt, t, { "--fig-grow": 0 }, { "--fig-grow": 1 })
      : fromTo(el, rt, t, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }),
};
