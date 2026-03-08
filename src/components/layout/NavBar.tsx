import { useState, useRef, useEffect } from "react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
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

export function NavBar({ t, lang, setLang, transparent, scrollY = 0, userName, onNavigate, onScrollTo, onLogin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isZh = lang === "zh";

  // === 通知系统逻辑 ===
  const [notifOpen, setNotifOpen] = useState(false);
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === 搜索栏逻辑 ===
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "articles");
      url.searchParams.set("q", searchQuery.trim());
      window.history.pushState({}, '', url.toString());
      onNavigate("articles");
      setMenuOpen(false);
    }
  };

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
      {/* 🔍 搜索栏 UI */}
      <div style={{ display: "flex", alignItems: "center", background: "rgba(212,175,55,0.05)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 4, marginRight: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-ghost)", marginRight: 8 }}>🔍</span>
        <input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder={isZh ? "搜索文章/作者..." : "Search..."}
          style={{ background: "transparent", border: "none", color: "var(--text)", outline: "none", width: 140, fontFamily: "var(--mono)", fontSize: 12 }}
        />
      </div>

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
      
      {/* 🔔 通知铃铛 */}
      {user && (
        <div ref={notifRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 18, position: "relative", padding: "4px" }}
            title={isZh ? "通知" : "Notifications"}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -2, right: -4, background: "#ef4444", color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 10, fontFamily: "var(--mono)", fontWeight: "bold" }}>
                {unreadCount}
              </span>
            )}
          </button>
          
          {notifOpen && (
            <div style={{ position: "absolute", top: 40, right: -10, width: 320, maxWidth: "85vw", background: "#111113", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.8)", zIndex: 999, maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", borderRadius: 8 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111113", zIndex: 10 }}>
                <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--gold)", fontWeight: "bold" }}>{isZh ? "消息通知" : "Notifications"}</span>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ fontSize: 11, color: "var(--text-ghost)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>{isZh ? "全部已读" : "Mark all read"}</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-ghost)" }}>{isZh ? "暂无通知" : "No notifications yet"}</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => markAsRead(n.id)} style={{ padding: "16px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: n.is_read ? "transparent" : "rgba(212,175,55,0.08)", transition: "background 0.2s" }}>
                    <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: n.is_read ? "var(--text-dim)" : "var(--text)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      {n.type === 'announcement' ? '📢' : n.type === 'featured' ? '🌟' : '📝'}
                      {isZh ? n.title_zh : n.title_en}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>
                      {isZh ? n.message_zh : n.message_en}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginTop: 8 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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

          <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {links}
          </div>

          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, flexDirection: "column", gap: 5 }}>
            <span style={{ width: 22, height: 2, background: menuOpen ? "var(--gold)" : "var(--text-dim)", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ width: 22, height: 2, background: "var(--text-dim)", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 22, height: 2, background: menuOpen ? "var(--gold)" : "var(--text-dim)", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav-mobile-menu" onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", top: 64, left: 0, right: 0, bottom: 0, zIndex: 99, background: "rgba(10,10,12,0.98)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 40, gap: 24 }}>
          {links}
        </div>
      )}
    </>
  );
}
