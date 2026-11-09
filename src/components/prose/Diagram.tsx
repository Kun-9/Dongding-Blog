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
import type { CSSProperties } from "react";
import type { Diagram as DiagramData } from "@/lib/diagram";
import { keepHyphens, type FigureHtml } from "@/lib/html-figure";
import type { LegendKey, SvgFigure as SvgFigureData } from "@/lib/svg-figure";
import { Compare, Matrix } from "./diagram/Compare";
import { Cycle, Flow } from "./diagram/Flow";
import { Bars, Stats } from "./diagram/Numbers";
import { Shell } from "./diagram/parts";
import { GridBoard } from "./diagram/Grid";
import { BarsScene, FigureScene, GridScene, SpotScene, TimelineScene } from "./diagram/Scene";
import { spotPlan } from "@/lib/diagram";
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
      return <Bars items={d.items} unit={d.unit} limit={d.limit} />;
    case "grid":
      return <GridBoard rows={d.rows} axis={d.axis} />;
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
/**
 * 한 번에 읽는 그림은 칸을 차례로 띄우지 않는다. 스크롤 중에 빈 줄이 보였다(2026-11-05,
 * hook 글 matrix 다섯 줄 중 둘이 빈 칸으로 찍힘). 순서가 내용인 flow·sequence·bars 는 그대로.
 */
const STILL = new Set<DiagramData["kind"]>(["compare", "matrix", "stats", "layers", "tree"]);

export function Diagram({ diagram }: { diagram: DiagramData }) {
  const sig = sigOf(JSON.stringify(diagram));
  // 장면은 자기 무대를 그린다. 내용이 바뀌면(스튜디오) key 로 새로 그려 진행 상태를 버린다.
  if (diagram.scene) {
    if (diagram.kind === "timeline") return <TimelineScene key={sig} caption={diagram.caption} points={diagram.points} />;
    if (diagram.kind === "bars" && diagram.barScene) return <BarsScene key={sig} caption={diagram.caption} unit={diagram.unit} scene={diagram.barScene} />;
    if (diagram.kind === "grid" && diagram.steps) return <GridScene key={sig} caption={diagram.caption} axis={diagram.axis} steps={diagram.steps} />;
    const { notes, cellStep } = spotPlan(diagram);
    return (
      <SpotScene key={sig} caption={diagram.caption} notes={notes} cellStep={cellStep}>
        <Body d={diagram} />
      </SpotScene>
    );
  }
  return (
    <Shell caption={diagram.caption} bare={BARE.has(diagram.kind)} still={STILL.has(diagram.kind)} sig={sig}>
      <Body d={diagram} />
    </Shell>
  );
}

/** ```figure — 이미 거른 HTML 이다(parseFigureHtml). 하이픈 토큰은 여기서 칸으로 감싼다(keepHyphens). */
export function HtmlFigure({ figure }: { figure: FigureHtml }) {
  const html = keepHyphens(figure.html);
  if (figure.scene) return <FigureScene key={sigOf(figure.html)} caption={figure.caption} html={html} steps={figure.scene.steps} />;
  return (
    <Shell caption={figure.caption} sig={sigOf(figure.html)}>
      <div className="fig-html" dangerouslySetInnerHTML={{ __html: html }} />
    </Shell>
  );
}

/** 범례 글리프 — 선 색·점선·표시. svg.css 의 같은 클래스로 칠한다. */
function LegendGlyph({ k }: { k: LegendKey }) {
  if (k === "x" || k === "ok")
    return (
      <svg viewBox="-12 -7 24 14" aria-hidden="true">
        <g className={k === "x" ? "mark-x" : "mark-ok"}>
          <circle cx="0" cy="0" r="6.5" />
          <path d={k === "x" ? "M-2.6 -2.6L2.6 2.6M2.6 -2.6L-2.6 2.6" : "M-3 0.2L-1 2.2L3 -2"} />
        </g>
      </svg>
    );
  if (k === "dash")
    return (
      <svg viewBox="0 0 24 14" aria-hidden="true">
        <rect className="soft dash" x="2" y="2" width="20" height="10" rx="3" />
      </svg>
    );
  if (k === "dot")
    return (
      <svg viewBox="0 0 24 14" aria-hidden="true">
        <circle className="dot" cx="12" cy="7" r="4" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 14" aria-hidden="true">
      <line className={`edge ${k}`} x1="1" y1="7" x2="23" y2="7" />
    </svg>
  );
}

/**
 * ```svg — 이미 거른 판들이다(parseSvgFigure). 화살촉 id 는 그림마다 지문으로 가른다: 다른 그림이 접힌 칸
 * 안에 숨어 있으면 그쪽 정의를 집은 화살촉이 사라진다. 판 폭의 1.15배까지만 키워 글자가 커지지 않게 한다.
 */
export function SvgFigure({ figure }: { figure: SvgFigureData }) {
  const sig = sigOf(figure.panels.map((p) => p.html).join(""));
  const id = `svgf-${sig.replace(/-/g, "m")}`;
  const wide = figure.panels.some((p) => p.only === "wide");
  const pw = Math.round(Math.max(...figure.panels.filter((p) => p.only !== "wide").map((p) => p.width)) * 0.92);
  return (
    <Shell caption={figure.caption} still sig={sig}>
      <div className="svgf">
        {figure.title ? <p className="svgf-title">{figure.title}</p> : null}
        <div className="svgf-panels" data-wide={wide ? "" : undefined} style={{ "--pw": `${pw}px` } as CSSProperties}>
          {figure.panels.map((p, i) => (
            <div
              key={i}
              className="svgf-panel"
              data-only={p.only}
              style={{ maxWidth: Math.round(p.width * 1.15) }}
              dangerouslySetInnerHTML={{ __html: p.html.replace(/(marker-(?:start|mid|end)="url\(#)@/g, `$1${id}-`) }}
            />
          ))}
        </div>
        {figure.legend.length ? (
          <div className="svgf-legend">
            {figure.legend.map((l, i) => (
              <span key={i}>
                <LegendGlyph k={l.key} />
                {l.label}
              </span>
            ))}
          </div>
        ) : null}
        <svg className="svgf-defs" aria-hidden="true" focusable="false">
          <defs>
            {(["a", "a-bad", "a-good", "a-muted"] as const).map((m) => (
              <marker key={m} id={`${id}-${m}`} className={m} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" />
              </marker>
            ))}
          </defs>
        </svg>
      </div>
    </Shell>
  );
}
