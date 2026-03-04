/* ═══════════════ Database / Domain Types ═══════════════ */

export type Lang = "en" | "zh";

export type ArticleStatus = "draft" | "under_review" | "revision" | "accepted" | "rejected" | "published";

export type UserBadge = "reader" | "author" | "reviewer" | "editor";

export interface Article {
  id: string;
  vol: string;
  issue: string;
  featured: boolean;
  date: string;
  classification: string;
  title_en: string;
  title_zh: string;
  authors: string;
  affiliation: string;
  abstract_en: string;
  abstract_zh: string;
  keywords: string;
  model: string;
  status: ArticleStatus;
  img: string;
  shares: number;
  comments: number;
  rating: number;
  ratings: number;
}

export interface UserPaper {
  id: string;
  title: string;
  status: ArticleStatus;
  submitted: string;
  classification: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  affiliation: string;
  orcid?: string;
  level: number;
  xp: number;
  badge: UserBadge;
  papers: number;
  reviews: number;
  created_at: string;
}

export interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  user_name: string;
  user_badge: UserBadge;
  content: string;
  created_at: string;
}

/* ═══════════════ Supabase Row Types (mirrors DB schema) ═══════════════ */

export interface DbArticle {
  id: string;
  vol: string;
  issue: string;
  featured: boolean;
  published_at: string;
  classification: string;
  title_en: string;
  title_zh: string;
  authors: string;
  affiliation: string;
  abstract_en: string;
  abstract_zh: string;
  keywords: string;
  model_examined: string;
  status: ArticleStatus;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubmission {
  id: string;
  user_id: string;
  title: string;
  markdown: string;
  classification: string;
  status: ArticleStatus;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbComment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DbRating {
  id: string;
  article_id: string;
  user_id: string;
  score: number;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  display_name: string;
  affiliation: string;
  orcid: string | null;
  badge: UserBadge;
  level: number;
  xp: number;
  papers_published: number;
  reviews_completed: number;
  created_at: string;
}
