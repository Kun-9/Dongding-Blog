// ConfirmDialog — 중앙 카드 모달 with backdrop blur.
// Reusable across post delete, series delete, bookmark delete, etc.
//
// Props:
//   open         — bool
//   tone         — 'danger' | 'warning' | 'info'  (default: 'info')
//   title        — string
//   body         — ReactNode  (한 줄~짧은 문단 권장)
//   meta         — ReactNode  (선택. 대상 식별용 부가 정보 — slug, 영향 받는 항목 수 등)
//   confirmLabel — string (default: '확인')
//   cancelLabel  — string (default: '취소')
//   onConfirm    — () => void
//   onCancel     — () => void
//   c, t         — theme tokens

const { useEffect: useEffectCD, useRef: useRefCD } = React;

function ConfirmDialog({
  open, tone = 'info', title, body, meta,
  confirmLabel = '확인', cancelLabel = '취소',
  onConfirm, onCancel, c, t,
}) {
  const cardRef = useRefCD(null);

  useEffectCD(() => {
    if (!open) return;
    // Esc로만 닫음. Enter 자동 확정은 위험 액션이라 의도적으로 막음.
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
    };
    window.addEventListener('keydown', onKey);
    // 모달 뒤 스크롤 락
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // 카드 자체에 포커스 — 확정 버튼에 자동 포커스하지 않음
    setTimeout(() => cardRef.current?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  // tone 별 글리프 + 색상
  const tones = {
    danger: {
      glyph: '⌫',
      glyphBg:  t.dark ? 'rgba(163,90,77,0.22)' : 'rgba(160,74,58,0.12)',
      glyphFg:  t.dark ? '#d99a8c' : '#a04a3a',
      ringBg:   t.dark ? 'rgba(163,90,77,0.10)' : 'rgba(160,74,58,0.06)',
      btnBg:    t.dark ? '#7a3a30' : '#a04a3a',
      btnInk:   '#fff',
      btnHover: t.dark ? '#8a4438' : '#b25646',
    },
    warning: {
      glyph: '!',
      glyphBg:  t.dark ? 'rgba(194,160,90,0.22)' : 'rgba(154,122,35,0.12)',
      glyphFg:  t.dark ? '#e0c486' : '#9a7a23',
      ringBg:   t.dark ? 'rgba(194,160,90,0.10)' : 'rgba(154,122,35,0.06)',
      btnBg:    t.dark ? '#a07a2a' : '#9a7a23',
      btnInk:   '#fff',
      btnHover: t.dark ? '#b8893a' : '#b08a2c',
    },
    info: {
      glyph: '?',
      glyphBg:  t.dark ? 'rgba(127,165,176,0.22)' : 'rgba(90,133,144,0.12)',
      glyphFg:  t.dark ? '#7fa5b0' : '#5a8590',
      ringBg:   t.dark ? 'rgba(127,165,176,0.10)' : 'rgba(90,133,144,0.06)',
      btnBg:    c.accent,
      btnInk:   c.accentInk,
      btnHover: t.dark ? '#fff' : '#000',
    },
  }[tone] || tones?.info;

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="cd-title"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: t.dark ? 'rgba(8,7,6,0.72)' : 'rgba(28,28,28,0.42)',
        backdropFilter: 'blur(6px) saturate(120%)',
        WebkitBackdropFilter: 'blur(6px) saturate(120%)',
        animation: 'cd-fade-in 0.18s ease-out',
        padding: 24,
      }}
    >
      <style>{`
        @keyframes cd-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cd-pop-in {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          outline: 'none',
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          boxShadow: t.dark
            ? '0 20px 60px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)'
            : '0 20px 60px rgba(28,28,28,0.18), 0 4px 12px rgba(28,28,28,0.06)',
          padding: '28px 28px 22px',
          fontFamily: window.DD_FONTS.sans,
          animation: 'cd-pop-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Tone glyph */}
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tones.glyphBg, color: tones.glyphFg,
          boxShadow: `0 0 0 6px ${tones.ringBg}`,
          fontFamily: window.DD_FONTS.sans, fontSize: 20, fontWeight: 700,
          marginBottom: 18,
        }}>{tones.glyph}</div>

        {/* Title */}
        <h3 id="cd-title" style={{
          margin: 0, fontSize: 19, fontWeight: 600, color: c.ink,
          letterSpacing: '-0.025em', lineHeight: 1.35,
        }}>{title}</h3>

        {/* Body */}
        {body && (
          <div style={{
            margin: '8px 0 0', fontSize: 14, color: c.inkSoft,
            lineHeight: 1.65, letterSpacing: '-0.005em', textWrap: 'pretty',
          }}>{body}</div>
        )}

        {/* Meta block — slug, target identifier, etc. */}
        {meta && (
          <div style={{
            marginTop: 16, padding: '10px 12px',
            background: c.surfaceAlt, border: `1px solid ${c.border}`,
            borderRadius: 8,
            fontFamily: window.DD_FONTS.mono, fontSize: 12.5,
            color: c.inkSoft, lineHeight: 1.5,
            wordBreak: 'break-all',
          }}>{meta}</div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          marginTop: 24,
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 14px', borderRadius: 7,
              background: 'transparent', border: `1px solid ${c.border}`,
              color: c.inkSoft, cursor: 'pointer',
              fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: 500,
              letterSpacing: '-0.005em', whiteSpace: 'nowrap',
              transition: 'border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.color = c.ink; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.inkSoft; }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 16px', borderRadius: 7,
              background: tones.btnBg, border: '1px solid transparent',
              color: tones.btnInk, cursor: 'pointer',
              fontFamily: window.DD_FONTS.sans, fontSize: 13.5, fontWeight: 600,
              letterSpacing: '-0.005em', whiteSpace: 'nowrap',
              boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)',
              transition: 'background 0.12s, transform 0.08s',
              outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = tones.btnHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = tones.btnBg; }}
            onFocus={(e)      => { e.currentTarget.style.boxShadow = `inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.2), 0 0 0 3px ${tones.ringBg}`; }}
            onBlur={(e)       => { e.currentTarget.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)'; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmDialog = ConfirmDialog;
