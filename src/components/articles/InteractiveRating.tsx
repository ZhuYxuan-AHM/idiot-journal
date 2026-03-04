import { useState } from "react";
import { useRatings } from "@/hooks/useRatings";
import type { UserProfile } from "@/lib/types";
import type { T } from "@/i18n";

interface Props {
  articleId: string;
  user: UserProfile | null;
  t: T;
  onLoginRequired: () => void;
}

export function InteractiveRating({ articleId, user, t, onLoginRequired }: Props) {
  const { avg, count, userRating, submitRating } = useRatings(articleId);
  const [hover, setHover] = useState(0);
  const [msg, setMsg] = useState("");

  const handleRate = async (score: number) => {
    if (!user) { onLoginRequired(); return; }
    const { error } = await submitRating(score);
    if (error) setMsg(error);
    else setMsg(t.articles.ratingSubmitted ?? "Rating submitted!");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div style={{
      border: "1px solid var(--border)", padding: "20px 24px",
      background: "var(--surface)", marginTop: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{
            fontSize: 13, fontFamily: "var(--mono)", letterSpacing: 2,
            color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8,
          }}>
            {t.articles.rate}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => handleRate(i)}
                style={{
                  fontSize: 28, cursor: "pointer",
                  color: i <= (hover || userRating || 0) ? "var(--gold)" : "var(--text-dead)",
                  transition: "color 0.15s, transform 0.15s",
                  transform: hover === i ? "scale(1.2)" : "scale(1)",
                  display: "inline-block",
                }}
              >
                {i <= (hover || userRating || 0) ? "\u2605" : "\u2606"}
              </span>
            ))}
          </div>
          {userRating && (
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--gold)", marginTop: 6 }}>
              {t.articles.yourRating ?? "Your rating"}: {userRating}/5
            </div>
          )}
          {msg && (
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "#4ade80", marginTop: 4 }}>{msg}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 300, color: "var(--gold)", lineHeight: 1 }}>{avg || "\u2014"}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-ghost)", marginTop: 4 }}>
            {count} {t.articles.ratingsCount ?? "ratings"}
          </div>
        </div>
      </div>
    </div>
  );
}
