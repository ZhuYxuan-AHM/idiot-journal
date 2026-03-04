import { parseFrontMatter, mdToHtml } from "@/lib/markdown";

export function PaperPreview({ markdown }: { markdown: string }) {
  const { meta, body } = parseFrontMatter(markdown);
  const html = mdToHtml(body);
  return (
    <div style={{ background: "#fff", color: "#1a1a1a", fontFamily: "var(--serif)", padding: "44px 48px", minHeight: "100%", lineHeight: 1.8 }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #1a1a1a", paddingBottom: 20, marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#999", letterSpacing: 3, marginBottom: 6 }}>I.D.I.O.T. \u82e5\u667a \u2014 Vol. 1, Issue 1, 2026</div>
        {meta.title && <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, margin: "10px 0" }}>{meta.title}</h1>}
        {meta.authors && <div style={{ fontSize: 14, color: "#555", marginBottom: 3 }}>{meta.authors}</div>}
        {meta.affiliation && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>{meta.affiliation}</div>}
      </div>
      {meta.abstract && (
        <div style={{ background: "#faf9f7", border: "1px solid #eee", padding: "14px 20px", marginBottom: 24, fontSize: 13, lineHeight: 1.8 }}>
          <strong>Abstract:</strong> {meta.abstract}
        </div>
      )}
      {meta.keywords && <div style={{ fontSize: 11, color: "#888", marginBottom: 20, fontFamily: "var(--mono)" }}>Keywords: {meta.keywords}</div>}
      {meta.classification && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#bbb", marginBottom: 16, letterSpacing: 1 }}>Classification: {meta.classification} | Model: {meta.model || "N/A"}</div>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
