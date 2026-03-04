import { useState, useEffect, useCallback } from "react";
import { supabase, isLive } from "@/lib/supabase";
import { DEMO_USER } from "@/lib/demo-data";
import type { UserProfile } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLive || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) fetchProfile(session.user.id);
        else { setUser(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid: string) {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.display_name,
        affiliation: data.affiliation,
        orcid: data.orcid ?? undefined,
        level: data.level,
        xp: data.xp,
        badge: data.badge as UserProfile["badge"],
        papers: data.papers_published,
        reviews: data.reviews_completed,
        created_at: data.created_at,
      });
    }
    setLoading(false);
  }

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isLive || !supabase) {
      // Demo mode
      setUser({ ...DEMO_USER, email, name: email.split("@")[0] });
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, meta: { name: string; affiliation: string }) => {
    if (!isLive || !supabase) {
      setUser({ ...DEMO_USER, email, name: meta.name, affiliation: meta.affiliation });
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: meta.name } },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (isLive && supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, signIn, signUp, signOut };
}
