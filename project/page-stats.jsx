// Pages: Admin Stats (Umami 공유 링크 기반) · Login.
// Ports of src/app/admin/stats/page.tsx and src/app/login/page.tsx.

const { useState: useStateS, useMemo: useMemoS } = React;

// 시안용 고정 시드 — 실제로는 /api/stats/* 프록시가 Umami 를 읽는다.
function fakeSeries(days) {
  const out = [];
  const today = new Date('2026-04-27');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // 주말엔 덜 읽힌다. 나머지는 seed 로 흔들어 준다.
    const dow = d.getDay();
    const base = dow === 0 || dow === 6 ? 120 : 320;
    const seed = (d.getDate() * 37 + d.getMonth() * 11) % 100;
    out.push({ x: key, y: Math.round(base + seed * 2.4) });
  }
  return out;
}

function PageviewChart({ c, data, max }) {
  const W = 600, H = 96, padX = 4, padY = 8;
  const innerW = W - padX * 2, innerH = H - padY * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const pts = data.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (p.y / max) * innerH,
    v: p.y, k: p.x,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `M ${padX} ${padY + innerH} ` + pts.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${padX + innerW} ${padY + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="일별 페이지뷰 추이"
      style={{ display: 'block', width: '100%', height: 96, overflow: 'visible' }}>
      <line x1={padX} x2={padX + innerW} y1={padY + innerH} y2={padY + innerH} stroke={c.border} strokeWidth="1" />
      <path d={area} fill={c.ink} opacity="0.07" />
      <path d={line} fill="none" stroke={c.ink} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(p => p.v > 0 ? <circle key={p.k} cx={p.x} cy={p.y} r="2.4" fill={c.ink}><title>{`${p.k}: ${p.v}`}</title></circle> : null)}
    </svg>
  );
}

function StatsPage({ c, t, onNav }) {
  const [days, setDays] = useStateS(7);
  const series = useMemoS(() => fakeSeries(days), [days]);
  const max = Math.max(1, ...series.map(p => p.y));
  const pageviews = series.reduce((a, p) => a + p.y, 0);
  const visits = Math.round(pageviews * 0.62);
  const visitors = Math.round(pageviews * 0.44);
  const bounces = Math.round(visits * 0.38);

  const cards = [
    { label: '방문자', value: visitors },
    { label: '페이지뷰', value: pageviews },
    { label: '세션', value: visits },
    { label: '이탈률', value: `${Math.round((bounces / visits) * 100)}%` },
  ];

  const tables = [
    { title: 'Top Pages', data: [
      ['/posts/jpa-n-plus-1', 1284], ['/', 962], ['/posts/interview-cs', 741],
      ['/posts/spring-tx-propagation', 588], ['/posts', 402], ['/about', 264],
      ['/posts/mysql-index-internals', 231], ['/series', 118],
    ] },
    { title: 'Top Referrers', data: [
      ['', 1420], ['google.com', 863], ['news.hada.io', 402],
      ['x.com', 271], ['github.com', 148], ['okky.kr', 96],
    ] },
    { title: 'Top Events', data: [
      ['copy-code', 312], ['like', 188], ['toc-click', 141],
      ['search-open', 97], ['email-copy', 34],
    ] },
  ];

  const card = {
    borderRadius: 12, border: `1px solid ${c.border}`, background: c.surface,
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px var(--gut) 0' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <div>
          <div style={{
            fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 8,
          }}>Admin · Stats</div>
          <h1 style={{
            margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(27px, 6vw, 36px)', fontWeight: 600,
            letterSpacing: '-0.03em', color: c.ink,
          }}>통계</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, fontFamily: window.DD_FONTS.mono, fontSize: 12 }}>
          {[7, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '4px 12px', borderRadius: 999, cursor: 'pointer', font: 'inherit',
              border: `1px solid ${days === d ? c.borderStrong : c.border}`,
              background: 'transparent', color: days === d ? c.ink : c.inkMuted,
            }}>{d}일</button>
          ))}
        </div>
      </header>

      <section className="dd-g4" style={{ gap: 14, marginBottom: 32 }}>
        {cards.map(s => (
          <div key={s.label} style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: 500, color: c.inkMuted }}>{s.label}</div>
            <div style={{
              margin: '4px 0', fontFamily: window.DD_FONTS.sans, fontSize: 28, fontWeight: 700,
              lineHeight: 1, letterSpacing: '-0.03em', color: c.ink, fontVariantNumeric: 'tabular-nums',
            }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
          </div>
        ))}
      </section>

      <section style={{ ...card, padding: '20px 22px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600, color: c.ink }}>일별 페이지뷰</div>
          <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            최근 {days}일 · peak {max.toLocaleString()}
          </div>
        </div>
        <PageviewChart c={c} data={series} max={max} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 8,
          fontFamily: window.DD_FONTS.mono, fontSize: 10, color: c.inkMuted, fontVariantNumeric: 'tabular-nums',
        }}>
          <span>{series[0]?.x.slice(5)}</span>
          <span>{series[Math.floor(series.length / 2)]?.x.slice(5)}</span>
          <span>{series[series.length - 1]?.x.slice(5)}</span>
        </div>
      </section>

      <section className="dd-g3" style={{ gap: 16 }}>
        {tables.map(tbl => (
          <div key={tbl.title} style={{ ...card, padding: '16px 18px' }}>
            <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600, color: c.ink, marginBottom: 10 }}>{tbl.title}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {tbl.data.map(([label, n], i) => (
                <li key={label || 'direct'} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '6px 0',
                  fontSize: 12.5, borderTop: i === 0 ? 'none' : `1px solid ${c.border}`,
                }}>
                  <span style={{ color: c.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || '(direct)'}</span>
                  <span style={{ fontFamily: window.DD_FONTS.mono, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{n.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}

// ── Login — Studio/Admin 진입용. 공개 가입은 막혀 있어 계정은 관리자 하나뿐. ──
function LoginPage({ c, t, onNav, setTweak, next = 'studio' }) {
  const [error, setError] = useStateS(false);

  const field = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: `1px solid ${c.border}`, background: c.surface,
    fontFamily: window.DD_FONTS.sans, fontSize: 14, color: c.ink, outline: 'none',
  };

  const submit = (e) => {
    e.preventDefault();
    const pw = e.target.password.value;
    if (!pw) { setError(true); return; }
    setTweak('viewer', 'admin');
    onNav(next);
  };

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '112px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{
        fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 24,
      }}>Studio</div>
      <h1 style={{
        margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 32, fontWeight: 600,
        letterSpacing: '-0.03em', lineHeight: 1.15, color: c.ink,
      }}>로그인</h1>
      <p style={{ margin: '12px 0 32px', fontSize: 14, lineHeight: 1.6, color: c.inkMuted }}>
        글을 쓰거나 고치려면 로그인이 필요합니다.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: window.DD_FONTS.sans, fontSize: 12.5, color: c.inkSoft }}>이메일</span>
          <input style={field} type="email" name="email" autoComplete="username" defaultValue={window.DD_DATA.social.email} required />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: window.DD_FONTS.sans, fontSize: 12.5, color: c.inkSoft }}>비밀번호</span>
          <input style={field} type="password" name="password" autoComplete="current-password" required />
        </label>

        {error && <p style={{ margin: 0, fontSize: 13, color: '#c0563f' }}>이메일 또는 비밀번호가 맞지 않습니다.</p>}

        <button type="submit" style={{
          marginTop: 8, padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${c.border}`, background: c.ink, color: c.bg,
          fontFamily: window.DD_FONTS.sans, fontSize: 14, fontWeight: 500,
        }}>로그인</button>
      </form>
    </main>
  );
}

Object.assign(window, { StatsPage, LoginPage });
