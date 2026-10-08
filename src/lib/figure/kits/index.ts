/**
 * figure 디자인 키트 목록. 새 키트는 kits/<이름>.ts·.css 를 만들고 여기와 ../figure.css 에 넣는다.
 * 순수 데이터 — 서버·점검기·런타임이 같이 읽는다.
 */
import { box } from "./box";
import { layer } from "./layer";
import { layout } from "./layout";
import { piece } from "./piece";
import { term } from "./term";
import { text } from "./text";
import type { Kit } from "./types";

export type { Kit } from "./types";

// 순서가 기본 모션의 우선순위다(먼저 맞는 선택자가 이긴다).
export const KITS: Kit[] = [layout, box, piece, text, layer, term];

/** 키트 클래스의 기본 등장 모션 — [선택자, 모션 이름]. 먼저 맞는 것이 이긴다. */
export const kitMotion = (): [string, string][] => KITS.flatMap((k) => k.motion ?? []);

/** 화면에 있을 때 반복을 켜야 하는 키트 선택자. */
export const kitLive = (): string[] => KITS.flatMap((k) => k.live ?? []);
