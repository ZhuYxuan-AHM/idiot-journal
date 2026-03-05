interface Props {
  rating: number;
  count: number;
}

export function StarRating({ rating, count }: Props) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                // 如果 userRating 已存在，就禁用悬浮和点击事件
                onMouseEnter={() => !userRating && setHover(i)}
                onMouseLeave={() => !userRating && setHover(0)}
                onClick={() => !userRating && handleRate(i)}
                style={{
                  fontSize: 28, 
                  cursor: userRating ? "default" : "pointer", // 评过之后鼠标变回普通箭头
                  color: i <= (hover || userRating || 0) ? "var(--gold)" : "var(--text-dead)",
                  transition: "color 0.15s, transform 0.15s",
                  transform: hover === i ? "scale(1.2)" : "scale(1)",
                  display: "inline-block",
                }}
              >
            {i <= full ? "\u2605" : i === full + 1 && half ? "\u2605" : "\u2606"}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>{rating}</span>
      <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>({count})</span>
    </div>
  );
}
