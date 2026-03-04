import { useState } from "react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import type { Lang } from "@/lib/types";
import type { T } from "@/i18n";

interface Props {
  t: T;
  lang: Lang;
  setLang: (l: Lang) => void;
  transparent?: boolean;
  scrollY?: number;
  userName?: string;
  onNavigate: (page: string) => void;
  onScrollTo: (id: string) => void;
  onLogin: () => void;
  onLogout?: () => void;
}

export function NavBar({ t, lang, setLang, transparent, scrollY = 0, userName, onNavigate, onScrollTo, onLogin, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navBg = transparent && scrollY > 80
    ? { background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(212,175,55,0.15)" }
    : transparent
    ? { background: "transparent" }
    : { background: "rgba(10,10,12,0.98)", borderBottom: "1px solid rgba(212,175,55,0.15)" };

  const navLink = (label: string, action: () => void, gold?: boolean) => (
    <a className="nl" style={gold ? { color: "var(--gold)" } : undefined}
      onClick={() => { action(); setMenuOpen(false); }}>{label}</a>
  );

  const links = (
    <>
      {([["about", t.nav.about], ["scope", t.nav.scope], ["submit", t.nav.submit]] as const).map(([id, l]) => (
        <a key={id} className="nl" onClick={() => { onScrollTo(id); setMenuOpen(false); }}>{l}</a>
      ))}
      {navLink(t.nav.preview, () => onNavigate("preview"), true)}
      {navLink(t.nav.articles, () => onNavigate("articles"))}
      {navLink(t.nav.editorial, () => onScrollTo("editorial"))}
      {userName
        ? <a className="nl" onClick={() => { onNavigate("profile"); setMenuOpen(false); }} style={{ color: "var(--gold)" }}>{userName}</a>
        : <a className="nl" onClick={() => { onLogin(); setMenuOpen(false); }}>{t.nav.login}</a>
      }
      {userName && onLogout && (
        <a className="nl" style={{ fontSize: 10, color: "var(--text-ghost)" }} onClick={() => { onLogout(); setMenuOpen(false); }}>Logout</a>
      )}
      <LanguageToggle lang={lang} setLang={setLang} />
    </>
  );

  return (
    <>
      <nav style={{ position: transparent ? "fixed" : "relative", top: 0, left: 0, right: 0, zIndex: 100, transition: "all 0.4s", padding: "0 24px", ...navBg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => onNavigate("home")}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 500, color: "var(--gold)", letterSpacing: 4 }}>I.D.I.O.T.</span>
            <span style={{ fontFamily: "var(--serif-cn)", fontSize: 14, color: "var(--text-faint)" }}>{"\u82e5\u667a"}</span>
          </div>

          {/* Desktop nav */}
          <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {links}
          </div>

          {/* Mobile hamburger */}
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none", background: "none", border: "none", cursor: "pointer",
              padding: 8, flexDirection: "column", gap: 5,
            }}>
            <span style={{ width: 22, height: 2, background: menuOpen ? "var(--gold)" : "var(--text-dim)", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ width: 22, height: 2, background: "var(--text-dim)", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 22, height: 2, background: menuOpen ? "var(--gold)" : "var(--text-dim)", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="nav-mobile-menu" onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed", top: 64, left: 0, right: 0, bottom: 0, zIndex: 99,
            background: "rgba(10,10,12,0.98)", backdropFilter: "blur(12px)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "flex-start", paddingTop: 40, gap: 24,
          }}>
          {links}
        </div>
      )}
    </>
  );
}
