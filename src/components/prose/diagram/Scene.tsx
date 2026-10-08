"use client";

/**
 * 장면 — `scene: on` 인 timeline·bars. 화면 높이 무대가 붙어 있고, 스크롤은 박자만 센다.
 * 박자가 바뀌면 그림은 0.8초 동안 다음 단계로 가서 멈춘다. 스크롤을 놓으면 박자 자리에
 * 맞춰 선다(html.sc-snap, scroll-snap proximity). 기준은 .claude/skills/blog-figures.
 *
 * 서버는 첫 단계가 다 된 모습을 그린다. 붙은 뒤 화면 밖이면 시작 전으로 바로 돌려 두고,
 * 들어오면 첫 단계로 움직인다. 움직임 줄이기 설정이면 단계만 바뀌고 움직이지 않는다.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { BarScene, TimelinePoint } from "@/lib/diagram";
import { cx } from "./parts";

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const TWEEN_MS = 800;

/** 설명 안의 **굵게**(형광펜)와 `코드` 만 살린다. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <b key={i}>{p.slice(2, -2)}</b>
        ) : p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** 값 묶음을 목표값까지 0.8초 동안 옮긴다. 도중에 목표가 바뀌면 지금 값에서 이어 간다. */
function useTween<T extends Record<string, number>>(initial: T, paint: (v: T) => void) {
  const state = useRef({ ...initial });
  const anim = useRef({ from: { ...initial }, to: { ...initial }, t0: 0, id: 0 });
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  });
  useEffect(() => () => cancelAnimationFrame(anim.current.id), []);
  return useCallback((next: T, instant: boolean) => {
    const a = anim.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    a.from = { ...state.current };
    a.to = { ...next };
    a.t0 = performance.now();
    const frame = (now: number) => {
      const t = instant || reduce ? 1 : clamp((now - a.t0) / TWEEN_MS);
      const e = easeOut(t);
      for (const k in a.to) (state.current as Record<string, number>)[k] = lerp(a.from[k], a.to[k], e);
      paintRef.current(state.current);
      a.id = t < 1 ? requestAnimationFrame(frame) : 0;
    };
    cancelAnimationFrame(a.id);
    a.id = requestAnimationFrame(frame);
  }, []);
}

/**
 * 스냅은 장면이 화면 가운데에 걸쳐 있을 때만 켠다. 늘 켜 두면 글을 열자마자, 또는 장면과
 * 먼 곳에서 스크롤을 멈췄을 때 장면 자리로 끌려간다.
 */
const nearScenes = new Set<Element>();
const syncSnap = () => document.documentElement.classList.toggle("sc-snap", nearScenes.size > 0);

/**
 * 무대와 박자. 단계 = round(무대가 붙은 뒤 스크롤한 거리 / 박자), 마지막 단계에서 멈춘다.
 * 박자 가운데서 넘어가므로 스냅 자리에서는 늘 다 바뀐 모습이다.
 */
function Stage({
  label,
  head,
  notes,
  onStep,
  children,
}: {
  label: string;
  head: ReactNode;
  notes: { k: string; text: string }[];
  onStep: (s: number, instant: boolean) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });
  const n = notes.length;

  useEffect(() => {
    const sec = ref.current;
    if (!sec) return;
    let k = Number.NaN;
    let raf = 0;
    const tick = (scrolled: boolean) => {
      raf = 0;
      const beat = (sec.querySelector(".sc-beat") as HTMLElement | null)?.offsetHeight || 1;
      const { top, bottom } = sec.getBoundingClientRect();
      const rel = -top;
      const first = Number.isNaN(k);
      const at = Math.max(0, Math.min(n - 1, Math.floor(rel / beat + 0.5)));
      // 시작 전(-1)은 화면 아래로 완전히 나갔을 때만. 다시 들어와 무대 위쪽이 화면 가운데에
      // 닿으면 첫 단계로 움직인다. 처음 붙을 때 이미 보이면 서버가 그린 첫 단계를 그대로 둔다.
      const s = top >= innerHeight ? -1 : k === -1 && top > innerHeight / 2 ? -1 : at;
      if (scrolled) {
        if (top < innerHeight / 2 && bottom > innerHeight / 2) nearScenes.add(sec);
        else nearScenes.delete(sec);
        syncSnap();
      }
      if (s !== k) {
        k = s;
        setStep(s);
        stepRef.current(s, first);
      }
      // 지금 칸의 막대: 다음 단계로 넘어가는 지점까지 얼마나 왔나. React 가 칸을 다시 그리기 전이라 번호로 찾는다.
      const bar = sec.querySelectorAll<HTMLElement>(".sc-pips span")[s];
      bar?.style.setProperty("--f", s < n - 1 ? clamp((rel - s * beat) / (beat / 2)).toFixed(3) : "1");
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(() => tick(true));
    };
    addEventListener("scroll", on, { passive: true, capture: true });
    addEventListener("resize", on);
    tick(false);
    return () => {
      removeEventListener("scroll", on, { capture: true });
      removeEventListener("resize", on);
      cancelAnimationFrame(raf);
      nearScenes.delete(sec);
      syncSnap();
    };
  }, [n]);

  return (
    <section ref={ref} className="sc">
      <div className="sc-stage">
        <div className="sc-in">
          <figure aria-label={label} className={cx("sc-board dg-panel", step >= 0 && "is-live")}>
            {head}
            {children}
          </figure>
          <div className="sc-notes">
            {notes.map((x, i) => (
              <div key={i} className={cx("sc-note", i === step && "on", i < step && "up")}>
                <span className="sc-k">{x.k}</span>
                <p>
                  <Inline text={x.text} />
                </p>
              </div>
            ))}
          </div>
          <div className="sc-pips" aria-hidden>
            {notes.map((_, i) => (
              <i key={i} className={cx(i === step && "on", i < step && "done")}>
                <span />
              </i>
            ))}
          </div>
        </div>
      </div>
      <div className="sc-beats" aria-hidden>
        {notes.map((_, i) => (
          <i key={i} className="sc-beat" />
        ))}
      </div>
    </section>
  );
}

/* ── timeline ─────────────────────────────────────────────────────────── */

/** 버전 슬라이드 하나의 자리. d = 지금 위치에서 몇 칸 떨어졌나. */
function slide(d: number) {
  const ad = Math.abs(d);
  return {
    transform: `translateX(calc(${d.toFixed(4)} * var(--sc-gap))) scale(${(1 - Math.min(ad, 1.5) * 0.18).toFixed(3)})`,
    opacity: clamp(1 - ad * 0.65).toFixed(3),
  };
}

export function TimelineScene({ caption, points }: { caption?: string; points: TimelinePoint[] }) {
  const n = points.length;
  const at = (i: number) => `${((i + 0.5) / n) * 100}%`;
  const its = useRef<(HTMLDivElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  const go = useTween({ pos: 0 }, ({ pos }) => {
    its.current.forEach((el, i) => {
      if (!el) return;
      const s = slide(i - pos);
      el.style.transform = s.transform;
      el.style.opacity = s.opacity;
      el.classList.toggle("cur", Math.abs(i - pos) < 0.5);
    });
    if (fill.current) fill.current.style.transform = `scaleX(${clamp(pos / (n - 1)).toFixed(4)})`;
    if (head.current) {
      head.current.style.left = `${((clamp(pos, 0, n - 1) + 0.5) / n) * 100}%`;
      head.current.style.opacity = clamp((pos + 0.6) / 0.6).toFixed(3);
    }
    rail.current?.querySelectorAll(".sc-d").forEach((d, i) => d.classList.toggle("on", pos >= i - 0.05));
    rail.current?.querySelectorAll(".sc-lb").forEach((l, i) => l.classList.toggle("on", Math.abs(pos - i) < 0.5));
  });

  return (
    <Stage
      label={caption ?? points.map((p) => p.when).join(", ")}
      head={caption ? <div className="sc-ttl">{caption}</div> : null}
      notes={points.map((p) => ({ k: p.when, text: p.detail ?? "" }))}
      onStep={(s, instant) => go({ pos: s < 0 ? -0.6 : s }, instant)}
    >
      <div className="sc-car">
        {points.map((p, i) => (
          <div key={i} ref={(el) => void (its.current[i] = el)} className={cx("sc-it", i === 0 && "cur")} style={slide(i)}>
            <span className="sc-ver">{p.when}</span>
            <span className="sc-hd">{p.what}</span>
          </div>
        ))}
      </div>
      <div ref={rail} className="sc-rail">
        <span className="sc-base" style={{ left: at(0), right: at(0) }} />
        <span ref={fill} className="sc-fill" style={{ left: at(0), right: at(0), transform: "scaleX(0)" }} />
        {points.map((p, i) => (
          <span key={i}>
            <span className={cx("sc-d", i === 0 && "on")} style={{ left: at(i) }} />
            <span className={cx("sc-lb", i === 0 && "on")} style={{ left: at(i) }}>
              {p.when}
            </span>
          </span>
        ))}
        <span ref={head} className="sc-head" style={{ left: at(0) }} />
      </div>
    </Stage>
  );
}

/* ── bars ─────────────────────────────────────────────────────────────── */

const PREFIX = /^[$€£¥₩]$/;

function decimalsOf(x: number) {
  const s = String(x);
  return s.includes(".") ? Math.min(3, s.split(".")[1].length) : 0;
}

/** 1·2·5 단위의 눈금 간격. */
function niceStep(x: number) {
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

/** 단계별 값·축을 미리 계산한다. 단계 사이 t 는 소수로 보간한다. */
function plan(scene: BarScene, unit?: string) {
  const dec = Math.max(0, ...scene.steps.flatMap((s) => s.values.flat().map(decimalsOf)));
  const pre = unit && PREFIX.test(unit) ? unit : "";
  const suf = unit && !pre ? unit : "";
  const fmt = (v: number, d = dec) => `${pre}${v.toFixed(d)}${suf}`;
  const totals = scene.steps.map((s) => s.values.map((v) => v.reduce((a, b) => a + b, 0)));
  const wide = Math.max(...totals.filter((_, i) => !scene.steps[i].zoom).flat(), 0) * 1.07 || 1;
  const axes = scene.steps.map((s, i) => (s.zoom ? Math.max(...totals[i]) * 1.12 || wide : wide));
  // 축이 같은 단계는 눈금 한 벌을 같이 쓴다.
  const sets = [...new Set(axes)].map((axis) => {
    const st = niceStep(axis / 4);
    const ticks: number[] = [];
    for (let v = st; v < axis * 0.98; v += st) ticks.push(Number(v.toFixed(6)));
    return { axis, ticks, d: decimalsOf(st) };
  });
  const lnSpread = Math.log(Math.max(...axes) / Math.min(...axes)) || 1;
  /** g: 자란 정도(0~1), t: 단계 위치(소수). */
  const frame = (g: number, t: number) => {
    const a = Math.floor(clamp(t, 0, scene.steps.length - 1));
    const b = Math.min(scene.steps.length - 1, a + 1);
    const f = clamp(t - a);
    const axis = Math.exp(lerp(Math.log(axes[a]), Math.log(axes[b]), f));
    const pct = (v: number) => ((v * g) / axis) * 100;
    const rows = scene.rows.map((_, r) => {
      const segs = scene.steps[a].values[r].map((v, j) => lerp(v, scene.steps[b].values[r][j], f));
      const total = segs.reduce((x, y) => x + y, 0);
      // 지금까지 가장 길었던 길이를 점선으로 남긴다 — 줄어든 만큼 보인다.
      const most = Math.max(...totals.slice(0, a + 1).map((tt) => tt[r]), total);
      return { segs, total, pcts: segs.map(pct), ghost: pct(most), ghostOp: most > 0 ? clamp(((most - total) / most) * 3) : 0 };
    });
    const ticks = sets.flatMap((set) => {
      const w = 1 - clamp(Math.abs(Math.log(axis) - Math.log(set.axis)) / lnSpread);
      return set.ticks.map((v) => ({ v, left: (v / axis) * 100, op: w, d: set.d }));
    });
    const ratio = rows.length > 1 && rows[1].total > 1e-9 ? rows[0].total / rows[1].total : Number.NaN;
    return { rows, ticks, ratio };
  };
  return { fmt, frame, sets };
}

/** 배수 글자. 둘째 행이 0 이면 나눌 수 없다. */
const times = (x: number) => (Number.isFinite(x) ? `${x.toFixed(1)}배` : "–");

export function BarsScene({ caption, unit, scene }: { caption?: string; unit?: string; scene: BarScene }) {
  const p = plan(scene, unit);
  const init = p.frame(1, 0);
  const box = useRef<HTMLDivElement>(null);

  const go = useTween({ g: 1, t: 0 }, ({ g, t }) => {
    const root = box.current;
    if (!root) return;
    const fr = p.frame(g, t);
    const tw = (root.querySelector(".sc-tk") as HTMLElement | null)?.clientWidth ?? 0;
    root.querySelectorAll<HTMLElement>(".sc-tk").forEach((tk, r) => {
      const row = fr.rows[r];
      tk.querySelectorAll<HTMLElement>(".sc-sg").forEach((sg, j) => {
        sg.style.width = `${row.pcts[j].toFixed(3)}%`;
        const em = sg.firstElementChild as HTMLElement | null;
        if (em) {
          em.textContent = p.fmt(row.segs[j]);
          em.style.opacity = clamp(((row.pcts[j] / 100) * tw - 40) / 10).toFixed(2);
        }
      });
      const gh = tk.querySelector<HTMLElement>(".sc-ghost");
      if (gh) {
        gh.style.width = `${row.ghost.toFixed(3)}%`;
        gh.style.opacity = row.ghostOp.toFixed(3);
      }
    });
    root.querySelectorAll<HTMLElement>(".sc-tot").forEach((el, r) => (el.textContent = p.fmt(fr.rows[r].total * g)));
    const ratio = root.closest("figure")?.querySelector<HTMLElement>(".sc-ratio");
    if (ratio) {
      ratio.style.opacity = g.toFixed(3);
      ratio.lastElementChild!.textContent = times(fr.ratio);
    }
    root.querySelectorAll<HTMLElement>(".sc-tick[data-v]").forEach((el, i) => {
      const tk = fr.ticks[i];
      el.hidden = tk.left > 101;
      el.style.left = `${tk.left.toFixed(3)}%`;
      el.style.opacity = tk.op.toFixed(3);
    });
  });

  const multi = scene.parts.length > 1;
  return (
    <Stage
      label={caption ?? scene.rows.map((r) => r.label).join(", ")}
      head={
        <div className="sc-top">
          {caption ? <div className="sc-ttl">{caption}</div> : <span />}
          {scene.ratio ? (
            <span className="sc-ratio">
              <small>{scene.ratio}</small>
              <b>{times(init.ratio)}</b>
            </span>
          ) : null}
        </div>
      }
      notes={scene.steps.map((s) => ({ k: s.name, text: s.note }))}
      onStep={(s, instant) => go(s < 0 ? { g: 0, t: 0 } : { g: 1, t: s }, instant)}
    >
      <div ref={box} className="sc-bars">
        <div className="sc-axis">
          <span className="sc-tick">
            <i />
            <b>{p.fmt(0, 0)}</b>
          </span>
          {init.ticks.map((tk, i) => (
            <span key={i} data-v={tk.v} className="sc-tick" hidden={tk.left > 101} style={{ left: `${tk.left}%`, opacity: tk.op }}>
              <i />
              <b>{p.fmt(tk.v, tk.d)}</b>
            </span>
          ))}
        </div>
        {scene.rows.map((row, r) => (
          <div key={r} className="sc-row">
            <span className={cx("sc-nm", row.accent && "acc", row.muted && "mut")}>{row.label}</span>
            <span className="sc-tk">
              <i className="sc-ghost" style={{ width: `${init.rows[r].ghost}%`, opacity: 0 }} />
              {init.rows[r].pcts.map((pc, j) => (
                <span key={j} className={cx("sc-sg", `sc-s${multi ? j : "x"}`)} style={{ width: `${pc}%` }}>
                  <em style={{ opacity: pc > 9 ? 1 : 0 }}>{p.fmt(init.rows[r].segs[j])}</em>
                </span>
              ))}
            </span>
            <span className="sc-tot">{p.fmt(init.rows[r].total)}</span>
          </div>
        ))}
      </div>
      {multi ? (
        <div className="sc-legend">
          {scene.parts.map((name, j) => (
            <span key={j}>
              <i className={`sc-s${j}`} />
              {name}
            </span>
          ))}
        </div>
      ) : null}
    </Stage>
  );
}
