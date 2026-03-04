import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useArticles } from "@/hooks/useArticles";
import { supabase, isLive } from "@/lib/supabase";
import { DEMO_USER_PAPERS } from "@/lib/demo-data";
import { TEMPLATE_EN, TEMPLATE_ZH } from "@/lib/templates";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/layout/AuthModal";
import { SocialBar } from "@/components/articles/SocialBar";
import { CommentSection } from "@/components/articles/CommentSection";
import { InteractiveRating } from "@/components/articles/InteractiveRating";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { LevelBar } from "@/components/profile/LevelBar";
import { PaperPreview } from "@/components/preview/PaperPreview";
import type { Lang, Article } from "@/lib/types";

import "@/styles/global.css";

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [page, setPage] = useState("home");
  const [scrollY, setScrollY] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const t = useT(lang);
  const { user, signIn, signUp, signOut } = useAuth();
  const { articles, trackShare } = useArticles();

  useEffect(() => { setMarkdown(lang === "en" ? TEMPLATE_EN : TEMPLATE_ZH); }, [lang]);
  useEffect(() => {
    const f = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  const goTo = (id: string) => { setPage("home"); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100); };
  const handleCopy = () => { navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handlePdf = () => window.print();
  const handleSubmitPaper = async () => {
    if (!user) { setSubmitMsg(t.preview.loginFirst); return; }
    if (!markdown.trim() || markdown.trim().length < 100) {
      setSubmitMsg("Paper content is too short. Please write at least 100 characters.");
      setTimeout(() => setSubmitMsg(""), 4000);
      return;
    }
    if (isLive && supabase) {
      const { error } = await supabase.from("submissions").insert({
        user_id: user.id,
        title: markdown.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 200) || "Untitled",
        markdown,
        classification: "Human Bewilderment",
        status: "draft",
      });
      if (error) {
        setSubmitMsg("Submission failed: " + error.message);
        setTimeout(() => setSubmitMsg(""), 5000);
        return;
      }
    }
    setSubmitMsg(t.preview.submitSuccess);
    setTimeout(() => setSubmitMsg(""), 4000);
  };
  const handleLogin = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    return { error: error ? (typeof error === "string" ? error : (error as any).message ?? "Login failed") : null };
  };
  const handleRegister = async (email: string, password: string, meta: { name: string; affiliation: string }) => {
    const { error } = await signUp(email, password, meta);
    return { error: error ? (typeof error === "string" ? error : (error as any).message ?? "Registration failed") : null };
  };

  const navProps = {
    t, lang, setLang, userName: user?.name.split(" ")[0],
    onNavigate: (p: string) => { setPage(p); window.scrollTo({ top: 0 }); },
    onScrollTo: goTo, onLogin: () => setAuthMode("login"),
    onLogout: signOut,
  };

  const featured = articles.find((a) => a.featured);
  const others = articles.filter((a) => !a.featured);
  const isZh = lang === "zh";

  /* ═══════════════ PREVIEW PAGE ═══════════════ */
  if (page === "preview") {
    return (
      <div style={{ minHeight: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <div style={{ background: "rgba(10,10,12,0.98)", borderBottom: "1px solid var(--gold-dim)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--gold)", letterSpacing: 2, cursor: "pointer" }} onClick={() => setPage("home")}>{"\u2190"} I.D.I.O.T. {"\u82e5\u667a"}</span>
            <span style={{ color: "var(--text-dead)" }}>|</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: 1 }}>{t.preview.title}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--gold)", border: "1px solid rgba(212,175,55,0.3)", padding: "2px 7px", letterSpacing: 1 }}>{t.preview.templateLabel}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="bp bs" onClick={handleCopy}>{copied ? t.preview.copied : t.preview.btnCopy}</button>
            <button className="bp bs" onClick={handlePdf}>{t.preview.btnPdf}</button>
            <button className="bp bs" style={{ borderColor: "var(--text-ghost)", color: "var(--text-muted)" }} onClick={() => setMarkdown(lang === "en" ? TEMPLATE_EN : TEMPLATE_ZH)}>{t.preview.btnClear}</button>
            <button className="bp bs" style={{ background: "var(--gold)", color: "var(--bg)", borderColor: "var(--gold)" }} onClick={handleSubmitPaper}>{t.preview.btnSubmit}</button>
            {!user && <button className="bp bs" onClick={() => setAuthMode("login")}>{t.nav.login}</button>}
            <LanguageToggle lang={lang} setLang={setLang} />
          </div>
        </div>
        {submitMsg && (
          <div style={{ padding: "10px 24px", fontSize: 12, fontFamily: "var(--mono)", color: submitMsg.includes("success") || submitMsg.includes("\u6210\u529f") ? "#4ade80" : "#ef4444", background: submitMsg.includes("success") || submitMsg.includes("\u6210\u529f") ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)", borderBottom: "1px solid var(--border)" }}>
            {submitMsg}
          </div>
        )}
        <div style={{ padding: "6px 24px", fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--mono)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>{t.preview.desc}</div>
        <div className="pg" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
          <div style={{ borderRight: "1px solid rgba(212,175,55,0.1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "6px 20px", fontSize: 8, fontFamily: "var(--mono)", color: "var(--text-ghost)", letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", justifyContent: "space-between" }}>
              <span>Markdown Editor</span><span style={{ color: "var(--text-dead)" }}>{markdown.length.toLocaleString()} chars</span>
            </div>
            <textarea className="ea" value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "6px 20px", fontSize: 8, fontFamily: "var(--mono)", color: "var(--text-ghost)", letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>Journal Format Preview</div>
            <div style={{ flex: 1, overflow: "auto", background: "#edecea" }}>
              <div style={{ maxWidth: 660, margin: "16px auto", boxShadow: "0 1px 12px rgba(0,0,0,0.1)", borderRadius: 1 }}>
                <PaperPreview markdown={markdown} />
              </div>
              <div style={{ height: 24 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════ ARTICLE DETAIL PAGE (Preprint Style) ═══════════════ */
  if (page === "article-detail" && selectedArticle) {
    const a = selectedArticle;
    return (
      <div style={{ minHeight: "100vh" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <NavBar {...navProps} />
        <div style={{ paddingTop: 80, maxWidth: 800, margin: "0 auto", padding: "80px 24px 0" }}>
          <a className="nl" style={{ display: "inline-block", marginTop: 20, marginBottom: 32 }}
            onClick={() => { setPage("articles"); setSelectedArticle(null); }}>
            {t.articles.backToList}
          </a>

          {/* Preprint header bar */}
          <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)", padding: "16px 24px", marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }} className="preprint-meta">
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 2 }}>I.D.I.O.T. PREPRINT</span>
              <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{t.articles.vol} {a.vol}, {t.articles.iss} {a.issue}</span>
              <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{a.date}</span>
            </div>
            <div style={{ display: "inline-block", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", padding: "2px 10px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1 }}>
              {a.classification}
            </div>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.4, marginBottom: 8 }}>
            {isZh ? a.title_zh : a.title_en}
          </h1>
          {isZh && a.title_en && <h2 style={{ fontSize: 18, fontWeight: 300, color: "var(--text-muted)", marginBottom: 12, fontStyle: "italic" }}>{a.title_en}</h2>}
          {!isZh && a.title_zh && <h2 style={{ fontSize: 18, fontWeight: 300, color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--serif-cn)" }}>{a.title_zh}</h2>}

          {/* Authors */}
          <div style={{ fontSize: 16, color: "var(--text-dim)", marginBottom: 4, fontWeight: 500 }}>{a.authors}</div>
          <div style={{ fontSize: 13, color: "var(--text-faint)", fontStyle: "italic", marginBottom: 8 }}>{a.affiliation}</div>
          {a.model !== "N/A" && (
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginBottom: 8 }}>{t.articles.model}: {a.model}</div>
          )}

          <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

          {/* Abstract */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              {t.articles.abstract}
            </div>
            <p style={{ fontSize: 15.5, lineHeight: 2, color: "var(--text-dim)", textAlign: "justify" }}>
              {isZh ? a.abstract_zh : a.abstract_en}
            </p>
            {isZh && <p style={{ fontSize: 14, lineHeight: 1.9, color: "var(--text-faint)", marginTop: 16, fontStyle: "italic" }}>{a.abstract_en}</p>}
          </div>

          {a.keywords && (
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginBottom: 32 }}>
              <span style={{ fontWeight: 600, color: "var(--text-faint)" }}>{t.articles.keywords}:</span> {a.keywords}
            </div>
          )}

          <div style={{ height: 1, background: "var(--border)", margin: "8px 0 32px" }} />

          <SocialBar article={a} t={t.articles} onShare={() => trackShare(a.id)} />

          <InteractiveRating articleId={a.id} user={user} t={t} onLoginRequired={() => setAuthMode("login")} />
          <CommentSection articleId={a.id} user={user} t={t} onLoginRequired={() => setAuthMode("login")} />

          <div style={{ height: 80 }} />
        </div>
        <Footer t={t} />
      </div>
    );
  }

  /* ═══════════════ ARTICLES PAGE ═══════════════ */
  if (page === "articles") {
    return (
      <div style={{ minHeight: "100vh" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <NavBar {...navProps} />
        <div style={{ paddingTop: 80 }} className="ctr">
          <div className="gl" style={{ marginTop: 40 }} />
          <h1 style={{ fontSize: 42, fontWeight: 300, marginBottom: 8 }}>{t.articles.title}</h1>
          <p style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--text-faint)", marginBottom: 48, letterSpacing: 1 }}>{t.articles.coverNote}</p>

          {featured && (
            <div style={{ border: "1px solid rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)", marginBottom: 48, cursor: "pointer", overflow: "hidden" }} onClick={() => { setSelectedArticle(featured); setPage("article-detail"); window.scrollTo({ top: 0 }); }}>
              <div style={{ padding: "32px 44px 40px" }}>
                <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>{t.articles.featured}</div>
                <div style={{ display: "inline-block", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", padding: "2px 10px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1, marginBottom: 12 }}>{featured.classification}</div>
                <h2 style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.35, marginBottom: 10 }}>{isZh ? featured.title_zh : featured.title_en}</h2>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>{featured.authors} {"\u2014"} {featured.affiliation}</div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-faint)", marginBottom: 16, maxWidth: 800 }}>{isZh ? featured.abstract_zh : featured.abstract_en}</p>
                <div style={{ display: "flex", gap: 24, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginBottom: 4 }}>
                  {featured.model !== "N/A" && <span>{t.articles.model}: {featured.model}</span>}
                  <span>{t.articles.vol} {featured.vol}, {t.articles.iss} {featured.issue}</span>
                  <span>{featured.date}</span>
                </div>
                <SocialBar article={featured} t={t.articles} onShare={() => trackShare(featured.id)} />
              </div>
            </div>
          )}

          <h3 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 24 }}>{t.articles.latest}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 80 }}>
            {others.map((a) => (
              <div key={a.id} className="article-card" style={{ padding: "24px 28px" }} onClick={() => { setSelectedArticle(a); setPage("article-detail"); window.scrollTo({ top: 0 }); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                  <div style={{ display: "inline-block", background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 8px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--text-muted)", letterSpacing: 1 }}>{a.classification}</div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)", whiteSpace: "nowrap" }}>{a.date}</div>
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.35, marginBottom: 8 }}>{isZh ? a.title_zh : a.title_en}</h3>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{a.authors} {"\u2014"} <span style={{ fontStyle: "italic" }}>{a.affiliation}</span></div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-faint)", maxWidth: 700 }}>{(isZh ? a.abstract_zh : a.abstract_en).slice(0, 200)}...</p>
                <SocialBar article={a} t={t.articles} onShare={() => trackShare(a.id)} />
              </div>
            ))}
          </div>
        </div>
        <Footer t={t} />
      </div>
    );
  }

  /* ═══════════════ PROFILE PAGE ═══════════════ */
  if (page === "profile") {
    if (!user) { setAuthMode("login"); setPage("home"); return null; }
    const badgeMap: Record<string, { c: string; bg: string }> = {
      reviewer: { c: "#a78bfa", bg: "#1a1a3a" },
      author: { c: "#4ade80", bg: "#0a3a1a" },
      editor: { c: "#d4af37", bg: "#3a2a0a" },
      reader: { c: "#4a9eff", bg: "#1a3a5c" },
    };
    const ub = badgeMap[user.badge] ?? badgeMap.reader;

    return (
      <div style={{ minHeight: "100vh" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <NavBar {...navProps} />
        <div style={{ paddingTop: 80 }} className="ctr">
          <div className="gl" style={{ marginTop: 40 }} />
          <h1 style={{ fontSize: 42, fontWeight: 300, marginBottom: 40 }}>{t.profile.title}</h1>

          <div style={{ border: "1px solid rgba(212,175,55,0.12)", padding: "36px 40px", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(212,175,55,0.08)", border: "2px solid rgba(212,175,55,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontFamily: "var(--mono)", color: "var(--gold)", fontWeight: 600 }}>
                  {user.name[0]}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 500 }}>{user.name}</span>
                    <span style={{ background: ub.bg, color: ub.c, padding: "2px 10px", fontSize: 10, fontFamily: "var(--mono)", letterSpacing: 1, borderRadius: 2 }}>
                      {t.profile[("badge_" + user.badge) as keyof typeof t.profile]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>{user.email}</div>
                  <div style={{ fontSize: 14, color: "var(--text-faint)", marginTop: 2 }}>{user.affiliation}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 600, color: "var(--gold)" }}>{user.papers}</div><div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-faint)", letterSpacing: 1 }}>{t.profile.papersPublished}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 600, color: "#a78bfa" }}>{user.reviews}</div><div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-faint)", letterSpacing: 1 }}>{t.profile.reviewsDone}</div></div>
              </div>
            </div>
            <LevelBar level={user.level} xp={user.xp} t={t.profile} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase" }}>{t.profile.papers}</h3>
            <button className="bp bs" onClick={() => setPage("preview")}>{t.profile.submitNew}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48 }}>
            {DEMO_USER_PAPERS.map((p) => (
              <div key={p.id} style={{ border: "1px solid var(--border)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ display: "inline-block", background: "var(--surface)", padding: "2px 8px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--text-muted)", letterSpacing: 1, marginBottom: 8 }}>{p.classification}</div>
                  <h4 style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.35, marginBottom: 6 }}>{p.title}</h4>
                  <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{t.profile.submitted}: {p.submitted}</div>
                </div>
                <StatusBadge status={p.status} t={t.profile} />
              </div>
            ))}
          </div>
          <button className="bp bs" style={{ borderColor: "var(--text-ghost)", color: "var(--text-faint)" }} onClick={() => { signOut(); setPage("home"); }}>{t.profile.logout}</button>
          <div style={{ height: 80 }} />
        </div>
      </div>
    );
  }

  /* ═══════════════ HOME PAGE ═══════════════ */
  return (
    <div style={{ overflowX: "hidden" }}>
      <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
      <NavBar {...navProps} transparent scrollY={scrollY} />

      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "15%", right: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-10%", width: 600, height: 600, background: "radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="ctr" style={{ textAlign: "center", animation: "fadeInUp 1s" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 4, color: "var(--text-faint)", marginBottom: 40, textTransform: "uppercase" }}>{t.hero.badge}</div>
          <h1 className="ht" style={{ fontSize: "clamp(64px, 10vw, 120px)", fontWeight: 300, letterSpacing: "0.15em", color: "var(--gold)", lineHeight: 1, marginBottom: 8, textShadow: "0 0 80px rgba(212,175,55,0.15)" }}>{t.hero.title}</h1>
          <div style={{ fontSize: "clamp(24px, 4vw, 42px)", fontFamily: "var(--serif-cn)", color: "var(--text-muted)", fontWeight: 300, marginBottom: 20, letterSpacing: 12 }}>{t.hero.titleCn}</div>
          <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 400, color: "#c4c0b8", letterSpacing: 2, marginBottom: 40, fontStyle: "italic" }}>{t.hero.subtitle}</p>
          <div style={{ width: 60, height: 1, background: "var(--gold)", margin: "0 auto 40px", opacity: 0.5 }} />
          <p style={{ maxWidth: 680, margin: "0 auto 56px", fontSize: 17, lineHeight: 1.9, color: "var(--text-muted)", fontWeight: 300 }}>{t.hero.desc}</p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="bp" onClick={() => setPage("preview")}>{t.hero.cta}</a>
            <a className="bp" style={{ borderColor: "var(--text-ghost)", color: "var(--text-muted)" }} onClick={() => setPage("articles")}>{t.hero.cta2}</a>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="sec" style={{ background: "var(--bg-alt)" }}><div className="ctr"><div className="gl" />
        <h2 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 60 }}>{t.manifesto.title}</h2>
        <div style={{ maxWidth: 700 }}>
          {t.manifesto.pts.map((p, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <span style={{ color: "var(--text-faint)", fontStyle: "italic", fontSize: 22, lineHeight: 1.6 }}>{p.q}</span><br />
              <span style={{ color: "var(--gold)", fontWeight: 600, fontSize: 22, lineHeight: 1.6 }}>{p.a}</span>
            </div>
          ))}
          <div style={{ marginTop: 56, fontSize: 48, fontWeight: 700, color: "var(--gold)", letterSpacing: 4 }}>{t.manifesto.end}</div>
        </div>
      </div></section><div className="dv" />

      {/* About */}
      <section className="sec" id="about"><div className="ctr"><div className="gl" />
        <h2 style={{ fontSize: 38, fontWeight: 300, marginBottom: 48, lineHeight: 1.3 }}>{t.about.title}</h2>
        <div className="sg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
          <div>
            <p style={{ fontSize: 17, lineHeight: 2, color: "var(--text-dim)", marginBottom: 24 }}>{t.about.t1}</p>
            <p style={{ fontSize: 17, lineHeight: 2, color: "var(--text-dim)", marginBottom: 24 }}>{t.about.t2}</p>
            <p style={{ fontSize: 17, lineHeight: 2, color: "var(--text-dim)" }}>{t.about.t3}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <blockquote style={{ borderLeft: "2px solid var(--gold)", paddingLeft: 32, fontSize: 24, fontStyle: "italic", color: "var(--gold)", lineHeight: 1.6, fontWeight: 300, animation: "pulseGlow 4s infinite" }}>
              {"\u201c"}{t.about.highlight}{"\u201d"}
            </blockquote>
          </div>
        </div>
      </div></section><div className="dv" />

      {/* Scope */}
      <section className="sec" id="scope" style={{ background: "var(--bg-alt)" }}><div className="ctr"><div className="gl" />
        <h2 style={{ fontSize: 38, fontWeight: 300, marginBottom: 20, lineHeight: 1.3 }}>{t.scope.title}</h2>
        <p style={{ fontSize: 17, lineHeight: 1.9, color: "var(--text-muted)", marginBottom: 60, maxWidth: 700 }}>{t.scope.intro}</p>
        <div className="sg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {t.scope.areas.map((a, i) => (
            <div key={i} className="sc">
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gold)", letterSpacing: 2, marginBottom: 12 }}>{"0" + (i + 1)}</div>
              <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 10 }}>{a.t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-muted)", fontWeight: 300 }}>{a.d}</p>
            </div>
          ))}
        </div>
      </div></section><div className="dv" />

      {/* Submit */}
      <section className="sec" id="submit"><div className="ctr"><div className="gl" />
        <h2 style={{ fontSize: 38, fontWeight: 300, marginBottom: 20, lineHeight: 1.3 }}>{t.submit.title}</h2>
        <p style={{ fontSize: 17, lineHeight: 1.9, color: "var(--text-muted)", marginBottom: 48, maxWidth: 700 }}>{t.submit.t1}</p>
        <div className="sg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {t.submit.details.map((d, i) => (
                <div key={i} style={{ padding: "10px 0 10px 24px", borderLeft: "1px solid var(--gold-dim)", color: "var(--text-dim)", fontSize: 15, lineHeight: 1.8, fontFamily: "var(--mono)" }}>{d}</div>
              ))}
            </div>
            <a className="bp" onClick={() => setPage("preview")}>{t.submit.btnOnline}</a>
          </div>
          <div>
            <div style={{ background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.12)", padding: 36, marginBottom: 20 }}>
              <div style={{ fontSize: 18, color: "var(--gold)", marginBottom: 6, fontWeight: 500 }}>{"\u2713"} {t.submit.free}</div>
              <div style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.8 }}>{t.submit.access}</div>
            </div>
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-faint)", letterSpacing: 1 }}>{t.submit.note}</div>
          </div>
        </div>
      </div></section><div className="dv" />

      {/* Editorial */}
      <section className="sec" id="editorial" style={{ background: "var(--bg-alt)" }}><div className="ctr" style={{ textAlign: "center" }}>
        <div className="gl" style={{ margin: "0 auto 24px" }} />
        <h2 style={{ fontSize: 38, fontWeight: 300, marginBottom: 32, lineHeight: 1.3 }}>{t.editorial.title}</h2>
        <p style={{ fontSize: 17, lineHeight: 1.9, color: "var(--text-muted)", maxWidth: 600, margin: "0 auto 48px" }}>{t.editorial.note}</p>
        <a href="mailto:editorial@idiotjournal.org" className="bp">{t.editorial.cta}</a>
      </div></section>

      <Footer t={t} />
    </div>
  );
}
