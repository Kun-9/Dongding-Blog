// Giscus-style comments — fully designed mock that matches the site's
// cream/dark palette. Real giscus injects an iframe; this is the visual
// shell with realistic 3 threads so we can verify the chrome reads right.

const { useState: useStateC } = React;

function Comments({ c, t }) {
  const [tab, setTab] = useStateC('write');
  const [draft, setDraft] = useStateC('');
  const [reactions, setReactions] = useStateC({ '👍': 12, '🎉': 4, '🚀': 2, '👀': 1 });

  return (
    <section style={{
      marginTop: 64, paddingTop: 32, borderTop: `1px solid ${c.border}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, whiteSpace: 'nowrap' }}>Comments</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: c.ink, letterSpacing: '-0.025em' }}>3 thoughts</h3>
        </div>
        <a href="#" style={{
          fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}>powered by giscus ↗</a>
      </div>

      {/* Reactions row */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: c.inkMuted, marginRight: 6, whiteSpace: 'nowrap' }}>이 글의 반응</span>
        {Object.entries(reactions).map(([emoji, count]) => (
          <button key={emoji} onClick={() => setReactions(r => ({ ...r, [emoji]: r[emoji] + 1 }))}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: c.surface, border: `1px solid ${c.border}`,
              fontFamily: window.DD_FONTS.sans, fontSize: 12.5, color: c.inkSoft,
              cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = c.borderStrong}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = c.border}
          >
            <span style={{ fontSize: 14 }}>{emoji}</span>
            <span style={{ fontWeight: 600 }}>{count}</span>
          </button>
        ))}
        <button style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 999,
          background: 'transparent', border: `1px dashed ${c.border}`,
          color: c.inkMuted, cursor: 'pointer', fontSize: 14,
        }}>+</button>
      </div>

      {/* Composer */}
      <div style={{
        background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12,
        overflow: 'hidden', marginBottom: 28,
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${c.border}`, background: c.surfaceAlt }}>
          {[['write', '쓰기'], ['preview', '미리보기']].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer',
              background: tab === k ? c.surface : 'transparent',
              color: tab === k ? c.ink : c.inkMuted,
              fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: tab === k ? 600 : 500,
              letterSpacing: '-0.01em',
              borderBottom: tab === k ? `2px solid ${c.borderStrong}` : '2px solid transparent',
              marginBottom: -1,
            }}>{lbl}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {tab === 'write' ? (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="댓글을 남겨보세요. 마크다운을 지원합니다."
              rows={4}
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'vertical',
                background: 'transparent', color: c.ink,
                fontFamily: window.DD_FONTS.sans, fontSize: 14, lineHeight: 1.65,
                letterSpacing: '-0.005em', minHeight: 80,
              }}
            />
          ) : (
            <div style={{ fontSize: 14, color: draft ? c.inkSoft : c.inkMuted, lineHeight: 1.7, minHeight: 80 }}>
              {draft || '미리볼 내용이 없습니다.'}
            </div>
          )}
        </div>

        {/* Footer toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', background: c.surfaceAlt, borderTop: `1px solid ${c.border}`,
          gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 4, color: c.inkMuted }}>
            {[
              { glyph: 'B', style: { fontWeight: 700 }, title: '굵게' },
              { glyph: 'I', style: { fontStyle: 'italic' }, title: '기울임' },
              { glyph: '<>', style: { fontFamily: window.DD_FONTS.mono, fontSize: 11 }, title: '코드' },
              { glyph: '🔗', style: { fontSize: 12 }, title: '링크' },
              { glyph: '"', style: { fontSize: 18, lineHeight: 1 }, title: '인용' },
            ].map((b, i) => (
              <button key={i} title={b.title} style={{
                width: 28, height: 26, border: 'none', borderRadius: 5,
                background: 'transparent', color: c.inkMuted, cursor: 'pointer',
                fontFamily: window.DD_FONTS.sans, fontSize: 13,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                ...b.style,
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >{b.glyph}</button>
            ))}
            <span style={{ width: 1, background: c.border, margin: '0 4px' }} />
            <span style={{
              fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted,
              alignSelf: 'center', padding: '0 6px', whiteSpace: 'nowrap',
            }}>마크다운 지원</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, whiteSpace: 'nowrap' }}>{draft.length} chars</span>
            <window.CTA c={c} dark size="sm">댓글 달기</window.CTA>
          </div>
        </div>
      </div>

      {/* Sign-in prompt (above thread when guest) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '12px 16px', borderRadius: 10,
        background: c.surfaceAlt, border: `1px dashed ${c.border}`,
        marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 13.5, color: c.inkSoft, lineHeight: 1.5 }}>
          댓글을 남기려면 GitHub 계정으로 로그인하세요. 댓글은 <code style={{
            fontFamily: window.DD_FONTS.mono, fontSize: 12,
            background: t.dark ? 'rgba(255,200,140,0.10)' : 'rgba(168,129,74,0.12)',
            color: t.dark ? '#e8c89a' : '#7a5a2a', padding: '1.5px 6px', borderRadius: 5,
          }}>dongding/blog-comments</code> 저장소에 Discussions로 저장됩니다.
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 6,
          background: c.ink, color: c.bg, border: 'none', cursor: 'pointer',
          fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub로 로그인
        </button>
      </div>

      {/* Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CommentItem c={c} t={t}
          author="민지킴" handle="minjikim" role="contributor"
          time="3일 전" timeFull="2026-04-24 14:32"
          avatar="#5a7480" initial="민"
          body={<>BatchSize 전략 실험 부분이 정말 도움됐어요. 저희 팀에서도 비슷한 이슈가 있었는데, <code style={ic(t)}>spring.jpa.properties.hibernate.default_batch_fetch_size</code>를 100으로 잡고 모니터링 중입니다. 글에서 다룬 trade-off가 그대로 보이네요.</>}
          reactions={[['👍', 5], ['🎉', 1]]}
        />
        <CommentItem c={c} t={t}
          author="동딩" handle="dongding" role="author"
          time="3일 전" timeFull="2026-04-24 18:01"
          avatar="#7a8a5a" initial="동" img="assets/avatar.svg"
          body={<>네, 100 정도가 무난한 선이라고 생각해요. 다만 한 트랜잭션에서 끌어오는 양이 갑자기 늘면 GC 압력이 커질 수 있어서, 운영 환경에선 99p 응답시간을 함께 보세요.</>}
          replyTo="@minjikim"
          reactions={[['👍', 3], ['💡', 2]]}
        />
        <CommentItem c={c} t={t}
          author="anon-fox" handle="anon-fox" role="visitor"
          time="1일 전" timeFull="2026-04-26 09:15"
          avatar="#8a7355" initial="A"
          body={<>fetch join 한계 부분에서 페이징이 안 되는 이유가 명쾌하게 정리됐네요. 그동안 막연히 알고만 있던 걸 글로 다시 보니 확실해졌어요.</>}
          reactions={[['🚀', 2]]}
        />

        {/* Load more */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button style={{
            padding: '8px 18px', borderRadius: 999,
            background: 'transparent', border: `1px solid ${c.border}`,
            color: c.inkSoft, cursor: 'pointer',
            fontFamily: window.DD_FONTS.sans, fontSize: 13, fontWeight: 500,
            whiteSpace: 'nowrap',
          }}>이전 댓글 더 보기</button>
        </div>
      </div>
    </section>
  );
}

function CommentItem({ c, t, author, handle, role, time, timeFull, avatar, initial, img, body, replyTo, reactions }) {
  const isAuthor = role === 'author';
  return (
    <article style={{
      display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr)', gap: 14,
      padding: '4px 0',
    }}>
      {img ? (
        <img src={img} width="36" height="36" alt=""
          style={{ display: 'block', borderRadius: 999, flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: 999, background: avatar,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: window.DD_FONTS.sans, fontWeight: 700,
          fontSize: 14, letterSpacing: '-0.02em', flexShrink: 0,
        }}>{initial}</div>
      )}

      <div style={{ minWidth: 0 }}>
        {/* Header line */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
          marginBottom: 6,
        }}>
          <span style={{ fontFamily: window.DD_FONTS.sans, fontSize: 14, fontWeight: 600, color: c.ink, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{author}</span>
          <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkMuted, whiteSpace: 'nowrap' }}>@{handle}</span>
          {isAuthor && (
            <span style={{
              fontFamily: window.DD_FONTS.sans, fontSize: 10.5, fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '1.5px 6px', borderRadius: 4,
              background: 'rgba(122,138,90,0.18)', color: t.dark ? '#a8c08a' : '#5a6b3a',
              whiteSpace: 'nowrap',
            }}>AUTHOR</span>
          )}
          <span style={{ color: c.inkMuted, fontSize: 12 }}>·</span>
          <time title={timeFull} style={{ fontSize: 12, color: c.inkMuted, whiteSpace: 'nowrap' }}>{time}</time>
          {replyTo && (
            <>
              <span style={{ color: c.inkMuted, fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: c.inkMuted, whiteSpace: 'nowrap' }}>답글 to <span style={{ color: c.inkSoft, fontFamily: window.DD_FONTS.mono }}>{replyTo}</span></span>
            </>
          )}
        </div>

        {/* Body */}
        <div style={{
          fontSize: 14.5, lineHeight: 1.75, color: c.ink, letterSpacing: '-0.005em',
          paddingBottom: 10,
        }}>{body}</div>

        {/* Footer actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          {reactions.map(([emoji, count]) => (
            <button key={emoji} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 9px', borderRadius: 999,
              background: c.surfaceAlt, border: `1px solid ${c.border}`,
              fontFamily: window.DD_FONTS.sans, fontSize: 12, color: c.inkSoft,
              cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ fontSize: 13 }}>{emoji}</span>
              <span style={{ fontWeight: 600 }}>{count}</span>
            </button>
          ))}
          <button style={actionBtn(c)}>＋ 반응</button>
          <button style={actionBtn(c)}>↩ 답글</button>
          <button style={{ ...actionBtn(c), marginLeft: 'auto', color: c.inkMuted }}>⋯</button>
        </div>
      </div>
    </article>
  );
}

function ic(t) {
  return {
    fontFamily: window.DD_FONTS.mono, fontSize: '0.86em', fontWeight: 500,
    padding: '1.5px 6px', borderRadius: 5,
    background: t.dark ? 'rgba(255,200,140,0.10)' : 'rgba(168,129,74,0.12)',
    color: t.dark ? '#e8c89a' : '#7a5a2a',
    whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', letterSpacing: '-0.005em',
  };
}

function actionBtn(c) {
  return {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: c.inkSoft, fontFamily: window.DD_FONTS.sans,
    fontSize: 12.5, fontWeight: 500, padding: '2px 4px',
    letterSpacing: '-0.005em', whiteSpace: 'nowrap',
  };
}

Object.assign(window, { Comments });
