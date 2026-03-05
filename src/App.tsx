import { useState, useEffect, useRef } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useArticles } from "@/hooks/useArticles";
import { useEditors } from "@/hooks/useEditors";
import { useSubmissions } from "@/hooks/useSubmissions";
import { supabase, isLive } from "@/lib/supabase";
import { DEMO_USER_PAPERS } from "@/lib/demo-data";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/layout/AuthModal";
import { SocialBar } from "@/components/articles/SocialBar";
import { CommentSection } from "@/components/articles/CommentSection";
import { InteractiveRating } from "@/components/articles/InteractiveRating";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { LevelBar } from "@/components/profile/LevelBar";
import type { Lang, Article } from "@/lib/types";

import "@/styles/global.css";

export default function App() {
  // 1. 初始化语言时，先读取浏览器的“本地记忆”
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("idiot_language");
    return (saved === "zh" || saved === "en") ? saved : "en";
  });

  // 2. 只要语言切换了，就立刻写进本地记忆里
  useEffect(() => {
    localStorage.setItem("idiot_language", lang);
  }, [lang]);

  // 3. 初始化时，直接从网址读取要去的页面
  const [page, setPage] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("article")) return "home"; // 如果是文章详情，先用 home 打底交由另一个 useEffect 处理
    return params.get("view") || "home";
  });

  // 2. 只要 page 发生变化，就安静地把网址栏更新（不刷新页面）
  useEffect(() => {
    const url = new URL(window.location.href);
    if (page === "home") {
      url.searchParams.delete("view");
    } else if (page !== "article-detail") {
      url.searchParams.set("view", page);
      url.searchParams.delete("article");
    }
    window.history.replaceState({}, '', url.toString());
  }, [page]);

  // 用于工作台的稿件状态筛选
  const [dashboardFilter, setDashboardFilter] = useState("pending");
  const [scrollY, setScrollY] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [submitMsg, setSubmitMsg] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Submit form state
  const [subForm, setSubForm] = useState({ title: "", authors: "", affiliation: "", abstract_en: "", abstract_zh: "", keywords: "", classification: "Human Bewilderment" });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Reviewer dashboard
  const [profileMode, setProfileMode] = useState<"author" | "reviewer" | "editor">("author");
  const [activeReview, setActiveReview] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<string>("revision");
  const [showPdf, setShowPdf] = useState(false);

  const t = useT(lang);
  const { user, signIn, signUp, signOut } = useAuth();
  // 获取真实稿件数据
  const { mySubmissions, allSubmissions, refetch: refetchSubs } = useSubmissions(user?.id, user?.badge);
  const { articles, trackShare } = useArticles();
  const { editors } = useEditors();

  // 自动解析分享链接
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedArticleId = params.get("article");

    if (sharedArticleId) {
      const fetchSharedArticle = async () => {
        // 👇 1. 在异步函数内部加一行安全检查，彻底消除 TypeScript 的“可能为空”报错
        if (!supabase) return; 

        const { data } = await supabase
          .from("articles")
          .select("*")
          .eq("idiot_id", sharedArticleId)
          .single();

        if (data) {
          // 👇 2. 修正了状态函数名，使用你代码中真实的 setSelectedArticle
          setSelectedArticle(data); 
          setPage("article-detail");
        }
      };
      fetchSharedArticle();
    }
  }, []); // [] 确保只在页面刚打开时执行一次

  const goTo = (id: string) => { setPage("home"); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100); };

  const CLASSIFICATIONS = [
    "Human Bewilderment", "AI Absurdity", "Commercial Absurdism",
    "Management Ruozhi", "Ruozhi Philosophy", "Data Delusion",
    "UX Nightmares", "Policy Paradox",
  ];

  const handleSubmitPaper = async () => {
    if (!user) { setSubmitMsg(isZh ? "\u8bf7\u5148\u767b\u5f55" : "Please sign in first"); return; }
    if (!subForm.title.trim()) { setSubmitMsg(isZh ? "\u8bf7\u586b\u5199\u6807\u9898" : "Title is required"); return; }
    if (!subForm.authors.trim()) { setSubmitMsg(isZh ? "\u8bf7\u586b\u5199\u4f5c\u8005" : "Authors are required"); return; }
    if (!subForm.abstract_en.trim()) { setSubmitMsg(isZh ? "\u8bf7\u586b\u5199\u6458\u8981" : "Abstract is required"); return; }
    if (!pdfFile) { setSubmitMsg(isZh ? "\u8bf7\u4e0a\u4f20PDF\u6587\u4ef6" : "Please upload a PDF file"); return; }
    if (pdfFile.type !== "application/pdf") { setSubmitMsg(isZh ? "\u53ea\u63a5\u53d7PDF\u683c\u5f0f" : "Only PDF files are accepted"); return; }
    if (pdfFile.size > 20 * 1024 * 1024) { setSubmitMsg(isZh ? "\u6587\u4ef6\u4e0d\u80fd\u8d85\u8fc720MB" : "File must be under 20MB"); return; }

    setSubmitting(true);
    setSubmitMsg("");

    try {
      let pdf_url = "";
      if (isLive && supabase) {
        // Upload PDF to Supabase Storage
        const fileName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: uploadErr } = await supabase.storage.from("papers").upload(fileName, pdfFile, { contentType: "application/pdf" });
        if (uploadErr) throw new Error("Upload failed: " + uploadErr.message);
        const { data: urlData } = supabase.storage.from("papers").getPublicUrl(fileName);
        pdf_url = urlData.publicUrl;

        // Insert submission
        const { error: insertErr } = await supabase.from("submissions").insert({
          user_id: user.id,
          title: subForm.title,
          authors: subForm.authors,
          affiliation: subForm.affiliation,
          abstract_en: subForm.abstract_en,
          abstract_zh: subForm.abstract_zh,
          keywords: subForm.keywords,
          classification: subForm.classification,
          pdf_url,
          status: "submitted",
        });
        if (insertErr) throw new Error("Submission failed: " + insertErr.message);
      }

      setSubmitMsg(isZh ? "\u6295\u7a3f\u6210\u529f\uff01\u7f16\u8f91\u5c06\u5ba1\u6838\u60a8\u7684\u7a3f\u4ef6\u3002" : "Submitted successfully! The editorial team will review your manuscript.");
      setSubForm({ title: "", authors: "", affiliation: "", abstract_en: "", abstract_zh: "", keywords: "", classification: "Human Bewilderment" });
      setPdfFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setSubmitMsg(e.message || "Submission failed");
    }
    setSubmitting(false);
    setTimeout(() => setSubmitMsg(""), 6000);
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

  /* ═══════════════ SUBMIT PAGE ═══════════════ */
  if (page === "preview") {
    const inputStyle = { width: "100%", padding: "12px 16px", background: "#16161a", border: "1px solid var(--gold-dim)", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" } as const;
    const labelStyle = { fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-faint)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6, display: "block" };
    const isSuccess = submitMsg.includes("success") || submitMsg.includes("\u6210\u529f");

    return (
      <div style={{ minHeight: "100vh" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <NavBar {...navProps} />
        <div style={{ paddingTop: 80, maxWidth: 720, margin: "0 auto", padding: "80px 24px 0" }}>
          <div className="gl" style={{ marginTop: 20 }} />
          <h1 style={{ fontSize: 36, fontWeight: 300, marginBottom: 8 }}>{isZh ? "\u6295\u7a3f" : "Submit Manuscript"}</h1>
          <p style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--text-faint)", marginBottom: 8, letterSpacing: 1 }}>
            {isZh ? "\u4e0a\u4f20\u60a8\u7684\u7814\u7a76\u8bba\u6587\u81f3 I.D.I.O.T. 若智" : "Upload your research paper to I.D.I.O.T. 若智"}
          </p>

          {/* Format guidelines */}
          <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", padding: "20px 24px", marginBottom: 40, fontSize: 13, lineHeight: 1.8, color: "var(--text-faint)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gold)", letterSpacing: 2, marginBottom: 10 }}>
              {isZh ? "\u6295\u7a3f\u8981\u6c42" : "SUBMISSION GUIDELINES"}
            </div>
            {isZh ? (
  <span>• 接受PDF格式，最大20MB  •  论文应包含标题、摘要、关键词、正文和参考文献或新闻出处<br /> 
        <br />
    •  正文格式参考(最少应包含下面四个章节) <br />
    <br />
        第一章：实验背景与诱因 (Introduction & Incitement)<br />
        核心逻辑： 基于真实存在的行为，解释为什么这个弱智行为值得研究。<br />
        撰写要点：<br />
        媒体吹捧点： 引用一段媒体或厂商关于该模型此项能力的吹嘘。<br />
        预期表现： 按照跑分逻辑，AI 应该表现出的智能水平。<br />
        现实冲突： 简述你如何偶然（或刻意）触发了它的荒诞模式。<br />
<br />
第二章：弱智现象实录 (The Idiotic Phenomenon)<br />
核心逻辑： 像展示真理一样，不加修饰地展示还原现场。<br />
撰写要点：<br />
对话复现： 摘录关键的提问与回答（需保持原始格式）。<br />
现象分类： 明确该行为属于哪类弱智行为（如：逻辑循环、常识脱轨、自发性幻觉、计算性痴呆）。<br />
受害者视角： 描述如果这个回答直接应用到科研或商业中，会造成什么样的灾难。<br />
<br />
第三章：分析拆解 (Logical Autopsy / Analysis)<br />
核心逻辑： 这是最硬核的部分，剥开现象的外壳，看看里面的逻辑链是怎么断的。<br />
撰写要点：<br />
崩塌原理： 用理论或其他框架，分析这个行为在处理哪个关键词或逻辑连接词时产生了偏差。<br />
解决方法： 基于提出的原理，给出一个解决方案假设，并验证是否可以有效解决。<br />
（AI方向需补充）<br />
提示词脆弱性： 尝试微调 Prompt（如改一个逗号），展示这种弱智行为是否具有顽固性。<br />
跨模型验证： 同样的问题在 GPT-4, Claude, DeepSeek 上的不同失败表现。<br />
<br />
第四章：结论 (Conclusion)<br />
核心逻辑： 针对这种弱智行为，我们是能治好它，还是只能埋了它。<br />
撰写要点：<br />
（AI方向需补充）<br />
提示词补丁： 给出能纠正该弱智行为的有效指令（如果有）。<br />
边界定义： 明确该模型在这一特定领域的绝对禁区。<br />
最终裁决： 针对该模型的真实能力给出一个反吹捧的可量化评价。<br /> </span>
) : (
  <span>• PDF format only, max 20MB • Paper should include title, abstract, keywords, body, and references • Recommended: export from LaTeX or Word • The editorial team will review your manuscript after submission</span>
)}
          </div>

          {!user && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "var(--text-faint)", marginBottom: 16 }}>{isZh ? "\u8bf7\u5148\u767b\u5f55\u540e\u6295\u7a3f" : "Please sign in to submit"}</p>
              <button className="bp" onClick={() => setAuthMode("login")}>{t.nav.login}</button>
            </div>
          )}

          {user && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={labelStyle}>{isZh ? "\u8bba\u6587\u6807\u9898 *" : "Paper Title *"}</label>
                <input style={inputStyle} value={subForm.title} onChange={(e) => setSubForm({ ...subForm, title: e.target.value })} placeholder={isZh ? "\u60a8\u7684\u8bba\u6587\u6807\u9898" : "Your paper title"} />
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u4f5c\u8005 *" : "Authors *"}</label>
                <input style={inputStyle} value={subForm.authors} onChange={(e) => setSubForm({ ...subForm, authors: e.target.value })} placeholder="Jane Doe, John Smith" />
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u5355\u4f4d" : "Affiliation"}</label>
                <input style={inputStyle} value={subForm.affiliation} onChange={(e) => setSubForm({ ...subForm, affiliation: e.target.value })} placeholder={isZh ? "\u60a8\u7684\u5355\u4f4d" : "University / Institute"} />
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u5206\u7c7b *" : "Classification *"}</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={subForm.classification} onChange={(e) => setSubForm({ ...subForm, classification: e.target.value })}>
                  {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u82f1\u6587\u6458\u8981 *" : "Abstract (English) *"}</label>
                <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "var(--serif)", lineHeight: 1.8 }} value={subForm.abstract_en} onChange={(e) => setSubForm({ ...subForm, abstract_en: e.target.value })} placeholder={isZh ? "\u82f1\u6587\u6458\u8981" : "Abstract in English"} />
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u4e2d\u6587\u6458\u8981" : "Abstract (Chinese, optional)"}</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "var(--serif-cn)", lineHeight: 1.8 }} value={subForm.abstract_zh} onChange={(e) => setSubForm({ ...subForm, abstract_zh: e.target.value })} placeholder={isZh ? "\u4e2d\u6587\u6458\u8981\uff08\u53ef\u9009\uff09" : "\u4e2d\u6587\u6458\u8981 (optional)"} />
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u5173\u952e\u8bcd" : "Keywords"}</label>
                <input style={inputStyle} value={subForm.keywords} onChange={(e) => setSubForm({ ...subForm, keywords: e.target.value })} placeholder="keyword1, keyword2, keyword3" />
              </div>
              <div>
                <label style={labelStyle}>{isZh ? "\u4e0a\u4f20PDF *" : "Upload PDF *"}</label>
                <div style={{ border: "2px dashed var(--gold-dim)", padding: "32px 24px", textAlign: "center", cursor: "pointer", transition: "border-color 0.3s" }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--gold)"; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = ""; const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") setPdfFile(f); }}>
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }} />
                  {pdfFile ? (
                    <div>
                      <div style={{ fontSize: 14, color: "var(--gold)", marginBottom: 4 }}>\u2713 {pdfFile.name}</div>
                      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 24, color: "var(--text-ghost)", marginBottom: 8 }}>↑</div>
                      <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{isZh ? "\u70b9\u51fb\u6216\u62d6\u62fdPDF\u6587\u4ef6\u5230\u6b64\u5904" : "Click or drag PDF file here"}</div>
                      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginTop: 4 }}>PDF, max 20MB</div>
                    </div>
                  )}
                </div>
              </div>

              {submitMsg && (
                <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: isSuccess ? "#4ade80" : "#ef4444", background: isSuccess ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)", padding: "12px 16px", border: `1px solid ${isSuccess ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                  {submitMsg}
                </div>
              )}

              <button className="bp" style={{ width: "100%", marginTop: 8, opacity: submitting ? 0.5 : 1 }} onClick={handleSubmitPaper} disabled={submitting}>
                {submitting ? "..." : isZh ? "\u63d0\u4ea4\u7a3f\u4ef6" : "Submit Manuscript"}
              </button>
            </div>
          )}
          <div style={{ height: 80 }} />
        </div>
        <Footer t={t} />
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
            onClick={() => { 
              setPage("articles"); 
              setSelectedArticle(null); 
              // 清理网址栏，去掉 ?article=xxx
              window.history.pushState({}, '', window.location.pathname); 
            }}>
            {t.articles.backToList}
          </a>
          
          {/* 主编专属：封面文章管理控制台 */}
          {user?.badge === "editor_in_chief" && (
            <div style={{ marginBottom: 32, padding: "16px 24px", background: "rgba(239, 68, 68, 0.05)", border: "1px dashed rgba(239, 68, 68, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div style={{ fontSize: 13, color: "#ef4444", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: 1 }}>
                ⚡ {isZh ? "主编管理台 (EIC Console)" : "EIC Console"}
              </div>
              <button 
                className="bp bs" 
                style={{ 
                  background: a.featured ? "#ef4444" : "transparent",
                  borderColor: "#ef4444", 
                  color: a.featured ? "#fff" : "#ef4444",
                  fontWeight: a.featured ? 600 : 400
                }}
                onClick={async () => {
                  if (!supabase) return;
                  if (a.featured) {
                    alert(isZh ? "该文章已经是封面文章了！" : "This is already the featured article!");
                    return;
                  }
                  if (!confirm(isZh ? "确定将此文章设为最新一期的封面文章吗？\n(这将会替换掉当前的封面文章)" : "Set this as the featured article? (Will replace the current one)")) return;
                  
                  // 调用后端的安全 RPC 函数
                  const { error } = await supabase.rpc('set_featured_article', { target_article_id: a.id });
                  
                  if (error) {
                    alert("Error: " + error.message);
                  } else {
                    alert(isZh ? "封面文章设置成功！" : "Featured article updated!");
                    window.location.reload(); // 刷新页面以拉取最新状态
                  }
                }}
              >
                {a.featured ? (isZh ? "★ 当前封面文章 (Featured)" : "★ Featured Article") : (isZh ? "☆ 设为封面文章 (Set Featured)" : "☆ Set Featured")}
              </button>
            </div>
          )}

          {/* Preprint header bar */}
          <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)", padding: "16px 24px", marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }} className="preprint-meta">
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 2 }}>I.D.I.O.T. PREPRINT</span>
              {a.idiot_id && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>{a.idiot_id}</span>}
              <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{t.articles.vol} {a.vol}, {t.articles.iss} {a.issue}</span>
              <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{a.date}</span>
            </div>
            <div style={{ display: "inline-block", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", padding: "2px 10px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1 }}>
              {a.classification}
            </div>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.4, marginBottom: 8 }}>
            {isZh ? (a.title_zh || a.title_en) : (a.title_en || a.title_zh)}
          </h1>
          {isZh && a.title_en && a.title_zh && (a.title_en !== a.title_zh) && <h2 style={{ fontSize: 18, fontWeight: 300, color: "var(--text-muted)", marginBottom: 12, fontStyle: "italic" }}>{a.title_en}</h2>}
          {!isZh && a.title_zh && a.title_en && (a.title_zh !== a.title_en) && <h2 style={{ fontSize: 18, fontWeight: 300, color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--serif-cn)" }}>{a.title_zh}</h2>}
          
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
              {isZh ? (a.abstract_zh || a.abstract_en) : (a.abstract_en || a.abstract_zh)}
            </p>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "8px 0 32px" }} />

          {/* PDF Viewer */}
          {a.pdf_url && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase" }}>
                  {isZh ? "全文" : "Full Paper"}
                </div>
                <a href={a.pdf_url} target="_blank" rel="noopener noreferrer" className="bp bs" style={{ textDecoration: "none" }}>
                  {isZh ? "下载PDF" : "Download PDF"}
                </a>
              </div>
              <iframe
                src={`${a.pdf_url}#toolbar=0&navpanes=0`} 
                style={{ width: "100%", height: "80vh", border: "1px solid var(--border)", background: "#fff" }}
                title="PDF Viewer"
              />
            </div>
          )}

          <SocialBar article={a} t={t.articles} onShare={() => {
            trackShare(a.id); // 保留你原有的点击追踪功能
            // 动态生成带 ID 的专属链接并复制
            const shareUrl = `${window.location.origin}?article=${a.idiot_id}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
              alert(isZh ? `专属链接已复制！快去分享吧！\n${shareUrl}` : `Link copied to clipboard!\n${shareUrl}`);
            }).catch(err => {
              alert("复制失败，请手动复制: " + shareUrl);
            });
          }} />

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
                <h2 style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.35, marginBottom: 10 }}>{isZh ? (featured.title_zh || featured.title_en) : (featured.title_en || featured.title_zh)}</h2>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>{featured.authors} {"\u2014"} {featured.affiliation}</div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-faint)", marginBottom: 16, textAlign: "justify" }}>{isZh ? featured.abstract_zh : featured.abstract_en}</p>
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
                <h3 style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.35, marginBottom: 8 }}>{isZh ? (a.title_zh || a.title_en) : (a.title_en || a.title_zh)}</h3>
                {a.idiot_id && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)", marginBottom: 6 }}>{a.idiot_id}</div>}
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
    // 如果没有获取到 user，不要粗暴地踢回主页，而是给 Supabase 留出半秒钟的加载时间
    if (!user) { 
      return (
        <div style={{ minHeight: "100vh", paddingTop: 160, textAlign: "center" }}>
          <NavBar {...navProps} />
          <h3 style={{ fontSize: 18, color: "var(--text-dim)", marginBottom: 24, fontFamily: "var(--mono)" }}>
            {isZh ? "正在验证身份信息..." : "Verifying session..."}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginBottom: 32 }}>
            {isZh ? "如果您尚未登录，请点击下方按钮" : "If you are not logged in, please proceed below."}
          </p>
          <button className="bp" onClick={() => { setAuthMode("login"); setPage("home"); }}>
            {isZh ? "返回首页并登录" : "Return Home & Login"}
          </button>
          <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      );
    }
    
    const badgeMap: Record<string, { c: string; bg: string }> = {
      editor_in_chief:  { c: "#ef4444", bg: "#3a0a0a" },
      associate_editor: { c: "#f472b6", bg: "#3a1a2a" },
      editor:           { c: "#d4af37", bg: "#3a2a0a" },
      reviewer:         { c: "#a78bfa", bg: "#1a1a3a" },
      author:           { c: "#4ade80", bg: "#0a3a1a" },
      reader:           { c: "#4a9eff", bg: "#1a3a5c" },
    };
    const ub = badgeMap[user.badge] ?? badgeMap.reader;
    
    // 权限判定矩阵
    const isReviewer = ["reviewer", "editor", "associate_editor", "editor_in_chief"].includes(user.badge);
    const isEditor = ["editor", "associate_editor", "editor_in_chief"].includes(user.badge);
    const isChief = user.badge === "editor_in_chief";

    // 过滤分配给审稿人的稿件
    return (
      <div style={{ minHeight: "100vh" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <NavBar {...navProps} />
        <div style={{ paddingTop: 80 }} className="ctr">
          <div className="gl" style={{ marginTop: 40 }} />
          <h1 style={{ fontSize: 42, fontWeight: 300, marginBottom: 40 }}>{t.profile.title}</h1>

          {/* --- 1. 顶部个人信息卡片 --- */}
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
                      {t.profile[("badge_" + user.badge) as keyof typeof t.profile] || user.badge}
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

          {/* --- 2. 身份切换选项卡 --- */}
          {isReviewer && !activeReview && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div className="lt">
                <button className={`lb ${profileMode === "author" ? "a" : ""}`} onClick={() => setProfileMode("author")} style={{ padding: "8px 24px" }}>
                  {isZh ? "作者工作台" : "Author Dashboard"}
                </button>
                <button className={`lb ${profileMode === "reviewer" ? "a" : ""}`} onClick={() => setProfileMode("reviewer")} style={{ padding: "8px 24px" }}>
                  {isZh ? "审稿工作台" : "Reviewer Dashboard"}
                </button>
                {isEditor && (
                  <button className={`lb ${profileMode === "editor" ? "a" : ""}`} onClick={() => setProfileMode("editor")} style={{ padding: "8px 24px" }}>
                    {isZh ? "编辑工作台" : "Editorial Board"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* --- 3. 视图 A：作者真实投稿列表 --- */}
          {profileMode === "author" && !activeReview && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase" }}>{t.profile.papers}</h3>
                <button className="bp bs" onClick={() => setPage("preview")}>{t.profile.submitNew}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48 }}>
                {mySubmissions.length === 0 ? (
                   <div style={{ textAlign: "center", padding: "40px", color: "var(--text-ghost)", border: "1px dashed var(--border)" }}>
                     {isZh ? "您还没有投递过稿件。" : "You haven't submitted any papers yet."}
                   </div>
                ) : mySubmissions.map((p) => (
                  <div key={p.id} style={{ border: "1px solid var(--border)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 300 }}>
                      <div style={{ display: "inline-block", background: "var(--surface)", padding: "2px 8px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--text-muted)", letterSpacing: 1, marginBottom: 8 }}>{p.classification}</div>
                      <h4 style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.35, marginBottom: 6 }}>{p.title}</h4>
                      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{t.profile.submitted}: {p.created_at ? p.created_at.split('T')[0] : 'Unknown'}</div>
                    </div>
                    <StatusBadge status={p.status as any} t={t.profile} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- 4. 视图 B/C：审稿人/编辑真实全局列表 --- */}
          {(profileMode === "reviewer" || profileMode === "editor") && !activeReview && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              
              {/* 顶部分类筛选栏 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 16, flexWrap: "wrap", gap: 16 }}>
                <h3 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--gold)", textTransform: "uppercase", margin: 0 }}>
                  {profileMode === "editor" ? (isZh ? "全局稿件管理" : "All Submissions") : (isZh ? "审稿队列" : "Review Queue")}
                </h3>
                
                <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
                  <button className="nl" style={{ padding: 0, border: "none", background: "none", cursor: "pointer", color: dashboardFilter === "pending" ? "var(--gold)" : "var(--text-ghost)", fontWeight: dashboardFilter === "pending" ? 600 : 400 }} onClick={() => setDashboardFilter("pending")}>
                    {isZh ? "待处理 (Pending)" : "Pending"}
                  </button>
                  <button className="nl" style={{ padding: 0, border: "none", background: "none", cursor: "pointer", color: dashboardFilter === "resolved" ? "#4ade80" : "var(--text-ghost)", fontWeight: dashboardFilter === "resolved" ? 600 : 400 }} onClick={() => setDashboardFilter("resolved")}>
                    {isZh ? "已录用 (Accepted)" : "Accepted"}
                  </button>
                  <button className="nl" style={{ padding: 0, border: "none", background: "none", cursor: "pointer", color: dashboardFilter === "rejected" ? "#ef4444" : "var(--text-ghost)", fontWeight: dashboardFilter === "rejected" ? 600 : 400 }} onClick={() => setDashboardFilter("rejected")}>
                    {isZh ? "已拒稿 (Rejected)" : "Rejected"}
                  </button>
                  <button className="nl" style={{ padding: 0, border: "none", background: "none", cursor: "pointer", color: dashboardFilter === "all" ? "var(--text)" : "var(--text-ghost)", fontWeight: dashboardFilter === "all" ? 600 : 400 }} onClick={() => setDashboardFilter("all")}>
                    {isZh ? "全部 (All)" : "All"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48 }}>
                {allSubmissions
                  .filter(s => s.status !== "draft") // 永远过滤掉草稿
                  .filter(s => {
                    if (dashboardFilter === "pending") {
                      // 【核心逻辑】如果是审稿人，只看“全新提交”的稿件。
                      // 只要任何一个审稿人点过提交（状态变成了 under_review），它就会从所有审稿人的待处理池中消失！
                      if (profileMode === "reviewer") {
                        return s.status === "submitted";
                      }
                      // 如果是主编/编辑，统揽全局，需要处理新提交的、以及审稿人刚审完的(under_review)
                      return ["submitted", "under_review", "revision"].includes(s.status);
                    }
                    if (dashboardFilter === "resolved") return ["accepted", "published"].includes(s.status);
                    if (dashboardFilter === "rejected") return s.status === "rejected";
                    return true; // "all"
                  })
                  .length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-ghost)", border: "1px dashed var(--border)" }}>
                     {isZh ? "该分类下暂无稿件。" : "No submissions in this category."}
                  </div>
                ) : allSubmissions
                  .filter(s => s.status !== "draft")
                  .filter(s => {
                    if (dashboardFilter === "pending") {
                      // 【核心逻辑】如果是审稿人，只看“全新提交”的稿件。
                      // 只要任何一个审稿人点过提交（状态变成了 under_review），它就会从所有审稿人的待处理池中消失！
                      if (profileMode === "reviewer") {
                        return s.status === "submitted";
                      }
                      // 如果是主编/编辑，统揽全局，需要处理新提交的、以及审稿人刚审完的(under_review)
                      return ["submitted", "under_review", "revision"].includes(s.status);
                    }
                    if (dashboardFilter === "resolved") return ["accepted", "published"].includes(s.status);
                    if (dashboardFilter === "rejected") return s.status === "rejected";
                    return true; // "all"
                  })
                  
                  .map((p) => (
                  <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, cursor: "pointer", transition: "border-color 0.3s" }}
                       onMouseEnter={(e) => e.currentTarget.style.borderColor = profileMode === "editor" ? "#d4af37" : "#a78bfa"}
                       onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                       onClick={() => { 
                         setActiveReview(p); 
                         setShowPdf(false);
                         setReviewNotes(p.reviewer_notes || ""); 
                         setReviewStatus(p.status === 'submitted' ? 'under_review' : p.status);
                       }}>
                    <div style={{ flex: 1, minWidth: 300 }}>
                      <h4 style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.35, marginBottom: 6, color: "var(--text)" }}>{p.title}</h4>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{isZh ? "提交于" : "Submitted"}: {p.created_at ? p.created_at.split('T')[0] : 'Unknown'}</div>
                        <StatusBadge status={p.status as any} t={t.profile} />
                      </div>
                    </div>
                    <button className="bp bs" style={{ borderColor: profileMode === "editor" ? "var(--gold)" : "#a78bfa", color: profileMode === "editor" ? "var(--gold)" : "#a78bfa" }}>
                      {profileMode === "editor" ? (isZh ? "进入编辑裁决" : "Manage") : (isZh ? "开始审阅" : "Review")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- 5. 真实操作面板 (直接连接 Supabase) --- */}
          {(profileMode === "reviewer" || profileMode === "editor") && activeReview && (
            <div style={{ marginBottom: 48, animation: "fadeIn 0.3s" }}>
              <button className="nl" style={{ marginBottom: 24, fontSize: 12, padding: 0, border: "none", background: "none" }} onClick={() => { setActiveReview(null); setShowPdf(false); }}>
                ← {isZh ? "返回列表" : "Back to List"}
              </button>
              
              <div style={{ border: `1px solid ${profileMode === "editor" ? "var(--gold-dim)" : "rgba(167,139,250,0.2)"}`, background: "rgba(255,255,255,0.01)", padding: "32px 40px" }}>
                <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: profileMode === "editor" ? "var(--gold)" : "#a78bfa", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>
                  {profileMode === "editor" ? (isZh ? "编辑裁决面板" : "Editorial Action Panel") : (isZh ? "同行评审面板" : "Peer Review Panel")}
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: 16 }}>{activeReview.title}</h2>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-dim)", marginBottom: 24 }}>
                  <strong style={{ color: "var(--text)" }}>Abstract:</strong> {activeReview.abstract_en}
                </div>
                
                <button className="bp bs" style={{ marginBottom: showPdf ? 24 : 32, display: "inline-block", borderColor: showPdf ? "var(--text-ghost)" : "var(--gold)", color: showPdf ? "var(--text)" : "var(--gold)" }} onClick={() => setShowPdf(!showPdf)}>
                  {showPdf ? (isZh ? "收起 PDF 预览" : "Hide PDF Preview") : (isZh ? "在线预览完整 PDF 附件" : "Preview Full PDF")}
                </button>

                {showPdf && activeReview.pdf_url && (
                  <div style={{ width: "100%", height: "70vh", marginBottom: 32, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "#fff", animation: "fadeIn 0.3s" }}>
                    <iframe src={activeReview.pdf_url} width="100%" height="100%" style={{ border: "none" }} title="PDF Preview" />
                  </div>
                )}

                <div className="dv" style={{ margin: "24px 0" }} />

                <h3 style={{ fontSize: 16, marginBottom: 16, color: profileMode === "editor" ? "var(--gold)" : "#a78bfa" }}>
                  {profileMode === "editor" ? (isZh ? "汇总统筹意见与内部备注" : "Editorial Internal Notes") : (isZh ? "我的评审意见" : "My Review Notes")}
                </h3>
                <textarea 
                  className="ea" 
                  style={{ minHeight: profileMode === "editor" ? 120 : 160, border: "1px solid var(--border)", marginBottom: 20 }}
                  placeholder={profileMode === "editor" ? (isZh ? "统筹审稿意见，留下编辑裁决记录..." : "Internal notes...") : (isZh ? "指出理论漏洞或结构问题..." : "Enter detailed feedback...")}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />

                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <select 
                      className="inp" 
                      style={{ width: "auto", minWidth: 200, cursor: "pointer", borderColor: profileMode === "editor" ? "var(--gold)" : "#a78bfa" }}
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as any)}
                    >
                      <option value="under_review">{isZh ? "审阅中 (Under Review)" : "Under Review"}</option>
                      <option value="revision">{profileMode === "editor" ? (isZh ? "要求作者修改 (Request Revision)" : "Request Revision") : (isZh ? "建议修改 (Recommend Revision)" : "Recommend Revision")}</option>
                      <option value="accepted">{profileMode === "editor" ? (isZh ? "最终录用 (Accept)" : "Accept") : (isZh ? "建议录用 (Recommend Accept)" : "Recommend Accept")}</option>
                      <option value="rejected">{profileMode === "editor" ? (isZh ? "最终拒稿 (Reject)" : "Reject") : (isZh ? "建议拒稿 (Recommend Reject)" : "Recommend Reject")}</option>
                    </select>
                    
                    <button className="bp" style={{ background: profileMode === "editor" ? "var(--gold)" : "#a78bfa", color: "var(--bg)", borderColor: "transparent" }} 
                      onClick={async () => {
                        if (!supabase || !user) return;
                        
                        let newStatus = reviewStatus;
                        let newNotes = reviewNotes;

                        // 【核心修复】如果是普通审稿人提交，只追加意见，不改变稿件的最终生死状态
                        if (profileMode === "reviewer") {
                          newStatus = "under_review"; // 强制保持在“审阅中”，等主编定夺
                          
                          // 翻译一下审稿人的建议，作为抬头
                          const recMap: any = { accepted: "建议录用", rejected: "建议拒稿", revision: "建议修改", under_review: "审阅意见" };
                          const recommendation = recMap[reviewStatus] || "审阅意见";
                          
                          // 把以前别人写的意见提取出来（如果有的话），追加自己的意见在后面
                          const existingNotes = activeReview.reviewer_notes ? activeReview.reviewer_notes + "\n\n" : "";
                          newNotes = existingNotes + `【${user.name} - ${recommendation}】\n${reviewNotes}`;
                        }

                        const { error } = await supabase.from('submissions').update({
                          status: newStatus,
                          reviewer_notes: newNotes
                        }).eq('id', activeReview.id);

                        if (error) {
                          alert("Error: " + error.message);
                        } else {
                          if (profileMode === "reviewer") {
                            alert(isZh ? `审阅意见已追加并推送给编辑部！` : `Review appended and sent to editorial board!`);
                          } else {
                            alert(isZh ? `编辑裁决已更新！当前状态: ${reviewStatus}` : `Status updated in database: ${reviewStatus}`);
                          }
                          setActiveReview(null);
                          setShowPdf(false);
                          setReviewNotes("");
                          refetchSubs(); // 刷新列表
                        }
                    }}>
                      {profileMode === "editor" ? (isZh ? "更新至数据库" : "Update Database") : (isZh ? "提交评审至数据库" : "Submit Recommendation")}
                    </button>
                  </div>

                  {/* 调用真实 RPC 函数一键发表文章 */}
                  {profileMode === "editor" && isChief && reviewStatus === "accepted" && (
                    <button className="bp" style={{ background: "#ef4444", borderColor: "#ef4444", color: "#fff", fontWeight: 600, animation: "fadeIn 0.4s" }} 
                      onClick={async () => {
                        if (!supabase) return;
                        if (!confirm(isZh ? "确定将此稿件正式发表到期刊首页吗？此操作将生成正式期刊号。" : "Are you sure you want to publish this to the journal?")) return;
                        
                        const { data, error } = await supabase.rpc('publish_submission', { sub_id: activeReview.id });

                        if (error) {
                          alert("Publish Error: " + error.message);
                        } else {
                          alert(isZh ? `🎉 彻底成功！已生成正式期刊号: ${data}\n现在去首页看看吧！` : `🎉 Published successfully! ID: ${data}`);
                          setActiveReview(null);
                          setShowPdf(false);
                          refetchSubs(); 
                        }
                    }}>
                      ⚡ {isZh ? "正式发表至期刊 (Publish)" : "Publish to Journal"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!activeReview && (
            <button className="bp bs" style={{ borderColor: "var(--text-ghost)", color: "var(--text-faint)" }} onClick={() => { signOut(); setPage("home"); }}>
              {t.profile.logout}
            </button>
          )}
          
          <div style={{ height: 80 }} />
        </div>
        <Footer t={t} />
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
        
        {/* --- 动态渲染编委会成员 --- */}
        {editors.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32, marginBottom: 48 }}>
            {editors.map((ed) => {
              // 匹配我们在 Profile 里用过的炫酷颜色
              const styleMap: Record<string, { c: string; bg: string }> = {
                editor_in_chief:  { c: "#ef4444", bg: "rgba(239,68,68,0.08)" },
                associate_editor: { c: "#f472b6", bg: "rgba(244,114,182,0.08)" },
                editor:           { c: "#d4af37", bg: "rgba(212,175,55,0.08)" },
              };
              const st = styleMap[ed.badge] || styleMap.editor;
              
              return (
                <div key={ed.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", transition: "all 0.3s" }} className="article-card">
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: st.bg, border: `1px solid ${st.c}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "var(--mono)", color: st.c, fontWeight: 600, marginBottom: 20 }}>
                    {ed.name[0]}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>{ed.name}</h3>
                  <div style={{ display: "inline-block", background: st.bg, color: st.c, padding: "3px 12px", fontSize: 11, fontFamily: "var(--mono)", letterSpacing: 1, borderRadius: 2, marginBottom: 16 }}>
                    {/* 使用翻译文件中对应头衔 */}
                    {t.profile[("badge_" + ed.badge) as keyof typeof t.profile] || ed.badge}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-faint)", fontStyle: "italic", lineHeight: 1.6 }}>{ed.affiliation}</div>
                </div>
              );
            })}
          </div>
        )}

        <a href="mailto:editorial@idiotjournal.org" className="bp">{t.editorial.cta}</a>
      </div></section>

      <Footer t={t} />
    </div>
  );
}
