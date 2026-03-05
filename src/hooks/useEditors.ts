import { useState, useEffect } from "react";
import { supabase, isLive } from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";

export function useEditors() {
  const [editors, setEditors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLive || !supabase) {
      // 演示模式下的假数据
      setEditors([
        { id: "demo-eic", email: "chief@idiotjournal.org", name: "张三 (Dr. Zhang)", affiliation: "示例大学认知科学系", level: 5, xp: 5000, badge: "editor_in_chief", papers: 12, reviews: 45, created_at: "2025-01-01" },
        { id: "demo-ae", email: "assoc@idiotjournal.org", name: "李四 (Prof. Li)", affiliation: "技术荒诞研究院", level: 4, xp: 3000, badge: "associate_editor", papers: 8, reviews: 30, created_at: "2025-02-01" },
      ]);
      setLoading(false);
      return;
    }

    async function fetchEditors() {
      // 1. 明确的类型保护：如果 supabase 是 null，直接退出函数
      if (!supabase) {
        setLoading(false);
        return;
      }

      // 2. 此时 TypeScript 已经 100% 确信 supabase 不为 null 了
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("badge", ["editor_in_chief", "associate_editor", "editor"]);

      if (data) {
        const formatted = data.map((d: any) => ({
          id: d.id,
          email: d.email,
          name: d.display_name,
          affiliation: d.affiliation,
          orcid: d.orcid ?? undefined,
          level: d.level,
          xp: d.xp,
          badge: d.badge,
          papers: d.papers_published,
          reviews: d.reviews_completed,
          created_at: d.created_at,
        }));
        
        const order = { editor_in_chief: 1, associate_editor: 2, editor: 3 };
        formatted.sort((a, b) => 
          (order[a.badge as keyof typeof order] || 99) - (order[b.badge as keyof typeof order] || 99)
        );
        
        setEditors(formatted);
      }
      setLoading(false);
    }

    fetchEditors();
  }, []);

  return { editors, loading };
}
