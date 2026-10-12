// 아스키 트리 자동 인식 확인: npx tsx scripts/check-ascii-tree.ts
import assert from "node:assert/strict";
import { isAsciiTree, parseDiagram, type TreeNode } from "../src/lib/diagram";

const evalTree = `my-plugin/
├── .claude-plugin/plugin.json
├── skills/...
└── evals/
    ├── first-case/
    │   ├── prompt.md
    │   └── graders/
    │       ├── criteria.md
    │       └── skill-fired.md
    └── results/`;
const tmpTree = `tmp/
├── desktop-check/      — 첫 데스크톱 시안 4종
└── mobile-after/       — 모바일 보정 후`;

assert.ok(isAsciiTree("text", evalTree));
assert.ok(isAsciiTree("", tmpTree));
assert.ok(!isAsciiTree("bash", evalTree));
assert.ok(!isAsciiTree("text", "CASE  WITH\nfirst-case  1.00"));
assert.ok(!isAsciiTree("text", "a/\n├── b\nnot tree line"));

const shape = (ns: TreeNode[]): unknown => ns.map((n) => [n.label, n.sub ?? "", shape(n.children)]);
const a = parseDiagram("tree", evalTree).diagram;
assert.ok(a?.kind === "tree");
assert.deepEqual(shape(a.roots), [["my-plugin/", "", [
  [".claude-plugin/plugin.json", "", []],
  ["skills/...", "", []],
  ["evals/", "", [
    ["first-case/", "", [["prompt.md", "", []], ["graders/", "", [["criteria.md", "", []], ["skill-fired.md", "", []]]]]],
    ["results/", "", []],
  ]],
]]]);
const b = parseDiagram("tree", tmpTree).diagram;
assert.ok(b?.kind === "tree");
assert.deepEqual(shape(b.roots), [["tmp/", "", [["desktop-check/", "첫 데스크톱 시안 4종", []], ["mobile-after/", "모바일 보정 후", []]]]]);
console.log("ok");
