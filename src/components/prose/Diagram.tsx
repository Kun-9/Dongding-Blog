/**
 * 그림 블록 — 코드 펜스 언어가 그림 종류(lib/diagram.ts)면 그림으로,
 * ```figure 면 디자인 키트 HTML(lib/html-figure.ts)로 그린다.
 *
 * 좌표 대신 HTML 로 그려서 글자가 넘치지 않고, 좁은 화면에서는 접히고,
 * 색은 블로그 테마 변수를 따라간다. 등장 애니메이션은 스크롤 타임라인을
 * 지원하는 브라우저에서만(`.dg-step`, globals.css) — 아니면 그냥 보인다.
 *
 * 훅이 없어서 서버·클라이언트(스튜디오 미리보기) 어디서나 그려진다.
 */
import type { Diagram as DiagramData } from "@/lib/diagram";
import type { FigureHtml } from "@/lib/html-figure";
import { Compare, Matrix } from "./diagram/Compare";
import { Cycle, Flow } from "./diagram/Flow";
import { Bars, Stats } from "./diagram/Numbers";
import { Shell } from "./diagram/parts";
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

/** 자체 테두리가 있는 표 모양은 판 없이 둔다 — 상자 안의 상자가 된다. */
const BARE = new Set<DiagramData["kind"]>(["compare", "matrix"]);

export function Diagram({ diagram }: { diagram: DiagramData }) {
  return (
    <Shell caption={diagram.caption} bare={BARE.has(diagram.kind)}>
      <Body d={diagram} />
    </Shell>
  );
}

/** ```figure — 이미 거른 HTML 이다(parseFigureHtml). */
export function HtmlFigure({ figure }: { figure: FigureHtml }) {
  return (
    <Shell caption={figure.caption}>
      <div className="fig-html" dangerouslySetInnerHTML={{ __html: figure.html }} />
    </Shell>
  );
}
