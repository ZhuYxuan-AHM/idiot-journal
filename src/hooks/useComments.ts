import { useState, useEffect, useCallback } from "react";
import { supabase, isLive } from "@/lib/supabase";
import type { Comment } from "@/lib/types";

export function useComments(articleId: string) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!isLive || !supabase) { setLoading(false); return; }
    setLoading(true);
    // 获取时同时拿取 parent_id
    const { data } = await supabase
      .from("comments")
      .select("id, article_id, user_id, content, created_at, parent_id, profiles(display_name, badge)")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true }); // 改为正序排列，方便处理嵌套

    if (data) {
      setComments(data.map((d: any) => ({
        id: d.id,
        article_id: d.article_id,
        user_id: d.user_id,
        user_name: d.profiles?.display_name ?? "Anonymous",
        user_badge: d.profiles?.badge ?? "reader",
        content: d.content,
        created_at: d.created_at,
        parent_id: d.parent_id // 记录父评论 ID
      })));
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const postComment = async (content: string, parentId?: string) => {
    if (!isLive || !supabase) return { error: "Not connected" };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("comments")
      .insert({ article_id: articleId, user_id: user.id, content, parent_id: parentId });

    if (!error) await fetchComments();
    return { error: error?.message ?? null };
  };

  const deleteComment = async (commentId: string) => {
    if (!isLive || !supabase) return { error: "Not connected" };
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) await fetchComments();
    return { error: error?.message ?? null };
  };

  return { comments, loading, postComment, deleteComment, refresh: fetchComments };
}
