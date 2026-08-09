// Shared UI primitives for Dong-Ding blog — Header, PostCard, TagChip,
// CategoryChip, CTA, ThemeBadge, etc. Style-driven by window.DD_TOKENS[mode].

const { useState, useEffect, useMemo, useRef } = React;

// ── Theme accessor ─────────────────────────────────────────────────────────
function useTheme(t) {
  return window.DD_TOKENS[t.dark ? 'dark' : 'light'];
}

// ── Breakpoint hook — CSS로 못 바꾸는 것(렌더 자체가 달라지는 곳)에만 쓴다. ──
function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatch(e.matches);
    setMatch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

// ── Utility — format date ─────────────────────────────────────────────────
function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${y}.${m}.${d}`;
}

// ── CTA pill (the signature inset-shadow button) ───────────────────────────
function CTA({ children, dark = true, href = '#', size = 'md', onClick, c }) {
  const padding = size === 'sm' ? '6px 12px' : size === 'lg' ? '10px 20px' : '8px 16px';
  const fontSize = size === 'sm' ? 13 : 15;
  const dStyle = {
    background: c.accent, color: c.accentInk,
    boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.08)',
  };
  const lStyle = {
    background: 'transparent', color: c.ink,
    border: `1px solid ${c.borderStrong}`,
  };
  return (
    <a href={href} onClick={onClick} style={{
      display: 'inline-block', padding, borderRadius: 6,
      fontFamily: window.DD_FONTS.sans, fontSize, fontWeight: 600,
      textDecoration: 'none', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
      transition: 'opacity 0.15s, transform 0.15s',
      ...(dark ? dStyle : lStyle),
    }}
       onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
       onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >{children}</a>
  );
}

// ── Tag chip — small pill ──────────────────────────────────────────────────
function TagChip({ tag, c, size = 'md', filled = false, onClick }) {
  const px = size === 'sm' ? '3px 9px' : '4px 10px';
  const fs = size === 'sm' ? 11.5 : 12.5;
  return (
    <a href={`#/tags/${tag}`} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: px, borderRadius: 999,
      fontFamily: window.DD_FONTS.sans, fontSize: fs, fontWeight: 500,
      color: filled ? c.accentInk : c.inkMuted,
      background: filled ? c.accent : 'transparent',
      border: filled ? 'none' : `1px solid ${c.border}`,
      textDecoration: 'none', whiteSpace: 'nowrap',
      letterSpacing: '-0.005em',
    }}>
      <span style={{ opacity: filled ? 0.7 : 0.55 }}>#</span>{tag}
    </a>
  );
}

// ── Category chip — for header nav ──────────────────────────────────────────
function CategoryNav({ active, c, onNav }) {
  const cats = window.DD_DATA.categories;
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {cats.map(cat => {
        const isActive = active === cat.id;
        return (
          <a key={cat.id} href={`#/category/${cat.id}`}
             onClick={(e) => { if (onNav) { e.preventDefault(); onNav(`category:${cat.id}`); } }}
             style={{
               padding: '6px 12px', borderRadius: 6,
               fontFamily: window.DD_FONTS.sans, fontSize: 14, fontWeight: 500,
               color: isActive ? c.ink : c.inkMuted,
               background: isActive ? c.hover : 'transparent',
               textDecoration: 'none',
               letterSpacing: '-0.01em',
               transition: 'all 0.12s',
             }}
             onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = c.ink; }}
             onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = c.inkMuted; }}
          >{cat.name}</a>
        );
      })}
    </nav>
  );
}

// ── Header — minimal personal-blog style: brand · Posts · About · ⌘K · ☾ ──
function Header({ active, c, t, onNav, setTweak }) {
  const [openK, setOpenK] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const narrow = useMedia('(max-width: 760px)');
  useEffect(() => { setNavOpen(false); }, [active, narrow]);

  // Cmd+K listener
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenK(o => !o);
      } else if (e.key === 'Escape') setOpenK(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navLink = (key, label, target) => {
    const isActive = active === key;
    return (
      <a href={`#/${target}`} onClick={(e) => { e.preventDefault(); onNav(target); }} style={{
        padding: '6px 12px', borderRadius: 6, textDecoration: 'none',
        fontFamily: window.DD_FONTS.sans, fontSize: 14, fontWeight: 500,
        color: isActive ? c.ink : c.inkMuted,
        background: isActive ? c.hover : 'transparent',
        letterSpacing: '-0.005em', transition: 'color 0.12s',
      }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = c.ink; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = c.inkMuted; }}
      >{label}</a>
    );
  };

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: t.dark ? 'rgba(22,21,19,0.85)' : 'rgba(247,244,237,0.82)',
        backdropFilter: 'saturate(160%) blur(12px)', WebkitBackdropFilter: 'saturate(160%) blur(12px)',
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto', padding: '14px var(--gut)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand — 아바타는 홈 링크에서 떼어냈다. 눌러도 이동하지 않고 표정만 바뀐다. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <window.Avatar />
            <a href="#/" onClick={(e) => { e.preventDefault(); onNav('home'); }} style={{ textDecoration: 'none' }}>
              <span style={{
                fontFamily: window.DD_FONTS.sans, fontWeight: 700, fontSize: 17,
                color: c.ink, letterSpacing: '-0.025em', whiteSpace: 'nowrap',
              }}>Dong-Ding</span>
            </a>
          </div>

          {/* Right cluster — minimal nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <div className="dd-navlinks">
              {navLink('posts', 'Posts', 'posts')}
              {navLink('series', 'Series', 'series')}
              {navLink('bookmarks', 'Linkroll', 'bookmarks')}
              {navLink('about', 'About', 'about')}
            </div>

            {/* Search trigger */}
            <button onClick={() => setOpenK(true)} aria-label="Open command palette" style={{
              marginLeft: 6, padding: '5px 10px 5px 10px', borderRadius: 999,
              border: `1px solid ${c.border}`, background: 'transparent',
              color: c.inkMuted, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
              fontFamily: window.DD_FONTS.sans, fontSize: 12.5,
            }}>
              <span style={{ fontSize: 13 }}>⌕</span>
              <span className="dd-searchlabel" style={{ color: c.inkMuted }}>검색</span>
              <kbd className="dd-searchlabel" style={{
                fontFamily: window.DD_FONTS.mono, fontSize: 10.5, padding: '1px 5px',
                borderRadius: 4, background: c.surfaceAlt, color: c.inkMuted,
                border: `1px solid ${c.border}`,
              }}>⌘K</kbd>
            </button>

            {/* Theme toggle */}
            <button onClick={() => setTweak('dark', !t.dark)} aria-label="Toggle theme" style={{
              width: 32, height: 32, padding: 0, borderRadius: 999,
              border: `1px solid ${c.border}`, background: 'transparent',
              color: c.ink, cursor: 'pointer', fontSize: 14, marginLeft: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{t.dark ? '☼' : '☾'}</button>

            {/* 로그인했을 때만 뜨는 계정 드롭다운 */}
            {t.isAdmin && <AdminMenu c={c} active={active} onNav={onNav} setTweak={setTweak} />}

            {/* 좁은 화면 — 텍스트 네비가 접히면 이 버튼이 시트를 연다 */}
            <button className="dd-menubtn" onClick={() => setNavOpen(o => !o)} aria-label="메뉴" aria-expanded={navOpen} style={{
              width: 34, height: 34, padding: 0, borderRadius: 999, marginLeft: 6,
              border: `1px solid ${c.border}`, background: navOpen ? c.hover : 'transparent',
              color: c.ink, cursor: 'pointer', fontSize: navOpen ? 17 : 13, lineHeight: 1,
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{navOpen ? '×' : '☰'}</button>
          </div>
        </div>

        {navOpen && (
          <nav className="dd-mobilesheet" style={{ borderTop: `1px solid ${c.border}`, padding: '4px var(--gut) 10px' }}>
            {[['posts', 'Posts', 'posts'], ['series', 'Series', 'series'], ['bookmarks', 'Linkroll', 'bookmarks'], ['about', 'About', 'about']].map(([key, label, target], i) => (
              <a key={key} href={`#/${target}`} onClick={(e) => { e.preventDefault(); setNavOpen(false); onNav(target); }} style={{
                display: 'block', padding: '13px 2px', textDecoration: 'none',
                fontFamily: window.DD_FONTS.sans, fontSize: 15.5, fontWeight: 500, letterSpacing: '-0.015em',
                color: active === key ? c.ink : c.inkMuted,
                borderTop: i === 0 ? 'none' : `1px solid ${c.border}`,
              }}>{label}</a>
            ))}
          </nav>
        )}
      </header>
      {openK && <CommandPalette c={c} t={t} onNav={onNav} onClose={() => setOpenK(false)} />}
    </>
  );
}

// ── AdminMenu — 로그인 상태에서만 헤더에 뜨는 계정 드롭다운 ──────────────────
// 링크가 보인다고 권한이 생기는 건 아니고, 실제 차단은 서버가 한다.
const ADMIN_ITEMS = [
  { key: 'studio', label: '새 글' },
  { key: 'admin', label: '대시보드' },
  { key: 'stats', label: '통계' },
  { key: 'settings', label: '설정' },
];

function AdminMenu({ c, active, onNav, setTweak }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const email = window.DD_DATA.social.email;
  const handle = email.split('@')[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', marginLeft: 6 }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px 5px 8px', borderRadius: 999,
        border: `1px solid ${c.border}`, background: open ? c.hover : 'transparent',
        color: open ? c.ink : c.inkMuted, cursor: 'pointer',
        fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 500,
        letterSpacing: '-0.005em', transition: 'background 0.15s, color 0.15s',
      }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: c.accent }} />
        <span className="dd-handle" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{handle}</span>
        <span style={{ fontSize: 9, lineHeight: 1 }}>▾</span>
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 50, width: 190,
          borderRadius: 12, overflow: 'hidden', padding: '6px 0',
          background: c.surface, border: `1px solid ${c.border}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{
            padding: '4px 14px 8px', fontFamily: window.DD_FONTS.mono, fontSize: 11,
            color: c.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{email}</div>
          {ADMIN_ITEMS.map(item => (
            <a key={item.key} href={`#/${item.key}`} role="menuitem"
              onClick={(e) => { e.preventDefault(); setOpen(false); onNav(item.key); }}
              style={{
                display: 'block', padding: '8px 14px', textDecoration: 'none',
                fontFamily: window.DD_FONTS.sans, fontSize: 13,
                color: active === item.key ? c.ink : c.inkSoft,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >{item.label}</a>
          ))}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${c.border}` }}>
            <button role="menuitem" onClick={() => { setOpen(false); setTweak('viewer', 'guest'); onNav('home'); }} style={{
              width: '100%', padding: '8px 14px', textAlign: 'left',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: window.DD_FONTS.sans, fontSize: 13, color: c.inkMuted,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.ink; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.inkMuted; }}
            >로그아웃</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Command Palette (⌘K) ───────────────────────────────────────────────────
function CommandPalette({ c, t, onNav, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const cats = window.DD_DATA.categories;
  const posts = window.DD_DATA.posts;

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = [];
    if (!ql) {
      out.push({ kind: 'page',  label: 'Home',         action: () => onNav('home') });
      out.push({ kind: 'page',  label: 'All Posts',    action: () => onNav('posts') });
      out.push({ kind: 'page',  label: 'About',        action: () => onNav('about') });
      cats.forEach(cat => out.push({ kind: 'cat', label: cat.name, sub: `${cat.count}편 · ${cat.desc}`, action: () => onNav(`category:${cat.id}`) }));
      posts.slice(0, 3).forEach(p => out.push({ kind: 'post', label: p.title, sub: p.summary, action: () => onNav(`post:${p.slug}`) }));
      return out;
    }
    cats.forEach(cat => { if (cat.name.toLowerCase().includes(ql)) out.push({ kind: 'cat', label: cat.name, sub: `${cat.count}편`, action: () => onNav(`category:${cat.id}`) }); });
    posts.forEach(p => {
      if (p.title.toLowerCase().includes(ql) || p.summary.toLowerCase().includes(ql) || p.tags.some(tg => tg.includes(ql))) {
        out.push({ kind: 'post', label: p.title, sub: p.summary, action: () => onNav(`post:${p.slug}`) });
      }
    });
    const tagSet = new Set(); posts.forEach(p => p.tags.forEach(tg => { if (tg.includes(ql)) tagSet.add(tg); }));
    [...tagSet].forEach(tg => out.push({ kind: 'tag', label: `#${tg}`, action: () => onNav(`tag:${tg}`) }));
    return out;
  }, [q]);

  const [hi, setHi] = useState(0);
  useEffect(() => { setHi(0); }, [q]);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[hi]?.action(); onClose(); }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '12vh',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(560px, 92vw)', borderRadius: 14,
        background: c.surface, border: `1px solid ${c.border}`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${c.border}` }}>
          <span style={{ color: c.inkMuted, fontSize: 16 }}>⌕</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
                 placeholder="검색하거나 명령을 입력하세요…" style={{
                   flex: 1, border: 'none', outline: 'none', background: 'transparent',
                   color: c.ink, fontFamily: window.DD_FONTS.sans, fontSize: 15, letterSpacing: '-0.01em',
                 }} />
          <kbd style={{ fontFamily: window.DD_FONTS.mono, fontSize: 10.5, padding: '2px 6px', borderRadius: 4, color: c.inkMuted, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>esc</kbd>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 6, maxHeight: '50vh', overflowY: 'auto' }}>
          {items.length === 0 && (
            <li style={{ padding: 20, color: c.inkMuted, fontSize: 13.5, textAlign: 'center' }}>일치하는 항목이 없어요.</li>
          )}
          {items.map((it, i) => (
            <li key={i}>
              <button onClick={() => { it.action(); onClose(); }} onMouseEnter={() => setHi(i)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '9px 12px', borderRadius: 8, border: 'none',
                background: hi === i ? c.hover : 'transparent', color: c.ink,
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: c.surfaceAlt, color: c.inkMuted,
                  fontFamily: window.DD_FONTS.mono, fontSize: 10, fontWeight: 700,
                }}>{ {page: '◧', cat: '▦', post: '¶', tag: '#'}[it.kind] }</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.ink, letterSpacing: '-0.015em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</div>
                  {it.sub && <div style={{ fontSize: 12, color: c.inkMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</div>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${c.border}`, fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, display: 'flex', gap: 14 }}>
          <span>↑↓ 이동</span><span>↵ 선택</span><span>esc 닫기</span>
        </div>
      </div>
    </div>
  );
}

// ── Category Sidebar — collapsible tree, sticky on PostList ─────────────────
function CategorySidebar({ c, filter, onNav }) {
  const cats = window.DD_DATA.categories;
  const all = window.DD_DATA.posts;
  const isAll = !filter;
  const isCat = (id) => filter?.type === 'category' && filter.value === id;

  return (
    <nav className="dd-catnav" style={{ position: 'sticky', top: 90, alignSelf: 'flex-start' }}>
      <div style={{
        fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 12,
      }}>Categories</div>
      <ul className="dd-catnav-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <li>
          <button onClick={() => onNav('posts')} style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
            padding: '6px 10px', borderRadius: 6, background: isAll ? c.hover : 'transparent',
            color: isAll ? c.ink : c.inkSoft,
            fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: isAll ? 600 : 500,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            letterSpacing: '-0.01em',
          }}>
            <span>전체</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: c.inkMuted }}>{all.length}</span>
          </button>
        </li>
        {cats.map(cat => {
          const open = isCat(cat.id) || filter?.type === 'subcat-of' && filter.value === cat.id;
          return (
            <li key={cat.id}>
              <button onClick={() => onNav(`category:${cat.id}`)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
                padding: '6px 10px', borderRadius: 6, background: isCat(cat.id) ? c.hover : 'transparent',
                color: isCat(cat.id) ? c.ink : c.inkSoft,
                fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: isCat(cat.id) ? 600 : 500,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                letterSpacing: '-0.01em',
              }}>
                <span>{cat.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: c.inkMuted }}>{cat.count}</span>
              </button>
              {/* Subcategories — always visible under the active category */}
              {isCat(cat.id) && cat.subs && (
                <ul style={{ listStyle: 'none', margin: '2px 0 6px 0', padding: 0 }}>
                  {cat.subs.map(sub => (
                    <li key={sub.id}>
                      <button onClick={() => onNav(`category:${cat.id}`)} style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
                        padding: '4px 10px 4px 24px', borderRadius: 6, background: 'transparent',
                        color: c.inkMuted, fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 400,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        letterSpacing: '-0.005em',
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.color = c.ink}
                        onMouseLeave={(e) => e.currentTarget.style.color = c.inkMuted}
                      >
                        <span>{sub.name}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: c.inkSubtle }}>{sub.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Tag cloud */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${c.border}` }}>
        <div style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 10,
        }}>Tags</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[...new Set(all.flatMap(p => p.tags))].slice(0, 14).map(tg => (
            <TagChip key={tg} tag={tg} c={c} size="sm"
              filled={filter?.type === 'tag' && filter.value === tg}
              onClick={(e) => { e.preventDefault(); onNav(`tag:${tg}`); }} />
          ))}
        </div>
      </div>
    </nav>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer({ c }) {
  const s = window.DD_DATA.social;
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // mailto 를 쓰지 않는다 — 메일 클라이언트가 없는 방문자는 죽은 링크만 받고
  // 주소를 알 방법이 없다. 라벨은 "Email" 이므로 복사가 실패하면 주소를 노출한다.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(s.email);
      setToast({ kind: 'success', message: '이메일 주소를 복사했습니다.' });
    } catch {
      setToast({ kind: 'error', message: `복사에 실패했습니다. ${s.email}` });
    }
  };

  return (
    <>
    <footer style={{
      maxWidth: 1180, margin: '80px auto 0', padding: '32px var(--gut)',
      borderTop: `1px solid ${c.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 16,
      fontFamily: window.DD_FONTS.sans, fontSize: 13, color: c.inkMuted,
    }}>
      <div>{window.DD_DATA.copyright}</div>
      <div style={{ display: 'flex', gap: 18 }}>
        <a href={`https://${s.github}`} style={{ color: c.inkMuted, textDecoration: 'none' }}>GitHub</a>
        <button type="button" onClick={copyEmail} title={s.email} style={{
          padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
          font: 'inherit', color: c.inkMuted,
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = c.ink}
          onMouseLeave={(e) => e.currentTarget.style.color = c.inkMuted}
        >Email</button>
      </div>
    </footer>
    {toast && <window.ToastBanner c={c} toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────
// Multiple layout variants exposed as a tweak.
function PostCard({ post, c, t, layout = 'card', onNav }) {
  const cat = window.DD_DATA.categories.find(x => x.id === post.category);
  const meta = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>
      <span>{fmtDate(post.date)}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>{post.readTime}분</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>{cat?.name}</span>
    </div>
  );
  const tags = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {post.tags.slice(0, 3).map(tag => <TagChip key={tag} tag={tag} c={c} size="sm" />)}
    </div>
  );
  const onClick = (e) => { e.preventDefault(); onNav(`post:${post.slug}`); };

  const goPost = () => onNav(`post:${post.slug}`);
  const cardKey = (e) => { if (e.key === 'Enter') goPost(); };

  if (layout === 'list') {
    // Dense one-line list
    return (
      <div role="link" tabIndex={0} onClick={goPost} onKeyDown={cardKey} style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 16, padding: '14px 0', borderBottom: `1px solid ${c.border}`,
        cursor: 'pointer',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 18, fontWeight: 600,
            color: c.ink, letterSpacing: '-0.025em', lineHeight: 1.35,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{post.title}</h3>
          <p style={{
            margin: '4px 0 0', fontSize: 13.5, color: c.inkMuted, lineHeight: 1.55,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          }}>{post.summary}</p>
        </div>
        <div style={{ flexShrink: 0, fontSize: 12, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>
          {fmtDate(post.date)}
        </div>
      </div>
    );
  }

  if (layout === 'magazine') {
    // 2-col card with category eyebrow
    return (
      <div role="link" tabIndex={0} onClick={goPost} onKeyDown={cardKey} style={{
        display: 'block', padding: '24px 0', borderBottom: `1px solid ${c.border}`,
        cursor: 'pointer',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.inkMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          {cat?.name} · {fmtDate(post.date)} · {post.readTime}분
        </div>
        <h3 style={{
          margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 24, fontWeight: 600,
          color: c.ink, letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>{post.title}</h3>
        <p style={{
          margin: '10px 0 14px', fontSize: 15, color: c.inkSoft, lineHeight: 1.65,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{post.summary}</p>
        {tags}
      </div>
    );
  }

  // default 'card' — bordered cream card
  return (
    <div role="link" tabIndex={0} onClick={goPost} onKeyDown={cardKey} style={{
      display: 'block', padding: 22, borderRadius: 12,
      background: c.surface, border: `1px solid ${c.border}`,
      cursor: 'pointer',
      transition: 'border-color 0.18s, transform 0.18s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = c.borderStrong}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = c.border}
    >
      {meta}
      <h3 style={{
        margin: '8px 0 8px', fontFamily: window.DD_FONTS.sans, fontSize: 19, fontWeight: 600,
        color: c.ink, letterSpacing: '-0.025em', lineHeight: 1.35,
      }}>{post.title}</h3>
      <p style={{
        margin: '0 0 16px', fontSize: 14, color: c.inkSoft, lineHeight: 1.6,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{post.summary}</p>
      {tags}
    </div>
  );
}

// ── Background glow (Lovable hero ambient) ─────────────────────────────────
function HeroGlow({ c, t }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent)',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600,
        background: `radial-gradient(circle, ${c.glow1}, transparent 65%)`,
        filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', top: '0%', left: '-15%', width: 600, height: 500,
        background: `radial-gradient(circle, ${c.glow2}, transparent 65%)`,
        filter: 'blur(20px)',
      }} />
    </div>
  );
}

Object.assign(window, { useTheme, useMedia, fmtDate, CTA, TagChip, CategoryNav, Header, Footer, PostCard, HeroGlow, CommandPalette, CategorySidebar });
