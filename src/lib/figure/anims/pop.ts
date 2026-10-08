import { appear, fromTo, still } from "./keyframes";
import type { AnimModule } from "./types";

/** 작게 시작해 커지며 나타남 — 점·배지·체크·칩·화살촉. */
export const pop: AnimModule = {
  name: "pop",
  timing: { d: 0.45, delay: 0.12 },
  doc: { motion: "0.6배에서 커지며 나타남", use: "점·번호 배지·체크·칩·화살촉" },
  prepare: (el, rt, t) =>
    still(el) ? appear(el, rt, t) : fromTo(el, rt, t, { opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "scale(1)" }),
};
