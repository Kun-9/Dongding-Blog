// Page: Manage — 글 관리. 발행글·검토·초안을 한 목록에서 상태로 가른다.
// 관리자 전용. #/manage 는 전체, #/drafts 는 초안만 켠 같은 화면.

const { useState: useStateMG, useMemo: useMemoMG, useEffect: useEffectMG } = React;

const MG_TODAY = '2026-04-27'; // 시안 기준일 — 실제 서비스에선 new Date()
function mgDays(d) { return Math.round((Date.parse(MG_TODAY) - Date.parse(d)) / 86400000); }

// 시안 데이터: 발행 목록 중 하나는 비공개로 둔다 — 관리 화면에서만 보이는 상태.
const MG_PRIVATE = ['spring-boot-3-aot'];

const MG_STATUS = {
  published: { label: '발행', glyph: '●' },
  private: { label: '비공개', glyph: '◑' },
  review: { label: '검토', glyph: '◐' },
  draft: { label: '초안', glyph: '○' },
};

function mgBuildRows() {
  const posts = window.DD_DATA.posts.map(p => ({
    key: p.slug, slug: p.slug, kind: 'post',
    title: p.title, excerpt: p.summary, category: p.category,
    status: MG_PRIVATE.includes(p.slug) ? 'private' : 'published',
    date: p.date, views: p.views || 0, likes: p.likes || 0, readTime: p.readTime,
  }));
  const drafts = window.DD_EXTRA.drafts.map(d => ({
    key: `d-${d.slug}`, slug: d.slug, kind: 'draft',
    title: d.title, excerpt: d.excerpt, category: d.category,
    status: d.status, date: d.updated, words: d.words,
  }));
  return [...posts, ...drafts];
}

function ManagePage({ c, t, onNav, preset }) {
  const [rows, setRows] = useStateMG(mgBuildRows);
  const [status, setStatus] = useStateMG(preset || 'all');
  const [cat, setCat] = useStateMG('all');
  const [q, setQ] = useStateMG('');
  const [sort, setSort] = useStateMG('recent');
  const [sel, setSel] = useStateMG(() => new Set());
  const [ask, setAsk] = useStateMG(null); // { kind, rows: [] }

  useEffectMG(() => { setStatus(preset || 'all'); setSel(new Set()); }, [preset]);

  const warm = t.dark ? '#c9926f' : '#9a6b45';
  const count = (k) => k === 'all' ? rows.length : rows.filter(r => r.status === k).length;

  const shown = useMemoMG(() => {
    const needle = q.trim().toLowerCase();
    const f = rows.filter(r =>
      (status === 'all' || r.status === status) &&
      (cat === 'all' || r.category === cat) &&
      (!needle || (r.title + ' ' + (r.excerpt || '')).toLowerCase().includes(needle))
    );
    const cmp = {
      recent: (a, b) => b.date.localeCompare(a.date),
      old: (a, b) => a.date.localeCompare(b.date),
      views: (a, b) => (b.views || 0) - (a.views || 0) || b.date.localeCompare(a.date),
    }[sort];
    return [...f].sort(cmp);
  }, [rows, status, cat, q, sort]);

  const selRows = shown.filter(r => sel.has(r.key));
  const allShownSelected = shown.length > 0 && selRows.length === shown.length;

  const toggle = (key) => setSel(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const toggleAll = () => setSel(allShownSelected ? new Set() : new Set(shown.map(r => r.key)));

  // 초안이 발행으로 넘어가면 발행글이 쓰는 숫자(조회·좋아요·읽는 시간)가 생긴다.
  const applyStatus = (targets, to) => {
    const keys = new Set(targets.map(r => r.key));
    const toDraft = to === 'draft' || to === 'review';
    setRows(prev => prev.map(r => {
      if (!keys.has(r.key)) return r;
      const next = { ...r, status: to, kind: toDraft ? r.kind : 'post' };
      if (!toDraft) {
        next.views = r.views || 0;
        next.likes = r.likes || 0;
        next.readTime = r.readTime || Math.max(1, Math.round((r.words || 0) / 700));
      }
      return next;
    }));
    setSel(new Set());
  };
  const removeRows = (targets) => {
    const keys = new Set(targets.map(r => r.key));
    setRows(prev => prev.filter(r => !keys.has(r.key)));
    setSel(new Set());
  };

  const seg = (activeKey, k) => ({
    padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
    background: activeKey === k ? c.surfaceAlt : 'transparent',
    color: activeKey === k ? c.ink : c.inkMuted,
    fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: activeKey === k ? 600 : 500,
    letterSpacing: '-0.005em', whiteSpace: 'nowrap',
  });
  const segWrap = { display: 'flex', gap: 2, padding: 2, borderRadius: 8, background: c.surface, border: `1px solid ${c.border}`, flexWrap: 'wrap' };

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '40px var(--gut) 0' }}>
      <header style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(27px, 6vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, color: c.ink }}>글 관리</h1>
          <p style={{ margin: '10px 0 0', fontSize: 14.5, color: c.inkMuted, lineHeight: 1.6, maxWidth: 540 }}>
            발행 {count('published')} · 비공개 {count('private')} · 검토 {count('review')} · 초안 {count('draft')}. 상태만 바꾸면 되는 일은 여기서 끝냅니다.
          </p>
        </div>
        <button onClick={() => onNav('studio')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 13px 7px 11px', borderRadius: 999,
          background: c.ink, color: c.bg, border: 'none', cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600,
          letterSpacing: '-0.005em', whiteSpace: 'nowrap',
        }}><span style={{ fontSize: 14, lineHeight: 1, fontWeight: 400 }}>＋</span> 새 글</button>
      </header>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={segWrap}>
          {[['all', '전체'], ['published', '발행'], ['review', '검토'], ['draft', '초안'], ['private', '비공개']].map(([k, label]) => (
            <button key={k} onClick={() => { setStatus(k); setSel(new Set()); }} style={seg(status, k)}>
              {label} <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, opacity: 0.7 }}>{count(k)}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·요약 검색" style={{
            width: 190, padding: '7px 11px', borderRadius: 8,
            background: c.surface, border: `1px solid ${c.border}`, color: c.ink,
            fontFamily: window.DD_FONTS.sans, fontSize: 12.5, outline: 'none', letterSpacing: '-0.005em',
          }} />
          <div style={segWrap}>
            {[['recent', '최근순'], ['old', '오래된 순'], ['views', '조회순']].map(([k, label]) => (
              <button key={k} onClick={() => setSort(k)} style={seg(sort, k)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[{ id: 'all', name: '모든 분류' }, ...window.DD_DATA.categories].map(x => (
          <button key={x.id} onClick={() => setCat(x.id)} style={{
            padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${cat === x.id ? c.borderStrong : c.border}`,
            background: cat === x.id ? c.surfaceAlt : 'transparent',
            color: cat === x.id ? c.ink : c.inkMuted,
            fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: cat === x.id ? 600 : 500,
            letterSpacing: '-0.005em', whiteSpace: 'nowrap',
          }}>{x.name}</button>
        ))}
      </div>

      {/* List header / bulk bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 38,
        padding: '0 12px 9px 8px', borderBottom: `1px solid ${c.border}`,
      }}>
        <MgCheck c={c} checked={allShownSelected} onClick={toggleAll} />
        {selRows.length === 0 ? (
          <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11.5, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{shown.length}편</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 600, color: c.ink }}>{selRows.length}편 선택됨</span>
            <MgAction c={c} onClick={() => applyStatus(selRows, 'published')}>발행</MgAction>
            <MgAction c={c} onClick={() => applyStatus(selRows, 'private')}>비공개</MgAction>
            <MgAction c={c} color={t.dark ? '#d99a8c' : '#a04a3a'} onClick={() => setAsk({ kind: 'delete', rows: selRows })}>삭제</MgAction>
            <button onClick={() => setSel(new Set())} style={{ background: 'none', border: 'none', color: c.inkMuted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>선택 해제</button>
          </div>
        )}
      </div>

      {shown.length === 0 && (
        <div style={{ padding: '56px 20px', textAlign: 'center', color: c.inkMuted, fontSize: 14, lineHeight: 1.7 }}>
          이 조건에 맞는 글이 없습니다.<br />
          <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12 }}>필터를 하나 풀어 보세요.</span>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 64px' }}>
        {shown.map(r => (
          <MgRow key={r.key} r={r} c={c} t={t} warm={warm} onNav={onNav}
            selected={sel.has(r.key)} onToggle={() => toggle(r.key)}
            onStatus={(to) => applyStatus([r], to)}
            onDelete={() => setAsk({ kind: 'delete', rows: [r] })} />
        ))}
      </ul>

      <window.ConfirmDialog
        open={!!ask} c={c} t={t} tone="danger"
        title={ask?.rows.length > 1 ? `${ask.rows.length}편을 삭제할까요?` : '이 글을 삭제할까요?'}
        body="삭제한 글은 되돌릴 수 없습니다. 확신이 없다면 비공개로 내려 두는 편이 안전합니다."
        meta={ask && (ask.rows.length > 1
          ? <span>{ask.rows.slice(0, 3).map(r => r.title).join(' · ')}{ask.rows.length > 3 ? ` 외 ${ask.rows.length - 3}편` : ''}</span>
          : <span>{ask.rows[0].title} · /posts/{ask.rows[0].slug}</span>)}
        confirmLabel="삭제"
        onCancel={() => setAsk(null)}
        onConfirm={() => { removeRows(ask.rows); setAsk(null); }}
      />
    </main>
  );
}

function MgRow({ r, c, t, warm, onNav, selected, onToggle, onStatus, onDelete }) {
  const [hover, setHover] = useStateMG(false);
  const st = MG_STATUS[r.status];
  const cat = window.DD_DATA.categories.find(x => x.id === r.category);
  const isDraft = r.status === 'draft' || r.status === 'review';
  const words = r.words || 0;
  const days = mgDays(r.date);
  const stale = isDraft && days > 30;

  return (
    <li
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="dd-mgrow"
      style={{
        display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) auto',
        gap: 12, alignItems: 'start', padding: '14px 12px 14px 8px',
        borderBottom: `1px solid ${c.border}`,
        background: selected ? c.surfaceAlt : hover ? c.hover : 'transparent',
        transition: 'background 0.14s',
      }}>
      <div style={{ paddingTop: 3 }}><MgCheck c={c} checked={selected} onClick={onToggle} /></div>

      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => onNav(r.kind === 'draft' ? 'studio' : `post:${r.slug}`)}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span title={st.label} style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: r.status === 'published' ? c.inkSoft : warm }}>{st.glyph}</span>
          <span style={{ fontFamily: window.DD_FONTS.sans, fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: c.ink, lineHeight: 1.35 }}>{r.title}</span>
          {r.status !== 'published' && (
            <span style={{
              fontFamily: window.DD_FONTS.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              padding: '2px 7px', borderRadius: 4, color: warm,
              background: t.dark ? 'rgba(168,129,74,0.16)' : 'rgba(220,178,118,0.2)',
            }}>{st.label}</span>
          )}
        </div>
        <p style={{
          margin: '5px 0 0', fontSize: 13.5, color: c.inkSoft, lineHeight: 1.6,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 1, overflow: 'hidden',
        }}>{r.excerpt}</p>
        <div style={{
          marginTop: 7, display: 'flex', gap: 10, flexWrap: 'wrap',
          fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, fontVariantNumeric: 'tabular-nums',
        }}>
          <span>{cat ? cat.name : r.category}</span>
          {isDraft ? <span>{words.toLocaleString()}자</span> : <span>{r.readTime || 1}분</span>}
          <span>{isDraft ? '수정' : '발행'} {window.fmtDate(r.date)}</span>
          {!isDraft && <span>조회 {(r.views || 0).toLocaleString()}</span>}
          {!isDraft && <span>♡ {r.likes || 0}</span>}
          {isDraft && <span style={{ color: stale ? warm : c.inkMuted }}>{days}일째</span>}
        </div>
      </div>

      <div className="dd-hoveronly dd-mgactions" style={{
        display: 'flex', gap: 4, paddingTop: 2, opacity: hover || selected ? 1 : 0,
        pointerEvents: hover || selected ? 'auto' : 'none', transition: 'opacity 0.14s',
      }}>
        <MgAction c={c} onClick={() => onNav('studio')}>{isDraft ? '이어쓰기' : '수정'}</MgAction>
        {r.status === 'published'
          ? <MgAction c={c} onClick={() => onStatus('private')}>비공개</MgAction>
          : <MgAction c={c} onClick={() => onStatus('published')}>발행</MgAction>}
        <MgAction c={c} color={t.dark ? '#d99a8c' : '#a04a3a'} onClick={onDelete}>삭제</MgAction>
      </div>
    </li>
  );
}

function MgCheck({ c, checked, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={checked} style={{
      width: 16, height: 16, padding: 0, borderRadius: 4, cursor: 'pointer',
      border: `1px solid ${checked ? c.ink : c.borderStrong}`,
      background: checked ? c.ink : 'transparent', color: c.bg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, lineHeight: 1, flex: '0 0 auto',
    }}>{checked ? '✓' : ''}</button>
  );
}

function MgAction({ c, color, onClick, children }) {
  return (
    <button onClick={onClick} className="dd-iconbtn" style={{
      padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
      background: c.bg, border: `1px solid ${c.border}`,
      color: color || c.inkSoft, fontFamily: window.DD_FONTS.sans,
      fontSize: 11.5, fontWeight: 500, letterSpacing: '-0.005em', whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

Object.assign(window, { ManagePage });
