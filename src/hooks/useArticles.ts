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

    (async () => {
      const { data: arts } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (!arts?.length) {
        setLoading(false);
        return;
      }

      const ids = arts.map((a: any) => a.id);

      const [{ data: commentCounts }, { data: ratingData }, { data: shareCounts }] = await Promise.all([
        supabase.from("comments").select("article_id").in("article_id", ids),
        supabase.from("ratings").select("article_id, score").in("article_id", ids),
        supabase.from("shares").select("article_id").in("article_id", ids),
      ]);

      const cMap = new Map<string, number>();
      (commentCounts ?? []).forEach((c: any) => cMap.set(c.article_id, (cMap.get(c.article_id) ?? 0) + 1));

      const rMap = new Map<string, { sum: number; count: number }>();
      (ratingData ?? []).forEach((r: any) => {
        const prev = rMap.get(r.article_id) ?? { sum: 0, count: 0 };
        rMap.set(r.article_id, { sum: prev.sum + r.score, count: prev.count + 1 });
      });

      const sMap = new Map<string, number>();
      (shareCounts ?? []).forEach((s: any) => sMap.set(s.article_id, (sMap.get(s.article_id) ?? 0) + 1));

      setArticles(
        arts.map((d: any) => {
          const r = rMap.get(d.id);
          return {
            id: d.id, vol: d.vol, issue: d.issue, featured: d.featured,
            date: d.published_at, classification: d.classification,
            title_en: d.title_en, title_zh: d.title_zh,
            authors: d.authors, affiliation: d.affiliation,
            abstract_en: d.abstract_en, abstract_zh: d.abstract_zh,
            keywords: d.keywords, model: d.model_examined,
            status: d.status, img: d.cover_url ?? "",
            shares: sMap.get(d.id) ?? 0,
            comments: cMap.get(d.id) ?? 0,
            rating: r ? +(r.sum / r.count).toFixed(1) : 0,
            ratings: r?.count ?? 0,
          };
        })
      );
      setLoading(false);
    })();
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
