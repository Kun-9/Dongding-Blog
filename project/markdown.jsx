// Shared markdown parser — used by Studio preview AND post detail page.
// Block-level: # ## ### ####, ```lang:filename, > [!KIND] title (multi-line),
//              - / 1. lists, ---, blank lines.
// Inline:     **bold**, *italic*, `code`, [text](url), ![alt](url).
// `>` is RESERVED for callouts. Plain blockquote is not supported.

(function () {
  // 링크 카드로 펼쳐질 줄 — URL 또는 /posts/slug 하나만 있는 줄.
  const CARD_LINE = /^(https?:\/\/[^\s<>]+|\/posts\/[A-Za-z0-9_-]+)$/;

  // ── Inline tokenizer ────────────────────────────────────────────────────
  // Splits a string into <strong>, <em>, <code>, <a>, <img>, plain text nodes.
  function renderInline(text, c, keyBase) {
    if (!text) return null;
    const out = [];
    let i = 0;
    let buf = '';
    let n = 0;
    const flush = () => {
      if (buf) {
        out.push(buf);
        buf = '';
      }
    };
    const push = (node) => {
      flush();
      out.push(node);
      n++;
    };
    while (i < text.length) {
      const ch = text[i];
      const rest = text.slice(i);

      // Image ![alt](url)
      let m = rest.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) {
        push(
          <img
            key={`${keyBase}-img-${n}`}
            src={m[2]}
            alt={m[1]}
            style={{ maxWidth: '100%', borderRadius: 8, margin: '8px 0', display: 'block' }}
          />
        );
        i += m[0].length;
        continue;
      }
      // Link [text](url)
      m = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        push(
          <a
            key={`${keyBase}-a-${n}`}
            href={m[2]}
            target={/^https?:/.test(m[2]) ? '_blank' : undefined}
            rel={/^https?:/.test(m[2]) ? 'noopener noreferrer' : undefined}
            style={{ color: c.ink, textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: c.borderStrong }}
          >
            {renderInline(m[1], c, `${keyBase}-a-${n}-i`)}
          </a>
        );
        i += m[0].length;
        continue;
      }
      // Bare URL mid-sentence — 문장 안에 그대로 적은 주소도 링크로 만든다.
      if ((ch === 'h' || ch === 'H') && /^https?:\/\//i.test(rest)) {
        m = rest.match(/^https?:\/\/[^\s<>]+/i);
        if (m) {
          const raw = m[0].replace(/[.,;:!?)\]]+$/, '');
          push(
            <a
              key={`${keyBase}-u-${n}`}
              href={raw}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: c.ink, textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: c.borderStrong, overflowWrap: 'anywhere' }}
            >
              {raw.replace(/^https?:\/\//, '')}
            </a>
          );
          i += raw.length;
          continue;
        }
      }
      // Inline code `...`
      if (ch === '`') {
        const end = text.indexOf('`', i + 1);
        if (end > i) {
          push(<window.IC key={`${keyBase}-ic-${n}`} c={c}>{text.slice(i + 1, end)}</window.IC>);
          i = end + 1;
          continue;
        }
      }
      // Bold **text**
      if (ch === '*' && text[i + 1] === '*') {
        const end = text.indexOf('**', i + 2);
        if (end > i + 1) {
          push(
            <strong key={`${keyBase}-b-${n}`} style={{ color: c.ink, fontWeight: 600 }}>
              {renderInline(text.slice(i + 2, end), c, `${keyBase}-b-${n}-i`)}
            </strong>
          );
          i = end + 2;
          continue;
        }
      }
      // Italic *text*  (single asterisk, not adjacent to spaces awkwardly)
      if (ch === '*' && text[i + 1] !== '*' && text[i + 1] !== ' ') {
        const end = text.indexOf('*', i + 1);
        if (end > i && text[end - 1] !== ' ') {
          push(
            <em key={`${keyBase}-i-${n}`} style={{ fontStyle: 'italic' }}>
              {renderInline(text.slice(i + 1, end), c, `${keyBase}-i-${n}-i`)}
            </em>
          );
          i = end + 1;
          continue;
        }
      }
      buf += ch;
      i++;
    }
    flush();
    // Single string fast-path
    if (out.length === 1 && typeof out[0] === 'string') return out[0];
    return out.map((node, idx) => (typeof node === 'string' ? <React.Fragment key={`${keyBase}-t-${idx}`}>{node}</React.Fragment> : node));
  }

  // 줄 하나가 통째로 이미지일 때만 블록 이미지로 승격한다.
  const IMG_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)(?:\{([A-Za-z0-9]+)\})?$/;

  // ── Block parser ────────────────────────────────────────────────────────
  // Returns array of JSX nodes.
  function renderMarkdown(src, c, opts = {}) {
    const codeStyle = opts.codeStyle || 'card';
    const lines = String(src || '').split('\n');
    const out = [];
    let i = 0;
    let key = 0;
    const k = () => `md-${key++}`;

    const headerStyle = (level) => {
      const sizes = { 1: 30, 2: 24, 3: 19, 4: 16 };
      const margins = { 1: '0 0 14px', 2: '28px 0 10px', 3: '22px 0 8px', 4: '18px 0 6px' };
      return {
        fontFamily: window.DD_FONTS.sans,
        fontSize: sizes[level],
        fontWeight: 600,
        letterSpacing: level <= 2 ? '-0.025em' : '-0.015em',
        lineHeight: 1.3,
        margin: margins[level],
        color: c.ink,
        scrollMarginTop: 80,
      };
    };

    const slugify = (s) =>
      String(s)
        .toLowerCase()
        .trim()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);

    while (i < lines.length) {
      const ln = lines[i];

      // Blank line
      if (ln.trim() === '') {
        i++;
        continue;
      }

      // Horizontal rule
      if (/^---+\s*$/.test(ln)) {
        out.push(<hr key={k()} style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '28px 0' }} />);
        i++;
        continue;
      }

      // Link preview card — URL(또는 내부 글 경로)만 한 줄에 놓인 경우
      if (CARD_LINE.test(ln.trim())) {
        const target = ln.trim();
        const internal = target.match(/^\/posts\/([A-Za-z0-9_-]+)$/);
        out.push(
          internal
            ? <window.PostRefCard key={k()} c={c} slug={internal[1]} onNav={opts.onNav} />
            : <window.LinkCard key={k()} c={c} url={target} />
        );
        i++;
        continue;
      }

      // 이미지 줄 — 한 줄이면 Figure, 연속 줄이면 묶음. `{sm|wide|2|3|4}`로 폭·열 지정.
      if (IMG_LINE.test(ln.trim())) {
        const items = [];
        let opt = '';
        while (i < lines.length && IMG_LINE.test(lines[i].trim())) {
          const im = lines[i].trim().match(IMG_LINE);
          if (!items.length) opt = (im[3] || '').toLowerCase();
          items.push({ alt: im[1].trim(), src: im[2] });
          i++;
        }
        out.push(items.length === 1
          ? <window.Figure key={k()} c={c} src={items[0].src} alt={items[0].alt} size={opt} />
          : <window.ImageGroup key={k()} c={c} items={items} opt={opt} />);
        continue;
      }

      // Headers H1–H4
      const hMatch = ln.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2].trim();
        const id = slugify(text);
        const Tag = `h${level}`;
        out.push(
          <Tag key={k()} id={id} style={headerStyle(level)}>
            {renderInline(text, c, `${k()}-h`)}
          </Tag>
        );
        i++;
        continue;
      }

      // Code block ```lang:filename
      if (ln.startsWith('```')) {
        const fence = ln.slice(3).trim();
        const [lang, filename] = fence.split(':').map((s) => (s || '').trim());
        const code = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          code.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        out.push(
          <window.CodeBlock
            key={k()}
            c={c}
            lang={lang || ''}
            filename={filename || ''}
            code={code.join('\n')}
            style={codeStyle}
          />
        );
        continue;
      }

      // Callout — `> [!KIND] title` then continuation lines starting with `>`
      if (ln.startsWith('>')) {
        const first = ln.replace(/^>\s?/, '');
        const kindMatch = first.match(/^\[!(INFO|WARNING|TIP|NOTE)\]\s*(.*)$/i);
        const kind = kindMatch ? kindMatch[1].toLowerCase() : 'info';
        const title = kindMatch ? kindMatch[2].trim() : '';
        const bodyLines = kindMatch ? [] : [first];
        i++;
        while (i < lines.length && lines[i].startsWith('>')) {
          bodyLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        // Strip leading/trailing blank lines inside callout
        while (bodyLines.length && bodyLines[0].trim() === '') bodyLines.shift();
        while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();
        // Body paragraphs separated by blank lines
        const paragraphs = [];
        let cur = [];
        for (const bl of bodyLines) {
          if (bl.trim() === '') {
            if (cur.length) paragraphs.push(cur.join(' '));
            cur = [];
          } else {
            cur.push(bl);
          }
        }
        if (cur.length) paragraphs.push(cur.join(' '));

        out.push(
          <window.Callout key={k()} c={c} kind={kind} title={title || undefined}>
            {paragraphs.map((p, idx) => (
              <p key={idx} style={{ margin: idx === paragraphs.length - 1 ? 0 : '0 0 0.7em' }}>
                {renderInline(p, c, `${k()}-co-${idx}`)}
              </p>
            ))}
          </window.Callout>
        );
        continue;
      }

      // Unordered list  `- item`
      if (/^-\s+/.test(ln)) {
        const items = [];
        while (i < lines.length && /^-\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^-\s+/, ''));
          i++;
        }
        out.push(
          <ul key={k()} style={{ margin: '0 0 1.2em', padding: '0 0 0 1.3em', color: c.inkSoft, fontSize: 15.5, lineHeight: 1.85 }}>
            {items.map((it, idx) => (
              <li key={idx} style={{ margin: '0 0 0.3em' }}>{renderInline(it, c, `${k()}-li-${idx}`)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list  `1. item`
      if (/^\d+\.\s+/.test(ln)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\.\s+/, ''));
          i++;
        }
        out.push(
          <ol key={k()} style={{ margin: '0 0 1.2em', padding: '0 0 0 1.5em', color: c.inkSoft, fontSize: 15.5, lineHeight: 1.85 }}>
            {items.map((it, idx) => (
              <li key={idx} style={{ margin: '0 0 0.3em' }}>{renderInline(it, c, `${k()}-oli-${idx}`)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Paragraph — collect contiguous non-empty, non-block lines
      const paraLines = [ln];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('>') &&
        !/^-\s+/.test(lines[i]) &&
        !/^\d+\.\s+/.test(lines[i]) &&
        !/^---+\s*$/.test(lines[i]) &&
        !CARD_LINE.test(lines[i].trim())
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      out.push(
        <p key={k()} style={{ margin: '0 0 1em', fontSize: 15.5, lineHeight: 1.85, color: c.inkSoft, textWrap: 'pretty' }}>
          {renderInline(paraLines.join(' '), c, `${k()}-p`)}
        </p>
      );
    }
    return out;
  }

  // Extract a TOC from markdown source — H2/H3 only.
  function extractTOC(src) {
    const lines = String(src || '').split('\n');
    const items = [];
    let inFence = false;
    for (const ln of lines) {
      if (ln.startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = ln.match(/^(#{2,3})\s+(.+)$/);
      if (m) {
        const level = m[1].length;
        const text = m[2].trim();
        const id = text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s가-힣-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 60);
        items.push({ id, label: text, level });
      }
    }
    return items;
  }

  window.renderMarkdown = renderMarkdown;
  window.extractTOC = extractTOC;
})();
