import { StarRating } from "./StarRating";
import type { Article } from "@/lib/types";
import type { T } from "@/i18n";

interface Props {
  article: Article;
  t: T["articles"];
  onShare?: () => void;
}

export function SocialBar({ article: a, t, onShare }: Props) {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("https://idiotjournal.org/" + a.id);
    onShare?.();
  };

  return (
    <div
      style={{
        display: "flex", gap: 20, alignItems: "center",
        paddingTop: 12, borderTop: "1px solid var(--border)", marginTop: 12,
      }}
    >
      <button
        onClick={handleShare}
        style={{
          background: "none", border: "none", color: "var(--text-faint)",
          fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, padding: 0,
        }}
      >
        \u2197 {t.share} <span style={{ color: "var(--text-ghost)" }}>({a.shares})</span>
      </button>
      <span
        style={{
          color: "var(--text-faint)", fontSize: 11, fontFamily: "var(--mono)",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        \u2709 {t.comment} <span style={{ color: "var(--text-ghost)" }}>({a.comments})</span>
      </span>
      <StarRating rating={a.rating} count={a.ratings} />
    </div>
  );
}
