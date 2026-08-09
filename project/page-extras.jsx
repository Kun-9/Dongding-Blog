// Pages: Studio (write/edit), Admin Dashboard, Series, Search, Bookmarks.

const { useState: useStateX, useMemo: useMemoX, useEffect: useEffectX, useRef: useRefX } = React;

// Sample drafts and bookmarks data
window.DD_EXTRA = {
  drafts: [
    { slug: 'kafka-exactly-once', title: 'Kafka exactly-once는 정말 정확한가', updated: '2026-04-25', words: 2840, status: 'draft' },
    { slug: 'graphql-n-plus-1', title: 'GraphQL DataLoader, REST의 N+1보다 잘 푸는가', updated: '2026-04-23', words: 1620, status: 'review' },
    { slug: 'redis-cluster', title: 'Redis Cluster 슬롯 마이그레이션 일지', updated: '2026-04-18', words: 980, status: 'draft' },
  ],
  series: window.DD_DATA.series,
  bookmarks: [
    { url: 'martinfowler.com/articles/patterns-of-distributed-systems', title: 'Patterns of Distributed Systems', source: 'Martin Fowler', tag: 'system', note: '리더 선출, 로그 복제 패턴이 이름붙여 정리되어 있어 인용하기 좋다.', date: '2026-04-22' },
    { url: 'kafka.apache.org/documentation', title: 'Kafka Documentation — Exactly-Once Semantics', source: 'Apache Kafka', tag: 'kafka', note: 'idempotent producer + transactional API의 정확한 의미.', date: '2026-04-20' },
    { url: 'planetscale.com/blog/btrees-and-database-indexes', title: 'B-Trees and Database Indexes', source: 'PlanetScale', tag: 'mysql', note: 'B+Tree 시각화가 가장 깔끔한 자료.', date: '2026-04-12' },
    { url: 'jepsen.io/analyses', title: 'Jepsen — Distributed Systems Safety Research', source: 'Jepsen', tag: 'system', note: '분산 시스템이 어떻게 거짓말하는지에 대한 정전.', date: '2026-04-08' },
    { url: 'use-the-index-luke.com', title: 'Use The Index, Luke!', source: 'Markus Winand', tag: 'mysql', note: '인덱스 책 한 권을 웹페이지로 옮긴 자료.', date: '2026-03-28' },
    { url: 'shopify.engineering/scaling-shopify', title: 'Shopify의 모놀리스 분리기', source: 'Shopify Engineering', tag: 'system', note: '큰 모놀리스를 모듈러로 옮기는 단계가 자세히.', date: '2026-03-15' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// 1. STUDIO — write/edit page with split editor + preview
// ─────────────────────────────────────────────────────────────────────────
function StudioPage({ c, t, onNav }) {
  const narrow = window.useMedia('(max-width: 900px)');
  const [pane, setPane] = useStateX('edit');
  const [title, setTitle] = useStateX('JPA dirty checking, 어떻게 그렇게 빠른가');
  const [slug, setSlug] = useStateX('jpa-dirty-checking');
  const [slugLocked, setSlugLocked] = useStateX(true);
  const [category, setCategory] = useStateX('db');
  const [subcategory, setSubcategory] = useStateX('db-jpa');
  const [summary, setSummary] = useStateX('flush 시점에 변경 감지가 일어난다는 건 알겠는데, 어떤 자료구조를 쓰는가.');
  const [series, setSeries] = useStateX('jpa-deep');
  const [seriesOrder, setSeriesOrder] = useStateX(3);
  const [newSeriesOpen, setNewSeriesOpen] = useStateX(false);
  const [thumbnail, setThumbnail] = useStateX('');
  const [tags, setTags] = useStateX('jpa, hibernate, performance');
  const [visibility, setVisibility] = useStateX('published'); // 'published' | 'private' | 'draft'
  const [body, setBody] = useStateX(`# 들어가며

JPA를 쓰면서 한 번쯤은 의아했을 것이다 — 변경 감지(dirty checking)는 어떻게 그렇게 **가볍게** 동작할까?

\`\`\`java:Order.java
Order o = em.find(Order.class, 1L);
o.setStatus(PAID);  // setter만 호출했는데
// commit 시점에 UPDATE가 자동으로 나간다
\`\`\`

> [!INFO] 이 글이 다루는 범위
> Hibernate 6.x 기준으로 본다. 1차 캐시·flush·write-behind는 이미 안다고 가정.

## 스냅샷의 정체

엔티티가 영속성 컨텍스트에 들어올 때, Hibernate는 그 시점의 필드값을 \`Object[]\` 배열로 복제해 둔다. 이걸 *snapshot*이라고 부른다.

### 동작 단계

1. \`em.find()\` 시점에 스냅샷 한 벌을 따로 저장한다.
2. \`flush()\` 시점에 현재 필드와 스냅샷을 필드 단위로 비교한다.
3. 다른 필드가 하나라도 있으면 UPDATE를 만들어 큐에 넣는다.

> [!WARNING] 주의할 점
> 스냅샷은 **필드 참조를 그대로 복제**한다. 컬렉션 내부를 \`mutate\`하면 비교가 어긋난다 — \`new ArrayList<>(...)\`로 새 인스턴스를 넣는 편이 안전하다.

![flush 시점에 스냅샷과 현재 필드를 비교하는 구간](/images/jpa-dirty-checking/flush-diff.png){wide}

![스냅샷 적재 직후](/images/jpa-dirty-checking/before.png){2}
![setter 호출 후](/images/jpa-dirty-checking/after.png)

자세한 건 [Hibernate User Guide](https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html)에 정리되어 있다.

https://vladmihalcea.com/hibernate-multiplebagfetchexception

/posts/jpa-n-plus-1

---

> [!TIP] 빠르게 끌 수 있다
> \`@DynamicUpdate\`를 붙이면 변경된 필드만 UPDATE 절에 넣는다. 컬럼이 많은 테이블에서 유의미하게 빨라진다.`);
  const [saved, setSaved] = useStateX('saved');
  useEffectX(() => {
    setSaved('typing');
    const id = setTimeout(() => setSaved('saved'), 800);
    return () => clearTimeout(id);
  }, [title, category, tags, body]);

  const wordCount = body.replace(/\s+/g, '').length;
  const readTime = Math.max(1, Math.round(wordCount / 500));

  const textareaRef = useRefX(null);
  const rendered = useMemoX(() => window.renderMarkdown(body, c, { codeStyle: t.codeStyle || 'card' }), [body, c, t.codeStyle]);

  // Toolbar action — wraps selection or inserts a marker at cursor.
  const insertMd = (action) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = body.slice(0, start);
    const sel = body.slice(start, end);
    const after = body.slice(end);
    let nextBody = body;
    let cursorStart = start;
    let cursorEnd = end;

    const wrap = (left, right, placeholder) => {
      const inner = sel || placeholder;
      nextBody = before + left + inner + right + after;
      if (sel) {
        cursorStart = start + left.length;
        cursorEnd = cursorStart + inner.length;
      } else {
        cursorStart = start + left.length;
        cursorEnd = cursorStart + inner.length;
      }
    };

    const insertBlock = (block) => {
      const needsBlankBefore = before.length > 0 && !before.endsWith('\n\n');
      const needsBlankAfter = after.length > 0 && !after.startsWith('\n\n');
      const prefix = needsBlankBefore ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
      const suffix = needsBlankAfter ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
      nextBody = before + prefix + block + suffix + after;
      cursorStart = before.length + prefix.length;
      cursorEnd = cursorStart + block.length;
    };

    switch (action) {
      case 'bold':       wrap('**', '**', '굵게'); break;
      case 'italic':     wrap('*', '*', '기울임'); break;
      case 'code':       wrap('`', '`', '코드'); break;
      case 'para':       wrap('', '\n\n', ''); break;
      case 'codeblock':  insertBlock('```java:File.java\n' + (sel || '// code') + '\n```'); break;
      case 'callout':    insertBlock('> [!INFO] 제목\n> ' + (sel || '본문 내용')); break;
      case 'divider':    insertBlock('---'); break;
      case 'linkcard':   insertBlock(sel && /^https?:\/\//.test(sel.trim()) ? sel.trim() : 'https://example.com/article'); break;
      case 'image':      insertBlock('![' + (sel || '설명') + '](/images/' + slug + '/screenshot.png)'); break;
      case 'gallery':    insertBlock('![첫 번째](/images/' + slug + '/1.png){2}\n![두 번째](/images/' + slug + '/2.png)'); break;
      default: return;
    }
    setBody(nextBody);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <main>
      {/* Studio toolbar */}
      <div style={{
        position: 'sticky', top: 60, zIndex: 40, background: c.bg,
        borderBottom: `1px solid ${c.border}`, padding: '12px var(--gut)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', rowGap: 8,
        maxWidth: 'none',
      }}>
        <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted }}>
          STUDIO
        </div>
        <div style={{ width: 1, height: 14, background: c.border }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.inkMuted, fontFamily: window.DD_FONTS.mono }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: saved === 'saved' ? '#7da75e' : '#c8a86b', transition: 'background 0.2s' }} />
          {saved === 'saved' ? `자동저장됨 · ${wordCount}자 · ${readTime}분` : '저장 중…'}
        </div>
        <div style={{ flex: 1 }} />
        <RevisionPanel c={c} slug={slug} />
        <button style={{
          padding: '6px 12px', borderRadius: 6, border: `1px solid ${c.border}`,
          background: 'transparent', color: c.ink, cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
        }}>초안 저장</button>
        <window.CTA c={c} dark size="sm">발행하기 →</window.CTA>
      </div>

      {/* 좁은 화면엔 편집/미리보기를 나란히 넣을 수 없다 — 탭으로 갈라 본다. */}
      {narrow && (
        <div style={{ display: 'flex', gap: 6, padding: '12px var(--gut) 0' }}>
          {[['edit', '편집'], ['preview', '미리보기']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setPane(k)} aria-pressed={pane === k} style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${pane === k ? c.borderStrong : c.border}`,
              background: pane === k ? c.surface : 'transparent',
              color: pane === k ? c.ink : c.inkMuted,
              fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: pane === k ? 600 : 500,
              letterSpacing: '-0.01em',
            }}>{label}</button>
          ))}
        </div>
      )}

      <div className="dd-split" style={{ gap: 0, minHeight: 'calc(100vh - 200px)' }}>
        {/* Editor side */}
        <section style={{
          display: narrow && pane !== 'edit' ? 'none' : 'block',
          padding: '28px var(--gut) 64px',
          borderRight: narrow ? 'none' : `1px solid ${c.border}`,
        }}>
          <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, marginBottom: 14, letterSpacing: '0.05em' }}>FRONTMATTER</div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
            <FieldRow c={c} label="title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(c, true)} />
            </FieldRow>
            <FieldRow c={c} label="slug">
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '0 8px',
                  fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted,
                  background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 6,
                  whiteSpace: 'nowrap',
                }}>/posts/</span>
                <input value={slug} onChange={(e) => { setSlugLocked(false); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-')); }}
                  style={{ ...inputStyle(c), fontFamily: window.DD_FONTS.mono, fontSize: 13 }} />
                <button type="button" onClick={() => { setSlugLocked(true); setSlug(title.toLowerCase().replace(/[^a-z0-9\s-]+/g, '').replace(/\s+/g, '-').slice(0, 60)); }}
                  title="제목에서 자동 생성" style={{
                  padding: '0 10px', borderRadius: 6, border: `1px solid ${c.border}`,
                  background: slugLocked ? c.surfaceAlt : 'transparent', color: c.inkSoft,
                  cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                }}>↻</button>
              </div>
            </FieldRow>
            <FieldRow c={c} label="summary">
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="목록과 OG에 보일 한 줄 요약" style={{ ...inputStyle(c), fontSize: 13 }} />
            </FieldRow>
            <FieldRow c={c} label="category" plain>
              <window.CategoryField c={c} value={category} sub={subcategory}
                onChange={({ category: nc, sub }) => { setCategory(nc); setSubcategory(sub); }} />
            </FieldRow>
            <FieldRow c={c} label="tags">
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" style={inputStyle(c)} />
            </FieldRow>
            <FieldRow c={c} label="series" plain>
              <window.SeriesField c={c} value={series} order={seriesOrder} currentSlug={slug}
                newOpen={newSeriesOpen} onToggleNew={() => setNewSeriesOpen(v => !v)}
                onChange={(next) => {
                  if ('series' in next) setSeries(next.series);
                  if ('seriesOrder' in next) setSeriesOrder(next.seriesOrder);
                }} />
            </FieldRow>
            <FieldRow c={c} label="thumbnail">
              <ThumbnailField c={c} value={thumbnail} onChange={setThumbnail} />
            </FieldRow>
            <FieldRow c={c} label="공개 범위">
              <VisibilityField c={c} t={t} value={visibility} onChange={setVisibility} />
            </FieldRow>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 4px', borderRadius: 8, background: c.surfaceAlt, border: `1px solid ${c.border}`, width: 'fit-content' }}>
              {[['B','bold'],['I','italic'],['‹/›','code'],['¶','para'],['{ }','codeblock'],['◐','callout'],['—','divider'],['↗','linkcard'],['▤','gallery']].map(([g, k]) => (
                <button key={k} type="button" title={{ linkcard: '링크 카드 — URL을 한 줄로', gallery: '이미지 묶음 — 연속 줄 그리드' }[k] || k} onClick={() => insertMd(k)} style={{
                  width: 28, height: 28, borderRadius: 5, border: 'none', background: 'transparent',
                  color: c.inkSoft, cursor: 'pointer', fontFamily: g.includes('/') || g === '{ }' ? window.DD_FONTS.mono : window.DD_FONTS.sans,
                  fontSize: 12, fontWeight: 600, fontStyle: k === 'italic' ? 'italic' : 'normal',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >{g}</button>
              ))}
            </div>
            <button type="button" title="이미지 업로드 (드래그/붙여넣기도 가능)"
              onClick={() => insertMd('image')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px',
                borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent',
                color: c.inkSoft, cursor: 'pointer',
                fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
              <span aria-hidden style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11 }}>▣</span>이미지
            </button>
            <div style={{ flex: 1 }} />
            <a href="#" onClick={(e) => { e.preventDefault(); document.getElementById('md-cheatsheet')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{
              fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, textDecoration: 'none',
            }}>마크다운 문법 ↓</a>
          </div>
          <textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} style={{
            width: '100%', minHeight: 'min(540px, 58vh)', padding: '16px 18px', borderRadius: 8,
            background: c.surface, color: c.ink, border: `1px solid ${c.border}`,
            fontFamily: window.DD_FONTS.mono, fontSize: 13.5, lineHeight: 1.7,
            resize: 'vertical', outline: 'none',
          }} />

          {/* Cheatsheet */}
          <MarkdownCheatsheet c={c} id="md-cheatsheet" />
        </section>

        {/* Preview side */}
        <section style={{ display: narrow && pane !== 'preview' ? 'none' : 'block', padding: '28px var(--gut) 64px', overflow: 'auto' }}>
          <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, marginBottom: 14, letterSpacing: '0.05em' }}>PREVIEW</div>
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 8 }}>
              {(() => { const cat = window.DD_DATA.categories.find(x => x.id === category); const sb = cat?.subs?.find(x => x.id === subcategory); return `${cat?.name}${sb ? ' · ' + sb.name : ''}`; })()} · 초안
            </div>
            <h1 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(27px, 6vw, 36px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.15, color: c.ink, textWrap: 'balance' }}>{title}</h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0 0' }}>
              {tags.split(',').map(t => t.trim()).filter(Boolean).map(tg => <window.TagChip key={tg} tag={tg} c={c} size="sm" />)}
            </div>
            <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '24px 0' }} />
            {rendered}
          </div>
        </section>
      </div>
    </main>
  );
}

// Markdown cheatsheet — shows the parser's full grammar inline under the editor.
function MarkdownCheatsheet({ c, id }) {
  const [open, setOpen] = useStateX(false);
  const Row = ({ syntax, label }) => (
    <tr>
      <td style={{
        padding: '7px 10px', verticalAlign: 'top',
        fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkSoft,
        whiteSpace: 'pre', borderBottom: `1px solid ${c.border}`,
        width: '52%',
      }}>{syntax}</td>
      <td style={{
        padding: '7px 10px', verticalAlign: 'top',
        fontFamily: window.DD_FONTS.sans, fontSize: 12.5, color: c.inkMuted,
        borderBottom: `1px solid ${c.border}`, letterSpacing: '-0.005em',
      }}>{label}</td>
    </tr>
  );
  return (
    <section id={id} style={{
      marginTop: 20, padding: '14px 16px',
      borderRadius: 10, background: c.surfaceAlt, border: `1px solid ${c.border}`,
    }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: c.ink,
        fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
      }}>
        <span aria-hidden style={{ fontSize: 10, color: c.inkMuted, transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', display: 'inline-block', width: 10 }}>▸</span>
        마크다운 문법
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, fontWeight: 400 }}>
          {open ? '닫기' : '펼치기'}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, margin: '4px 0 8px' }}>블록</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              <Row syntax="# 제목" label="H1" />
              <Row syntax="## 섹션" label="H2 (TOC에 표시)" />
              <Row syntax="### 하위 섹션" label="H3 (TOC에 표시)" />
              <Row syntax="#### 작은 제목" label="H4" />
              <Row syntax="```java:Order.java&#10;코드…&#10;```" label="코드 블록 (lang : filename)" />
              <Row syntax="> [!INFO] 제목&#10;> 본문 줄들&#10;> 계속" label="Callout — INFO / WARNING / TIP / NOTE" />
              <Row syntax="- 항목&#10;- 항목" label="리스트" />
              <Row syntax="1. 항목&#10;2. 항목" label="번호 리스트" />
              <Row syntax="https://example.com/article" label="링크 카드 — URL만 한 줄일 때" />
              <Row syntax="/posts/jpa-n-plus-1" label="이 블로그 글 카드" />
              <Row syntax="![캡션](url)" label="이미지 — 캡션 + 클릭 확대" />
              <Row syntax="![캡션](url){sm}&#10;![캡션](url){wide}" label="작게(380px) / 본문 밖으로(880px)" />
              <Row syntax="![a](u1){2}&#10;![b](u2)" label="연속 줄 = 이미지 묶음. {2}{3}{4}는 열 수" />
              <Row syntax="---" label="수평선" />
            </tbody>
          </table>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, margin: '14px 0 8px' }}>인라인</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              <Row syntax="**굵게**" label="강조" />
              <Row syntax="*기울임*" label="이탤릭" />
              <Row syntax="`코드`" label="인라인 코드" />
              <Row syntax="[텍스트](url)" label="링크" />
              <Row syntax="https://example.com" label="문장 안에 쓰면 그대로 링크" />
              <Row syntax="![alt](url)" label="이미지" />
            </tbody>
          </table>
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 8,
            background: c.surface, border: `1px solid ${c.border}`,
            fontFamily: window.DD_FONTS.sans, fontSize: 12, color: c.inkMuted,
            lineHeight: 1.6, letterSpacing: '-0.005em',
          }}>
            <strong style={{ color: c.ink, fontWeight: 600 }}>규칙</strong> · <code style={{ fontFamily: window.DD_FONTS.mono }}>&gt;</code>는 callout 전용 (일반 인용문 없음). · 헤더와 마커 뒤엔 <strong style={{ color: c.ink, fontWeight: 600 }}>공백 한 칸</strong> 필수. · <code style={{ fontFamily: window.DD_FONTS.mono }}>&lt;Callout&gt;</code> 같은 JSX 태그는 인식하지 않는다.
          </div>
        </div>
      )}
    </section>
  );
}

function FieldRow({ c, label, children, plain }) {
  const Tag = plain ? 'div' : 'label';
  return (
    <Tag className="dd-field" style={{ alignItems: 'start', gap: 12, paddingTop: 4 }}>
      <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted, paddingTop: 8 }}>{label}</span>
      {children}
    </Tag>
  );
}

// 공개 범위 — 발행 / 비공개 / 초안 3-way 라디오
function VisibilityField({ c, t, value, onChange }) {
  const opts = [
    { v: 'published', label: '발행',   glyph: '●', desc: '외부에 공개' },
    { v: 'private',   label: '비공개', glyph: '◐', desc: 'URL 알아도 안 보임' },
    { v: 'draft',     label: '초안',   glyph: '○', desc: '저장만, 미공개' },
  ];
  const active = (v) => v === value;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{
        display: 'inline-flex', gap: 0,
        borderBottom: `1px solid ${c.border}`,
      }}>
        {opts.map((o) => {
          const isActive = active(o.v);
          const accentColor = o.v === 'published'
            ? (t.dark ? '#a8c08a' : '#5a6b3a')
            : o.v === 'private'
              ? c.ink
              : c.inkMuted;
          return (
            <button key={o.v} type="button" onClick={() => onChange(o.v)}
              aria-pressed={isActive}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1.5px solid ${isActive ? accentColor : 'transparent'}`,
                marginBottom: -1,
                color: isActive ? c.ink : c.inkMuted,
                fontFamily: window.DD_FONTS.sans, fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '-0.005em', cursor: 'pointer',
                transition: 'color 0.12s, border-color 0.12s',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = c.inkSoft; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = c.inkMuted; }}
            >
              <span aria-hidden style={{ fontSize: 9, lineHeight: 1, color: isActive ? accentColor : c.inkSubtle }}>{o.glyph}</span>
              {o.label}
            </button>
          );
        })}
      </div>
      <div style={{
        fontFamily: window.DD_FONTS.sans, fontSize: 11.5, color: c.inkMuted,
        letterSpacing: '-0.005em',
      }}>
        {opts.find((o) => o.v === value)?.desc}
      </div>
    </div>
  );
}

function inputStyle(c, isTitle) {
  return {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    background: c.surface, color: c.ink, border: `1px solid ${c.border}`,
    fontFamily: window.DD_FONTS.sans, fontSize: isTitle ? 15 : 13, fontWeight: isTitle ? 600 : 400,
    outline: 'none', letterSpacing: '-0.01em',
  };
}

// SeriesField / CategoryField → fields.jsx

// ── ThumbnailField — 대표 이미지. 비워 두면 홈 리드 그림이 시리즈 진행/타이포로 대체된다. ──
function ThumbnailField({ c, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div aria-hidden style={{
          width: 56, height: 42, flexShrink: 0, borderRadius: 6, overflow: 'hidden',
          border: `1px ${value ? 'solid' : 'dashed'} ${c.border}`, background: c.surfaceAlt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: window.DD_FONTS.mono, fontSize: 10, color: c.inkMuted,
        }}>
          {value ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '없음'}
        </div>
        <button type="button" onClick={() => onChange(value ? '' : '/images/cover.png')} style={{
          padding: '6px 12px', borderRadius: 6, border: `1px solid ${c.border}`,
          background: 'transparent', color: c.inkSoft, cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 12.5, whiteSpace: 'nowrap',
        }}>{value ? '변경' : '이미지 선택'}</button>
        {value && (
          <button type="button" onClick={() => onChange('')} style={{
            padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent',
            color: c.inkMuted, cursor: 'pointer', fontFamily: window.DD_FONTS.sans, fontSize: 12.5,
          }}>제거</button>
        )}
      </div>
      <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 10.5, color: c.inkMuted }}>
        홈 Featured 리드 그림에만 쓰입니다 — 본문에는 들어가지 않습니다.
      </span>
    </div>
  );
}

// ── RevisionPanel — 저장할 때마다 쌓인 직전 상태를 보고 되돌린다. ────────────────
// 제목·본문·분류만 되돌리고 발행 상태와 주소(slug)는 건드리지 않는다.
const REVISIONS = [
  { id: 3, at: '2026-04-26 22:14', title: 'JPA dirty checking, 어떻게 그렇게 빠른가', chars: 4210, preview: '엔티티가 영속성 컨텍스트에 들어올 때, Hibernate는 그 시점의 필드값을 배열로 복제해 둔다.' },
  { id: 2, at: '2026-04-26 18:02', title: 'JPA dirty checking은 왜 가벼운가', chars: 3180, preview: 'flush 시점에 변경 감지가 일어난다는 건 알겠는데, 어떤 자료구조를 쓰는가.' },
  { id: 1, at: '2026-04-25 09:37', title: '(제목 없음)', chars: 420, preview: '' },
];

function RevisionPanel({ c, slug }) {
  const [open, setOpen] = useStateX(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(v => !v)} title="이 글의 수정 이력" style={{
        padding: '6px 12px', borderRadius: 6, border: `1px solid ${c.border}`,
        background: open ? c.hover : 'transparent', color: open ? c.ink : c.inkSoft, cursor: 'pointer',
        fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s',
      }}>이력</button>

      {open && (
        <div style={{
          position: 'fixed', top: 104, right: 20, zIndex: 30,
          width: 'min(420px, calc(100vw - 40px))', maxHeight: '70vh', overflow: 'auto',
          padding: 12, borderRadius: 8, background: c.surface,
          border: `1px solid ${c.border}`, boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted,
            }}>수정 이력</span>
            <button type="button" onClick={() => setOpen(false)} style={{
              border: 'none', background: 'transparent', color: c.inkMuted, cursor: 'pointer', font: 'inherit', fontSize: 12,
            }}>닫기</button>
          </div>
          {REVISIONS.map((r, i) => (
            <div key={r.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11.5, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{r.at}</span>
                <button type="button" style={{
                  padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.border}`,
                  background: 'transparent', color: c.inkSoft, cursor: 'pointer',
                  fontFamily: window.DD_FONTS.sans, fontSize: 11.5, whiteSpace: 'nowrap',
                }}>이 버전으로</button>
              </div>
              <div style={{ marginTop: 4, fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 500, color: c.ink }}>{r.title}</div>
              <div style={{ marginTop: 2, fontSize: 12, lineHeight: 1.5, color: c.inkMuted }}>{r.preview || '(본문 없음)'}</div>
              <div style={{ marginTop: 4, fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkSubtle }}>{r.chars.toLocaleString()}자</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. ADMIN — dashboard
// ─────────────────────────────────────────────────────────────────────────
function AdminPage({ c, t, onNav }) {
  const D = window.DD_EXTRA;
  const posts = window.DD_DATA.posts;
  const stats = [
    { label: '발행된 글', value: posts.length, sub: '누적' },
    { label: '초안', value: D.drafts.length, sub: '대기 중' },
    { label: '카테고리', value: window.DD_DATA.categories.length, sub: '5개 분류' },
    { label: '총 조회수', value: window.DD_DATA.posts.reduce((a, p) => a + (p.views || 0), 0), sub: '누적' },
  ];

  // sparkline data: posts per month (last 12)
  const monthly = [3, 1, 2, 4, 2, 3, 5, 2, 4, 6, 3, 4];
  const max = Math.max(...monthly);

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px var(--gut) 0' }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 8 }}>ADMIN</div>
          <h1 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(27px, 6vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em', color: c.ink }}>대시보드</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: c.inkMuted }}>2026년 4월 27일 · 조용한 한 주.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <window.CTA c={c} dark={false} size="sm" onClick={(e) => { e.preventDefault(); onNav('settings'); }}>설정</window.CTA>
          <window.CTA c={c} dark={false} size="sm" onClick={(e) => { e.preventDefault(); onNav('studio'); }}>새 글 →</window.CTA>
          <window.CTA c={c} dark size="sm">바로 발행</window.CTA>
        </div>
      </header>

      {/* Stat cards */}
      <section className="dd-g4" style={{ gap: 14, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: '18px 20px', borderRadius: 12, background: c.surface, border: `1px solid ${c.border}`,
          }}>
            <div style={{ fontSize: 12, color: c.inkMuted, fontFamily: window.DD_FONTS.sans, fontWeight: 500, letterSpacing: '-0.005em' }}>{s.label}</div>
            <div style={{
              margin: '6px 0 4px', fontFamily: window.DD_FONTS.sans, fontSize: 32, fontWeight: 700,
              letterSpacing: '-0.03em', color: c.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: s.delta ? '#7da75e' : c.inkMuted, fontFamily: window.DD_FONTS.mono }}>{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="dd-g15" style={{ gap: 18, marginBottom: 32 }}>
        {/* Publishing cadence */}
        <div style={{ padding: '20px 22px', borderRadius: 12, background: c.surface, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, gap: 12 }}>
            <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600, color: c.ink, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>월별 발행 추이</div>
            <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, whiteSpace: 'nowrap' }}>최근 12개월</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {monthly.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${(v / max) * 60}px`, background: i === monthly.length - 1 ? c.ink : c.borderStrong, borderRadius: 3, opacity: i === monthly.length - 1 ? 1 : 0.55 }} />
                <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 9.5, color: c.inkMuted }}>{['M','J','J','A','S','O','N','D','J','F','M','A'][i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* By category */}
        <div style={{ padding: '20px 22px', borderRadius: 12, background: c.surface, border: `1px solid ${c.border}` }}>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600, color: c.ink, marginBottom: 14, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>카테고리별 분포</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {window.DD_DATA.categories.map(cat => {
              const total = window.DD_DATA.categories.reduce((a, x) => a + x.count, 0);
              const pct = (cat.count / total) * 100;
              return (
                <li key={cat.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 28px', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: c.inkSoft, fontFamily: window.DD_FONTS.sans, fontWeight: 500 }}>{cat.name}</span>
                  <div style={{ height: 6, borderRadius: 3, background: c.surfaceAlt, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c.borderStrong }} />
                  </div>
                  <span style={{ fontFamily: window.DD_FONTS.mono, color: c.inkMuted, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{cat.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Drafts */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10, borderBottom: `1px solid ${c.border}`, marginBottom: 14, gap: 12 }}>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, whiteSpace: 'nowrap' }}>초안 ({D.drafts.length})</div>
          <button onClick={() => onNav('studio')} style={{ background: 'none', border: 'none', color: c.inkMuted, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>새 초안 +</button>
        </div>
        <div className="dd-scroll-x">
        <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: c.inkMuted, fontFamily: window.DD_FONTS.mono, fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600 }}>TITLE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, width: 100 }}>STATUS</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, width: 100 }}>WORDS</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, width: 110 }}>UPDATED</th>
            </tr>
          </thead>
          <tbody>
            {D.drafts.map(d => (
              <tr key={d.slug} onClick={() => onNav('studio')} style={{ cursor: 'pointer', borderTop: `1px solid ${c.border}` }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 10px', color: c.ink, fontWeight: 500, letterSpacing: '-0.01em' }}>{d.title}</td>
                <td style={{ padding: '12px 10px' }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 4, fontFamily: window.DD_FONTS.mono,
                    color: d.status === 'review' ? '#a8814a' : c.inkMuted,
                    background: d.status === 'review' ? (t.dark ? 'rgba(168,129,74,0.15)' : 'rgba(220,178,118,0.18)') : c.surfaceAlt,
                  }}>{d.status}</span>
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', color: c.inkMuted, fontFamily: window.DD_FONTS.mono, fontVariantNumeric: 'tabular-nums' }}>{d.words.toLocaleString()}</td>
                <td style={{ padding: '12px 10px', textAlign: 'right', color: c.inkMuted, fontFamily: window.DD_FONTS.mono, fontVariantNumeric: 'tabular-nums' }}>{window.fmtDate(d.updated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* Recent comments */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ paddingBottom: 10, borderBottom: `1px solid ${c.border}`, marginBottom: 14, fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted }}>최근 댓글</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { who: 'jihoon-k', when: '4시간 전', body: 'BatchSize와 EntityGraph를 같이 쓰면 어떻게 될까요? 둘 다 적용된 쿼리를 본 적이 없어서…', post: 'JPA N+1 — fetch join은 정답이 아니다' },
            { who: 'soomin', when: '어제', body: '@Transactional(propagation = NESTED)를 쓰는 게 더 안전한 케이스도 있을까요?', post: '스프링 트랜잭션 전파, 그 진짜 동작' },
            { who: 'ddanji', when: '3일 전', body: 'Heap dump 도구로 MAT 말고 다른 거 추천하실 만한 게 있나요?', post: '디버깅 일지 — ThreadLocal 메모리 누수' },
          ].map((c2, i) => (
            <li key={i} className="dd-sidecol-120" style={{ padding: '14px 0', borderTop: i ? `1px solid ${c.border}` : 'none', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.ink, fontFamily: window.DD_FONTS.sans }}>@{c2.who}</div>
                <div style={{ fontSize: 11, color: c.inkMuted, fontFamily: window.DD_FONTS.mono, marginTop: 1 }}>{c2.when}</div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: c.inkSoft, lineHeight: 1.65 }}>{c2.body}</p>
                <div style={{ marginTop: 6, fontSize: 11.5, color: c.inkMuted }}>↳ <em>{c2.post}</em></div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. SERIES list page
// ─────────────────────────────────────────────────────────────────────────
// 시리즈 날짜 — 생성일은 데이터, 최근 연재일은 속한 글에서 파생한다.
function seriesDates(s) {
  const posts = window.DD_DATA.posts.filter(p => p.series === s.id);
  const last = posts.reduce((m, p) => (p.date > m ? p.date : m), '');
  return { created: s.createdAt || '', last };
}
function fmtYmd(d) { return d ? d.replace(/-/g, '.') : '—'; }

function SeriesPage({ c, t, onNav }) {
  const [creating, setCreating] = useStateX(false);
  const [sort, setSort] = useStateX('recent'); // 'recent' | 'created'
  const series = useMemoX(() => [...window.DD_EXTRA.series].sort((a, b) => {
    const da = seriesDates(a), db = seriesDates(b);
    return sort === 'created'
      ? db.created.localeCompare(da.created)
      : (db.last || '').localeCompare(da.last || '') || db.created.localeCompare(da.created);
  }), [sort]);
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '64px var(--gut) 0' }}>
      <header style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 12 }}>SERIES</div>
          <h1 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(29px, 7vw, 40px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.1, color: c.ink }}>연재 모음</h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, color: c.inkMuted, lineHeight: 1.6, maxWidth: 540 }}>
            한 주제를 여러 글로 나누어 천천히 따라가는 글 묶음. 처음부터 읽으면 가장 잘 이해됩니다.
          </p>
        </div>
        {t.isAdmin && !creating && (
          <button onClick={() => setCreating(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 13px 7px 11px', borderRadius: 999,
            background: c.ink, color: c.bg, border: 'none', cursor: 'pointer',
            fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600,
            letterSpacing: '-0.005em', whiteSpace: 'nowrap',
          }}><span style={{ fontSize: 14, lineHeight: 1, fontWeight: 400 }}>＋</span> 새 시리즈</button>
        )}
      </header>

      {t.isAdmin && creating && (
        <SeriesEditor c={c} t={t} onClose={() => setCreating(false)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11.5, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{series.length}개 시리즈</div>
        <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 8, background: c.surface, border: `1px solid ${c.border}` }}>
          {[['recent', '최근 연재순'], ['created', '생성순']].map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)} style={{
              padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: sort === k ? c.surfaceAlt : 'transparent',
              color: sort === k ? c.ink : c.inkMuted,
              fontFamily: window.DD_FONTS.sans, fontSize: 12, fontWeight: sort === k ? 600 : 500,
              letterSpacing: '-0.005em', whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="dd-g2" style={{ gap: 14, gridAutoRows: '1fr' }}>
        {series.map(s => (
          <SeriesCard key={s.id} s={s} c={c} t={t} sort={sort} onNav={onNav} />
        ))}
      </div>
    </main>
  );
}

function SeriesCard({ s, c, t, sort, onNav }) {
  const [hover, setHover] = useStateX(false);
  const { created, last } = seriesDates(s);
  const clamp = (n) => ({ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: n, overflow: 'hidden' });
  const metaCol = (active) => ({
    fontFamily: window.DD_FONTS.mono, fontSize: 11, lineHeight: 1.5,
    color: active ? c.inkSoft : c.inkMuted, opacity: active ? 1 : 0.75,
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  });
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', height: '100%' }}
    >
      <div role="link" tabIndex={0}
        onClick={() => onNav(`category:${s.id.startsWith('jpa') || s.id.startsWith('mysql') ? 'db' : s.id.startsWith('tx') ? 'spring' : 'system'}`)}
        style={{
          padding: 20, borderRadius: 12, background: c.surface,
          border: `1px solid ${hover ? c.borderStrong : c.border}`,
          cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14,
          height: '100%', minHeight: 232, boxSizing: 'border-box',
          transition: 'border-color 0.2s, transform 0.2s',
          transform: hover ? 'translateY(-2px)' : 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color, opacity: 0.85,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: window.DD_FONTS.mono, fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: '0.02em',
          }}>{s.count}편</div>
          <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, whiteSpace: 'nowrap' }}>{s.posts.length}/{s.count} 발행됨</div>
        </div>
        <div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 22, fontWeight: 600, color: c.ink, letterSpacing: '-0.025em', marginBottom: 6, lineHeight: 1.25, ...clamp(2) }}>{s.title}</div>
          <div style={{ fontSize: 14, color: c.inkSoft, lineHeight: 1.6, ...clamp(2) }}>{s.desc}</div>
        </div>
        <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div style={metaCol(sort === 'recent')}>최근 연재 {last ? fmtYmd(last) : '아직 없음'}</div>
            <div style={metaCol(sort === 'created')}>생성 {fmtYmd(created)}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: s.count }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < s.posts.length ? s.color : c.surfaceAlt,
              }} />
            ))}
          </div>
        </div>
      </div>
      {/* Hover admin actions */}
      {t.isAdmin && hover && (
        <div style={{
          position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4,
          background: c.bg, padding: 3, borderRadius: 7, border: `1px solid ${c.border}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }} onClick={(e) => e.stopPropagation()}>
          <button title="수정" style={hoverBtn(c)}>✎</button>
          <button title="순서 변경" style={hoverBtn(c)}>⇅</button>
          <button title="삭제" style={hoverBtn(c, t.dark ? '#d99a8c' : '#a04a3a')}>⌫</button>
        </div>
      )}
    </div>
  );
}

function hoverBtn(c, color) {
  return {
    width: 26, height: 26, padding: 0, borderRadius: 5,
    border: 'none', background: 'transparent',
    color: color || c.inkSoft, cursor: 'pointer', fontSize: 13,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
}

function SeriesEditor({ c, t, onClose }) {
  const [title, setTitle] = useStateX('');
  const [id, setId] = useStateX('');
  const [desc, setDesc] = useStateX('');
  const [count, setCount] = useStateX(5);
  const [color, setColor] = useStateX('#7a8a5a');

  const inp = {
    width: '100%', padding: '8px 11px', borderRadius: 6,
    background: c.bg, border: `1px solid ${c.border}`, color: c.ink,
    fontFamily: window.DD_FONTS.sans, fontSize: 14, outline: 'none', letterSpacing: '-0.005em',
  };
  const lbl = { fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted };

  return (
    <div style={{
      padding: 22, borderRadius: 12, marginBottom: 24,
      background: c.surface, border: `1px solid ${c.border}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 17, fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>새 시리즈</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: c.inkMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div className="dd-g2" style={{ gap: 14 }}>
        <label style={{ gridColumn: '1 / -1' }}>
          <div style={{ ...lbl, marginBottom: 6 }}>제목</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 동시성 제대로 보기" style={inp} />
        </label>
        <label>
          <div style={{ ...lbl, marginBottom: 6 }}>ID (링크용)</div>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="concurrency" style={{ ...inp, fontFamily: window.DD_FONTS.mono, fontSize: 13 }} />
        </label>
        <label>
          <div style={{ ...lbl, marginBottom: 6 }}>목표 편수</div>
          <input type="number" value={count} onChange={(e) => setCount(+e.target.value)} min={1} max={20} style={inp} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <div style={{ ...lbl, marginBottom: 6 }}>설명</div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="한 문장으로 이 시리즈가 무엇을 다루는지." style={{ ...inp, resize: 'vertical', minHeight: 60, lineHeight: 1.6 }} />
        </label>
        <label>
          <div style={{ ...lbl, marginBottom: 6 }}>테마 컬러</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#7a8a5a', '#a8814a', '#5a7480', '#8a7355', '#6a5a8a'].map(co => (
              <button key={co} type="button" onClick={() => setColor(co)} style={{
                width: 28, height: 28, borderRadius: 999, border: color === co ? `2px solid ${c.ink}` : `1px solid ${c.border}`,
                background: co, cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
        <button onClick={onClose} style={{
          padding: '7px 14px', borderRadius: 6, border: `1px solid ${c.border}`,
          background: 'transparent', color: c.inkSoft, cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 500,
        }}>취소</button>
        <button onClick={onClose} style={{
          padding: '7px 14px', borderRadius: 6, border: 'none',
          background: c.ink, color: c.bg, cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600,
        }}>시리즈 생성</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. SEARCH results
// ─────────────────────────────────────────────────────────────────────────
function SearchPage({ c, t, onNav, query }) {
  const [q, setQ] = useStateX(query || 'jpa');
  const [scope, setScope] = useStateX('all');
  const posts = window.DD_DATA.posts;
  const ql = q.trim().toLowerCase();

  const matches = useMemoX(() => {
    if (!ql) return [];
    return posts.filter(p =>
      p.title.toLowerCase().includes(ql) || p.summary.toLowerCase().includes(ql) ||
      p.tags.some(tg => tg.includes(ql)) || p.category.includes(ql)
    );
  }, [ql]);

  const tagMatches = useMemoX(() => {
    const set = new Set();
    posts.forEach(p => p.tags.forEach(tg => { if (tg.includes(ql)) set.add(tg); }));
    return [...set];
  }, [ql]);

  const highlight = (text) => {
    if (!ql) return text;
    const idx = text.toLowerCase().indexOf(ql);
    if (idx === -1) return text;
    return <>{text.slice(0, idx)}<mark style={{ background: t.dark ? 'rgba(212,158,106,0.25)' : 'rgba(255,224,168,0.7)', color: c.ink, padding: '0 1px' }}>{text.slice(idx, idx + ql.length)}</mark>{text.slice(idx + ql.length)}</>;
  };

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px var(--gut) 0' }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 10 }}>SEARCH</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
          background: c.surface, border: `1px solid ${c.border}`,
        }}>
          <span style={{ color: c.inkMuted, fontSize: 18 }}>⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어를 입력하세요…" style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent', color: c.ink,
            fontFamily: window.DD_FONTS.sans, fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {[['all','전체'],['title','제목'],['tag','태그'],['body','본문']].map(([k, lbl]) => (
            <button key={k} onClick={() => setScope(k)} style={{
              padding: '5px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              background: scope === k ? c.accent : 'transparent',
              color: scope === k ? c.accentInk : c.inkMuted,
              border: scope === k ? 'none' : `1px solid ${c.border}`,
              cursor: 'pointer', fontFamily: window.DD_FONTS.sans, letterSpacing: '-0.01em',
            }}>{lbl}</button>
          ))}
        </div>
      </header>

      <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted, marginBottom: 16 }}>
        {q ? `"${q}"에 대한 결과 ${matches.length}건` : '검색어를 입력하면 결과가 나타납니다.'}
      </div>

      {tagMatches.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 8 }}>관련 태그</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tagMatches.map(tg => <window.TagChip key={tg} tag={tg} c={c} onClick={(e) => { e.preventDefault(); onNav(`tag:${tg}`); }} />)}
          </div>
        </section>
      )}

      <section style={{ paddingBottom: 64 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {matches.map(p => {
            const cat = window.DD_DATA.categories.find(x => x.id === p.category);
            return (
              <li key={p.slug} style={{ padding: '18px 0', borderTop: `1px solid ${c.border}` }}>
                <a href="#" onClick={(e) => { e.preventDefault(); onNav(`post:${p.slug}`); }} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.inkMuted, fontFamily: window.DD_FONTS.mono, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {cat?.name} · {window.fmtDate(p.date)}
                  </div>
                  <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 18, fontWeight: 600, color: c.ink, letterSpacing: '-0.025em', lineHeight: 1.35 }}>
                    {highlight(p.title)}
                  </div>
                  <div style={{ fontSize: 14, color: c.inkSoft, marginTop: 4, lineHeight: 1.65 }}>
                    {highlight(p.summary)}
                  </div>
                </a>
              </li>
            );
          })}
          {q && matches.length === 0 && (
            <li style={{ padding: '40px 0', color: c.inkMuted, fontSize: 14, textAlign: 'center' }}>
              일치하는 글이 없어요. 다른 검색어를 시도해 보세요.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 5. BOOKMARKS / Linkroll
// ─────────────────────────────────────────────────────────────────────────
function BookmarksPage({ c, t, onNav }) {
  const items = window.DD_EXTRA.bookmarks;
  const [creating, setCreating] = useStateX(false);
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px var(--gut) 0' }}>
      <header style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 12 }}>LINKROLL</div>
          <h1 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(29px, 7vw, 40px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.1, color: c.ink }}>읽고 좋았던 글</h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, color: c.inkMuted, lineHeight: 1.6, maxWidth: 540 }}>
            남이 잘 정리해 둔 글을 다시 쓰는 건 시간 낭비예요. 대신 추천만 합니다.
          </p>
        </div>
        {t.isAdmin && !creating && (
          <button onClick={() => setCreating(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 13px 7px 11px', borderRadius: 999,
            background: c.ink, color: c.bg, border: 'none', cursor: 'pointer',
            fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600,
            letterSpacing: '-0.005em', whiteSpace: 'nowrap',
          }}><span style={{ fontSize: 14, lineHeight: 1, fontWeight: 400 }}>＋</span> 링크 추가</button>
        )}
      </header>

      {t.isAdmin && creating && (
        <BookmarkEditor c={c} t={t} onClose={() => setCreating(false)} />
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((b, i) => (
          <BookmarkRow key={i} b={b} c={c} t={t} />
        ))}
      </ul>
    </main>
  );
}

function BookmarkRow({ b, c, t }) {
  const [hover, setHover] = useStateX(false);
  return (
    <li
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="dd-sidecol-90" style={{ padding: '20px 0', borderTop: `1px solid ${c.border}`, gap: 18, position: 'relative' }}
    >
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{window.fmtDate(b.date)}</div>
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 4, fontFamily: window.DD_FONTS.mono,
            color: c.inkMuted, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{b.tag}</span>
        </div>
      </div>
      <div>
        <a href={`https://${b.url}`} target="_blank" rel="noopener" style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 17, fontWeight: 600, color: c.ink,
          letterSpacing: '-0.02em', textDecoration: 'none', lineHeight: 1.35,
        }}>{b.title} <span style={{ color: c.inkMuted, fontSize: 13, marginLeft: 4 }}>↗</span></a>
        <div style={{ fontSize: 12, color: c.inkMuted, marginTop: 2, fontFamily: window.DD_FONTS.mono }}>{b.source} · {b.url}</div>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: c.inkSoft, lineHeight: 1.7, paddingLeft: 12, borderLeft: `2px solid ${c.border}` }}>
          {b.note}
        </p>
      </div>
      {t.isAdmin && (
        <div className="dd-hoveronly" style={{
          position: 'absolute', top: 14, right: 0, display: 'flex', gap: 4,
          opacity: hover ? 1 : 0, pointerEvents: hover ? 'auto' : 'none',
          transition: 'opacity 0.12s',
          background: c.bg, padding: 3, borderRadius: 7, border: `1px solid ${c.border}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <button className="dd-iconbtn" title="수정" style={hoverBtn(c)}>✎</button>
          <button className="dd-iconbtn" title="삭제" style={hoverBtn(c, t.dark ? '#d99a8c' : '#a04a3a')}>⌫</button>
        </div>
      )}
    </li>
  );
}

function BookmarkEditor({ c, t, onClose }) {
  const [url, setUrl] = useStateX('');
  const [title, setTitle] = useStateX('');
  const [source, setSource] = useStateX('');
  const [tag, setTag] = useStateX('system');
  const [note, setNote] = useStateX('');

  const inp = {
    width: '100%', padding: '8px 11px', borderRadius: 6,
    background: c.bg, border: `1px solid ${c.border}`, color: c.ink,
    fontFamily: window.DD_FONTS.sans, fontSize: 14, outline: 'none', letterSpacing: '-0.005em',
  };
  const lbl = { fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: c.inkMuted };

  return (
    <div style={{
      padding: 22, borderRadius: 12, marginBottom: 24,
      background: c.surface, border: `1px solid ${c.border}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 17, fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>링크 추가</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: c.inkMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div className="dd-g2" style={{ gap: 14 }}>
        <label style={{ gridColumn: '1 / -1' }}>
          <div style={{ ...lbl, marginBottom: 6 }}>URL</div>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" style={{ ...inp, fontFamily: window.DD_FONTS.mono, fontSize: 13 }} />
          <div style={{ marginTop: 6, fontSize: 11, color: c.inkMuted, fontFamily: window.DD_FONTS.mono }}>제목·출처는 og:tag에서 자동 파싱됩니다.</div>
        </label>
        <label>
          <div style={{ ...lbl, marginBottom: 6 }}>제목</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="자동 채움 또는 수동 입력" style={inp} />
        </label>
        <label>
          <div style={{ ...lbl, marginBottom: 6 }}>출처</div>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Martin Fowler" style={inp} />
        </label>
        <label>
          <div style={{ ...lbl, marginBottom: 6 }}>태그</div>
          <select value={tag} onChange={(e) => setTag(e.target.value)} style={inp}>
            {['system', 'db', 'spring', 'kafka', 'jvm', 'observability'].map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <div style={{ ...lbl, marginBottom: 6 }}>내 메모</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="이 글이 왜 좋았는지 한·두 문장으로." style={{ ...inp, resize: 'vertical', minHeight: 80, lineHeight: 1.7 }} />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
        <button onClick={onClose} style={{
          padding: '7px 14px', borderRadius: 6, border: `1px solid ${c.border}`,
          background: 'transparent', color: c.inkSoft, cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 500,
        }}>취소</button>
        <button onClick={onClose} style={{
          padding: '7px 14px', borderRadius: 6, border: 'none',
          background: c.ink, color: c.bg, cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600,
        }}>추가</button>
      </div>
    </div>
  );
}

Object.assign(window, { StudioPage, AdminPage, SeriesPage, SearchPage, BookmarksPage });
