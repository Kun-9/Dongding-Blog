// Prose system — code block (with file/lang/copy/diff), callouts, TOC.
// All consume the active theme (c) — no hardcoded colors.

const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

// ── Tiny syntax tokenizer for Java-like code (good enough for demo) ─────────
const TOKEN_REGEX = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:public|private|protected|class|interface|extends|implements|static|final|void|new|return|if|else|for|while|do|switch|case|break|continue|throw|throws|try|catch|finally|import|package|null|true|false|this|super|abstract|synchronized|volatile|transient|enum|record|var|select|from|where|order|by|inner|join|fetch|left|right|distinct|count|group|having|insert|update|delete|into|values|on|and|or|not|in|exists|set|create|table|primary|key|foreign|references)\b)|(@\w+)|(\b[A-Z][A-Za-z0-9_]*\b)|(\b[0-9]+(?:\.[0-9]+)?[Ll]?\b)/gm;

function highlightLine(line, code) {
  // Returns array of <span>s
  const parts = [];
  let lastIdx = 0;
  let m;
  TOKEN_REGEX.lastIndex = 0;
  while ((m = TOKEN_REGEX.exec(line))) {
    if (m.index > lastIdx) {
      parts.push(<span key={lastIdx}>{line.slice(lastIdx, m.index)}</span>);
    }
    let color;
    if (m[1] || m[2]) color = code.comment;
    else if (m[3]) color = code.string;
    else if (m[4]) color = code.keyword;
    else if (m[5]) color = code.type;
    else if (m[6]) color = code.type;
    else if (m[7]) color = code.number;
    parts.push(<span key={m.index} style={{ color, fontStyle: m[1] || m[2] ? 'italic' : 'normal' }}>{m[0]}</span>);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < line.length) parts.push(<span key={lastIdx + 'r'}>{line.slice(lastIdx)}</span>);
  return parts.length ? parts : [<span key="0">{line}</span>];
}

// ── Code block ─────────────────────────────────────────────────────────────
// Props: filename, lang, code, highlight (array of line numbers), diff (mapping linenum→'+'|'-')
function CodeBlock({ filename, lang, code, highlight = [], diff = {}, c, style: styleVariant = 'card' }) {
  const lines = code.replace(/\n$/, '').split('\n');
  const [copied, setCopied] = useStateP(false);
  const cc = c.code;

  const onCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  // Style variants
  const isMinimal = styleVariant === 'minimal';
  const isInline = styleVariant === 'inline';

  return (
    <figure style={{
      margin: '24px 0', borderRadius: isMinimal ? 0 : 10,
      background: cc.bg, color: cc.ink,
      border: isMinimal ? 'none' : `1px solid ${cc.bg}`,
      overflow: 'hidden',
      borderLeft: isMinimal ? `3px solid ${cc.muted}` : 'none',
    }}>
      {/* header bar */}
      {!isInline && (
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', borderBottom: `1px solid rgba(255,255,255,0.05)`,
          fontFamily: window.DD_FONTS.mono, fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: cc.filename }}>
            {filename && <span style={{ fontWeight: 500 }}>{filename}</span>}
            {lang && <span style={{
              padding: '1px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: cc.muted, letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>{lang}</span>}
          </div>
          <button onClick={onCopy} style={{
            border: 'none', background: 'transparent', color: cc.muted,
            cursor: 'pointer', fontFamily: window.DD_FONTS.mono, fontSize: 11.5, padding: '2px 8px',
            borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = cc.ink; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = cc.muted; e.currentTarget.style.background = 'transparent'; }}
          >
            {copied ? '✓ 복사됨' : '⧉ 복사'}
          </button>
        </header>
      )}
      {/* code body */}
      <pre style={{
        margin: 0, padding: '14px 0', overflowX: 'auto',
        fontFamily: window.DD_FONTS.mono, fontSize: 13.5, lineHeight: 1.65,
      }}>
        <code style={{ display: 'block' }}>
          {lines.map((line, i) => {
            const n = i + 1;
            const isH = highlight.includes(n);
            const dt = diff[n];
            const hi = isH || dt;
            return (
              <div key={i} style={{
                display: 'flex',
                background: dt === '+' ? 'rgba(120,180,100,0.10)' : dt === '-' ? 'rgba(200,90,80,0.10)' : isH ? 'rgba(255,200,120,0.08)' : 'transparent',
                borderLeft: dt === '+' ? '2px solid rgba(120,180,100,0.6)' : dt === '-' ? '2px solid rgba(200,90,80,0.6)' : isH ? `2px solid ${cc.keyword}` : '2px solid transparent',
                paddingLeft: 16, paddingRight: 16,
              }}>
                <span aria-hidden style={{
                  display: 'inline-block', width: 28, marginRight: 14, textAlign: 'right',
                  color: cc.lineNum, userSelect: 'none', fontVariantNumeric: 'tabular-nums',
                }}>{n}</span>
                <span style={{ display: 'inline-block', width: 14, color: cc.muted, userSelect: 'none' }}>
                  {dt === '+' ? '+' : dt === '-' ? '−' : ''}
                </span>
                <span style={{ flex: 1, whiteSpace: 'pre' }}>{highlightLine(line, cc)}</span>
              </div>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}

// ── Inline code ────────────────────────────────────────────────────────────
function IC({ children, c }) {
  // Slight accent tint so inline code stands apart from the body without
  // looking like a chip. Tuned for the cream + dark themes both.
  const isDark = c.bg && c.bg.toLowerCase().startsWith('#1') || c.bg && c.bg.toLowerCase().startsWith('#2');
  return (
    <code style={{
      fontFamily: window.DD_FONTS.mono,
      fontSize: '0.86em', fontWeight: 500,
      padding: '1.5px 6px', borderRadius: 5,
      background: isDark ? 'rgba(255,200,140,0.10)' : 'rgba(168,129,74,0.12)',
      color: isDark ? '#e8c89a' : '#7a5a2a',
      border: 'none',
      letterSpacing: '-0.005em',
      overflowWrap: 'anywhere', wordBreak: 'break-word',
    }}>{children}</code>
  );
}

// ── Callout ────────────────────────────────────────────────────────────────
function Callout({ kind = 'info', title, children, c }) {
  const co = c.callout[kind] || c.callout.info;
  const labels = { info: 'INFO', warning: 'WARNING', tip: 'TIP', note: 'NOTE' };
  const glyphs = { info: 'i', warning: '!', tip: '✓', note: '※' };
  return (
    <aside style={{
      margin: '22px 0', padding: '14px 18px',
      background: co.bg, color: co.ink,
      borderRadius: 10,
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div aria-hidden style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: 999,
        background: co.bd, color: co.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 700,
        marginTop: 1,
      }}>{glyphs[kind]}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: co.glyph, marginBottom: title ? 2 : 4,
        }}>{labels[kind]}{title ? ` · ${title}` : ''}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>{children}</div>
      </div>
    </aside>
  );
}

// ── Link preview card ──────────────────────────────────────────────────────
// 본문에 URL만 한 줄로 두면 카드로 펼쳐진다. 메타데이터는 서버가 발행 시점에 OG
// 태그를 읽어 캐싱한 표(window.DD_LINKMETA)에서 온다 — 브라우저에서 남의 사이트를
// 긁을 수 없기 때문. 캐시에 없으면 도메인 한 줄로 떨어진다. 빈 카드보다 낫다.
const linkHost = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return String(url).replace(/^https?:\/\//, '').split('/')[0]; } };
const linkPath = (url) => { try { const u = new URL(url); return (u.pathname + u.search).replace(/\/$/, ''); } catch { return ''; } };
const linkMetaOf = (url) => (window.DD_LINKMETA || {})[String(url).replace(/^https?:\/\//, '').replace(/\/$/, '')] || null;
const hostHue = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 360; };
const clampLines = (n) => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' });

function LinkCard({ url, c }) {
  const [hover, setHover] = useStateP(false);
  const host = linkHost(url);
  const meta = linkMetaOf(url);
  const hue = hostHue(host);
  const dark = /^#[012]/.test(String(c.bg || ''));
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', gap: 14, margin: '22px 0', padding: meta ? '15px 17px' : '12px 14px',
        borderRadius: 10, border: `1px solid ${hover ? c.borderStrong : c.border}`,
        background: hover ? c.surfaceAlt : c.surface, textDecoration: 'none', color: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span aria-hidden style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: `hsl(${hue} ${dark ? 30 : 34}% ${dark ? 26 : 87}%)`, color: `hsl(${hue} 32% ${dark ? 78 : 30}%)`,
            fontFamily: window.DD_FONTS.mono, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
          }}>{host.charAt(0)}</span>
          <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11.5, color: c.inkMuted, whiteSpace: 'nowrap' }}>{host}</span>
          {!meta && (
            <span style={{
              flex: 1, minWidth: 0, fontFamily: window.DD_FONTS.mono, fontSize: 11.5, color: c.inkSubtle,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{linkPath(url)}</span>
          )}
          {meta && <span style={{ flex: 1 }} />}
          <span aria-hidden style={{
            fontSize: 12.5, color: hover ? c.ink : c.inkMuted,
            transform: hover ? 'translate(1px,-1px)' : 'none', transition: 'transform 0.15s, color 0.15s',
          }}>↗</span>
        </div>
        {meta && (
          <React.Fragment>
            <div style={{
              marginTop: 9, fontFamily: window.DD_FONTS.sans, fontSize: 15.5, fontWeight: 600,
              letterSpacing: '-0.018em', lineHeight: 1.4, color: c.ink, ...clampLines(2),
            }}>{meta.title}</div>
            {meta.desc && (
              <div style={{ marginTop: 5, fontSize: 13.5, lineHeight: 1.6, color: c.inkMuted, ...clampLines(2) }}>{meta.desc}</div>
            )}
          </React.Fragment>
        )}
      </div>
      {meta && meta.image && (
        <img src={meta.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{
          width: 132, height: 96, objectFit: 'cover', borderRadius: 7, flexShrink: 0,
          background: c.surfaceAlt, alignSelf: 'center',
        }} />
      )}
    </a>
  );
}

// 내부 글 참조 — `/posts/slug` 한 줄. 남의 사이트와 달리 메타를 이미 다 알고 있다.
function PostRefCard({ slug, c, onNav }) {
  const [hover, setHover] = useStateP(false);
  const post = (window.DD_DATA.posts || []).find(p => p.slug === slug);
  if (!post) return (
    <div style={{
      margin: '22px 0', padding: '12px 14px', borderRadius: 10, border: `1px dashed ${c.border}`,
      fontFamily: window.DD_FONTS.sans, fontSize: 13, color: c.inkMuted,
    }}>찾을 수 없는 글 <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12.5, color: c.inkSubtle }}>/posts/{slug}</span></div>
  );
  const cat = (window.DD_DATA.categories || []).find(x => x.id === post.category);
  return (
    <a href={`#/posts/${slug}`}
      onClick={onNav ? (e) => { e.preventDefault(); onNav(`post:${slug}`); } : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', margin: '22px 0', padding: '15px 17px', borderRadius: 10,
        border: `1px solid ${hover ? c.borderStrong : c.border}`,
        background: hover ? c.surfaceAlt : c.surface, textDecoration: 'none', color: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: window.DD_FONTS.sans, fontSize: 12, color: c.inkMuted }}>
        <span>이 블로그의 글</span>
        <span style={{ color: c.inkSubtle }}>·</span>
        <span>{cat ? cat.name : post.category}</span>
        <span style={{ color: c.inkSubtle }}>·</span>
        <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{window.fmtDate ? window.fmtDate(post.date) : post.date}</span>
        <span style={{ flex: 1 }} />
        <span aria-hidden style={{
          fontSize: 13, color: hover ? c.ink : c.inkMuted,
          transform: hover ? 'translateX(2px)' : 'none', transition: 'transform 0.15s, color 0.15s',
        }}>→</span>
      </div>
      <div style={{
        marginTop: 9, fontFamily: window.DD_FONTS.sans, fontSize: 15.5, fontWeight: 600,
        letterSpacing: '-0.018em', lineHeight: 1.4, color: c.ink, ...clampLines(2),
      }}>{post.title}</div>
      {post.summary && (
        <div style={{ marginTop: 5, fontSize: 13.5, lineHeight: 1.6, color: c.inkMuted, ...clampLines(2) }}>{post.summary}</div>
      )}
    </a>
  );
}

// ── TOC (sticky, with scroll-spy) ──────────────────────────────────────────
function TOC({ items, c, sticky = true }) {
  const [active, setActive] = useStateP(items[0]?.id);
  useEffectP(() => {
    const headings = items.map(i => document.getElementById(i.id)).filter(Boolean);
    if (!headings.length) return;
    const obs = new IntersectionObserver((entries) => {
      // pick the topmost intersecting heading
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-80px 0px -60% 0px', threshold: [0, 1] });
    headings.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav style={sticky ? { position: 'sticky', top: 90, alignSelf: 'flex-start' } : {}}>
      <div style={{
        fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: c.inkMuted, marginBottom: 12,
      }}>On this page</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a href={`#${item.id}`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }} style={{
                display: 'block', padding: '4px 10px',
                paddingLeft: item.level === 3 ? 22 : 10,
                borderRadius: 6,
                fontFamily: window.DD_FONTS.sans, fontSize: 13,
                color: isActive ? c.ink : c.inkMuted,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? c.hover : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.12s',
              }}>{item.label}</a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Reading progress bar (sticks below header) ──────────────────────────────
function ReadingProgress({ c, target }) {
  const [pct, setPct] = useStateP(0);
  useEffectP(() => {
    const onScroll = () => {
      const el = target?.current;
      if (!el) return;
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY - el.offsetTop;
      const p = Math.max(0, Math.min(1, scrolled / Math.max(1, total)));
      setPct(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [target]);
  return (
    <div aria-hidden style={{
      position: 'fixed', top: 60, left: 0, right: 0, height: 2,
      zIndex: 49, background: 'transparent', pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%', width: `${pct * 100}%`,
        background: c.borderStrong, transition: 'width 0.05s linear',
      }} />
    </div>
  );
}


// ── 이미지 ────────────────────────────────────────────────────────────────
// 한 장은 Figure(캡션 + 확대), 연속 줄은 ImageGroup(그리드). 폭은 sm / 기본 / wide 셋.
const IMG_RATIO = { 1: '16 / 9', 2: '4 / 3', 3: '4 / 3', 4: '1 / 1' };

// 못 불러온 이미지는 깨진 아이콘 대신 자리와 파일명을 보여준다 — 발행 전에 오타를 잡으라고.
function ImgSlot({ src, alt, c, ratio, cover, rounded = 8 }) {
  const [failed, setFailed] = useStateP(false);
  const name = String(src || '').split('/').filter(Boolean).pop() || 'image';
  if (failed) {
    return (
      <div style={{
        width: '100%', aspectRatio: ratio || '16 / 9', borderRadius: rounded,
        border: `1px dashed ${c.borderStrong}`, background: c.surfaceAlt,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        <span aria-hidden style={{ fontFamily: window.DD_FONTS.mono, fontSize: 15, lineHeight: 1, color: c.inkSubtle }}>▣</span>
        <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, lineHeight: 1.3, color: c.inkMuted, padding: '0 10px', textAlign: 'center', overflowWrap: 'anywhere' }}>{name}</span>
      </div>
    );
  }
  return (
    <img src={src} alt={alt || ''} loading="lazy" onError={() => setFailed(true)}
      style={{
        display: 'block', width: '100%', borderRadius: rounded, background: c.surfaceAlt,
        ...(cover ? { aspectRatio: ratio, objectFit: 'cover', height: '100%' } : { height: 'auto' }),
      }} />
  );
}

function Figure({ src, alt, size, c }) {
  const [zoom, setZoom] = useStateP(false);
  return (
    <figure className={size === 'wide' ? 'dd-imgwide' : undefined}
      style={{ margin: '26px 0', maxWidth: size === 'sm' ? 380 : '100%' }}>
      <button type="button" onClick={() => setZoom(true)} aria-label="이미지 확대"
        style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in' }}>
        <ImgSlot src={src} alt={alt} c={c} />
      </button>
      {alt ? <figcaption style={{
        marginTop: 9, fontFamily: window.DD_FONTS.sans, fontSize: 12.5, lineHeight: 1.5,
        color: c.inkMuted, letterSpacing: '-0.005em',
      }}>{alt}</figcaption> : null}
      {zoom && <Lightbox items={[{ src, alt }]} index={0} c={c} onClose={() => setZoom(false)} />}
    </figure>
  );
}

function ImageGroup({ items, opt, c }) {
  const [zoom, setZoom] = useStateP(-1);
  const explicit = Number(opt);
  const cols = explicit >= 1 && explicit <= 4 ? explicit : items.length === 2 ? 2 : items.length === 3 ? 3 : 2;
  const ratio = IMG_RATIO[cols] || '4 / 3';
  return (
    <div className={size2class(opt)} style={{ margin: '26px 0' }}>
      <div className="dd-imgrid" style={{ '--cols': cols }}>
        {items.map((it, idx) => (
          <figure key={idx} style={{ margin: 0, display: 'grid', gap: 6, alignContent: 'start' }}>
            <button type="button" onClick={() => setZoom(idx)} aria-label={`${idx + 1}번째 이미지 확대`}
              style={{ display: 'block', padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', borderRadius: 8, overflow: 'hidden', lineHeight: 0 }}>
              <ImgSlot src={it.src} alt={it.alt} c={c} ratio={ratio} cover />
            </button>
            {it.alt ? <figcaption style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 11.5, lineHeight: 1.45, color: c.inkMuted,
              letterSpacing: '-0.005em', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
            }}>{it.alt}</figcaption> : null}
          </figure>
        ))}
      </div>
      {zoom >= 0 && (
        <Lightbox items={items} index={zoom} c={c}
          onClose={() => setZoom(-1)} onMove={(d) => setZoom(v => (v + d + items.length) % items.length)} />
      )}
    </div>
  );
}

function size2class(opt) { return opt === 'wide' ? 'dd-imgwide' : undefined; }

// 라이트박스 — 루트로 올려 그린다. wide 그룹의 transform 안에서는 position:fixed가 갇힌다.
function Lightbox({ items, index, c, onClose, onMove }) {
  const it = items[index] || {};
  useEffectP(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (onMove && e.key === 'ArrowRight') onMove(1);
      else if (onMove && e.key === 'ArrowLeft') onMove(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onMove]);

  const navBtn = {
    width: 38, height: 38, borderRadius: 999, cursor: 'pointer',
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
    color: '#f2efe8', fontSize: 14, lineHeight: 1,
  };

  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(12,11,10,0.9)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: '48px 24px', backdropFilter: 'blur(3px)',
    }}>
      <button type="button" onClick={onClose} aria-label="닫기" style={{
        position: 'absolute', top: 18, right: 20, ...navBtn,
      }}>✕</button>
      <img src={it.src} alt={it.alt || ''} onClick={(e) => e.stopPropagation()}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
        style={{ maxWidth: 'min(1100px, 92vw)', maxHeight: '76vh', objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }} />
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 'min(1100px, 92vw)' }}>
        {onMove && <button type="button" onClick={() => onMove(-1)} aria-label="이전" style={navBtn}>←</button>}
        <div style={{ flex: 1, textAlign: 'center', fontFamily: window.DD_FONTS.sans, fontSize: 13, color: 'rgba(242,239,232,0.72)', letterSpacing: '-0.005em' }}>
          {it.alt}
          {items.length > 1 && (
            <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11.5, marginLeft: it.alt ? 10 : 0, color: 'rgba(242,239,232,0.45)', fontVariantNumeric: 'tabular-nums' }}>
              {index + 1} / {items.length}
            </span>
          )}
        </div>
        {onMove && <button type="button" onClick={() => onMove(1)} aria-label="다음" style={navBtn}>→</button>}
      </div>
    </div>,
    document.getElementById('root') || document.body
  );
}

Object.assign(window, { CodeBlock, IC, Callout, TOC, ReadingProgress, LinkCard, PostRefCard, Figure, ImageGroup });
