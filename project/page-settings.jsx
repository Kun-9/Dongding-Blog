// Settings page — admin/site preferences for the personal blog.
const { useState: useStateS } = React;

function SettingsPage({ c, t, onNav }) {
  // Categories — full CRUD on top of DD_DATA.categories
  const [cats, setCats] = useStateS(() => window.DD_DATA.categories.map(c => ({
    id: c.id, name: c.name, desc: c.desc, count: c.count,
    subs: c.subs.map(s => ({ ...s })),
  })));
  const [editingCat, setEditingCat] = useStateS(null); // { catId } | { catId, subId }
  const [expandedCat, setExpandedCat] = useStateS(() => new Set(window.DD_DATA.categories.map(c => c.id)));

  const updateCat = (catId, patch) => setCats(cs => cs.map(c => c.id === catId ? { ...c, ...patch } : c));
  const updateSub = (catId, subId, patch) => setCats(cs => cs.map(c =>
    c.id !== catId ? c : { ...c, subs: c.subs.map(s => s.id === subId ? { ...s, ...patch } : s) }));
  const moveCat = (catId, dir) => setCats(cs => {
    const i = cs.findIndex(c => c.id === catId);
    const j = i + dir;
    if (j < 0 || j >= cs.length) return cs;
    const next = cs.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const moveSub = (catId, subId, dir) => setCats(cs => cs.map(c => {
    if (c.id !== catId) return c;
    const i = c.subs.findIndex(s => s.id === subId);
    const j = i + dir;
    if (j < 0 || j >= c.subs.length) return c;
    const subs = c.subs.slice();
    [subs[i], subs[j]] = [subs[j], subs[i]];
    return { ...c, subs };
  }));
  const deleteCat = (catId) => setCats(cs => cs.filter(c => c.id !== catId));
  const deleteSub = (catId, subId) => setCats(cs => cs.map(c =>
    c.id !== catId ? c : { ...c, subs: c.subs.filter(s => s.id !== subId) }));
  const addCat = () => {
    const id = `new-${Date.now().toString(36).slice(-4)}`;
    setCats(cs => [...cs, { id, name: '새 카테고리', desc: '한 줄 설명', count: 0, subs: [] }]);
    setExpandedCat(s => new Set([...s, id]));
    setEditingCat({ catId: id });
  };
  const addSub = (catId) => {
    const id = `${catId}-new-${Date.now().toString(36).slice(-4)}`;
    setCats(cs => cs.map(c => c.id !== catId ? c : { ...c, subs: [...c.subs, { id, name: '새 서브', count: 0 }] }));
    setExpandedCat(s => new Set([...s, catId]));
    setEditingCat({ catId, subId: id });
  };
  const toggleExpand = (catId) => setExpandedCat(s => {
    const next = new Set(s);
    if (next.has(catId)) next.delete(catId); else next.add(catId);
    return next;
  });

  const [profile, setProfile] = useStateS({
    handle: 'dongding',
    name: '동딩 (Dong-Ding)',
    bio: '백엔드 7년차. 자바·스프링·DB. 한 번에 한 글씩 천천히.',
    email: 'dongding@example.com',
    avatar: '#7a8a5a',
    useImg: true,
  });
  const [social, setSocial] = useStateS({
    github: 'dongding',
  });
  const [comments, setComments] = useStateS({
    enabled: true,
    repo: 'dongding/blog-comments',
    category: 'General',
    mapping: 'pathname',
  });
  const [seo, setSeo] = useStateS({
    siteTitle: 'Dong-Ding · 개발 노트',
    shortTitle: 'Dong-Ding',
    description: '자바와 스프링, DB를 깊이, 천천히 따라가는 블로그.',
    canonical: 'https://blog.dongding.dev',
    copyright: '© 2026 Dong-Ding · 개발 노트',
    lang: 'ko',
    locale: 'ko-KR',
    ogHeadline: '개발 노트',
    ogTagline: 'AI를 활용해 만들고, 직접 쓰고, 고쳐나가는 기록',
    ogLabel: 'Dong-Ding',
  });
  const [publish, setPublish] = useStateS({
    autoSaveSec: 8,
    notifyOnComment: true,
  });

  return (
    <main className="dd-settingscols" style={{ gap: 32, maxWidth: 1080, margin: '0 auto', padding: '40px var(--gut) 64px' }}>
      {/* Sticky side nav */}
      <aside className="dd-setnav" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
        <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.inkMuted, marginBottom: 14, whiteSpace: 'nowrap' }}>SETTINGS</div>
        <ul className="dd-setnav-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            ['profile', '프로필'],
            ['social', '소셜 링크'],
            ['categories', '카테고리'],
            ['comments', '댓글'],
            ['seo', 'SEO · 메타'],
            ['publish', '에디터'],
          ].map(([id, lbl]) => (
            <li key={id}>
              <a href={`#settings-${id}`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }} style={{
                display: 'block', padding: '6px 10px', borderRadius: 6,
                color: c.inkSoft, textDecoration: 'none',
                fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: 500,
                letterSpacing: '-0.01em', whiteSpace: 'nowrap',
              }}
                 onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >{lbl}</a>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${c.border}` }}>
          <button onClick={() => onNav('admin')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: c.inkMuted, fontSize: 12.5, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>← 대시보드</button>
        </div>
      </aside>

      <div>
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 'clamp(27px, 6vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em', color: c.ink }}>설정</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: c.inkMuted, lineHeight: 1.6 }}>
            사이트와 관련된 거의 모든 것을 여기서. 변경사항은 저장 시점에 적용됩니다.
          </p>
        </header>

        {/* PROFILE */}
        <SettingsCard c={c} id="settings-profile" title="프로필" desc="About 페이지와 글 푸터에 함께 노출됩니다.">
          <Row c={c} label="아바타">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {profile.useImg ? (
                <img src="assets/avatar.svg" width="48" height="48" alt=""
                  style={{ display: 'block', borderRadius: 999, border: `1px solid ${c.border}` }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 999, background: profile.avatar, border: `1px solid ${c.border}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: window.DD_FONTS.sans, fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.02em' }}>
                  동
                </div>
              )}
              <button style={ghostBtn(c)} onClick={() => setProfile(p => ({ ...p, useImg: true }))}>이미지 변경</button>
              <div style={{ display: 'flex', gap: 4 }}>
                {['#7a8a5a', '#8a7355', '#5a7480', '#8a5d5d', '#5d6b8a'].map(col => (
                  <button key={col} className="dd-swatch" onClick={() => setProfile(p => ({ ...p, avatar: col, useImg: false }))} title={col}
                    style={{
                      width: 22, height: 22, borderRadius: 999, background: col,
                      border: (!profile.useImg && profile.avatar === col) ? `2px solid ${c.ink}` : `1px solid ${c.border}`,
                      cursor: 'pointer', padding: 0,
                    }} />
                ))}
              </div>
            </div>
          </Row>
          <Row c={c} label="핸들"><Input c={c} value={profile.handle} onChange={(v) => setProfile(p => ({...p, handle: v}))} prefix="@" /></Row>
          <Row c={c} label="이름"><Input c={c} value={profile.name} onChange={(v) => setProfile(p => ({...p, name: v}))} /></Row>
          <Row c={c} label="짧은 소개">
            <Textarea c={c} value={profile.bio} onChange={(v) => setProfile(p => ({...p, bio: v}))} rows={2} hint={`${profile.bio.length}/120자`} />
          </Row>
          <Row c={c} label="이메일"><Input c={c} type="email" value={profile.email} onChange={(v) => setProfile(p => ({...p, email: v}))} /></Row>
        </SettingsCard>

        {/* SOCIAL */}
        <SettingsCard c={c} id="settings-social" title="소셜 링크" desc="Footer와 About 페이지에 노출. 비워두면 숨겨집니다.">
          <Row c={c} label="GitHub"><Input c={c} value={social.github} onChange={(v) => setSocial(s => ({...s, github: v}))} prefix="github.com/" mono /></Row>
          <Row c={c} label="Email"><Input c={c} type="email" value={profile.email} onChange={(v) => setProfile(p => ({...p, email: v}))} mono /></Row>
        </SettingsCard>

        {/* CATEGORIES */}
        <SettingsCard c={c} id="settings-categories" title="카테고리" desc={
          <>대분류 5개 + 서브카테고리. 헤더 메뉴와 <code style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkSoft }}>/category/[id]</code> 라우팅에 직결됩니다.</>
        }>
          <CategoryManager c={c} t={t}
            cats={cats} editing={editingCat} expanded={expandedCat}
            setEditing={setEditingCat} toggleExpand={toggleExpand}
            updateCat={updateCat} updateSub={updateSub}
            moveCat={moveCat} moveSub={moveSub}
            deleteCat={deleteCat} deleteSub={deleteSub}
            addCat={addCat} addSub={addSub}
          />
        </SettingsCard>

        {/* COMMENTS */}
        <SettingsCard c={c} id="settings-comments" title="댓글 (Giscus)" desc="GitHub Discussions 기반. 별도 DB가 필요 없습니다.">
          <Row c={c} label="댓글 사용">
            <Toggle c={c} value={comments.enabled} onChange={(v) => setComments(s => ({...s, enabled: v}))} />
          </Row>
          <div style={{ opacity: comments.enabled ? 1 : 0.45, pointerEvents: comments.enabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
            <Row c={c} label="저장소"><Input c={c} value={comments.repo} onChange={(v) => setComments(s => ({...s, repo: v}))} mono /></Row>
            <Row c={c} label="카테고리">
              <Select c={c} value={comments.category} onChange={(v) => setComments(s => ({...s, category: v}))}
                options={['General', 'Announcements', 'Comments', 'Q&A']} />
            </Row>
            <Row c={c} label="매핑 방식">
              <Segmented c={c} value={comments.mapping} onChange={(v) => setComments(s => ({...s, mapping: v}))}
                options={[['pathname', 'pathname'], ['url', 'url'], ['title', 'title']]} />
            </Row>
          </div>
        </SettingsCard>

        {/* SEO */}
        <SettingsCard c={c} id="settings-seo" title="SEO · 메타" desc="검색엔진과 SNS 미리보기에 사용됩니다. OG 이미지는 업로드가 아니라 아래 세 문구로 그려집니다.">
          <SeoPreview c={c} t={t} seo={seo} />
          <Row c={c} label="사이트 제목"><Input c={c} value={seo.siteTitle} onChange={(v) => setSeo(s => ({...s, siteTitle: v}))} /></Row>
          <Row c={c} label="짧은 제목"><Input c={c} value={seo.shortTitle} onChange={(v) => setSeo(s => ({...s, shortTitle: v}))} /></Row>
          <Row c={c} label="설명">
            <Textarea c={c} value={seo.description} onChange={(v) => setSeo(s => ({...s, description: v}))} rows={2} hint={`${seo.description.length}/160자`} />
          </Row>
          <Row c={c} label="Canonical URL"><Input c={c} value={seo.canonical} onChange={(v) => setSeo(s => ({...s, canonical: v}))} mono /></Row>
          <Row c={c} label="저작권 표기"><Input c={c} value={seo.copyright} onChange={(v) => setSeo(s => ({...s, copyright: v}))} /></Row>
          <Row c={c} label="언어"><Input c={c} value={seo.lang} onChange={(v) => setSeo(s => ({...s, lang: v}))} mono /></Row>
          <Row c={c} label="locale"><Input c={c} value={seo.locale} onChange={(v) => setSeo(s => ({...s, locale: v}))} mono /></Row>
          <Row c={c} label="OG 헤드라인">
            <Input c={c} value={seo.ogHeadline} onChange={(v) => setSeo(s => ({...s, ogHeadline: v}))} />
          </Row>
          <Row c={c} label="OG 태그라인"><Input c={c} value={seo.ogTagline} onChange={(v) => setSeo(s => ({...s, ogTagline: v}))} /></Row>
          <Row c={c} label="OG 라벨"><Input c={c} value={seo.ogLabel} onChange={(v) => setSeo(s => ({...s, ogLabel: v}))} /></Row>
        </SettingsCard>

        {/* PUBLISH */}
        <SettingsCard c={c} id="settings-publish" title="에디터">
          <Row c={c} label="자동저장 간격">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={3} max={30} step={1} value={publish.autoSaveSec}
                onChange={(e) => setPublish(p => ({...p, autoSaveSec: +e.target.value}))}
                style={{ flex: 1, accentColor: c.borderStrong, maxWidth: 220 }} />
              <code style={{ fontFamily: window.DD_FONTS.mono, fontSize: 12, color: c.inkSoft, fontVariantNumeric: 'tabular-nums', minWidth: 36, whiteSpace: 'nowrap' }}>{publish.autoSaveSec}s</code>
            </div>
          </Row>
          <Row c={c} label="새 댓글 알림">
            <Toggle c={c} value={publish.notifyOnComment} onChange={(v) => setPublish(p => ({...p, notifyOnComment: v}))} />
          </Row>
        </SettingsCard>

        <div className="dd-savebar" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${c.border}` }}>
          <button style={ghostBtn(c)}>되돌리기</button>
          <window.CTA c={c} dark size="md">변경사항 저장</window.CTA>
        </div>
      </div>
    </main>
  );
}

// ── SEO preview ────────────────────────────────────────────────────────
// 한글은 검색결과에서 라틴 문자 두 배 폭을 먹는다. 글자 수가 아니라 폭 단위로 센다.
const DD_WIDE = /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFF60]/;
const seoUnits = (s = '') => [...s].reduce((n, ch) => n + (DD_WIDE.test(ch) ? 2 : 1), 0);
const seoClip = (s = '', max) => {
  let n = 0, out = '';
  for (const ch of s) {
    const w = DD_WIDE.test(ch) ? 2 : 1;
    if (n + w > max) return out.replace(/[\s,·]+$/, '') + '…';
    n += w; out += ch;
  }
  return out;
};

function SeoPreview({ c, t, seo }) {
  const [surface, setSurface] = useStateS('search');
  const [target, setTarget] = useStateS('home');
  const post = window.DD_DATA.posts[0];
  const isPost = target === 'post';
  const host = (seo.canonical || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const title = isPost ? `${post.title} · ${seo.shortTitle}` : seo.siteTitle;
  const desc = isPost ? post.summary : seo.description;
  const link = t.dark ? '#93b4e6' : '#2a5599';

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8,
      padding: '12px 14px 14px', marginBottom: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: c.inkMuted, marginRight: 'auto' }}>PREVIEW</span>
        <Segmented c={c} value={target} onChange={setTarget} options={[['home', '홈'], ['post', '글 상세']]} />
        <Segmented c={c} value={surface} onChange={setSurface} options={[['search', '검색 결과'], ['social', 'SNS 카드']]} />
      </div>

      {surface === 'search' ? (
        <div style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <img src="assets/favicon.svg" width="22" height="22" alt="" style={{ display: 'block', borderRadius: 999, border: `1px solid ${c.border}`, background: c.surface }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 12.5, color: c.ink, letterSpacing: '-0.005em', lineHeight: 1.3 }}>{seo.shortTitle || '—'}</div>
              <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 11.5, color: c.inkMuted, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {host}{isPost ? ` › posts › ${post.slug}` : ''}
              </div>
            </div>
          </div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 18, lineHeight: 1.35, color: link, letterSpacing: '-0.02em', marginBottom: 3 }}>
            {seoClip(title, 60) || '제목 없음'}
          </div>
          <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13, lineHeight: 1.55, color: c.inkSoft, letterSpacing: '-0.005em' }}>
            {isPost && <span style={{ color: c.inkMuted }}>2026. 4. 20. — </span>}{seoClip(desc, 155) || '설명을 입력하면 여기에 표시됩니다.'}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 460, border: `1px solid ${c.border}`, borderRadius: 8, overflow: 'hidden', background: c.surface }}>
          <div style={{ containerType: 'inline-size', aspectRatio: '1200 / 630', background: '#1c1c1c', position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              padding: '7cqw 7.5cqw', color: '#f7f4ed',
            }}>
            <div style={{ position: 'absolute', inset: '3.2cqw', border: '1px solid rgba(247,244,237,0.16)', borderRadius: '1cqw', pointerEvents: 'none' }} />
            <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: '2.4cqw', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(247,244,237,0.6)' }}>
              {seo.ogLabel || '—'}
            </div>
            <div>
              <div style={{ fontFamily: window.DD_FONTS.sans, fontWeight: 600, fontSize: isPost ? '5.4cqw' : '7.4cqw', lineHeight: 1.22, letterSpacing: '-0.03em' }}>
                {seoClip(isPost ? post.title : seo.ogHeadline, isPost ? 52 : 34)}
              </div>
              <div style={{ marginTop: '2cqw', fontFamily: window.DD_FONTS.sans, fontSize: '2.9cqw', lineHeight: 1.5, color: 'rgba(247,244,237,0.62)', letterSpacing: '-0.01em' }}>
                {seoClip(isPost ? post.summary : seo.ogTagline, 78)}
              </div>
            </div>
            </div>
          </div>
          <div style={{ padding: '10px 13px 12px', borderTop: `1px solid ${c.border}` }}>
            <div style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, marginBottom: 4 }}>{host}</div>
            <div style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: 600, color: c.ink, letterSpacing: '-0.015em', lineHeight: 1.4 }}>{seoClip(title, 70)}</div>
            <div style={{ marginTop: 3, fontFamily: window.DD_FONTS.sans, fontSize: 12.5, lineHeight: 1.5, color: c.inkMuted, letterSpacing: '-0.005em' }}>{seoClip(desc, 100)}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, paddingTop: 11, borderTop: `1px dashed ${c.border}` }}>
        <SeoMeter c={c} label="제목" n={seoUnits(title)} max={60} />
        <SeoMeter c={c} label="설명" n={seoUnits(desc)} max={155} />
        <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted, alignSelf: 'center' }}>한글 1자 = 2</span>
      </div>
    </div>
  );
}

function SeoMeter({ c, label, n, max }) {
  const over = n > max;
  const tone = over ? '#a07a35' : c.inkSoft;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
      <span style={{ fontFamily: window.DD_FONTS.sans, fontSize: 12, color: c.inkMuted, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ position: 'relative', flex: 1, height: 3, borderRadius: 999, background: c.surfaceAlt, minWidth: 54, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (n / max) * 100)}%`, background: tone, opacity: over ? 1 : 0.55, borderRadius: 999, transition: 'width 0.15s' }} />
      </div>
      <code style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: tone, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{n}/{max}{over ? ' 잘림' : ''}</code>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────
function SettingsCard({ c, id, title, desc, children }) {
  return (
    <section id={id} style={{
      background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: '20px 22px', marginBottom: 16, scrollMarginTop: 80,
    }}>
      <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${c.border}` }}>
        <h2 style={{ margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 17, fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>{title}</h2>
        {desc && <p style={{ margin: '4px 0 0', fontSize: 13, color: c.inkMuted, lineHeight: 1.55 }}>{desc}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

function Row({ c, label, children }) {
  return (
    <div className="dd-row2" style={{ alignItems: 'center', gap: 14 }}>
      <label style={{ fontFamily: window.DD_FONTS.sans, fontSize: 13, color: c.inkSoft, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Input({ c, value, onChange, prefix, type = 'text', placeholder, mono }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
      overflow: 'hidden',
    }}>
      {prefix && (
        <span style={{
          padding: '7px 10px', fontFamily: window.DD_FONTS.mono, fontSize: 12.5, color: c.inkMuted,
          background: c.surfaceAlt, borderRight: `1px solid ${c.border}`, whiteSpace: 'nowrap',
        }}>{prefix}</span>
      )}
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, padding: '7px 10px', border: 'none', outline: 'none',
          background: 'transparent', color: c.ink,
          fontFamily: mono ? window.DD_FONTS.mono : window.DD_FONTS.sans,
          fontSize: mono ? 13 : 13.5, letterSpacing: '-0.005em',
        }}
      />
    </div>
  );
}

function Textarea({ c, value, onChange, rows = 2, hint }) {
  return (
    <div>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        background: c.bg, color: c.ink, border: `1px solid ${c.border}`,
        fontFamily: window.DD_FONTS.sans, fontSize: 13.5, lineHeight: 1.55,
        resize: 'vertical', outline: 'none', letterSpacing: '-0.005em',
      }} />
      {hint && <div style={{ marginTop: 4, fontSize: 11, color: c.inkMuted, fontFamily: window.DD_FONTS.mono, textAlign: 'right' }}>{hint}</div>}
    </div>
  );
}

function Select({ c, value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      padding: '7px 10px', borderRadius: 6,
      background: c.bg, color: c.ink, border: `1px solid ${c.border}`,
      fontFamily: window.DD_FONTS.sans, fontSize: 13.5, letterSpacing: '-0.005em',
      outline: 'none', cursor: 'pointer',
    }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Segmented({ c, value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', gap: 0, padding: 2, borderRadius: 6, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
      {options.map(([k, lbl]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: '5px 12px', borderRadius: 4, border: 'none',
          background: value === k ? c.bg : 'transparent',
          color: value === k ? c.ink : c.inkMuted,
          fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: value === k ? 600 : 500,
          cursor: 'pointer', letterSpacing: '-0.005em', whiteSpace: 'nowrap',
          boxShadow: value === k ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        }}>{lbl}</button>
      ))}
    </div>
  );
}

function Toggle({ c, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 36, height: 20, borderRadius: 999,
      background: value ? c.borderStrong : c.surfaceAlt,
      border: `1px solid ${c.border}`,
      position: 'relative', cursor: 'pointer', padding: 0,
      transition: 'background 0.15s',
    }}>
      <span style={{
        position: 'absolute', top: 1, left: value ? 17 : 1,
        width: 16, height: 16, borderRadius: 999,
        background: value ? c.bg : c.surface,
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        transition: 'left 0.15s',
      }} />
    </button>
  );
}

function ghostBtn(c) {
  return {
    padding: '6px 12px', borderRadius: 6, border: `1px solid ${c.border}`,
    background: 'transparent', color: c.ink, cursor: 'pointer',
    fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 500,
    letterSpacing: '-0.005em', whiteSpace: 'nowrap',
  };
}

// ── Category Manager ─────────────────────────────────────────────────
function CategoryManager({
  c, t, cats, editing, expanded,
  setEditing, toggleExpand,
  updateCat, updateSub, moveCat, moveSub,
  deleteCat, deleteSub, addCat, addSub,
}) {
  const totalPosts = cats.reduce((a, x) => a + x.count, 0);
  const totalSubs = cats.reduce((a, x) => a + x.subs.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: 18, padding: '6px 2px 14px',
        fontFamily: window.DD_FONTS.mono, fontSize: 11.5, color: c.inkMuted,
        borderBottom: `1px dashed ${c.border}`, marginBottom: 4,
      }}>
        <span><span style={{ color: c.inkSoft, fontWeight: 600 }}>{cats.length}</span> 대분류</span>
        <span><span style={{ color: c.inkSoft, fontWeight: 600 }}>{totalSubs}</span> 서브</span>
        <span><span style={{ color: c.inkSoft, fontWeight: 600 }}>{totalPosts}</span> 글 매핑됨</span>
      </div>

      {/* Tree */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {cats.map((cat, idx) => {
          const isOpen = expanded.has(cat.id);
          const isEditing = editing?.catId === cat.id && !editing?.subId;
          return (
            <li key={cat.id} style={{
              borderTop: idx === 0 ? 'none' : `1px solid ${c.border}`,
            }}>
              {/* Parent row */}
              <CatRow
                c={c} t={t} kind="parent"
                isOpen={isOpen}
                isEditing={isEditing}
                idValue={cat.id}
                nameValue={cat.name}
                descValue={cat.desc}
                count={cat.count}
                onToggleExpand={() => toggleExpand(cat.id)}
                onStartEdit={() => setEditing({ catId: cat.id })}
                onCommit={(patch) => { updateCat(cat.id, patch); setEditing(null); }}
                onCancel={() => setEditing(null)}
                onUp={idx > 0 ? () => moveCat(cat.id, -1) : null}
                onDown={idx < cats.length - 1 ? () => moveCat(cat.id, +1) : null}
                onDelete={() => deleteCat(cat.id)}
                onAddSub={() => addSub(cat.id)}
              />

              {/* Sub rows */}
              {isOpen && cat.subs.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, background: c.surfaceAlt }}>
                  {cat.subs.map((sub, sIdx) => {
                    const subEditing = editing?.catId === cat.id && editing?.subId === sub.id;
                    return (
                      <li key={sub.id} style={{ borderTop: `1px solid ${c.border}` }}>
                        <CatRow
                          c={c} t={t} kind="sub"
                          isEditing={subEditing}
                          idValue={sub.id}
                          nameValue={sub.name}
                          count={sub.count}
                          onStartEdit={() => setEditing({ catId: cat.id, subId: sub.id })}
                          onCommit={(patch) => { updateSub(cat.id, sub.id, patch); setEditing(null); }}
                          onCancel={() => setEditing(null)}
                          onUp={sIdx > 0 ? () => moveSub(cat.id, sub.id, -1) : null}
                          onDown={sIdx < cat.subs.length - 1 ? () => moveSub(cat.id, sub.id, +1) : null}
                          onDelete={() => deleteSub(cat.id, sub.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              {isOpen && cat.subs.length === 0 && (
                <div style={{
                  padding: '8px 16px 10px 44px', background: c.surfaceAlt,
                  fontSize: 12, color: c.inkMuted, fontStyle: 'italic',
                  borderTop: `1px dashed ${c.border}`,
                }}>서브카테고리 없음 — 위 <span style={{ fontFamily: window.DD_FONTS.mono, color: c.inkSoft }}>+ 서브</span> 버튼으로 추가</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add new top-level */}
      <button onClick={addCat} style={{
        marginTop: 12, padding: '8px 12px', borderRadius: 6,
        border: `1px dashed ${c.border}`, background: 'transparent',
        color: c.inkSoft, cursor: 'pointer',
        fontFamily: window.DD_FONTS.sans, fontSize: 12.5, fontWeight: 500,
        letterSpacing: '-0.005em', textAlign: 'left',
        transition: 'border-color 0.15s, color 0.15s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.color = c.ink; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.inkSoft; }}
      >＋ 새 카테고리 추가</button>

      <p style={{ marginTop: 12, fontSize: 12, color: c.inkMuted, lineHeight: 1.55 }}>
        ID는 URL 슬러그에 그대로 들어갑니다. 글이 매핑된 카테고리를 삭제하면 해당 글들은 <span style={{ fontFamily: window.DD_FONTS.mono, color: c.inkSoft }}>uncategorized</span>로 이동합니다.
      </p>
    </div>
  );
}

function CatRow({
  c, t, kind, isOpen, isEditing,
  idValue, nameValue, descValue, count,
  onToggleExpand, onStartEdit, onCommit, onCancel,
  onUp, onDown, onDelete, onAddSub,
}) {
  const isParent = kind === 'parent';
  const [hover, setHover] = useStateS(false);
  const [confirmDel, setConfirmDel] = useStateS(false);
  const [draftName, setDraftName] = useStateS(nameValue);
  const [draftDesc, setDraftDesc] = useStateS(descValue || '');
  const [draftId, setDraftId] = useStateS(idValue);

  React.useEffect(() => {
    if (isEditing) {
      setDraftName(nameValue);
      setDraftDesc(descValue || '');
      setDraftId(idValue);
    }
  }, [isEditing, nameValue, descValue, idValue]);

  const commit = () => {
    const patch = { name: draftName.trim() || nameValue, id: draftId.trim() || idValue };
    if (isParent) patch.desc = draftDesc.trim();
    onCommit(patch);
  };

  const hasPosts = count > 0;
  const canDelete = !hasPosts || confirmDel;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDel(false); }}
      className="dd-linkrow dd-catrow"
      style={{
        alignItems: 'center', gap: 10,
        padding: isParent ? '12px 12px 12px 14px' : '6px 12px 6px 44px',
        background: isEditing ? (t.dark ? 'rgba(168,168,140,0.06)' : 'rgba(122,138,90,0.05)') : 'transparent',
        transition: 'background 0.12s',
        minHeight: isParent ? 48 : 36,
      }}
    >
      {/* Col 1: expand / leaf marker */}
      {isParent ? (
        <button className="dd-iconbtn" onClick={onToggleExpand} aria-label={isOpen ? '접기' : '펼치기'} style={{
          width: 22, height: 22, padding: 0, border: 'none', background: 'transparent',
          color: c.inkMuted, cursor: 'pointer', borderRadius: 4,
          fontFamily: window.DD_FONTS.mono, fontSize: 11,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.12s, color 0.12s',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = c.ink}
          onMouseLeave={(e) => e.currentTarget.style.color = c.inkMuted}
        >▶</button>
      ) : (
        <span style={{ color: c.inkMuted, fontFamily: window.DD_FONTS.mono, fontSize: 11, opacity: 0.6, textAlign: 'center' }}>└</span>
      )}

      {/* Col 2: Name + ID */}
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
            style={{
              padding: '5px 8px', borderRadius: 5,
              background: c.bg, color: c.ink, border: `1px solid ${c.borderStrong}`,
              fontFamily: window.DD_FONTS.sans, fontSize: isParent ? 14 : 13, fontWeight: isParent ? 600 : 500,
              letterSpacing: '-0.01em', outline: 'none',
            }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 11, color: c.inkMuted }}>id:</span>
            <input value={draftId} onChange={(e) => setDraftId(e.target.value.replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
              style={{
                padding: '3px 6px', borderRadius: 4, flex: 1,
                background: c.bg, color: c.inkSoft, border: `1px solid ${c.border}`,
                fontFamily: window.DD_FONTS.mono, fontSize: 11.5, outline: 'none',
              }} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <button onClick={onStartEdit} style={{
            padding: 0, border: 'none', background: 'transparent', cursor: 'text',
            textAlign: 'left', color: c.ink,
            fontFamily: window.DD_FONTS.sans,
            fontSize: isParent ? 14 : 13,
            fontWeight: isParent ? 600 : 500,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{nameValue}</button>
          <code style={{
            fontFamily: window.DD_FONTS.mono, fontSize: 10.5, color: c.inkMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>/{idValue}</code>
        </div>
      )}

      {/* Desc (parent only) OR count (sub) */}
      {isParent ? (
        isEditing ? (
          <input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="한 줄 설명"
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
            style={{
              padding: '6px 8px', borderRadius: 5,
              background: c.bg, color: c.ink, border: `1px solid ${c.border}`,
              fontFamily: window.DD_FONTS.sans, fontSize: 12.5,
              letterSpacing: '-0.005em', outline: 'none', alignSelf: 'center',
            }} />
        ) : (
          <button onClick={onStartEdit} style={{
            padding: 0, border: 'none', background: 'transparent', cursor: 'text',
            textAlign: 'left', color: c.inkSoft,
            fontFamily: window.DD_FONTS.sans, fontSize: 12.5, lineHeight: 1.4,
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            opacity: descValue ? 1 : 0.5,
            fontStyle: descValue ? 'normal' : 'italic',
          }}>{descValue || '설명 추가…'}</button>
        )
      ) : (
        <span />
      )}

      {/* Right: count badge + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        {/* Count pill */}
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          background: count > 0 ? (t.dark ? 'rgba(168,168,140,0.14)' : 'rgba(122,138,90,0.10)') : c.surfaceAlt,
          color: count > 0 ? c.inkSoft : c.inkMuted,
          fontFamily: window.DD_FONTS.mono, fontSize: 11, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'center',
          border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
        }}>{count}</span>

        {/* Actions — visible on hover or when editing */}
        <div className="dd-hoveronly" style={{
          display: 'flex', gap: 2,
          opacity: hover || isEditing ? 1 : 0,
          pointerEvents: hover || isEditing ? 'auto' : 'none',
          transition: 'opacity 0.12s',
        }}>
          {isEditing ? (
            <>
              <IconBtn c={c} onClick={commit} title="저장 (Enter)" tone="ok">✓</IconBtn>
              <IconBtn c={c} onClick={onCancel} title="취소 (Esc)">✕</IconBtn>
            </>
          ) : (
            <>
              {isParent && onAddSub && (
                <IconBtn c={c} onClick={onAddSub} title="서브카테고리 추가" wide>＋ 서브</IconBtn>
              )}
              <IconBtn c={c} onClick={onUp} title="위로" disabled={!onUp}>↑</IconBtn>
              <IconBtn c={c} onClick={onDown} title="아래로" disabled={!onDown}>↓</IconBtn>
              <IconBtn c={c} onClick={onStartEdit} title="이름·ID 편집">✎</IconBtn>
              {hasPosts && !confirmDel ? (
                <IconBtn c={c} onClick={() => setConfirmDel(true)} title={`${count}개 글이 있어요. 한번 더 클릭`} tone="warn">🗑</IconBtn>
              ) : (
                <IconBtn c={c} onClick={canDelete ? onDelete : undefined} title={confirmDel ? '정말 삭제' : '삭제'} tone="danger">
                  {confirmDel ? '정말?' : '🗑'}
                </IconBtn>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ c, onClick, title, children, disabled, tone, wide }) {
  const [hov, setHov] = useStateS(false);
  const tones = {
    danger: { hov: t => t.dark ? 'rgba(168,93,93,0.18)' : 'rgba(168,77,77,0.10)', col: t => t.dark ? '#d8a8a8' : '#8a4d4d' },
    warn:   { hov: () => 'rgba(196,148,72,0.14)', col: () => '#a07a35' },
    ok:     { hov: () => 'rgba(122,138,90,0.16)', col: () => '#5d6e3f' },
  };
  const T = tones[tone];
  return (
    <button className="dd-iconbtn" onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        height: 26, minWidth: wide ? 0 : 26, padding: wide ? '0 8px' : 0,
        borderRadius: 5, border: `1px solid ${hov && !disabled ? c.borderStrong : 'transparent'}`,
        background: disabled ? 'transparent' : (hov ? (T ? T.hov(c) : c.hover) : 'transparent'),
        color: disabled ? c.inkMuted : (T && hov ? T.col(c) : c.inkSoft),
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: wide ? window.DD_FONTS.sans : window.DD_FONTS.mono,
        fontSize: wide ? 11.5 : 12, fontWeight: wide ? 600 : 500,
        letterSpacing: wide ? '-0.005em' : 0, whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s, border-color 0.1s',
      }}>{children}</button>
  );
}

Object.assign(window, { SettingsPage });
