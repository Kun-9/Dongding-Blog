import type { SceneAttr } from "./types";

export const SPOT_NAME = "[a-z][a-z0-9-]{0,19}";
const VALID = new RegExp(`^${SPOT_NAME}$`);

/** 자리 이름 — `data-at` 이 떠 있는 요소를 이 자리 한가운데로 옮긴다. 자리 자체는 움직이지 않는다. */
export const spot: SceneAttr = {
  name: "data-spot",
  valid: (v) => VALID.test(v),
  fits: () => true,
  apply() {},
  doc: { example: 'data-spot="server"', meaning: "자리 이름. `data-at` 이 요소를 이 자리 한가운데로 옮긴다. 자리에는 높이를 준다(떠 있는 요소는 자리를 차지하지 않는다)" },
};
