import { useState, useEffect } from "react";
import { supabase, isLive } from "@/lib/supabase";

export function useSubmissions(userId: string | undefined, badge: string | undefined) {
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = async () => {
    if (!isLive || !supabase || !userId) return;
    setLoading(true);

    // 1. 获取作者自己投递的稿件
    const { data: myData } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (myData) setMySubmissions(myData);

    // 2. 如果当前用户是审稿人或编辑，获取全局需要处理的稿件
    if (["reviewer", "editor", "associate_editor", "editor_in_chief"].includes(badge || "")) {
      const { data: allData } = await supabase
        .from("submissions")
        .select("*")
        .neq("status", "draft") // 排除草稿状态
        .order("created_at", { ascending: false });

      if (allData) setAllSubmissions(allData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchSubs();
  }, [userId, badge]);

  return { mySubmissions, allSubmissions, refetch: fetchSubs, loading };
}
