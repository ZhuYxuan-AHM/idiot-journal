import type { ArticleStatus } from "@/lib/types";
import type { T } from "@/i18n";

const STATUS_STYLES: Record<string, { bg: string; c: string }> = {
  under_review: { bg: "#1a2a3a", c: "#4a9eff" },
  revision:     { bg: "#3a2a0a", c: "#d4af37" },
  accepted:     { bg: "#0a3a1a", c: "#4ade80" },
  rejected:     { bg: "#3a0a0a", c: "#ef4444" },
  published:    { bg: "#1a1a3a", c: "#a78bfa" },
};

interface Props {
  status: ArticleStatus;
  t: T["profile"];
}

export function StatusBadge({ status, t }: Props) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.under_review;
  const label = t[("status_" + status) as keyof typeof t] ?? status;
  return (
    <span
      style={{
        background: s.bg, color: s.c,
        padding: "3px 10px", fontSize: 10,
        fontFamily: "var(--mono)", letterSpacing: 1, borderRadius: 2,
      }}
    >
      {label}
    </span>
  );
}
