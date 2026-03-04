import type { T } from "@/i18n";

const XP_THRESHOLDS = [0, 200, 600, 1400, 3000, 6000];

interface Props {
  level: number;
  xp: number;
  t: T["profile"];
}

export function LevelBar({ level, xp, t }: Props) {
  const cur = XP_THRESHOLDS[level - 1] ?? 0;
  const nxt = XP_THRESHOLDS[level] ?? 6000;
  const pct = Math.min(100, ((xp - cur) / (nxt - cur)) * 100);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--gold)", letterSpacing: 1 }}>
          {t.lvl} {level}: {t.levels[level - 1]}
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>
          {xp} / {nxt} {t.xp}
        </div>
      </div>
      <div style={{ height: 6, background: "rgba(212,175,55,0.1)", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: pct + "%",
            background: "linear-gradient(90deg, var(--gold), #b8960f)",
            borderRadius: 3, transition: "width 0.6s",
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: "var(--text-ghost)", fontFamily: "var(--mono)", marginTop: 6 }}>
        {t.nextLvl}: {t.levels[level] ?? "\u2014"}
      </div>
    </div>
  );
}
