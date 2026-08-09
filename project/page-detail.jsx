// Page: Post Detail — featured article with TOC, callouts, code blocks.

function PostDetailPage({ c, t, slug, onNav }) {
  const post = window.DD_DATA.posts.find(p => p.slug === slug) || window.DD_DATA.posts[0];
  const cat = window.DD_DATA.categories.find(x => x.id === post.category);
  const idx = window.DD_DATA.posts.findIndex(p => p.slug === post.slug);
  const prev = window.DD_DATA.posts[idx + 1];
  const next = window.DD_DATA.posts[idx - 1];
  const articleRef = React.useRef(null);

  const codeStyle = t.codeStyle || 'card';
  const fontSize = t.bodySize || 17;
  const maxWidth = t.bodyWidth || 700;

  const toc = window.DD_POST_BODY.toc;
  const seriesCtx = window.DD_SERIES_CTX(post);

  const javaCode = `@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = LAZY)
    private Member member;

    @OneToMany(mappedBy = "order")
    private List<OrderItem> items = new ArrayList<>();
}`;

  const fetchJoinCode = `// 페이징과 함께 쓰면 경고가 난다
SELECT DISTINCT o
FROM Order o
JOIN FETCH o.items
WHERE o.status = 'PAID'
ORDER BY o.createdAt DESC`;

  const batchSizeCode = `// application.yml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100  # 조회 시 한 번에 100개씩 IN으로 묶어 가져옴`;

  // Prose paragraph helper
  const P = ({ children }) => (
    <p style={{
      margin: '0 0 1.4em', fontSize, lineHeight: 1.85,
      color: c.inkSoft, letterSpacing: '-0.005em', textWrap: 'pretty',
    }}>{children}</p>
  );
  const H2 = ({ id, children }) => (
    <h2 id={id} style={{
      margin: '2.4em 0 0.7em', fontFamily: window.DD_FONTS.sans,
      fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.3,
      color: c.ink, scrollMarginTop: 80,
    }}>{children}</h2>
  );
  const H3 = ({ id, children }) => (
    <h3 id={id} style={{
      margin: '2em 0 0.5em', fontFamily: window.DD_FONTS.sans,
      fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.35,
      color: c.ink, scrollMarginTop: 80,
    }}>{children}</h3>
  );

  return (
    <main>
      <window.ReadingProgress c={c} target={articleRef} />
      <div className="dd-detailcols" style={{
        maxWidth: 1180, margin: '0 auto', padding: '0 var(--gut)',
        '--bw': `${maxWidth}px`,
        gap: 64, justifyContent: 'center',
      }}>
        {/* Article column */}
        <article ref={articleRef} style={{ paddingTop: 56, paddingBottom: 32 }}>
          {/* Breadcrumb */}
          <div style={{
            fontFamily: window.DD_FONTS.sans, fontSize: 12, color: c.inkMuted,
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <a href="#/" onClick={(e) => { e.preventDefault(); onNav('home'); }} style={{ color: c.inkMuted, textDecoration: 'none' }}>Home</a>
            <span style={{ opacity: 0.4 }}>/</span>
            <a href={`#/category/${cat?.id}`} onClick={(e) => { e.preventDefault(); onNav(`category:${cat.id}`); }} style={{ color: c.inkMuted, textDecoration: 'none' }}>{cat?.name}</a>
          </div>

          {t.isAdmin && (
            <AdminBar c={c} t={t} post={post} onNav={onNav} />
          )}

          {seriesCtx && <SeriesBanner c={c} ctx={seriesCtx} onNav={onNav} />}

          <header style={{ marginBottom: 36 }}>
            <h1 style={{
              margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(29px, 7vw, 40px)', fontWeight: 600,
              letterSpacing: '-0.035em', lineHeight: 1.15, color: c.ink, textWrap: 'balance',
            }}>{post.title}</h1>
            <p style={{ margin: '14px 0 22px', fontSize: 17, color: c.inkMuted, lineHeight: 1.6, letterSpacing: '-0.005em' }}>
              {post.summary}
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, paddingTop: 16,
              borderTop: `1px solid ${c.border}`,
            }}>
              <window.Avatar size={36} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
                <div style={{ color: c.ink, fontWeight: 500 }}>{window.DD_DATA.author}</div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 1,
                  color: c.inkMuted, fontFamily: window.DD_FONTS.mono, fontVariantNumeric: 'tabular-nums',
                }}>
                  <span>{window.fmtDate(post.date)}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{post.readTime}분 읽기</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{(post.views || 0).toLocaleString()} views</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {post.tags.map(tag => <window.TagChip key={tag} tag={tag} c={c} size="sm" />)}
              </div>
            </div>
          </header>

          {/* Body */}
          <H2 id="problem">문제 상황</H2>
          <P>
            주문 목록 화면에서 갑자기 응답이 8초로 늘었다는 알람이 왔다. 페이지당 20건을 보여주는 단순한 화면이었는데, 쿼리 로그를 켜 보니
            한 페이지를 그릴 때마다 <window.IC c={c}>SELECT</window.IC> 쿼리가 60번 넘게 나가고 있었다. 우리 모두가 한 번씩은 만나는,
            이름도 친절하게 붙여둔 <strong style={{ color: c.ink, fontWeight: 600 }}>N+1 문제</strong>다.
          </P>
          <P>
            첫 본능은 당연히 <window.IC c={c}>fetch join</window.IC>이다. 사람들이 가장 먼저 권하는 답이고, 실제로 쿼리는 1개로 줄어든다.
            그런데 그게 정말로 정답인가? 이 글은 그 질문에 대한 1년간의 시행착오를 정리한 것이다.
          </P>

          <window.Callout kind="info" title="이 글이 다루는 범위" c={c}>
            Hibernate 6.x 기준이며, <window.IC c={c}>OneToMany</window.IC> 관계 위주로 본다. ManyToOne LAZY는 별도 장에서 다룰 것이다.
          </window.Callout>

          <H2 id="lazy">LAZY 로딩과 N+1</H2>
          <P>
            엔티티는 다음과 같이 정의되어 있다. 모든 연관관계는 LAZY로 잡혀있다 — 그게 좋은 기본값이다.
          </P>
          <window.CodeBlock c={c}
            filename="Order.java"
            lang="java"
            code={javaCode}
            highlight={[6, 9]}
            style={codeStyle}
          />
          <P>
            그러면 주문 20개를 가져오는 코드를 보자. <window.IC c={c}>orders.forEach(o {'->'} o.getItems().size())</window.IC> 같은
            식으로 컬렉션을 한 번이라도 건드리면, 그 순간 20번의 추가 쿼리가 나간다. 이게 N+1이다.
          </P>

          <H2 id="fetch-join">fetch join의 한계</H2>
          <P>
            JPQL에서 <window.IC c={c}>JOIN FETCH</window.IC>를 쓰면 단일 쿼리로 묶을 수 있다. 그런데 다음 코드에는 두 가지 함정이 있다.
          </P>
          <window.CodeBlock c={c}
            filename="OrderRepository.java"
            lang="jpql"
            code={fetchJoinCode}
            highlight={[3]}
            style={codeStyle}
          />

          <window.Callout kind="warning" title="MultipleBagFetchException" c={c}>
            <window.IC c={c}>List</window.IC>를 두 개 이상 fetch join 하면 Hibernate가 거부한다. <window.IC c={c}>Set</window.IC>으로 바꾸거나
            <window.IC c={c}>@OrderColumn</window.IC>을 쓰는 우회법이 있지만, 진짜 문제는 따로 있다 — 컬렉션을 fetch join 하는 순간 페이징이 메모리에서 일어난다는 것.
          </window.Callout>

          <window.LinkCard c={c} url="https://vladmihalcea.com/hibernate-multiplebagfetchexception" />

          <H3 id="paging">페이징과의 충돌</H3>
          <P>
            <window.IC c={c}>setMaxResults(20)</window.IC>을 호출해도 SQL에 LIMIT이 붙지 않는다. 대신 모든 행을 가져와서 애플리케이션 메모리에서
            잘라낸다. 데이터가 100만 건이라면? 100만 건이 다 올라오고, 그중 20건만 반환한다. 운영 환경에서 이건 사고다.
          </P>

          <H2 id="batch-size">BatchSize 전략</H2>
          <P>
            그래서 보통은 다음 절충안으로 간다 — <window.IC c={c}>ToOne</window.IC> 관계만 fetch join 하고,
            <window.IC c={c}>ToMany</window.IC>는 <window.IC c={c}>BatchSize</window.IC>로 묶는다.
          </P>
          <window.CodeBlock c={c}
            filename="application.yml"
            lang="yaml"
            code={batchSizeCode}
            style={codeStyle}
          />
          <window.Callout kind="tip" title="batch_fetch_size, 얼마가 적당한가" c={c}>
            너무 작으면 라운드트립이 늘고, 너무 크면 IN 절이 길어져 DB 옵티마이저가 헤맨다. 경험적으로는 100~500 사이가 안전하다.
            정확한 수치는 슬로우 쿼리 로그로 확인하자.
          </window.Callout>

          <H2 id="wrap">정리</H2>
          <P>
            결국 정답은 "fetch join이 정답이 아니라, 상황에 맞는 도구를 골라 쓰는 게 정답"이라는 평범한 결론이다.
            ToOne은 fetch join, ToMany는 BatchSize, 페이징이 진짜 필요한 곳에는 별도 쿼리. 셋을 머릿속에 두고 코드를 짜면 N+1은 거의 만나지 않는다.
          </P>

          <window.Callout kind="note" title="다음 글" c={c}>
            <window.IC c={c}>@EntityGraph</window.IC>는 fetch join을 좀 더 선언적으로 쓰는 방법이다. 다음 글에서 이걸 BatchSize와 어떻게 조합하는지 다룬다.
          </window.Callout>

          {seriesCtx && (
            <div style={{ marginTop: 40 }}>
              <SeriesStepNav c={c} ctx={seriesCtx} onNav={onNav} />
            </div>
          )}

          <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'center' }}>
            <LikeButton c={c} post={post} />
          </div>

          {/* Comments — Giscus-style */}
          <window.Comments c={c} t={t} />
        </article>

        {/* TOC sidebar */}
        <aside className="dd-toc-aside" style={{ paddingTop: 56 }}>
          <div style={{ position: 'sticky', top: 90, alignSelf: 'flex-start' }}>
            <window.TOC items={toc} c={c} sticky={false} />

            {/* Tags box — moves with TOC */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${c.border}` }}>
              <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 10 }}>Tags</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {post.tags.map(tag => <window.TagChip key={tag} tag={tag} c={c} size="sm" />)}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Prev/Next */}
      <section style={{ maxWidth: 1180, margin: '32px auto 0', padding: '0 var(--gut)' }}>
        {seriesCtx && (
          <div style={{
            marginBottom: 12, fontFamily: window.DD_FONTS.sans, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: c.inkMuted,
          }}>시간순 글 탐색</div>
        )}
        <div className="dd-g2" style={{ gap: 12 }}>
          {prev ? (
            <a href="#" onClick={(e) => { e.preventDefault(); onNav(`post:${prev.slug}`); }} style={{
              display: 'block', padding: 18, borderRadius: 12,
              background: c.surface, border: `1px solid ${c.border}`,
              textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 6 }}>← Previous</div>
              <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 15, fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>{prev.title}</div>
            </a>
          ) : <div />}
          {next ? (
            <a href="#" onClick={(e) => { e.preventDefault(); onNav(`post:${next.slug}`); }} style={{
              display: 'block', padding: 18, borderRadius: 12, textAlign: 'right',
              background: c.surface, border: `1px solid ${c.border}`,
              textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 6 }}>Next →</div>
              <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 15, fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>{next.title}</div>
            </a>
          ) : <div />}
        </div>
      </section>
    </main>
  );
}

window.PostDetailPage = PostDetailPage;

// ── Admin action bar (local-only, when t.isAdmin) ──────────────────────────
function AdminBar({ c, t, post, onNav }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null); // { kind, text } | null
  const toastTimer = React.useRef(null);

  const showToast = (kind, text) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, text });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const onDuplicate = () => {
    showToast('ok', `복제됨 — /posts/${post.slug}-copy`);
  };
  const onDelete = () => {
    setDeleteOpen(false);
    showToast('warn', `삭제됨 — 휴지통으로 이동 (30일 보관)`);
  };

  const status = post.status || 'published';
  const statusTone = {
    published: { bg: 'rgba(122,138,90,0.18)', fg: t.dark ? '#a8c08a' : '#5a6b3a', label: 'PUBLISHED' },
    draft:     { bg: 'rgba(168,129,74,0.16)', fg: t.dark ? '#d4a878' : '#7a5a2a', label: 'DRAFT' },
    private:   { bg: 'rgba(140,140,140,0.18)', fg: c.inkMuted, label: 'PRIVATE' },
  }[status] || { bg: 'rgba(140,140,140,0.18)', fg: c.inkMuted, label: status.toUpperCase() };

  const btn = (extra = {}) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 11px', borderRadius: 6,
    background: 'transparent', border: `1px solid ${c.border}`,
    color: c.inkSoft, cursor: 'pointer',
    fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 500,
    letterSpacing: '-0.005em', whiteSpace: 'nowrap',
    transition: 'border-color 0.12s, color 0.12s, background 0.12s',
    ...extra,
  });

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 14px', marginBottom: 24,
        borderRadius: 10, border: `1px dashed ${c.border}`,
        background: c.surfaceAlt, position: 'relative',
      }}>
        {/* Local mode badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingRight: 10, borderRight: `1px solid ${c.border}` }}>
          <span style={{
            width: 7, height: 7, borderRadius: 999, background: '#7a8a5a',
            boxShadow: '0 0 0 3px rgba(122,138,90,0.18)',
          }} />
          <span style={{
            fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted,
          }}>Local · Admin</span>
        </div>

        {/* Slug + status */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{
            fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>/posts/{post.slug}</span>
          <span style={{
            fontFamily: window.DD_FONTS.sans, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.04em', padding: '1.5px 6px', borderRadius: 4,
            background: statusTone.bg, color: statusTone.fg, whiteSpace: 'nowrap',
          }}>{statusTone.label}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onNav('studio')} style={btn()}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.color = c.ink; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.inkSoft; }}
          >✎ 수정</button>
          <button onClick={onDuplicate} style={btn()}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.color = c.ink; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.inkSoft; }}
          >⧉ 복제</button>
          <button onClick={() => setDeleteOpen(true)}
            style={btn({ color: t.dark ? '#d99a8c' : '#a04a3a' })}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = t.dark ? '#a35a4d' : '#c08070';
              e.currentTarget.style.background = t.dark ? 'rgba(163,90,77,0.10)' : 'rgba(160,74,58,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = c.border;
              e.currentTarget.style.background = 'transparent';
            }}
          >⌫ 삭제</button>
        </div>

        {/* Inline toast — bottom-right of AdminBar */}
        {toast && <AdminToast c={c} t={t} kind={toast.kind} text={toast.text} />}
      </div>

      {/* Delete confirmation */}
      <window.ConfirmDialog
        open={deleteOpen}
        tone="danger"
        title="이 글을 삭제할까요?"
        body={
          <>
            발행된 글을 삭제하면 외부 링크(소셜 공유, 검색 결과)에서{' '}
            <strong style={{ color: c.ink, fontWeight: 600 }}>404</strong>가 납니다.
            잠깐 내려두려는 거라면 <strong style={{ color: c.ink, fontWeight: 600 }}>수정</strong>에서{' '}
            공개 범위를 비공개로 바꿀 수 있어요.
          </>
        }
        meta={
          <>
            <div style={{ color: c.inkMuted, marginBottom: 2 }}>{post.title}</div>
            <div>/posts/{post.slug}</div>
          </>
        }
        confirmLabel="이 글 삭제"
        cancelLabel="그만두기"
        onConfirm={onDelete}
        onCancel={() => setDeleteOpen(false)}
        c={c} t={t}
      />
    </>
  );
}
window.AdminBar = AdminBar;

// ── Inline toast — appears inside AdminBar after duplicate/delete ───────────
function AdminToast({ c, t, kind, text }) {
  const palette = {
    ok:   { bg: t.dark ? '#1d2419' : '#ecf1e8', fg: t.dark ? '#bcd1a4' : '#324225', dot: '#7a8a5a' },
    warn: { bg: t.dark ? '#2a2316' : '#f7eedb', fg: t.dark ? '#e0c486' : '#5e4912', dot: '#9a7a23' },
  }[kind] || { bg: c.surfaceAlt, fg: c.inkSoft, dot: c.inkMuted };

  return (
    <div
      role="status"
      style={{
        position: 'absolute', bottom: -14, right: 14,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 999,
        background: palette.bg, border: `1px solid ${c.border}`,
        boxShadow: t.dark
          ? '0 4px 14px rgba(0,0,0,0.32)'
          : '0 4px 14px rgba(28,28,28,0.06)',
        fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 500,
        color: palette.fg, letterSpacing: '-0.005em',
        animation: 'admin-toast-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <style>{`
        @keyframes admin-toast-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span style={{
        width: 6, height: 6, borderRadius: 999, background: palette.dot,
        boxShadow: `0 0 0 3px ${palette.dot}22`,
      }} />
      {text}
    </div>
  );
}

// ── SeriesBanner — 시리즈에 속한 글 상단 컨텍스트 배너 ───────────────────────
function SeriesBanner({ c, ctx, onNav }) {
  const [hover, setHover] = React.useState(false);
  const pad = Math.max(2, String(ctx.total).length);
  const cur = String(ctx.currentOrder).padStart(pad, '0');
  const tot = String(ctx.total).padStart(pad, '0');

  return (
    <a href={`#/series/${ctx.id}`} onClick={(e) => { e.preventDefault(); onNav('series'); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 24, padding: '12px 16px', borderRadius: 12, overflow: 'hidden',
        background: hover ? c.surfaceAlt : c.surface,
        border: `1px solid ${hover ? c.borderStrong : c.border}`,
        textDecoration: 'none', color: 'inherit',
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
      }}>
      <span aria-hidden style={{ position: 'absolute', insetBlock: 0, left: 0, width: 3, background: ctx.color }} />
      <span aria-hidden style={{
        marginLeft: 4, width: 28, height: 28, flexShrink: 0, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: c.surfaceAlt, border: `1px solid ${c.border}`,
        fontFamily: window.DD_FONTS.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.04em', color: c.ink, fontVariantNumeric: 'tabular-nums',
      }}>{cur}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: window.DD_FONTS.sans, fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: c.inkMuted,
        }}>
          <span>Series</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{ fontFamily: window.DD_FONTS.mono, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>STEP {cur} / {tot}</span>
        </span>
        <span style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 14.5, fontWeight: 600,
          letterSpacing: '-0.015em', color: c.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{ctx.title}</span>
      </div>
      <span style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 500, color: c.inkSoft,
      }}>
        <span>전체 {ctx.publishedCount}편</span>
        <span aria-hidden style={{
          fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted,
          transform: hover ? 'translateX(4px)' : 'none', transition: 'transform 0.2s',
        }}>→</span>
      </span>
    </a>
  );
}

// ── SeriesStepNav — 본문 아래 단계 네비게이션 ─────────────────────────────────
// 헤더 스트립 + 이전/다음 단계 카드 + 전체 회차 rail.
function SeriesStepNav({ c, ctx, onNav }) {
  const total = ctx.slots.length;
  const digits = Math.max(2, String(total).length);
  const kicker = {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: window.DD_FONTS.sans, fontSize: 10.5, fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase',
  };

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${c.border}`, background: c.surface }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        padding: '12px 20px', background: c.surfaceAlt, borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span aria-hidden style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 999, background: ctx.color, boxShadow: `0 0 0 3px ${ctx.color}22` }} />
          <span style={{ ...kicker, color: c.inkMuted }}>Series</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{
            fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: c.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{ctx.title}</span>
        </div>
        <a href={`#/series/${ctx.id}`} onClick={(e) => { e.preventDefault(); onNav('series'); }} style={{
          flexShrink: 0, fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: 500,
          color: c.inkSoft, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>전체 보기 ({ctx.publishedCount}편) <span aria-hidden style={{ fontFamily: window.DD_FONTS.mono }}>→</span></a>
      </div>

      <div className="dd-g2">
        {ctx.seriesPrev ? (
          <StepCard c={c} post={ctx.seriesPrev} dir="prev" color={c.inkMuted} onNav={onNav} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20, borderRight: `1px solid ${c.border}` }}>
            <span style={{ ...kicker, color: c.inkMuted, opacity: 0.5 }}>◌ 시리즈 시작</span>
          </div>
        )}
        {ctx.seriesNext ? (
          <StepCard c={c} post={ctx.seriesNext} dir="next" color={ctx.color} onNav={onNav} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: 20 }}>
            <span style={{ ...kicker, color: c.inkMuted, opacity: 0.5 }}>마지막 단계 ●</span>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px', borderTop: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ ...kicker, color: c.inkMuted }}>전체 회차</span>
          <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{ctx.publishedCount} / {total}</span>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ctx.slots.map((slot, i) => {
            const num = String(slot.order).padStart(digits, '0');
            const base = {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 32, minWidth: 32, borderRadius: 6,
              fontFamily: window.DD_FONTS.mono, fontSize: 11, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            };
            if (slot.kind === 'empty') {
              return (
                <li key={`e${i}`}>
                  <span aria-label={`${num}회 (예정)`} style={{
                    ...base, padding: '0 8px', border: `1px dashed ${c.border}`,
                    background: 'transparent', color: c.inkMuted, opacity: 0.5,
                  }}>{num}</span>
                </li>
              );
            }
            if (slot.post.slug === ctx.currentSlug) {
              return (
                <li key={slot.post.slug}>
                  <span aria-current="step" title={`현재 보고 있는 회차 — ${slot.post.title}`} style={{
                    ...base, padding: '0 10px', color: c.ink,
                    background: `${ctx.color}1f`, boxShadow: `inset 0 0 0 1.5px ${ctx.color}`,
                  }}>{num}</span>
                </li>
              );
            }
            return (
              <li key={slot.post.slug}>
                <a href={`#/posts/${slot.post.slug}`} title={slot.post.title}
                  onClick={(e) => { e.preventDefault(); onNav(`post:${slot.post.slug}`); }}
                  style={{
                    ...base, padding: '0 8px', textDecoration: 'none',
                    border: `1px solid ${c.border}`, background: c.surface, color: c.inkSoft,
                    transition: 'border-color 0.2s, color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.ink; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.background = c.surface; e.currentTarget.style.color = c.inkSoft; }}
                >{num}</a>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StepCard({ c, post, dir, color, onNav }) {
  const [hover, setHover] = React.useState(false);
  const isPrev = dir === 'prev';
  const step = post.seriesOrder ? `STEP ${String(post.seriesOrder).padStart(2, '0')}` : null;
  return (
    <a href={`#/posts/${post.slug}`} onClick={(e) => { e.preventDefault(); onNav(`post:${post.slug}`); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, padding: 20,
        alignItems: isPrev ? 'flex-start' : 'flex-end', textAlign: isPrev ? 'left' : 'right',
        borderRight: isPrev ? `1px solid ${c.border}` : 'none',
        background: hover ? c.surfaceAlt : 'transparent',
        textDecoration: 'none', color: 'inherit', transition: 'background 0.2s',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, color,
        fontFamily: window.DD_FONTS.sans, fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        {isPrev ? (
          <>
            <span aria-hidden style={{ fontFamily: window.DD_FONTS.mono, transform: hover ? 'translateX(-4px)' : 'none', transition: 'transform 0.2s' }}>←</span>
            <span>이전 단계</span>
            {step && <><span style={{ opacity: 0.3 }}>·</span><span style={{ fontFamily: window.DD_FONTS.mono, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{step}</span></>}
          </>
        ) : (
          <>
            {step && <><span style={{ fontFamily: window.DD_FONTS.mono, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{step}</span><span style={{ opacity: 0.3 }}>·</span></>}
            <span>다음 단계</span>
            <span aria-hidden style={{ fontFamily: window.DD_FONTS.mono, transform: hover ? 'translateX(4px)' : 'none', transition: 'transform 0.2s' }}>→</span>
          </>
        )}
      </div>
      <div style={{
        fontFamily: window.DD_FONTS.sans, fontSize: 15.5, fontWeight: 600,
        lineHeight: 1.4, letterSpacing: '-0.018em', color: c.ink, textWrap: 'pretty',
      }}>{post.title}</div>
    </a>
  );
}

// ── LikeButton — 익명 좋아요. 누른 사실은 브라우저가 기억하고 서버는 증감만 받는다. ──
function LikeButton({ c, post }) {
  const KEY = 'dongding:liked';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const [liked, setLiked] = React.useState(() => read().includes(post.slug));
  const [likes, setLikes] = React.useState(post.likes || 0);
  const [hover, setHover] = React.useState(false);

  const toggle = () => {
    const next = !liked;
    setLiked(next);
    setLikes(n => Math.max(n + (next ? 1 : -1), 0));
    const list = read();
    try {
      localStorage.setItem(KEY, JSON.stringify(next ? [...list, post.slug] : list.filter(s => s !== post.slug)));
    } catch { /* 프라이빗 모드 — 기억만 못 할 뿐 동작은 한다 */ }
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={liked}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
        fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 500,
        background: liked ? c.hover : c.surface,
        border: `1px solid ${liked ? c.borderStrong : c.border}`,
        color: liked || hover ? c.ink : c.inkMuted,
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
      }}>
      <span>{liked ? '좋아요 취소' : '좋아요'}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{likes.toLocaleString()}</span>
    </button>
  );
}
