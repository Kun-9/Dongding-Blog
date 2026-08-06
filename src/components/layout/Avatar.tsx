"use client";

/**
 * Avatar — 헤더 아바타. 검은자는 고정이고 흰 점만 그 안에서 커서를 따라본다.
 * 누르면 튀어오르며 표정이 바뀌고, 연타하면 흔들린다. 8연타는 이스터에그.
 * 표정 상태와 흰 점 궤도는 globals.css 의 `.av-*` 규칙이 들고 있다.
 */
import { useEffect, useRef } from "react";

const FACES = ["smile", "sleepy", "wow", "proud", "sulk"];
const POP = "cubic-bezier(.34,1.56,.64,1)";

// 흰 점의 기본 위치와 궤도 반경. 검은자 r13 - 흰 점 r4.3 = 8.7 이 삐져나가지 않는 한계.
const REST_X = 4.8;
const REST_Y = -5.4;
const ORBIT = 7.4;

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 8연타 보상 — 미니 아바타가 화면 위에서 쏟아진다. */
function rain(svg: SVGSVGElement) {
  const w = window.innerWidth;
  for (let i = 0; i < 14; i++) {
    const el = svg.cloneNode(true) as SVGSVGElement;
    el.dataset.face = i % 3 === 0 ? "proud" : "smile";
    el.style.cssText = `position:fixed;z-index:60;pointer-events:none;width:30px;height:30px;left:${
      (i * 137) % Math.max(w - 40, 1)
    }px;top:-40px`;
    document.body.appendChild(el);
    el.animate(
      [
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        {
          transform: `translateY(${window.innerHeight + 80}px) rotate(${
            (i % 2 ? 1 : -1) * 340
          }deg)`,
          opacity: 0.85,
        },
      ],
      {
        duration: 950 + (i % 5) * 140,
        delay: i * 58,
        easing: "cubic-bezier(.4,0,.9,.6)",
      },
    ).onfinish = () => el.remove();
  }
}

export function Avatar({ size = 30 }: { size?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const combo = useRef(0);
  const face = useRef(0);
  const resetT = useRef(0);
  const faceT = useRef(0);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || reduced()) return;

    const glints = svg.querySelectorAll<SVGCircleElement>(".av-glint");
    let raf = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      raf = 0;
      if (!last || svg.dataset.face !== "smile") return;
      const r = svg.getBoundingClientRect();
      const dx = last.clientX - (r.left + r.width / 2);
      const dy = last.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      // 260px 안에선 온전히 따라보고, 420px 을 넘으면 기본 위치로 풀린다.
      const k = 1 - Math.min(Math.max(d - 260, 0) / 160, 1);
      const x = REST_X + ((dx / d) * ORBIT - REST_X) * k;
      const y = REST_Y + ((dy / d) * ORBIT - REST_Y) * k;
      glints.forEach((g) => {
        g.style.transform = k === 0 ? "" : `translate(${x}px, ${y}px)`;
      });
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onClick = () => {
    const svg = ref.current;
    if (!svg) return;

    combo.current += 1;
    clearTimeout(resetT.current);
    resetT.current = window.setTimeout(() => {
      combo.current = 0;
    }, 900);

    // 표정 룰렛. 웃음이 아닌 동안에는 흰 점 추적이 멈추므로 기본 위치로 돌려둔다.
    svg
      .querySelectorAll<SVGCircleElement>(".av-glint")
      .forEach((g) => (g.style.transform = ""));
    face.current += 1;
    svg.dataset.face =
      combo.current >= 8 ? "proud" : FACES[face.current % FACES.length];
    clearTimeout(faceT.current);
    faceT.current = window.setTimeout(() => {
      svg.dataset.face = "smile";
    }, 1600);

    if (reduced()) return;

    if (combo.current === 1) {
      svg.animate(
        [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-9px) scale(1.12)", offset: 0.45 },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 520, easing: POP },
      );
    } else {
      const s = 1 + Math.min(combo.current, 8) * 0.05;
      const a = Math.min(combo.current, 8) * 2.5;
      svg.animate(
        [
          { transform: `rotate(-${a}deg) scale(${s})` },
          { transform: `rotate(${a}deg) scale(${s})`, offset: 0.5 },
          { transform: "rotate(0) scale(1)" },
        ],
        { duration: 260, easing: POP },
      );
    }

    if (combo.current >= 8) {
      combo.current = 0;
      rain(svg);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="아바타 인사"
      style={{ width: size, height: size }}
      className="shrink-0 cursor-pointer rounded-full border-none bg-transparent p-0"
    >
      <svg
        ref={ref}
        className="av"
        viewBox="0 0 256 256"
        data-face="smile"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="av-clip">
            <circle cx="128" cy="128" r="128" />
          </clipPath>
          <linearGradient id="av-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d8ea8" />
            <stop offset="1" stopColor="#5d6b8a" />
          </linearGradient>
          <linearGradient id="av-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf8f0" />
            <stop offset="1" stopColor="#f1e8d6" />
          </linearGradient>
        </defs>
        <g clipPath="url(#av-clip)">
          <rect width="256" height="256" fill="url(#av-bg)" />
          <ellipse cx="128" cy="298" rx="106" ry="86" fill="#3f3b34" />
          <ellipse cx="128" cy="110" rx="102" ry="88" fill="#4a3a2a" />
          <circle cx="38" cy="158" r="15" fill="#f2e9d7" />
          <circle cx="218" cy="158" r="15" fill="#f2e9d7" />
          <rect
            x="34"
            y="30"
            width="188"
            height="196"
            rx="88"
            fill="url(#av-skin)"
          />
          <path
            d="M26 146C26 54 74 24 128 24C182 24 230 54 230 146C218 122 206 92 188 104C172 115 164 94 148 104C132 114 124 92 108 102C92 111 82 92 66 104C48 116 38 122 26 146Z"
            fill="#4a3a2a"
          />
          <g className="av-cheeks">
            <ellipse cx="70" cy="188" rx="15" ry="9" fill="#d9927a" opacity=".42" />
            <ellipse cx="186" cy="188" rx="15" ry="9" fill="#d9927a" opacity=".42" />
          </g>
          <g>
            <path className="av-brow" d="M76 138q17 -8 34 -1" />
            <path className="av-brow" d="M146 137q17 -7 34 1" />
          </g>
          <g className="av-eyes">
            <g className="av-eye">
              <circle cx="94" cy="163" r="13" fill="#38352c" />
              <circle
                className="av-glint"
                cx="94"
                cy="163"
                r="4.3"
                fill="#fbf8f0"
                opacity=".92"
              />
            </g>
            <g className="av-eye">
              <circle cx="162" cy="163" r="13" fill="#38352c" />
              <circle
                className="av-glint"
                cx="162"
                cy="163"
                r="4.3"
                fill="#fbf8f0"
                opacity=".92"
              />
            </g>
          </g>
          <g>
            <path className="av-arc" d="M81 168q13 -17 26 0" />
            <path className="av-arc" d="M149 168q13 -17 26 0" />
          </g>
          <path className="av-mouth av-m-smile" d="M115 191q13 13 26 0" />
          <path className="av-mouth av-m-grin" d="M106 185q22 24 44 0" />
          <path className="av-mouth av-m-flat" d="M114 193h28" />
          <ellipse
            className="av-mouth av-m-o"
            cx="128"
            cy="192"
            rx="9"
            ry="11"
          />
        </g>
      </svg>
    </button>
  );
}
