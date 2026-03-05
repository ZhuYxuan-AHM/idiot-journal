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
            style={{
              color: i <= full ? "var(--gold)" : i === full + 1 && half ? "var(--gold)" : "var(--text-dead)",
              fontSize: 14,
            }}
          >
            {i <= full ? "★" : i === full + 1 && half ? "★" : "☆"}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>{rating}</span>
      <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>({count})</span>
    </div>
  );
}
