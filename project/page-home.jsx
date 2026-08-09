// Page: Home — Hero + Featured + Recent grid + Categories.

const { useMemo: useMemoH } = React;

function HomePage({ c, t, onNav, setTweak }) {
  const data = window.DD_DATA;
  const featured = data.posts.find(p => p.featured) || data.posts[0];
  const recent = data.posts.filter(p => p.slug !== featured.slug).slice(0, 6);

  const heroVariant = t.heroStyle || 'editorial'; // 'editorial' | 'minimal' | 'kr-display'

  return (
    <main>
      {/* Hero */}
      <section style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '64px var(--gut) 32px' }}>

        {heroVariant === 'editorial' && (
          <div style={{ position: 'relative', maxWidth: 720 }}>
            <div style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: c.inkMuted, marginBottom: 14,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              whiteSpace: 'nowrap',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#5d8a66' }} />
              ISSUE 12 · APRIL 2026
            </div>
            <h1 style={{
              margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(34px, 8.5vw, 56px)', fontWeight: 600,
              letterSpacing: '-0.04em', lineHeight: 1.05, color: c.ink,
            }}>안녕하세요,<br/>{data.author}입니다.</h1>
            <p style={{
              margin: '18px 0 28px', fontSize: 18, lineHeight: 1.7, color: c.inkSoft,
              fontFamily: window.DD_FONTS.sans, maxWidth: 580, letterSpacing: '-0.005em',
            }}>실무에서 마주친 <window.IC c={c}>Spring</window.IC>, <window.IC c={c}>Oracle</window.IC>, 분산 서비스 공통 계층 설계, 그리고 AI를 실무에 녹이는 고민까지 — 끝까지 파고든 기록을 천천히 읽힐도록 씁니다.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <window.CTA c={c} dark href="#/posts" onClick={(e) => { e.preventDefault(); onNav('posts'); }}>최근 글 →</window.CTA>
              <window.CTA c={c} dark={false} href="#/about" onClick={(e) => { e.preventDefault(); onNav('about'); }}>About</window.CTA>
            </div>
          </div>
        )}

        {heroVariant === 'minimal' && (
          <div style={{ position: 'relative', maxWidth: 600 }}>
            <h1 style={{
              margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 32, fontWeight: 600,
              letterSpacing: '-0.025em', lineHeight: 1.3, color: c.ink,
            }}>{data.author} · 개발 노트</h1>
            <p style={{ margin: '12px 0 0', fontSize: 16, color: c.inkMuted, lineHeight: 1.7 }}>
              {data.bio}
            </p>
          </div>
        )}

        {heroVariant === 'kr-display' && (
          <div style={{ position: 'relative' }}>
            <div style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(52px, 15vw, 96px)', fontWeight: 700,
              letterSpacing: '-0.05em', lineHeight: 0.95, color: c.ink,
              maxWidth: 900,
            }}>천천히<br/>깊게.</div>
            <p style={{ margin: '24px 0 28px', fontSize: 17, color: c.inkSoft, maxWidth: 540, lineHeight: 1.7 }}>
              실무 백엔드 개발자의 노트. 빠르게 훑기 위해서가 아니라, 한 번 깊이 이해하기 위해 쓰는 글.
            </p>
            <window.CTA c={c} dark href="#/posts" onClick={(e) => { e.preventDefault(); onNav('posts'); }}>읽기 시작 →</window.CTA>
          </div>
        )}
      </section>

      {/* Featured post */}
      <section style={{ maxWidth: 1180, margin: '24px auto 0', padding: '0 var(--gut)' }}>
        <div style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: c.inkMuted, paddingBottom: 12, borderBottom: `1px solid ${c.border}`,
          marginBottom: 24,
        }}>Featured</div>
        <div role="link" tabIndex={0} className="dd-featured"
          onClick={() => onNav(`post:${featured.slug}`)}
          onKeyDown={(e) => { if (e.key === 'Enter') onNav(`post:${featured.slug}`); }}
          style={{
            gap: 32, alignItems: 'center',
            padding: '8px 0 28px', cursor: 'pointer',
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.inkMuted, marginBottom: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              <span>{window.fmtDate(featured.date)}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{featured.readTime}분 읽기</span>
            </div>
            <h2 style={{
              margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(26px, 5.5vw, 36px)', fontWeight: 600,
              letterSpacing: '-0.03em', lineHeight: 1.2, color: c.ink, textWrap: 'pretty',
            }}>
              <a href="#" onClick={(e) => { e.preventDefault(); onNav(`post:${featured.slug}`); }} style={{ color: 'inherit', textDecoration: 'none' }}>{featured.title}</a>
            </h2>
            <p style={{ margin: '14px 0 16px', fontSize: 16, color: c.inkSoft, lineHeight: 1.7 }}>
              {featured.summary}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {featured.tags.map(tag => <window.TagChip key={tag} tag={tag} c={c} />)}
            </div>
          </div>
          {/* Lead figure — 썸네일 > 시리즈 진행 > 카테고리·태그 타이포 */}
          <LeadFigure post={featured} c={c} />
        </div>
      </section>

      {/* Recent grid */}
      <section style={{ maxWidth: 1180, margin: '40px auto 0', padding: '0 var(--gut)' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingBottom: 12, borderBottom: `1px solid ${c.border}`, marginBottom: 24,
        }}>
          <div style={{
            fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted,
          }}>Recent</div>
          <a href="#/posts" onClick={(e) => { e.preventDefault(); onNav('posts'); }} style={{
            fontSize: 13, color: c.inkMuted, textDecoration: 'none', fontWeight: 500,
          }}>전체 보기 →</a>
        </div>
        <div className="dd-g3" style={{ gap: 18 }}>
          {recent.map(p => <window.PostCard key={p.slug} post={p} c={c} t={t} layout={t.cardLayout || 'card'} onNav={onNav} />)}
        </div>
      </section>

      {/* Trending — 최근 7일 조회수 상위 */}
      <TrendingSection c={c} onNav={onNav} />

      {/* Categories */}
      <section style={{ maxWidth: 1180, margin: '64px auto 0', padding: '0 var(--gut)' }}>
        <div style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted,
          paddingBottom: 12, borderBottom: `1px solid ${c.border}`, marginBottom: 24,
        }}>Categories</div>
        <div className="dd-g5" style={{ gap: 12 }}>
          {window.DD_DATA.categories.map(cat => (
            <a key={cat.id} href={`#/category/${cat.id}`}
               onClick={(e) => { e.preventDefault(); onNav(`category:${cat.id}`); }}
               style={{
                 display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                 minHeight: 110, padding: 18, borderRadius: 12,
                 background: c.surface, border: `1px solid ${c.border}`,
                 textDecoration: 'none', color: 'inherit',
                 transition: 'border-color 0.18s, transform 0.18s',
               }}
               onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.transform = 'translateY(-2px)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = 'none'; }}
            >
              <div>
                <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 16, fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: 12, color: c.inkMuted, marginTop: 4, lineHeight: 1.5 }}>{cat.desc}</div>
              </div>
              <div style={{ fontSize: 12, color: c.inkMuted, fontVariantNumeric: 'tabular-nums', marginTop: 12 }}>
                {cat.count} 편 →
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

// ── LeadFigure — 홈 Featured 오른쪽 리드 그림 ─────────────────────────────
// 우선순위는 썸네일 > 시리즈 진행 인디케이터 > 카테고리·태그 타이포다. 앞의 둘은 글마다
// 실제로 다른 정보를 담고, 마지막은 어떤 글이든 성립하는 폴백이라 "그릴 게 없어서 빈 상자"가 없다.
function leadFrame(c) {
  return {
    position: 'relative', aspectRatio: '4/3', borderRadius: 12,
    border: `1px solid ${c.border}`, background: c.surface, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function LeadStripes({ c }) {
  return <div aria-hidden style={{
    position: 'absolute', inset: 0, opacity: 0.55,
    background: `repeating-linear-gradient(180deg, transparent 0 18px, ${c.surfaceAlt} 18px 19px)`,
  }} />;
}

// slug 를 색조로 접는다(FNV-1a). 글마다 다른 색이 나오되 재배포해도 같은 색이 유지된다.
function hueOf(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) { h ^= slug.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 360;
}

function LeadFigure({ post, c }) {
  const ctx = window.DD_SERIES_CTX(post);

  if (post.thumbnail) {
    return (
      <div style={leadFrame(c)}>
        <img src={post.thumbnail} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  if (ctx) {
    return (
      <div style={leadFrame(c)}>
        <LeadStripes c={c} />
        <div style={{ position: 'relative', width: '100%', height: '100%', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em', color: c.inkMuted }}>{ctx.title}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 66, fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.05em', color: c.ink, fontVariantNumeric: 'tabular-nums' }}>
              {String(ctx.currentOrder).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 13, color: c.inkMuted }}>/ {String(ctx.total).padStart(2, '0')}</span>
          </div>
          <div style={{ display: 'grid', gap: 5, gridTemplateColumns: `repeat(${ctx.total}, 1fr)` }}>
            {Array.from({ length: ctx.total }, (_, i) => (
              <span key={i} style={{ height: 3, borderRadius: 2, background: c.ink, opacity: i + 1 === ctx.currentOrder ? 1 : 0.16 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cat = window.DD_DATA.categories.find(x => x.id === post.category);
  const heading = cat ? cat.name : post.category.split('-')[0].toUpperCase();
  const tags = post.tags.slice(0, 4);
  return (
    <div style={leadFrame(c)}>
      <LeadStripes c={c} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(120% 90% at 50% 0%, hsl(${hueOf(post.slug)} 38% 55% / 0.1), transparent 70%)`,
      }} />
      <div style={{ position: 'relative', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.04em', color: c.ink }}>{heading}</div>
        {tags.length > 0 && (
          <>
            <div style={{ width: 34, height: 1, margin: '12px auto', background: c.borderStrong, opacity: 0.5 }} />
            <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, lineHeight: 1.9, color: c.inkMuted, wordBreak: 'keep-all' }}>{tags.join(' · ')}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Trending — Umami 상위 URL × 글 메타. 집계가 비면 섹션 자체가 나오지 않는다. ───
function TrendingSection({ c, onNav }) {
  const items = window.DD_DATA.posts
    .filter(p => p.views)
    .slice()
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
  if (!items.length) return null;

  return (
    <section style={{ maxWidth: 1180, margin: '64px auto 0', padding: '0 var(--gut)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        paddingBottom: 12, borderBottom: `1px solid ${c.border}`, marginBottom: 24,
      }}>
        <div style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted,
        }}>Trending</div>
        <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted }}>최근 7일</div>
      </div>
      <ol className="dd-g2" style={{ margin: 0, padding: 0, listStyle: 'none', gap: '0 32px' }}>
        {items.map((p, i) => (
          <li key={p.slug} style={{
            display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'baseline', gap: 12,
            padding: '12px 0', borderBottom: `1px solid ${c.border}`,
          }}>
            <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
            <a href={`#/posts/${p.slug}`} onClick={(e) => { e.preventDefault(); onNav(`post:${p.slug}`); }} style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 14.5, fontWeight: 500, letterSpacing: '-0.01em',
              color: c.ink, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{p.title}</a>
            <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{p.views.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

window.HomePage = HomePage;
