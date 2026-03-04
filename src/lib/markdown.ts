/** Parse YAML-ish front matter from markdown */
export function parseFrontMatter(md: string) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {} as Record<string, string>, body: md };
  const meta: Record<string, string> = {};
  m[1].split("\n").forEach((l) => {
    const x = l.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (x) meta[x[1]] = x[2];
  });
  return { meta, body: m[2] };
}

/** Convert simple markdown to HTML for journal preview */
export function mdToHtml(md: string): string {
  let h = md
    .replace(/^#### (.*$)/gm, '<h5 class="mh5">$1</h5>')
    .replace(/^### (.*$)/gm, '<h4 class="mh4">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="mh3">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 class="mh2">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="mc">$1</code>')
    .replace(/^> (.*$)/gm, '<blockquote class="mbq">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="mhr"/>')
    .replace(/^- (.*$)/gm, "<li>$1</li>");

  // Tables
  h = h.replace(/(\|.*\|\n)+/g, (match) => {
    const rows = match
      .trim()
      .split("\n")
      .filter((r) => !r.match(/^\|[\s\-|]+\|$/));
    if (!rows.length) return match;
    const cells = rows.map((r) =>
      r
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim())
    );
    let t =
      '<table class="mt"><thead><tr>' +
      cells[0].map((c) => `<th>${c}</th>`).join("") +
      "</tr></thead><tbody>";
    cells.slice(1).forEach((row) => {
      t += "<tr>" + row.map((c) => `<td>${c}</td>`).join("") + "</tr>";
    });
    return t + "</tbody></table>";
  });

  // Group consecutive blockquotes and list items
  h = h.replace(
    /((<blockquote class="mbq">.*<\/blockquote>\n?)+)/g,
    '<div class="mbqg">$1</div>'
  );
  h = h.replace(/((<li>.*<\/li>\n?)+)/g, '<ul class="ml">$1</ul>');

  // Wrap remaining text in paragraphs
  h = h
    .split("\n\n")
    .map((b) => {
      const s = b.trim();
      if (!s || s.startsWith("<")) return s;
      return `<p class="mp">${s}</p>`;
    })
    .join("\n");

  return h;
}
