import { appear } from "./keyframes";
import type { AnimModule } from "./types";

/** 제자리에서 나타남 — 다른 것을 감싸는 상자·점선·배경. */
export const fade: AnimModule = {
  name: "fade",
  timing: { d: 0.6, delay: 0 },
  doc: { motion: "제자리에서 나타남", use: "다른 것을 감싸는 상자, 점선, 배경" },
  prepare: appear,
};
