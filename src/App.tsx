import { useState, useEffect, useRef, useMemo } from "react";
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
import { stampPdf } from "@/lib/pdf-tools";
import { PosterGenerator } from "@/components/articles/PosterGenerator";

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
  const [showPoster, setShowPoster] = useState(false);
  
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
  
  //  为主编修改文章新增的状态
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [editForm, setEditForm] = useState({ title_en: "", title_zh: "", authors: "", affiliation: "", abstract_en: "", abstract_zh: "", keywords: "" });
  const [editPdf, setEditPdf] = useState<File | null>(null);
  const [isUpdatingArticle, setIsUpdatingArticle] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);
  // 公告功能的 State
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title_en: "", title_zh: "", msg_en: "", msg_zh: "" });
  
  const t = useT(lang);
  const isZh = lang === "zh";
  const { user, signIn, signUp, signOut } = useAuth();
  // 获取真实稿件数据
  const { mySubmissions, allSubmissions, refetch: refetchSubs } = useSubmissions(user?.id, user?.badge);
  const { articles, trackShare } = useArticles();
  // 👇==== 新增：榜单数据统计算法 ====👇
  const { topAuthors, topAffiliations } = useMemo(() => {
    const aCounts: Record<string, number> = {};
    const affCounts: Record<string, number> = {};

    articles.forEach(a => {
      // 1. 统计作者 (假设作者是用逗号分隔的，比如 "张三, 李四")
      if (a.authors) {
        a.authors.split(/[,，]/).forEach(author => {
          const name = author.trim();
          if (name) aCounts[name] = (aCounts[name] || 0) + 1;
        });
      }
      // 2. 统计机构
      if (a.affiliation) {
        const aff = a.affiliation.trim();
        if (aff) affCounts[aff] = (affCounts[aff] || 0) + 1;
      }
    });

    // 排序并取前 10 名
    const sortedAuthors = Object.entries(aCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sortedAffiliations = Object.entries(affCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return { topAuthors: sortedAuthors, topAffiliations: sortedAffiliations };
  }, [articles]);

  // 读者排行占位数据 (后续可以通过数据库 RPC 真实拉取全站积分最高的用户)
  const topReaders = [
    { name: "Mystic Reviewer", score: 1250, desc: isZh ? "参与评议 12 次" : "12 Peer Reviews" },
    { name: "Dr. NullPointer", score: 840, desc: isZh ? "点赞分享 34 次" : "34 Shares & Likes" },
    { name: "Alice Wonderland", score: 620, desc: isZh ? "发表评论 18 次" : "18 Comments" }
  ];
  
  const { editors } = useEditors();
  
  // 轮播图状态 
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselArticles = articles.filter(a => a.featured).concat(articles.filter(a => !a.featured)).slice(0, 5);

  useEffect(() => {
    if (carouselArticles.length === 0 || page !== "home") return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselArticles.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselArticles.length, page]);
  
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
        {/* 当 showPoster 为 true 时渲染海报组件 */}
        {showPoster && (
          <PosterGenerator 
            article={a} 
            t={t.articles} 
            onClose={() => setShowPoster(false)} 
          />
        )}
        
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
          
          {/* 主编专属：文章管理控制台 */}
          {/* 主编专属：文章管理控制台 */}
          {user?.badge === "editor_in_chief" && (
            <>
              {/* 注意这里的 marginBottom 条件加上了 isAnnouncing */}
              <div style={{ marginBottom: isEditingArticle || isAnnouncing ? 16 : 32, padding: "16px 24px", background: "rgba(239, 68, 68, 0.05)", border: "1px dashed rgba(239, 68, 68, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div style={{ fontSize: 13, color: "#ef4444", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: 1 }}>
                  ⚡ {isZh ? "主编管理台 (EIC Console)" : "EIC Console"}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  
                  {/* 👇新增的：发布公告按钮👇 */}
                  <button 
                    className="bp bs" 
                    style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
                    onClick={() => { 
                      setIsAnnouncing(!isAnnouncing); 
                      setIsEditingArticle(false); // 展开公告时收起编辑面板
                    }}
                  >
                     📢 {isZh ? "发布全站公告" : "Broadcast Announcement"}
                  </button>
                  {/* 👆新增结束👆 */}

                  <button 
                    className="bp bs" 
                    style={{ borderColor: "#ef4444", color: "#ef4444" }}
                    onClick={() => {
                      setIsAnnouncing(false); // 展开编辑面板时收起公告
                      if (!isEditingArticle) {
                        // 展开时，自动填入当前文章的数据
                        setEditForm({
                          title_en: a.title_en, title_zh: a.title_zh,
                          authors: a.authors, affiliation: a.affiliation,
                          abstract_en: a.abstract_en, abstract_zh: a.abstract_zh,
                          keywords: a.keywords
                        });
                        setEditPdf(null);
                      }
                      setIsEditingArticle(!isEditingArticle);
                    }}
                  >
                    {isEditingArticle ? (isZh ? "取消修改" : "Cancel Edit") : (isZh ? "✎ 修改信息与PDF" : "✎ Edit Info & PDF")}
                  </button>
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
                      
                      const { error } = await supabase.rpc('set_featured_article', { target_article_id: a.id });
                      if (error) alert("Error: " + error.message);
                      else { alert(isZh ? "🎉 封面文章设置成功！" : "🎉 Featured article updated!"); window.location.reload(); }
                    }}
                  >
                    {a.featured ? (isZh ? "★ 当前封面文章" : "★ Featured Article") : (isZh ? "☆ 设为封面文章" : "☆ Set Featured")}
                  </button>
                </div>
              </div>

              {/* 👇新增的：公告表单面板👇 */}
              {isAnnouncing && (
                <div style={{ background: "rgba(20, 20, 25, 0.9)", border: "1px solid #a78bfa", padding: "24px", marginBottom: 32, animation: "fadeIn 0.3s" }}>
                  <h3 style={{ fontSize: 16, color: "#a78bfa", marginBottom: 16, fontFamily: "var(--mono)" }}>{isZh ? "发送全站系统公告" : "Send Global Announcement"}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input className="inp" placeholder={isZh ? "英文标题" : "Title (EN)"} value={announceForm.title_en} onChange={e => setAnnounceForm({...announceForm, title_en: e.target.value})} />
                    <input className="inp" placeholder={isZh ? "中文标题" : "Title (ZH)"} value={announceForm.title_zh} onChange={e => setAnnounceForm({...announceForm, title_zh: e.target.value})} />
                    <textarea className="ea" style={{ minHeight: 80, border: "1px solid var(--gold-dim)" }} placeholder={isZh ? "英文正文" : "Message (EN)"} value={announceForm.msg_en} onChange={e => setAnnounceForm({...announceForm, msg_en: e.target.value})} />
                    <textarea className="ea" style={{ minHeight: 80, border: "1px solid var(--gold-dim)" }} placeholder={isZh ? "中文正文" : "Message (ZH)"} value={announceForm.msg_zh} onChange={e => setAnnounceForm({...announceForm, msg_zh: e.target.value})} />
                    
                    <button className="bp" style={{ background: "#a78bfa", color: "#fff", borderColor: "#a78bfa" }} 
                      onClick={async () => {
                        if (!supabase) return;
                        if (!announceForm.title_en || !announceForm.title_zh) { alert(isZh ? "请填写双语标题" : "Please fill titles"); return; }
                        const { error } = await supabase.rpc('broadcast_announcement', { 
                          t_en: announceForm.title_en, t_zh: announceForm.title_zh, 
                          m_en: announceForm.msg_en, m_zh: announceForm.msg_zh 
                        });
                        if (error) alert("Error: " + error.message);
                        else {
                          alert(isZh ? "✅ 全站公告已发送！" : "✅ Announcement broadcasted!");
                          setAnnounceForm({ title_en: "", title_zh: "", msg_en: "", msg_zh: "" });
                          setIsAnnouncing(false);
                        }
                      }}
                    >
                      {isZh ? "确认发送给所有人" : "Send to All Users"}
                    </button>
                  </div>
                </div>
              )}
            
              {/* 修改文章的隐藏表单 */}
              {isEditingArticle && (
                <div style={{ background: "rgba(20, 20, 25, 0.9)", border: "1px solid var(--gold-dim)", padding: "24px", marginBottom: 32, animation: "fadeIn 0.3s" }}>
                  <h3 style={{ fontSize: 16, color: "var(--gold)", marginBottom: 16, fontFamily: "var(--mono)" }}>{isZh ? "修改已发表文章数据" : "Edit Published Data"}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input className="inp" value={editForm.title_en} onChange={e => setEditForm({...editForm, title_en: e.target.value})} placeholder={isZh ? "英文标题" : "Title (EN)"} />
                    <input className="inp" value={editForm.title_zh} onChange={e => setEditForm({...editForm, title_zh: e.target.value})} placeholder={isZh ? "中文标题" : "Title (ZH)"} />
                    <input className="inp" value={editForm.authors} onChange={e => setEditForm({...editForm, authors: e.target.value})} placeholder={isZh ? "作者" : "Authors"} />
                    <input className="inp" value={editForm.affiliation} onChange={e => setEditForm({...editForm, affiliation: e.target.value})} placeholder={isZh ? "机构/单位" : "Affiliation"} />
                    <textarea className="ea" style={{ minHeight: 120, border: "1px solid var(--gold-dim)" }} value={editForm.abstract_en} onChange={e => setEditForm({...editForm, abstract_en: e.target.value})} placeholder={isZh ? "英文摘要" : "Abstract (EN)"} />
                    <textarea className="ea" style={{ minHeight: 120, border: "1px solid var(--gold-dim)" }} value={editForm.abstract_zh} onChange={e => setEditForm({...editForm, abstract_zh: e.target.value})} placeholder={isZh ? "中文摘要" : "Abstract (ZH)"} />
                    <input className="inp" value={editForm.keywords} onChange={e => setEditForm({...editForm, keywords: e.target.value})} placeholder={isZh ? "关键词" : "Keywords"} />
                    
                    {/* PDF 替换拖拽框 */}
                    <div 
                      style={{ border: "1px dashed var(--gold-dim)", padding: "20px", textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.2)" }} 
                      onClick={() => editFileRef.current?.click()}
                    >
                      <input ref={editFileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditPdf(f); }} />
                      {editPdf ? (
                        <span style={{ color: "var(--gold)", fontFamily: "var(--mono)", fontSize: 13 }}>✓ {editPdf.name}</span>
                      ) : (
                        <span style={{ color: "var(--text-ghost)", fontSize: 13 }}>{isZh ? "↑ 点击上传新 PDF 替换（若不选则保留原 PDF）" : "↑ Click to upload new PDF (leave empty to keep current)"}</span>
                      )}
                    </div>

                    <button 
                      className="bp" 
                      style={{ marginTop: 8, background: "var(--gold)", color: "var(--bg)", borderColor: "var(--gold)", opacity: isUpdatingArticle ? 0.5 : 1 }} 
                      disabled={isUpdatingArticle} 
                      onClick={async () => {
                        if (!supabase) return;
                        setIsUpdatingArticle(true);
                        try {
                        let finalPdfUrl = a.pdf_url;
  
                        if (editPdf) {
                        // 1. 👇 核心改进：删除 Storage 中的旧文件
                        if (a.pdf_url) {
                        // 从 URL 中提取路径（例如从 .../public/papers/published/xxx.pdf 提取 published/xxx.pdf）
                        const oldPath = a.pdf_url.split('/public/papers/')[1];
      if (oldPath) {
        await supabase.storage.from("papers").remove([oldPath]);
      }
    }

    // 2. 加工并上传新文件 (保持原有打标逻辑)
    const tempUrl = URL.createObjectURL(editPdf);
    const stampedBlob = await stampPdf(tempUrl, a.idiot_id, a.vol, a.issue);
    URL.revokeObjectURL(tempUrl);

    const finalPath = `published/final-${a.idiot_id}.pdf`; 

const { error: uploadErr } = await supabase.storage
  .from("papers")
  .upload(finalPath, stampedBlob, { 
    contentType: "application/pdf", 
    upsert: true // 👈 关键：如果文件已存在，直接覆盖
  });
      
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from("papers").getPublicUrl(finalPath);
    finalPdfUrl = urlData.publicUrl;
  }

                          // 2. 更新文章数据库
                          const { error: updateErr } = await supabase.from("articles").update({
                            title_en: editForm.title_en, title_zh: editForm.title_zh,
                            authors: editForm.authors, affiliation: editForm.affiliation,
                            abstract_en: editForm.abstract_en, abstract_zh: editForm.abstract_zh,
                            keywords: editForm.keywords, pdf_url: finalPdfUrl
                          }).eq("id", a.id);

                          if (updateErr) throw new Error(updateErr.message);
                          
                          alert(isZh ? "文章信息与附件更新成功！" : "Article updated successfully!");
                          window.location.reload(); 
                        } catch (e: any) {
                          alert("Update Error: " + e.message);
                        }
                        setIsUpdatingArticle(false);
                      }}
                    >
                      {isUpdatingArticle ? "..." : (isZh ? "确认保存修改" : "Save Changes")}
                    </button>
                  </div>
                </div>
              )}
            </>
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
          }} 
            onGeneratePoster={() => setShowPoster(true)}
            />

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
    // 1. 实时获取 URL 中的搜索关键词
    const searchParams = new URLSearchParams(window.location.search);
    const q = (searchParams.get("q") || "").toLowerCase();

    // 2. 过滤文章：支持搜中英标题、作者、机构
    const filteredArticles = articles.filter(a => 
      !q || 
      (a.title_en || "").toLowerCase().includes(q) || 
      (a.title_zh || "").toLowerCase().includes(q) || 
      (a.authors || "").toLowerCase().includes(q) ||
      (a.affiliation || "").toLowerCase().includes(q)
    );

    // 3. 区分显示逻辑：
    // - 如果没有搜索词，正常显示封面文章 (featured) 和 最新列表 (others)
    // - 如果有搜索词，取消封面大图展示，把所有匹配结果平铺显示
    const displayFeatured = !q ? filteredArticles.find((a) => a.featured) : null;
    const displayOthers = q ? filteredArticles : filteredArticles.filter((a) => !a.featured);

    return (
      <div style={{ minHeight: "100vh" }}>
        <AuthModal t={t} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
        <NavBar {...navProps} />
        <div style={{ paddingTop: 80 }} className="ctr">
          <div className="gl" style={{ marginTop: 40 }} />
          
          {/* 标题区：如果有搜索词，显示“Search Results”，否则显示“Articles” */}
          <h1 style={{ fontSize: 42, fontWeight: 300, marginBottom: 8 }}>
            {q ? (isZh ? `搜索结果: "${searchParams.get("q")}"` : `Search Results for "${searchParams.get("q")}"`) : t.articles.title}
          </h1>
          <p style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--text-faint)", marginBottom: 48, letterSpacing: 1 }}>
            {q ? (isZh ? `共找到 ${filteredArticles.length} 篇相关文章` : `Found ${filteredArticles.length} related articles`) : t.articles.coverNote}
          </p>

          {/* 封面文章（仅在非搜索状态下显示） */}
          {displayFeatured && (
            <div style={{ border: "1px solid rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)", marginBottom: 48, cursor: "pointer", overflow: "hidden" }} onClick={() => { setSelectedArticle(displayFeatured); setPage("article-detail"); window.scrollTo({ top: 0 }); }}>
              <div style={{ padding: "32px 44px 40px" }}>
                <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>{t.articles.featured}</div>
                <div style={{ display: "inline-block", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", padding: "2px 10px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1, marginBottom: 12 }}>{displayFeatured.classification}</div>
                <h2 style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.35, marginBottom: 10 }}>{isZh ? (displayFeatured.title_zh || displayFeatured.title_en) : (displayFeatured.title_en || displayFeatured.title_zh)}</h2>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>{displayFeatured.authors} {"\u2014"} {displayFeatured.affiliation}</div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-faint)", marginBottom: 16, textAlign: "justify" }}>{isZh ? displayFeatured.abstract_zh : displayFeatured.abstract_en}</p>
                <div style={{ display: "flex", gap: 24, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginBottom: 4 }}>
                  {displayFeatured.model !== "N/A" && <span>{t.articles.model}: {displayFeatured.model}</span>}
                  <span>{t.articles.vol} {displayFeatured.vol}, {t.articles.iss} {displayFeatured.issue}</span>
                  <span>{displayFeatured.date}</span>
                </div>
                <SocialBar article={displayFeatured} t={t.articles} onShare={() => trackShare(displayFeatured.id)} />
              </div>
            </div>
          )}

          {/* 列表区域头部提示词 */}
          {!q && <h3 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 24 }}>{t.articles.latest}</h3>}
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 80 }}>
            {/* 搜索为空的占位提示 */}
            {q && displayOthers.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-ghost)", border: "1px dashed var(--border)" }}>
                {isZh ? "未找到符合条件的文章，请尝试其他关键词。" : "No articles match your search. Try different keywords."}
              </div>
            )}

            {/* 列表渲染 */}
            {displayOthers.map((a) => (
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
                        // 0. 安全守卫：满足 TS 检查，确保基础对象存在
                        if (!supabase || !activeReview) return;
                        if (!confirm(isZh ? "确定将此稿件正式发表吗？系统将自动注入页眉页脚并生成期刊号。" : "Confirm publication? System will inject headers/footers and generate ID.")) return;

                        setSubmitting(true); 
                        try {
                          // ──────── Stage 1: 数据库发表 ────────
                          const { data: newIdiotId, error: publishError } = await supabase.rpc('publish_submission', { 
                            sub_id: activeReview.id,
                            p_vol: "1", 
                            p_issue: "1" 
                          });

                          if (publishError) throw new Error("Database Publish Failed: " + publishError.message);
                          if (!newIdiotId) throw new Error("Failed to generate Idiot ID");

                          let finalPdfUrl = activeReview.pdf_url; 
                          
                          // ──────── Stage 2 & 3: PDF 注入与上传 ────────
                          try {
                          // 调用工具函数注入页眉页脚
                          const stampedBlob = await stampPdf(activeReview.pdf_url, newIdiotId, "1", "1");
  
                          if (stampedBlob.size < 100) throw new Error("Generated PDF is too small.");

                          // ✅ 使用固定文件名：这样后续更新也会覆盖此路径，不会产生旧版本堆积
                          const finalPath = `published/final-${newIdiotId}.pdf`; 
  
                          if (!supabase) throw new Error("Connection lost during process");

                          // ✅ 核心修复：变量名改为 publishUploadErr，并保留 upsert: true
                          const { error: publishUploadErr } = await supabase.storage
                          .from("papers")
                          .upload(finalPath, stampedBlob, { 
                          contentType: "application/pdf", 
                          upsert: true 
                    });

                          if (publishUploadErr) throw publishUploadErr; // 使用新的变量名

                          // 获取正式版公开链接
                          const { data: urlData } = supabase.storage.from("papers").getPublicUrl(finalPath);
                          if (!urlData) throw new Error("Could not get public URL");
                          finalPdfUrl = urlData.publicUrl;

                            // ──────── Stage 4: 更新文章表链接 ────────
                            const { error: updateErr } = await supabase
                              .from("articles")
                              .update({ pdf_url: finalPdfUrl })
                              .eq("idiot_id", newIdiotId);
                            
                            if (updateErr) throw updateErr;

                          } catch (pdfErr: any) {
                            // PDF 加工失败的容错提示
                            console.error("PDF Stamping Warning:", pdfErr);
                            alert(isZh 
                              ? `提示：文章已发表为 ${newIdiotId}，但 PDF 页眉注入失败。` 
                              : `Note: Article published as ${newIdiotId}, but PDF stamping failed.`);
                          }

                          // ──────── Stage 5: 成功结束 ────────
                          alert(isZh ? `🎉 正式发表成功！期刊号: ${newIdiotId}` : `🎉 Published successfully! ID: ${newIdiotId}`);
                          setActiveReview(null);
                          setShowPdf(false);
                          refetchSubs(); // 刷新列表，该稿件会从“待处理”消失

                        } catch (err: any) {
                          alert("Critical Error: " + err.message);
                        } finally {
                          setSubmitting(false); // 解锁按钮
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

      {/* Manifesto改为精选轮播图 */}
      <section className="sec" style={{ background: "var(--bg-alt)", position: "relative" }}>
        <div className="ctr">
          <div className="gl" />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", margin: 0 }}>
              {isZh ? "往期精选" : "Featured Archives"}
            </h2>
            {/* 左右切换按钮 */}
            {carouselArticles.length > 1 && (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="bp bs" onClick={() => setCurrentSlide(s => (s === 0 ? carouselArticles.length - 1 : s - 1))} style={{ padding: "8px 12px" }}>←</button>
                <button className="bp bs" onClick={() => setCurrentSlide(s => (s + 1) % carouselArticles.length)} style={{ padding: "8px 12px" }}>→</button>
              </div>
            )}
          </div>

          <div style={{ position: "relative", minHeight: 280 }}>
            {carouselArticles.length > 0 ? carouselArticles.map((a, idx) => (
              <div
                key={a.id}
                style={{
                  position: currentSlide === idx ? "relative" : "absolute",
                  top: 0, left: 0, width: "100%",
                  opacity: currentSlide === idx ? 1 : 0,
                  transform: currentSlide === idx ? "translateX(0)" : "translateX(20px)",
                  pointerEvents: currentSlide === idx ? "auto" : "none",
                  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "40px 48px",
                  cursor: "pointer",
                  zIndex: currentSlide === idx ? 10 : 0
                }}
                className="article-card"
                onClick={() => { setSelectedArticle(a); setPage("article-detail"); window.scrollTo({ top: 0 }); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "inline-block", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", padding: "2px 10px", fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1 }}>
                    {a.classification}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{a.date}</div>
                </div>
                
                <h3 style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.4, marginBottom: 12, color: "var(--text)" }}>
                  {isZh ? (a.title_zh || a.title_en) : (a.title_en || a.title_zh)}
                </h3>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>{a.authors} <span style={{ fontStyle: "italic", color: "var(--text-faint)" }}>— {a.affiliation}</span></div>
                
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-faint)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {isZh ? a.abstract_zh : a.abstract_en}
                </p>
                
                <div style={{ marginTop: 24, fontSize: 12, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  {t.articles.readMore}
                </div>
              </div>
            )) : (
              <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-ghost)", border: "1px dashed var(--border)" }}>
                {isZh ? "数据加载中..." : "Loading articles..."}
              </div>
            )}
          </div>

          {/* 底部进度指示点 */}
          {carouselArticles.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              {carouselArticles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  style={{
                    width: currentSlide === idx ? 32 : 16, 
                    height: 3, padding: 0,
                    background: currentSlide === idx ? "var(--gold)" : "var(--border)",
                    border: "none", cursor: "pointer", transition: "all 0.4s"
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="dv" />

      {/* ════════ 新增：风云榜单模块 (背景色：黑) ════════ */}
      <section className="sec" id="leaderboard"><div className="ctr"><div className="gl" />
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 40 }}>
          <h2 style={{ fontSize: 38, fontWeight: 300, lineHeight: 1.3 }}>{isZh ? "贡献榜" : "Leaderboard"}</h2>
          <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1 }}>{isZh ? "本周动态" : "WEEKLY TRENDS"}</span>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32 }}>
          
          {/* 1. 活跃作者榜 */}
          <div style={{ background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.15)", padding: "32px 24px" }}>
            <h3 style={{ fontSize: 16, fontFamily: "var(--mono)", color: "var(--gold)", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              🏆 {isZh ? "作者贡献" : "Top Authors"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topAuthors.map(([name, count], idx) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18, fontFamily: "var(--mono)", color: idx === 0 ? "var(--gold)" : "var(--text-ghost)", fontWeight: 600 }}>0{idx + 1}</span>
                    <span style={{ fontSize: 15, color: "var(--text-dim)", fontWeight: 500 }}>{name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>{count} {isZh ? "篇" : "Papers"}</span>
                </div>
              ))}
              {topAuthors.length === 0 && <div style={{ fontSize: 13, color: "var(--text-ghost)" }}>{isZh ? "暂无数据" : "No data yet"}</div>}
            </div>
          </div>

          {/* 2. 瞩目机构榜 */}
          <div style={{ background: "rgba(167,139,250,0.03)", border: "1px solid rgba(167,139,250,0.15)", padding: "32px 24px" }}>
            <h3 style={{ fontSize: 16, fontFamily: "var(--mono)", color: "#a78bfa", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              🏛️ {isZh ? "瞩目机构" : "Top Institutions"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topAffiliations.map(([name, count], idx) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18, fontFamily: "var(--mono)", color: idx === 0 ? "#a78bfa" : "var(--text-ghost)", fontWeight: 600 }}>0{idx + 1}</span>
                    <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 500, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={name}>{name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>{count} {isZh ? "篇" : "Papers"}</span>
                </div>
              ))}
              {topAffiliations.length === 0 && <div style={{ fontSize: 13, color: "var(--text-ghost)" }}>{isZh ? "暂无数据" : "No data yet"}</div>}
            </div>
          </div>

          {/* 3. 明星读者榜 */}
          <div style={{ background: "rgba(74,222,128,0.03)", border: "1px solid rgba(74,222,128,0.15)", padding: "32px 24px" }}>
            <h3 style={{ fontSize: 16, fontFamily: "var(--mono)", color: "#4ade80", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              🌟 {isZh ? "明星读者" : "Top Readers"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topReaders.map((reader, idx) => (
                <div key={reader.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18, fontFamily: "var(--mono)", color: idx === 0 ? "#4ade80" : "var(--text-ghost)", fontWeight: 600 }}>0{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: 15, color: "var(--text-dim)", fontWeight: 500 }}>{reader.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{reader.desc}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "#4ade80", fontWeight: 600 }}>{reader.score}</span>
                </div>
              ))}
            </div>
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

        <a href="yuxuanzhu83@gmail.com" className="bp">{t.editorial.cta}</a>
      </div></section>
      
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
      
      <Footer t={t} />
    </div>
  );
}
