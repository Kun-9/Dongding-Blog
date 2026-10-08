import type { Kit } from "./types";

export const layer: Kit = {
  name: "layer",
  label: "겹치기",
  use: "장면에서 단계마다 바뀌는 화면을 한 칸에 겹쳐 둔다. 높이는 가장 큰 화면이 정해 흔들리지 않는다",
  classes: [["fig-layer", "자식이 한 칸에 겹친다"]],
};
