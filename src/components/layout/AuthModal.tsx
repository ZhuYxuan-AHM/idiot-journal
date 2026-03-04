import { useState } from "react";
import type { T } from "@/i18n";

interface Props {
  t: T;
  mode: "login" | "register" | null;
  setMode: (m: "login" | "register" | null) => void;
  onLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  onRegister: (email: string, password: string, meta: { name: string; affiliation: string }) => Promise<{ error: string | null }>;
}

export function AuthModal({ t, mode, setMode, onLogin, onRegister }: Props) {
  const [form, setForm] = useState({ email: "", password: "", name: "", affiliation: "", orcid: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  if (!mode) return null;
  const isLogin = mode === "login";

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    let result: { error: string | null };
    if (isLogin) {
      result = await onLogin(form.email, form.password);
    } else {
      if (!form.name.trim()) { setError("Name is required"); setLoading(false); return; }
      if (!form.email.trim()) { setError("Email is required"); setLoading(false); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
      result = await onRegister(form.email, form.password, { name: form.name, affiliation: form.affiliation });
    }

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (!isLogin) {
      setSuccess("Account created! Check your email to confirm, or sign in directly.");
      setTimeout(() => { setMode(null); setSuccess(""); }, 3000);
    } else {
      setMode(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="modal-bg" onClick={() => setMode(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111113", border: "1px solid rgba(212,175,55,0.15)", padding: "48px 40px", width: "min(440px, 90vw)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--gold)", letterSpacing: 3, marginBottom: 8 }}>I.D.I.O.T. {"\u82e5\u667a"}</div>
        <h2 style={{ fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 32, fontFamily: "var(--serif)" }}>
          {isLogin ? t.auth.loginTitle : t.auth.registerTitle}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} onKeyDown={handleKeyDown}>
          {!isLogin && <input className="inp" placeholder={t.auth.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          <input className="inp" placeholder={t.auth.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="inp" placeholder={t.auth.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {!isLogin && (
            <>
              <input className="inp" placeholder={t.auth.affiliation} value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} />
              <input className="inp" placeholder={t.auth.orcid} value={form.orcid} onChange={(e) => setForm({ ...form, orcid: e.target.value })} />
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "10px 14px", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "#4ade80", background: "rgba(74,222,128,0.08)", padding: "10px 14px", border: "1px solid rgba(74,222,128,0.2)" }}>
              {success}
            </div>
          )}

          <button
            className="bp"
            style={{ width: "100%", marginTop: 8, opacity: loading ? 0.5 : 1, pointerEvents: loading ? "none" : "auto" }}
            onClick={handleSubmit}
          >
            {loading ? "..." : isLogin ? t.auth.login : t.auth.register}
          </button>
          <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", fontFamily: "var(--mono)" }}>
            <span style={{ cursor: "pointer", color: "var(--text-muted)" }} onClick={() => { setMode(isLogin ? "register" : "login"); setError(""); setSuccess(""); }}>
              {isLogin ? t.auth.switchReg : t.auth.switchLogin}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
