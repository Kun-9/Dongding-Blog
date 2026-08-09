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

Object.assign(window, { CodeBlock, IC, Callout, TOC, ReadingProgress, LinkCard, PostRefCard });
