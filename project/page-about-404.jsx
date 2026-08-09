// Pages: About, NotFound

function AboutPage({ c, t, onNav }) {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px var(--gut) 0' }}>
      <header style={{ marginBottom: 40 }}>
        <img src="assets/avatar.svg" width="88" height="88" alt=""
          style={{ display: 'block', borderRadius: 999, marginBottom: 22, border: `1px solid ${c.border}` }} />
        <div style={{
          fontFamily: window.DD_FONTS.sans, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: c.inkMuted, marginBottom: 12,
        }}>About</div>
        <h1 style={{
          margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 44, fontWeight: 600,
          letterSpacing: '-0.035em', lineHeight: 1.1, color: c.ink, textWrap: 'balance',
        }}>안녕하세요,<br/>{window.DD_DATA.author}입니다.</h1>
      </header>

      <section style={{ marginBottom: 40 }}>
        <p style={{ margin: '0 0 1.4em', fontSize: 17, lineHeight: 1.85, color: c.inkSoft, letterSpacing: '-0.005em' }}>
          2년차 백엔드 개발자입니다. Java, Spring, Oracle로 일하고, 분산 서비스가 공유하는 공통 계층을 만들고 운영하면서 시스템이 어떻게 맞물려 돌아가는지 익히고 있어요.
        </p>
        <p style={{ margin: '0 0 1.4em', fontSize: 17, lineHeight: 1.85, color: c.inkSoft, letterSpacing: '-0.005em' }}>
          요즘은 AI를 학습하고 실제 업무에 어떻게 녹여낼지 실험하는 게 가장 즐겁습니다. 이 블로그에는 그 과정에서 마주친 문제를 끝까지 풀어본 기록을 남겨요.
          답이 있는 글보다, 같이 고민하다가 함께 답에 도달하는 글을 쓰고 싶습니다.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{
          margin: '0 0 16px', fontFamily: window.DD_FONTS.sans, fontSize: 22, fontWeight: 600,
          letterSpacing: '-0.025em', color: c.ink,
        }}>경력</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {[
            ['2024.08 — 현재', '한경정보기술 백엔드 엔지니어', '분산 서비스 공통 계층을 설계하고 운영, 업무에 AI 도구를 적극 활용'],
          ].map(([when, role, desc], i) => (
            <li key={i} className="dd-sidecol-140" style={{
              padding: '14px 0', borderTop: `1px solid ${c.border}`,
            }}>
              <span style={{ fontFamily: window.DD_FONTS.mono, fontSize: 13, color: c.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{when}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: c.ink, letterSpacing: '-0.015em' }}>{role}</div>
                <div style={{ fontSize: 14, color: c.inkMuted, marginTop: 2, lineHeight: 1.6 }}>{desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{
          margin: '0 0 14px', fontFamily: window.DD_FONTS.sans, fontSize: 22, fontWeight: 600,
          letterSpacing: '-0.025em', color: c.ink,
        }}>관심사</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Java', 'Spring', 'Oracle', '분산 서비스', '공통 모듈 설계', 'AI 활용 개발', 'LLM 워크플로우'].map(t => (
            <span key={t} style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              fontFamily: window.DD_FONTS.sans, background: c.surface,
              border: `1px solid ${c.border}`, color: c.ink, letterSpacing: '-0.01em',
            }}>{t}</span>
          ))}
        </div>
      </section>

      <section style={{ paddingBottom: 32 }}>
        <h2 style={{
          margin: '0 0 14px', fontFamily: window.DD_FONTS.sans, fontSize: 22, fontWeight: 600,
          letterSpacing: '-0.025em', color: c.ink,
        }}>연락</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <window.CTA c={c} dark href={`https://${window.DD_DATA.social.github}`}>GitHub</window.CTA>
          <window.CTA c={c} dark={false} href={`mailto:${window.DD_DATA.social.email}`}>Email</window.CTA>
        </div>
      </section>
    </main>
  );
}

function NotFoundPage({ c, t, onNav }) {
  return (
    <main style={{
      maxWidth: 700, margin: '0 auto', padding: '120px var(--gut)',
      textAlign: 'center', minHeight: 'calc(100vh - 200px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: window.DD_FONTS.mono, fontSize: 13, color: c.inkMuted,
        marginBottom: 24, padding: '8px 14px', borderRadius: 6,
        background: c.surface, border: `1px solid ${c.border}`,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#c95642' }} />
        HTTP 404 · NoSuchPostException
      </div>
      <h1 style={{
        margin: 0, fontFamily: window.DD_FONTS.sans, fontSize: 80, fontWeight: 700,
        letterSpacing: '-0.05em', lineHeight: 0.95, color: c.ink,
      }}>404</h1>
      <h2 style={{
        margin: '20px 0 14px', fontFamily: window.DD_FONTS.sans, fontSize: 24, fontWeight: 600,
        letterSpacing: '-0.025em', color: c.ink, textWrap: 'balance',
      }}>이 글은 영속성 컨텍스트에 없습니다</h2>
      <p style={{ margin: 0, fontSize: 15, color: c.inkMuted, lineHeight: 1.7, maxWidth: 480 }}>
        URL이 잘못됐거나, 글이 옮겨졌거나, 아직 발행되지 않은 글일 수 있어요.<br/>
        flush() 한번 더 하면 나올 것 같지만 — 안 나올 거예요.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
        <window.CTA c={c} dark onClick={(e) => { e.preventDefault(); onNav('home'); }} href="#/">← 홈으로</window.CTA>
        <window.CTA c={c} dark={false} onClick={(e) => { e.preventDefault(); onNav('posts'); }} href="#/posts">전체 글</window.CTA>
      </div>
    </main>
  );
}

Object.assign(window, { AboutPage, NotFoundPage });
