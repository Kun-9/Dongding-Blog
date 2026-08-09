// Avatar — 헤더/작성자 아바타. 검은자는 고정이고 흰 점만 커서를 따라본다.
// 누르면 튀어오르며 표정이 바뀌고, 연타하면 흔들린다. 8연타는 이스터에그.
// 표정 상태와 흰 점 궤도는 blog.html 의 `.av-*` 규칙이 들고 있다.
// Port of src/components/layout/Avatar.tsx.

const FACES = ['smile', 'sleepy', 'wow', 'proud', 'sulk'];
const POP = 'cubic-bezier(.34,1.56,.64,1)';
const REST_X = 4.8, REST_Y = -5.4, ORBIT = 7.4;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 8연타 보상 — 미니 아바타가 화면 위에서 쏟아진다.
function avatarRain(svg) {
  const w = window.innerWidth;
  for (let i = 0; i < 14; i++) {
    const el = svg.cloneNode(true);
    el.dataset.face = i % 3 === 0 ? 'proud' : 'smile';
    el.style.cssText = `position:fixed;z-index:60;pointer-events:none;width:30px;height:30px;left:${(i * 137) % Math.max(w - 40, 1)}px;top:-40px`;
    document.body.appendChild(el);
    el.animate([
      { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
      { transform: `translateY(${window.innerHeight + 80}px) rotate(${(i % 2 ? 1 : -1) * 340}deg)`, opacity: 0.85 },
    ], { duration: 950 + (i % 5) * 140, delay: i * 58, easing: 'cubic-bezier(.4,0,.9,.6)' }).onfinish = () => el.remove();
  }
}

function Avatar({ size = 30 }) {
  const ref = React.useRef(null);
  const combo = React.useRef(0);
  const face = React.useRef(0);
  const resetT = React.useRef(0);
  const faceT = React.useRef(0);

  React.useEffect(() => {
    const svg = ref.current;
    if (!svg || reducedMotion()) return;
    const glints = svg.querySelectorAll('.av-glint');
    let raf = 0, last = null;

    const paint = () => {
      raf = 0;
      if (!last || svg.dataset.face !== 'smile') return;
      const r = svg.getBoundingClientRect();
      const dx = last.clientX - (r.left + r.width / 2);
      const dy = last.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      // 260px 안에선 온전히 따라보고, 420px 을 넘으면 기본 위치로 풀린다.
      const k = 1 - Math.min(Math.max(d - 260, 0) / 160, 1);
      const x = REST_X + ((dx / d) * ORBIT - REST_X) * k;
      const y = REST_Y + ((dy / d) * ORBIT - REST_Y) * k;
      glints.forEach(g => { g.style.transform = k === 0 ? '' : `translate(${x}px, ${y}px)`; });
    };
    const onMove = (e) => { last = e; if (!raf) raf = requestAnimationFrame(paint); };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const onClick = () => {
    const svg = ref.current;
    if (!svg) return;
    combo.current += 1;
    clearTimeout(resetT.current);
    resetT.current = setTimeout(() => { combo.current = 0; }, 900);

    // 표정 룰렛. 웃음이 아닌 동안에는 흰 점 추적이 멈추므로 기본 위치로 돌려둔다.
    svg.querySelectorAll('.av-glint').forEach(g => { g.style.transform = ''; });
    face.current += 1;
    svg.dataset.face = combo.current >= 8 ? 'proud' : FACES[face.current % FACES.length];
    clearTimeout(faceT.current);
    faceT.current = setTimeout(() => { svg.dataset.face = 'smile'; }, 1600);

    if (reducedMotion()) return;
    if (combo.current === 1) {
      svg.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-9px) scale(1.12)', offset: 0.45 },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 520, easing: POP });
    } else {
      const sc = 1 + Math.min(combo.current, 8) * 0.05;
      const a = Math.min(combo.current, 8) * 2.5;
      svg.animate([
        { transform: `rotate(-${a}deg) scale(${sc})` },
        { transform: `rotate(${a}deg) scale(${sc})`, offset: 0.5 },
        { transform: 'rotate(0) scale(1)' },
      ], { duration: 260, easing: POP });
    }
    if (combo.current >= 8) { combo.current = 0; avatarRain(svg); }
  };

  return (
    <button type="button" onClick={onClick} aria-label="아바타 인사"
      style={{ width: size, height: size, flexShrink: 0, padding: 0, border: 'none', background: 'transparent', borderRadius: 999, cursor: 'pointer' }}>
      <svg ref={ref} className="av" viewBox="0 0 256 256" data-face="smile" aria-hidden="true">
        <defs>
          <clipPath id="av-clip"><circle cx="128" cy="128" r="128"></circle></clipPath>
          <linearGradient id="av-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d8ea8"></stop><stop offset="1" stopColor="#5d6b8a"></stop>
          </linearGradient>
          <linearGradient id="av-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf8f0"></stop><stop offset="1" stopColor="#f1e8d6"></stop>
          </linearGradient>
        </defs>
        <g clipPath="url(#av-clip)">
          <rect width="256" height="256" fill="url(#av-bg)"></rect>
          <ellipse cx="128" cy="298" rx="106" ry="86" fill="#3f3b34"></ellipse>
          <ellipse cx="128" cy="110" rx="102" ry="88" fill="#4a3a2a"></ellipse>
          <circle cx="38" cy="158" r="15" fill="#f2e9d7"></circle>
          <circle cx="218" cy="158" r="15" fill="#f2e9d7"></circle>
          <rect x="34" y="30" width="188" height="196" rx="88" fill="url(#av-skin)"></rect>
          <path d="M26 146C26 54 74 24 128 24C182 24 230 54 230 146C218 122 206 92 188 104C172 115 164 94 148 104C132 114 124 92 108 102C92 111 82 92 66 104C48 116 38 122 26 146Z" fill="#4a3a2a"></path>
          <g className="av-cheeks">
            <ellipse cx="70" cy="188" rx="15" ry="9" fill="#d9927a" opacity=".42"></ellipse>
            <ellipse cx="186" cy="188" rx="15" ry="9" fill="#d9927a" opacity=".42"></ellipse>
          </g>
          <g>
            <path className="av-brow" d="M76 138q17 -8 34 -1"></path>
            <path className="av-brow" d="M146 137q17 -7 34 1"></path>
          </g>
          <g className="av-eyes">
            <g className="av-eye">
              <circle cx="94" cy="163" r="13" fill="#38352c"></circle>
              <circle className="av-glint" cx="94" cy="163" r="4.3" fill="#fbf8f0" opacity=".92"></circle>
            </g>
            <g className="av-eye">
              <circle cx="162" cy="163" r="13" fill="#38352c"></circle>
              <circle className="av-glint" cx="162" cy="163" r="4.3" fill="#fbf8f0" opacity=".92"></circle>
            </g>
          </g>
          <g>
            <path className="av-arc" d="M81 168q13 -17 26 0"></path>
            <path className="av-arc" d="M149 168q13 -17 26 0"></path>
          </g>
          <path className="av-mouth av-m-smile" d="M115 191q13 13 26 0"></path>
          <path className="av-mouth av-m-grin" d="M106 185q22 24 44 0"></path>
          <path className="av-mouth av-m-flat" d="M114 193h28"></path>
          <ellipse className="av-mouth av-m-o" cx="128" cy="192" rx="9" ry="11"></ellipse>
        </g>
      </svg>
    </button>
  );
}

// ── ToastBanner — 화면 우하단 고정 상태 배너 (스튜디오 · 이메일 복사 공용) ──
function ToastBanner({ c, toast, onClose }) {
  const ok = toast.kind === 'success';
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100, maxWidth: 420,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 12, background: c.surface,
      border: `1px solid ${ok ? '#7da75e' : '#c95c5c'}`, boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
    }}>
      <span style={{
        width: 24, height: 24, flexShrink: 0, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: ok ? '#7da75e' : '#c95c5c', color: '#fff',
        fontFamily: window.DD_FONTS.mono, fontSize: 13, fontWeight: 700,
      }}>{ok ? '✓' : '!'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: c.ink }}>{toast.message}</div>
        {toast.href && (
          <a href={toast.href} style={{ display: 'inline-block', marginTop: 4, fontSize: 12.5, fontWeight: 600, color: c.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>지금 보기 →</a>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="닫기" style={{
        flexShrink: 0, padding: 4, borderRadius: 4, border: 'none', background: 'transparent',
        color: c.inkMuted, fontSize: 14, cursor: 'pointer',
      }}>×</button>
    </div>
  );
}

Object.assign(window, { Avatar, ToastBanner });
