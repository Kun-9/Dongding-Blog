"use client";

/**
 * ```embed — 실제로 작동하는 HTML 을 글 안에서 돌린다. 문법은 `lib/embed.ts`.
 *
 * HTML 을 받아 srcdoc 으로 넣고 sandbox 는 allow-scripts 만 연다. allow-same-origin 이 없으니 안쪽은
 * 불투명 출처라 블로그의 쿠키·저장소·DOM 에 닿지 못한다. 그래서 부모도 안쪽 높이를 읽지 못해,
 * 끝에 붙인 스크립트가 자기 높이를 postMessage 로 알린다.
 */
import { useEffect, useId, useRef, useState } from "react";
import { EMBED_MAX_H, EMBED_MIN_H, type EmbedBlock, type EmbedItem } from "@/lib/embed";
import { TabBar, tabPanelClass } from "./Figure";

/** 높이를 받기 전 자리. 안쪽이 `html { height: 100% }` 면 이 높이에 머무니 그때는 height 를 적는다. */
const START_H = 420;

// 판이 커진 만큼(innerHeight 증가분) 그대로 따라 커진 높이는 알리지 않는다. body 가 min-height:100vh 에
// margin·padding 을 얹은 위젯은 알릴 때마다 그만큼 다시 커져 상한까지 늘어났다(2026-10-13 리뷰에서 재현).
const REPORT_HEIGHT = `<script>(()=>{const d=document.documentElement;let H=0,W=innerHeight;const s=()=>{const w=innerHeight,h=Math.ceil(Math.max(d.getBoundingClientRect().height,document.body?document.body.scrollHeight:0)),follow=w!==W&&h-H===w-W;W=w;if(h===H)return;H=h;if(!follow)parent.postMessage({embedHeight:h},"*")};new ResizeObserver(s).observe(d);addEventListener("load",s)})()</script>`;

// 판 안에서는 스크롤하지 않는다. 높이는 내용에 맞추니 넘칠 일이 없고, 휠·터치는 글 쪽으로 넘어간다.
// height 를 적었는데 내용이 더 길면 아래가 잘린다(2026-10-13 "임베딩된 html 은 내부 스크롤 안 되게").
const NO_SCROLL = `<style>html,body{overflow:hidden!important}</style>`;

/** 원문 끝에 붙이면 닫히지 않은 주석·textarea 안에 갇힐 수 있어 <head> 바로 뒤에 넣는다. doctype 앞은 quirks 모드라 피한다. */
function withFrameHead(html: string): string {
  const inject = NO_SCROLL + REPORT_HEIGHT;
  const head = html.match(/<head\b[^>]*>/i);
  if (!head || head.index === undefined) return html + inject;
  const at = head.index + head[0].length;
  return html.slice(0, at) + inject + html.slice(at);
}

function fileNameOf(src: string): string {
  return src.split("/").pop() || src;
}

function EmbedFrame({ item, title, height }: { item: EmbedItem; title: string; height?: number }) {
  const [doc, setDoc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [auto, setAuto] = useState(START_H);
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(item.src)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((text) => alive && setDoc(withFrameHead(text)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [item.src]);

  useEffect(() => {
    if (height) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const h = Math.ceil(Number(e.data?.embedHeight));
      if (h > 0) setAuto(Math.min(Math.max(h, EMBED_MIN_H), EMBED_MAX_H));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [height]);

  const h = height ?? auto;
  if (failed) {
    return (
      <span
        className="flex w-full items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-alt font-mono text-[11px] text-ink-muted"
        style={{ height: h }}
      >
        {fileNameOf(item.src)}
      </span>
    );
  }
  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={doc ?? undefined}
      // allow-forms 가 없으면 submit 이벤트부터 뜨지 않아 Enter 로 도는 위젯이 먹통이다. 제출해도 이 판 안에서만 움직인다.
      sandbox="allow-scripts allow-forms"
      referrerPolicy="no-referrer"
      className="block w-full rounded-lg border border-border-token bg-surface-alt"
      // h 는 안쪽 문서 높이라 위아래 테두리 2px 를 더한다. 빼면 판이 2px 모자라 안이 스크롤됐다.
      style={{ height: h + 2 }}
    />
  );
}

export function Embed({ embed }: { embed: EmbedBlock }) {
  const [on, setOn] = useState(0);
  const id = useId();
  const { items, caption, height } = embed;
  const titleOf = (it: EmbedItem) => it.label || caption || fileNameOf(it.src);

  return (
    <figure className="my-[26px]">
      {items.length > 1 && <TabBar id={id} labels={items.map((it) => it.label)} on={on} onPick={setOn} />}
      <div className="grid">
        {items.map((it, idx) =>
          items.length > 1 ? (
            <div
              key={`${idx}-${it.src}`}
              role="tabpanel"
              id={`${id}-p${idx}`}
              aria-labelledby={`${id}-t${idx}`}
              className={tabPanelClass(idx === on)}
            >
              <EmbedFrame item={it} title={titleOf(it)} height={height} />
            </div>
          ) : (
            <EmbedFrame key={`${idx}-${it.src}`} item={it} title={titleOf(it)} height={height} />
          ),
        )}
      </div>
      {caption ? (
        <figcaption className="mt-[9px] font-sans text-[12.5px] leading-[1.5] tracking-[-0.005em] text-ink-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
