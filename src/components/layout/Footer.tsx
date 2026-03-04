import type { T } from "@/i18n";

export function Footer({ t }: { t: T }) {
  return (
    <footer style={{ borderTop: "1px solid rgba(212,175,55,0.1)", padding: "48px 0" }}>
      <div className="ctr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--gold)", letterSpacing: 4, marginBottom: 4 }}>
            I.D.I.O.T. <span style={{ fontFamily: "var(--serif-cn)", fontSize: 13, color: "var(--text-faint)", letterSpacing: 2 }}>若智</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-ghost)", fontStyle: "italic" }}>{t.footer.tagline}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)", letterSpacing: 1 }}>
            \u00a9 {new Date().getFullYear()} {t.footer.copy}
          </div>
        </div>
      </div>
    </footer>
  );
}
