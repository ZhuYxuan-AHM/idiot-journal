import { useState, useEffect } from "react";
import { supabase, isLive } from "@/lib/supabase";
import { DEMO_ARTICLES } from "@/lib/demo-data";
import type { Article } from "@/lib/types";

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>(DEMO_ARTICLES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLive || !supabase) return;
    setLoading(true);

    supabase
      .from("articles")
      .select("*, article_stats(*)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setArticles(
            data.map((d: any) => ({
              id: d.id,
              vol: d.vol,
              issue: d.issue,
              featured: d.featured,
              date: d.published_at,
              classification: d.classification,
              title_en: d.title_en,
              title_zh: d.title_zh,
              authors: d.authors,
              affiliation: d.affiliation,
              abstract_en: d.abstract_en,
              abstract_zh: d.abstract_zh,
              keywords: d.keywords,
              model: d.model_examined,
              status: d.status,
              img: d.cover_url ?? "",
              shares: d.article_stats?.[0]?.share_count ?? 0,
              comments: d.article_stats?.[0]?.comment_count ?? 0,
              rating: d.article_stats?.[0]?.avg_rating ?? 0,
              ratings: d.article_stats?.[0]?.rating_count ?? 0,
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  const trackShare = async (articleId: string) => {
    if (isLive && supabase) {
      await supabase.from("shares").insert({ article_id: articleId });
    }
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, shares: a.shares + 1 } : a))
    );
  };

  return { articles, loading, trackShare };
}
