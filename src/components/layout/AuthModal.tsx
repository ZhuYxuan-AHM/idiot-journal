import { useState } from "react";
import type { T } from "@/i18n";

interface Props {
  t: T;
  mode: "login" | "register" | null;
  setMode: (m: "login" | "register" | null) => void;
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string, meta: { name: string; affiliation: string }) => void;
}

export function AuthModal({ t, mode, setMode, onLogin, onRegister }: Props) {
  const [form, setForm] = useState({ email: "", password: "", name: "", affiliation: "", orcid: "" });
  if (!mode) return null;
  const isLogin = mode === "login";

  const handleSubmit = () => {
    if (isLogin) {
      onLogin(form.email, form.password);
    } else {
      onRegister(form.email, form.password, { name: form.name, affiliation: form.affiliation });
    }
    setMode(null);
  };

  return (
    <div className="modal-bg" onClick={() => setMode(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111113", border: "1px solid rgba(212,175,55,0.15)", padding: "48px 40px", width: "min(440px, 90vw)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--gold)", letterSpacing: 3, marginBottom: 8 }}>I.D.I.O.T. 若智</div>
        <h2 style={{ fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 32, fontFamily: "var(--serif)" }}>
          {isLogin ? t.auth.loginTitle : t.auth.registerTitle}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isLogin && <input className="inp" placeholder={t.auth.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          <input className="inp" placeholder={t.auth.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="inp" placeholder={t.auth.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {!isLogin && (
            <>
              <input className="inp" placeholder={t.auth.affiliation} value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} />
              <input className="inp" placeholder={t.auth.orcid} value={form.orcid} onChange={(e) => setForm({ ...form, orcid: e.target.value })} />
            </>
          )}
          <button className="bp" style={{ width: "100%", marginTop: 8 }} onClick={handleSubmit}>
            {isLogin ? t.auth.login : t.auth.register}
          </button>
          <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", fontFamily: "var(--mono)" }}>
            <span style={{ cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setMode(isLogin ? "register" : "login")}>
              {isLogin ? t.auth.switchReg : t.auth.switchLogin}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-ghost)", textAlign: "center", fontFamily: "var(--mono)", marginTop: 4 }}>{t.auth.demo}</div>
        </div>
      </div>
    </div>
  );
}
