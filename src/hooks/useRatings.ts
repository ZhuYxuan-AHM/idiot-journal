import { useState, useEffect, useCallback } from "react";
import { supabase, isLive } from "@/lib/supabase";

interface RatingState {
  avg: number;
  count: number;
  userRating: number | null;
}

export function useRatings(articleId: string) {
  const [state, setState] = useState<RatingState>({ avg: 0, count: 0, userRating: null });
  const [loading, setLoading] = useState(true);

  const fetchRatings = useCallback(async () => {
    if (!isLive || !supabase) { setLoading(false); return; }

    // Get aggregate
    const { data: agg } = await supabase
      .from("ratings")
      .select("score")
      .eq("article_id", articleId);

    const scores = agg?.map((r: any) => r.score) ?? [];
    const avg = scores.length ? +(scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : 0;

    // Get user's rating
    let userRating: number | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: ur } = await supabase
        .from("ratings")
        .select("score")
        .eq("article_id", articleId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ur) userRating = ur.score;
    }

    setState({ avg, count: scores.length, userRating });
    setLoading(false);
  }, [articleId]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const submitRating = async (score: number) => {
    if (!isLive || !supabase) return { error: "Not connected" };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Upsert: insert or update
    const { error } = await supabase
      .from("ratings")
      .upsert(
        { article_id: articleId, user_id: user.id, score },
        { onConflict: "article_id,user_id" }
      );

    if (!error) {
      setState((prev) => ({ ...prev, userRating: score }));
      await fetchRatings();
    }
    return { error: error?.message ?? null };
  };

  return { ...state, loading, submitRating };
}
