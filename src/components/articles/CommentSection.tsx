import { useState } from "react";
import { useComments } from "@/hooks/useComments";
import type { UserProfile } from "@/lib/types";
import type { T } from "@/i18n";

// 补充了主编和副主编的专属配色！
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
  const { comments, loading, postComment } = useComments(articleId);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const handlePost = async () => {
    if (!user) { onLoginRequired(); return; }
    if (!draft.trim()) return;
    setPosting(true);
    setError("");
    const { error: err } = await postComment(draft.trim());
    if (err) setError(err);
    else setDraft("");
    setPosting(false);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
  };

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{
        fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 3,
        color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 20,
      }}>
        {t.articles.comment} ({comments.length})
      </h3>

      {/* Post box */}
      <div style={{
        border: "1px solid var(--border)", padding: 20, marginBottom: 24,
        background: "var(--surface)",
      }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={user ? (t.articles.commentPlaceholder ?? "Share your thoughts...") : (t.articles.loginToComment ?? "Sign in to comment")}
          disabled={!user}
          maxLength={2000}
          style={{
            width: "100%", minHeight: 80, background: "#16161a",
            border: "1px solid var(--gold-dim)", color: "var(--text)",
            fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.7,
            padding: "12px 16px", outline: "none", resize: "vertical",
            opacity: user ? 1 : 0.5,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>
            {draft.length}/2000
          </span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {error && <span style={{ fontSize: 11, color: "#ef4444", fontFamily: "var(--mono)" }}>{error}</span>}
            {!user ? (
              <button className="bp bs" onClick={onLoginRequired}>{t.nav.login}</button>
            ) : (
              <button
                className="bp bs"
                onClick={handlePost}
                disabled={posting || !draft.trim()}
                style={{
                  opacity: posting || !draft.trim() ? 0.4 : 1,
                  background: draft.trim() ? "var(--gold)" : "transparent",
                  color: draft.trim() ? "var(--bg)" : "var(--text-faint)",
                }}
              >
                {posting ? "..." : (t.articles.postComment ?? "Post")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-ghost)", padding: 20, textAlign: "center" }}>
          Loading...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-ghost)", fontStyle: "italic", padding: "20px 0" }}>
          {t.articles.noComments ?? "No comments yet. Be the first to share your thoughts."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {comments.map((c) => {
            const bc = BADGE_COLORS[c.user_badge] ?? BADGE_COLORS.reader;
            return (
              <div key={c.id} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 20, paddingBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontFamily: "var(--mono)", color: "var(--gold)", fontWeight: 600,
                  }}>
                    {c.user_name[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{c.user_name}</span>
                  <span style={{
                    background: bc.bg, color: bc.c,
                    padding: "1px 7px", fontSize: 9, fontFamily: "var(--mono)", letterSpacing: 1,
                  }}>
                    {/* 这里修复了头衔翻译 */}
                    {t.profile[("badge_" + c.user_badge) as keyof typeof t.profile] || c.user_badge}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "var(--text-dim)", margin: 0 }}>
                  {c.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
