/**
 * 그림 블록 — 코드 펜스 언어가 그림 종류(lib/diagram.ts)면 그림으로,
 * ```figure 면 디자인 키트 HTML(lib/html-figure.ts)로 그린다.
 *
 * 좌표 대신 HTML 로 그려서 글자가 넘치지 않고, 좁은 화면에서는 접히고,
 * 색은 블로그 테마 변수를 따라간다. 칸마다 `data-anim` 을 달아 두면 판
 * (Shell)이 스크롤에 맞춰 움직인다(lib/figure-motion). JS 가 없으면 그냥 보인다.
 *
 * 그림 자체에는 훅이 없어서 서버·클라이언트(스튜디오 미리보기) 어디서나 그려진다.
 */
import type { Diagram as DiagramData } from "@/lib/diagram";
import type { FigureHtml } from "@/lib/html-figure";
import { Compare, Matrix } from "./diagram/Compare";
import { Cycle, Flow } from "./diagram/Flow";
import { Bars, Stats } from "./diagram/Numbers";
import { Shell } from "./diagram/parts";
import { BarsScene, TimelineScene } from "./diagram/Scene";
import { Layers, Tree } from "./diagram/Structure";
import { Sequence, Timeline } from "./diagram/Timeline";

function Body({ d }: { d: DiagramData }) {
  switch (d.kind) {
    case "flow":
      return <Flow nodes={d.nodes} />;
    case "cycle":
      return <Cycle nodes={d.nodes} center={d.center} />;
    case "compare":
      return <Compare columns={d.columns} rows={d.rows} />;
    case "matrix":
      return <Matrix columns={d.columns} rows={d.rows} />;
    case "timeline":
      return <Timeline points={d.points} />;
    case "sequence":
      return <Sequence actors={d.actors} messages={d.messages} />;
    case "layers":
      return <Layers items={d.items} layout={d.layout} />;
    case "tree":
      return <Tree roots={d.roots} />;
    case "stats":
      return <Stats items={d.items} />;
    case "bars":
      return <Bars items={d.items} unit={d.unit} />;
  }
}

/** 그림 내용의 짧은 지문. 내용을 통째로 넘기면 페이지 데이터에 한 번 더 실린다. */
function sigOf(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

/** 자체 테두리가 있는 표 모양은 판 없이 둔다 — 상자 안의 상자가 된다. */
const BARE = new Set<DiagramData["kind"]>(["compare", "matrix"]);

export function Diagram({ diagram }: { diagram: DiagramData }) {
  const sig = sigOf(JSON.stringify(diagram));
  // 장면은 자기 무대를 그린다. 내용이 바뀌면(스튜디오) key 로 새로 그려 진행 상태를 버린다.
  if (diagram.kind === "timeline" && diagram.scene) return <TimelineScene key={sig} caption={diagram.caption} points={diagram.points} />;
  if (diagram.kind === "bars" && diagram.scene) return <BarsScene key={sig} caption={diagram.caption} unit={diagram.unit} scene={diagram.scene} />;
  return (
    <Shell caption={diagram.caption} bare={BARE.has(diagram.kind)} sig={sig}>
      <Body d={diagram} />
    </Shell>
  );
}

/** ```figure — 이미 거른 HTML 이다(parseFigureHtml). */
export function HtmlFigure({ figure }: { figure: FigureHtml }) {
  return (
    <Shell caption={figure.caption} sig={sigOf(figure.html)}>
      <div className="fig-html" dangerouslySetInnerHTML={{ __html: figure.html }} />
    </Shell>
  );
}
