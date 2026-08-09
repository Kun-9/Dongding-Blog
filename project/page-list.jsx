// Page: Post List, Tag, Category — all share filtered list logic.

function PostListPage({ c, t, onNav, filter }) {
  // filter: { type: 'all' | 'category' | 'tag', value: id }
  const all = window.DD_DATA.posts;
  const filtered = filter?.type === 'category'
    ? all.filter(p => p.category === filter.value)
    : filter?.type === 'tag'
    ? all.filter(p => p.tags.includes(filter.value))
    : all;

  const cat = filter?.type === 'category' ? window.DD_DATA.categories.find(x => x.id === filter.value) : null;
  const layout = t.cardLayout || 'card';

  // Title block per filter type
  let title, sub, eyebrow;
  if (filter?.type === 'category' && cat) {
    eyebrow = 'CATEGORY';
    title = cat.name;
    sub = `${cat.desc} · ${filtered.length}편`;
  } else if (filter?.type === 'tag') {
    eyebrow = 'TAG';
    title = `#${filter.value}`;
    sub = `이 태그가 붙은 글 ${filtered.length}편`;
  } else {
    eyebrow = 'ARCHIVE';
    title = '모든 글';
    sub = `전체 ${all.length}편의 노트`;
  }

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  // Group by year
  const byYear = {};
  sorted.forEach(p => {
    const y = p.date.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(p);
  });
  const years = Object.keys(byYear).sort().reverse();

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '64px var(--gut) 0' }}>
      <div className="dd-listcols" style={{ gap: 48 }}>
        {/* Left: category tree sidebar */}
        <window.CategorySidebar c={c} filter={filter} onNav={onNav} />

        {/* Right: list */}
        <div>
          <header style={{ paddingBottom: 24, borderBottom: `1px solid ${c.border}`, marginBottom: 28 }}>
            <div style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: c.inkMuted, marginBottom: 10,
            }}>{eyebrow}</div>
            <h1 style={{
              margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(29px, 7vw, 40px)', fontWeight: 600,
              letterSpacing: '-0.035em', lineHeight: 1.05, color: c.ink,
            }}>{title}</h1>
            <p style={{ margin: '10px 0 0', fontSize: 15, color: c.inkMuted, lineHeight: 1.6 }}>{sub}</p>
          </header>

          {/* Posts grouped by year */}
          <div style={{ paddingBottom: 32 }}>
            {years.map(y => (
              <section key={y} style={{ marginBottom: 32 }}>
                <div style={{
                  fontFamily: window.DD_FONTS.mono, fontSize: 13, fontWeight: 600,
                  color: c.inkMuted, marginBottom: 12, fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                }}>{y}</div>
                {layout === 'card' ? (
                  <div className="dd-g2" style={{ gap: 14 }}>
                    {byYear[y].map(p => <window.PostCard key={p.slug} post={p} c={c} t={t} layout="card" onNav={onNav} />)}
                  </div>
                ) : (
                  <div>
                    {byYear[y].map(p => <window.PostCard key={p.slug} post={p} c={c} t={t} layout={layout} onNav={onNav} />)}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

window.PostListPage = PostListPage;
