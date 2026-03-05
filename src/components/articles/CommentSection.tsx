import { useState } from "react";
import { useComments } from "@/hooks/useComments";
import type { UserProfile } from "@/lib/types";
import type { T } from "@/i18n";

const BADGE_COLORS: Record<string, { c: string; bg: string }> = {
  editor_in_chief:  { c: "#ef4444", bg: "#3a0a0a" },
  associate_editor: { c: "#f472b6", bg: "#3a1a2a" },
  editor:   { c: "#d4af37", bg: "#3a2a0a" },
  reviewer: { c: "#a78bfa", bg: "#1a1a3a" },
  author:   { c: "#4ade80", bg: "#0a3a1a" },
  reader:   { c: "#4a9eff", bg: "#1a3a5c" },
};

interface Props {
  articleId: string;
  user: UserProfile | null;
  t: T;
  onLoginRequired: () => void;
}

export function CommentSection({ articleId, user, t, onLoginRequired }: Props) {
  const { comments, loading, postComment, deleteComment } = useComments(articleId);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);

  const handlePost = async () => {
    if (!user) { onLoginRequired(); return; }
    if (!draft.trim()) return;
    setPosting(true);
    const { error } = await postComment(draft.trim(), replyTarget?.id);
    if (!error) { setDraft(""); setReplyTarget(null); }
    setPosting(false);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    return Math.floor(mins / 3600000) + "h ago";
  };

  // 渲染单条评论及其子回复
  const renderComment = (c: any, isReply = false) => {
    const bc = BADGE_COLORS[c.user_badge] ?? BADGE_COLORS.reader;
    // 权限检查：是否可以删除
    const canDelete = user && (user.id === c.user_id || ["editor", "associate_editor", "editor_in_chief"].includes(user.badge));

    return (
      <div key={c.id} style={{ 
        borderLeft: isReply ? "1px dashed var(--border)" : "2px solid var(--border)", 
        paddingLeft: isReply ? 16 : 20, 
        marginLeft: isReply ? 24 : 0,
        marginBottom: 16 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)", fontWeight: 600 }}>
            {c.user_name[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{c.user_name}</span>
          <span style={{ background: bc.bg, color: bc.c, padding: "1px 6px", fontSize: 8, fontFamily: "var(--mono)", letterSpacing: 1 }}>
            {t.profile[("badge_" + c.user_badge) as keyof typeof t.profile] || c.user_badge}
          </span>
          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{timeAgo(c.created_at)}</span>
          
          {/* 操作按钮组 */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {user && (
              <button className="nl" style={{ fontSize: 9, padding: 0 }} onClick={() => {
                setReplyTarget({ id: c.id, name: c.user_name });
                document.getElementById("comment-box")?.scrollIntoView({ behavior: "smooth" });
              }}>
                REPLY
              </button>
            )}
            {canDelete && (
              <button className="nl" style={{ fontSize: 9, padding: 0, color: "#ef4444" }} onClick={() => {
                if (confirm(isZh ? "确定删除这条评论吗？" : "Delete this comment?")) deleteComment(c.id);
              }}>
                DELETE
              </button>
            )}
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-dim)", margin: 0 }}>{c.content}</p>
        
        {/* 递归渲染属于该评论的回复 */}
        {comments.filter(reply => reply.parent_id === c.id).map(reply => renderComment(reply, true))}
      </div>
    );
  };

  const isZh = t.nav.login === "登录";

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 20 }}>
        {t.articles.comment} ({comments.length})
      </h3>

      {/* 发布框 */}
      <div id="comment-box" style={{ border: "1px solid var(--border)", padding: 20, marginBottom: 24, background: "var(--surface)" }}>
        {replyTarget && (
          <div style={{ fontSize: 11, color: "var(--gold)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Replying to @{replyTarget.name}</span>
            <span style={{ cursor: "pointer" }} onClick={() => setReplyTarget(null)}>✕</span>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={user ? (isZh ? `作为 ${user.name} 发表看法...` : `Commenting as ${user.name}...`) : t.articles.loginToComment}
          disabled={!user}
          style={{ width: "100%", minHeight: 80, background: "#16161a", border: "1px solid var(--gold-dim)", color: "var(--text)", fontFamily: "var(--serif)", fontSize: 14, padding: "12px 16px", outline: "none", resize: "vertical" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button className="bp bs" onClick={handlePost} disabled={posting || !draft.trim()} style={{ background: draft.trim() ? "var(--gold)" : "transparent", color: draft.trim() ? "var(--bg)" : "var(--text-faint)" }}>
            {posting ? "..." : (isZh ? "发布评论" : "Post")}
          </button>
        </div>
      </div>

      {/* 评论列表 - 只从最顶层评论开始渲染 */}
      {loading ? (
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-ghost)", textAlign: "center" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {comments.filter(c => !c.parent_id).map(c => renderComment(c))}
        </div>
      )}
    </div>
  );
}
