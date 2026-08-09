// Frontmatter 전용 선택 컴포넌트 — 카테고리(2단), 시리즈(+회차 슬롯).
// native <select>를 쓰지 않는다: OS 드롭다운은 테마를 따르지 않고, 하위 카테고리·회차 점유 상태를 보여줄 수 없다.

const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

const F = () => window.DD_FONTS;

// 바깥 클릭 / Esc로 닫기
function useDismiss(open, close) {
  const ref = useRefF(null);
  useEffectF(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

// ── 카테고리 — 상위는 항상 펼쳐 두고, 하위는 선택된 상위 것만 보여준다 ──────────
function CategoryField({ c, value, sub, onChange }) {
  const cats = window.DD_DATA.categories;
  const cat = cats.find(x => x.id === value) || cats[0];
  const subs = cat.subs || [];
  const activeSub = subs.find(s => s.id === sub);

  const pill = (active, small) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: small ? 26 : 30, padding: small ? '0 11px' : '0 13px',
    borderRadius: 999, cursor: 'pointer',
    fontFamily: F().sans, fontSize: small ? 12 : 13,
    fontWeight: active ? 600 : 500, letterSpacing: '-0.01em',
    background: active ? c.accent : 'transparent',
    color: active ? c.accentInk : c.inkMuted,
    border: `1px solid ${active ? c.accent : c.border}`,
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
    whiteSpace: 'nowrap',
  });
  const hoverIn = (active) => (e) => { if (!active) { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.ink; } };
  const hoverOut = (active) => (e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.inkMuted; } };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {cats.map(x => {
          const active = x.id === cat.id;
          return (
            <button key={x.id} type="button" onClick={() => onChange({ category: x.id, sub: '' })}
              aria-pressed={active} style={pill(active)}
              onMouseEnter={hoverIn(active)} onMouseLeave={hoverOut(active)}>
              {x.name}
              <span style={{ fontFamily: F().mono, fontSize: 10.5, opacity: active ? 0.62 : 0.75, color: active ? c.accentInk : c.inkSubtle, fontVariantNumeric: 'tabular-nums' }}>{x.count}</span>
            </button>
          );
        })}
      </div>

      {subs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
          <span aria-hidden style={{ fontFamily: F().mono, fontSize: 11, color: c.inkSubtle, marginRight: 2 }}>└</span>
          {[{ id: '', name: '전체', count: cat.count }, ...subs].map(s => {
            const active = (s.id || '') === (sub || '');
            return (
              <button key={s.id || 'all'} type="button" onClick={() => onChange({ category: cat.id, sub: s.id })}
                aria-pressed={active}
                style={{
                  ...pill(false, true),
                  background: active ? c.surfaceAlt : 'transparent',
                  borderColor: active ? c.borderStrong : c.border,
                  color: active ? c.ink : c.inkMuted,
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = c.hover; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                {s.name}
                <span style={{ fontFamily: F().mono, fontSize: 10, color: c.inkSubtle, fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: c.inkMuted, letterSpacing: '-0.005em' }}>
        <code style={{ fontFamily: F().mono, fontSize: 11, color: c.inkSoft }}>
          {cat.id}{activeSub ? ` / ${activeSub.id}` : ''}
        </code>
        <span style={{ fontFamily: F().sans }}>{activeSub ? activeSub.name : cat.desc}</span>
      </div>
    </div>
  );
}

// ── 시리즈 — 커스텀 드롭다운 + 회차 슬롯 레일 ───────────────────────────────
function SeriesField({ c, value, order, currentSlug, newOpen, onChange, onToggleNew }) {
  const list = window.DD_DATA.series;
  const current = list.find(s => s.id === value);
  const [open, setOpen] = useStateF(false);
  const wrapRef = useDismiss(open, () => setOpen(false));

  const occupied = new Map();
  if (current) {
    window.DD_DATA.posts
      .filter(p => p.series === current.id && p.slug !== currentSlug && p.seriesOrder)
      .forEach(p => occupied.set(p.seriesOrder, p));
  }
  const slotMax = current ? Math.max(current.count, ...[...occupied.keys(), 0], order) : 0;
  const taken = occupied.get(order);
  const filled = (s) => window.DD_DATA.posts.filter(p => p.series === s.id).length;

  const trigger = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
    height: 34, padding: '0 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
    background: c.surface, border: `1px solid ${open ? c.borderStrong : c.border}`,
    color: c.ink, fontFamily: F().sans, fontSize: 13, letterSpacing: '-0.01em',
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={trigger}>
            <span aria-hidden style={{
              width: 8, height: 8, borderRadius: 999, flexShrink: 0,
              background: current ? current.color : 'transparent',
              border: current ? 'none' : `1px dashed ${c.inkSubtle}`,
            }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: current ? c.ink : c.inkMuted, fontWeight: current ? 600 : 400 }}>
              {current ? current.title : '시리즈 없음 — 단독 글'}
            </span>
            {current && (
              <span style={{ fontFamily: F().mono, fontSize: 11, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>
                {filled(current)}/{current.count}
              </span>
            )}
            <span aria-hidden style={{ fontSize: 9, color: c.inkSubtle, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
          </button>

          {open && (
            <div role="listbox" style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40,
              padding: 5, borderRadius: 10, background: c.surface,
              border: `1px solid ${c.border}`, boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
              maxHeight: 320, overflowY: 'auto',
            }}>
              <SeriesOption c={c} selected={!value} onPick={() => { onChange({ series: '', seriesOrder: 0 }); setOpen(false); }}
                dot={null} title="시리즈 없음" desc="단독 글로 발행합니다." />
              <div style={{ height: 1, background: c.border, margin: '5px 4px' }} />
              {list.map(s => (
                <SeriesOption key={s.id} c={c} selected={s.id === value}
                  onPick={() => { onChange({ series: s.id, seriesOrder: order || filled(s) + 1 }); setOpen(false); }}
                  dot={s.color} title={s.title} desc={s.desc} progress={`${filled(s)}/${s.count}`} />
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={onToggleNew} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 34, padding: '0 11px',
          borderRadius: 8, border: `1px solid ${c.border}`, background: newOpen ? c.surfaceAlt : 'transparent',
          color: c.inkSoft, cursor: 'pointer',
          fontFamily: F().sans, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap',
        }}><span aria-hidden>＋</span>새 시리즈</button>
      </div>

      {current && (
        <div style={{ display: 'grid', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
            <span style={{ fontFamily: F().mono, fontSize: 11, color: c.inkSubtle, marginRight: 3 }}>회차</span>
            {Array.from({ length: slotMax }, (_, i) => i + 1).map(n => {
              const busy = occupied.get(n);
              const active = n === order;
              const over = n > current.count;
              return (
                <button key={n} type="button" title={busy ? `${n}편 — ${busy.title}` : over ? `${n}편 — 목표 초과 슬롯` : `${n}편 — 비어있음`}
                  onClick={() => onChange({ seriesOrder: n })}
                  style={{
                    position: 'relative', width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
                    background: active ? c.accent : busy ? c.surfaceAlt : 'transparent',
                    color: active ? c.accentInk : busy ? c.inkMuted : c.inkSoft,
                    border: active ? `1px solid ${c.accent}` : busy ? `1px solid ${c.border}` : `1px dashed ${c.borderStrong}`,
                    fontFamily: F().mono, fontSize: 12, fontWeight: active ? 700 : 500,
                    fontVariantNumeric: 'tabular-nums', transition: 'background 0.12s, color 0.12s',
                  }}>
                  {n}
                  {busy && !active && <span aria-hidden style={{ position: 'absolute', right: 4, bottom: 3, width: 3, height: 3, borderRadius: 999, background: current.color }} />}
                </button>
              );
            })}
            <button type="button" title="다음 회차 추가" onClick={() => onChange({ seriesOrder: slotMax + 1 })}
              style={{
                width: 30, height: 30, borderRadius: 7, cursor: 'pointer', background: 'transparent',
                color: c.inkSubtle, border: `1px dashed ${c.border}`, fontFamily: F().mono, fontSize: 13,
              }}>＋</button>
          </div>
          <div style={{ fontFamily: F().sans, fontSize: 11.5, letterSpacing: '-0.005em', color: taken ? '#c0705e' : c.inkMuted }}>
            {taken
              ? `${order}편은 이미 “${taken.title}”가 차지하고 있습니다 — 저장 시 뒤로 밀립니다.`
              : order > current.count
                ? `${order}편 — 목표 ${current.count}편을 넘습니다. 시리즈가 자동 확장됩니다.`
                : order > 0
                  ? `${order}편 — 비어있는 슬롯입니다.`
                  : '회차를 선택하세요.'}
          </div>
        </div>
      )}

      {newOpen && (
        <div style={{ padding: 12, borderRadius: 10, background: c.surfaceAlt, border: `1px solid ${c.border}`, display: 'grid', gap: 8 }}>
          <input placeholder="시리즈 제목" style={fieldInput(c)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="series-id" style={{ ...fieldInput(c), fontFamily: F().mono, fontSize: 13 }} />
            <input placeholder="목표 편수" style={{ ...fieldInput(c), width: 110 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onToggleNew} style={{
              padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.border}`,
              background: 'transparent', color: c.inkMuted, cursor: 'pointer', font: 'inherit', fontSize: 12,
            }}>취소</button>
            <window.CTA c={c} dark size="sm" onClick={(e) => { e.preventDefault(); onToggleNew(); }}>만들기</window.CTA>
          </div>
        </div>
      )}
    </div>
  );
}

function SeriesOption({ c, selected, onPick, dot, title, desc, progress }) {
  return (
    <button type="button" role="option" aria-selected={selected} onClick={onPick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left',
        padding: '8px 9px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: selected ? c.surfaceAlt : 'transparent',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = c.hover; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
      <span aria-hidden style={{
        width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0,
        background: dot || 'transparent', border: dot ? 'none' : `1px dashed ${c.inkSubtle}`,
      }} />
      <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontFamily: F().sans, fontSize: 13, fontWeight: selected ? 600 : 500, color: c.ink, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          {progress && <span style={{ fontFamily: F().mono, fontSize: 10.5, color: c.inkSubtle, fontVariantNumeric: 'tabular-nums' }}>{progress}</span>}
          {selected && <span aria-hidden style={{ fontSize: 11, color: c.ink }}>✓</span>}
        </span>
        <span style={{
          fontFamily: F().sans, fontSize: 11.5, color: c.inkMuted, letterSpacing: '-0.005em',
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 1, overflow: 'hidden',
        }}>{desc}</span>
      </span>
    </button>
  );
}

function fieldInput(c) {
  return {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    background: c.surface, color: c.ink, border: `1px solid ${c.border}`,
    fontFamily: F().sans, fontSize: 13, outline: 'none', letterSpacing: '-0.01em',
  };
}

Object.assign(window, { CategoryField, SeriesField });
