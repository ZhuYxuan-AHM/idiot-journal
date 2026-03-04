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
}

export function NavBar({ t, lang, setLang, transparent, scrollY = 0, userName, onNavigate, onScrollTo, onLogin }: Props) {
  const navBg = transparent && scrollY > 80
    ? { background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(212,175,55,0.15)" }
    : transparent
    ? { background: "transparent" }
    : { background: "rgba(10,10,12,0.98)", borderBottom: "1px solid rgba(212,175,55,0.15)" };

  return (
    <nav style={{ position: transparent ? "fixed" : "relative", top: 0, left: 0, right: 0, zIndex: 100, transition: "all 0.4s", padding: "0 32px", ...navBg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => onNavigate("home")}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 500, color: "var(--gold)", letterSpacing: 4 }}>I.D.I.O.T.</span>
          <span style={{ fontFamily: "var(--serif-cn)", fontSize: 14, color: "var(--text-faint)" }}>若智</span>
        </div>
        <div className="dn" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {([["about", t.nav.about], ["scope", t.nav.scope], ["submit", t.nav.submit]] as const).map(([id, l]) => (
            <a key={id} className="nl" onClick={() => onScrollTo(id)}>{l}</a>
          ))}
          <a className="nl" style={{ color: "var(--gold)" }} onClick={() => onNavigate("preview")}>{t.nav.preview}</a>
          <a className="nl" onClick={() => onNavigate("articles")}>{t.nav.articles}</a>
          <a className="nl" onClick={() => onScrollTo("editorial")}>{t.nav.editorial}</a>
          {userName
            ? <a className="nl" onClick={() => onNavigate("profile")} style={{ color: "var(--gold)" }}>{userName}</a>
            : <a className="nl" onClick={onLogin}>{t.nav.login}</a>
          }
          <LanguageToggle lang={lang} setLang={setLang} />
        </div>
      </div>
    </nav>
  );
}
