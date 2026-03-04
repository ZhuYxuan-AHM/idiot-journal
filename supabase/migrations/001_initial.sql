-- ╔══════════════════════════════════════════════════════════════╗
-- ║  I.D.I.O.T. 若智 Journal — Initial Schema                  ║
-- ║  Run in Supabase SQL Editor or via supabase db push         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── User Profiles ───────────────────────────────────────────
-- Extends Supabase Auth; linked via auth.uid()
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text not null default 'Researcher',
  affiliation text not null default '',
  orcid       text,
  badge       text not null default 'reader'
                check (badge in ('reader','author','reviewer','editor')),
  level       int  not null default 1 check (level between 1 and 5),
  xp          int  not null default 0,
  papers_published   int not null default 0,
  reviews_completed  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: public read"
  on public.profiles for select using (true);

create policy "Profiles: self update"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', 'Researcher')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── Published Articles ──────────────────────────────────────
create table public.articles (
  id            uuid primary key default uuid_generate_v4(),
  vol           text not null default '1',
  issue         text not null default '1',
  featured      boolean not null default false,
  published_at  date not null default current_date,
  classification text not null,
  title_en      text not null,
  title_zh      text not null default '',
  authors       text not null,
  affiliation   text not null default '',
  abstract_en   text not null,
  abstract_zh   text not null default '',
  keywords      text not null default '',
  model_examined text not null default 'N/A',
  status        text not null default 'published'
                  check (status in ('draft','published')),
  cover_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.articles enable row level security;

create policy "Articles: public read published"
  on public.articles for select using (status = 'published');


-- ─── Submissions (user paper uploads) ────────────────────────
create table public.submissions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  markdown      text not null default '',
  classification text not null default '',
  status        text not null default 'under_review'
                  check (status in ('draft','under_review','revision','accepted','rejected','published')),
  reviewer_notes text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.submissions enable row level security;

create policy "Submissions: owner read"
  on public.submissions for select using (auth.uid() = user_id);

create policy "Submissions: owner insert"
  on public.submissions for insert with check (auth.uid() = user_id);

create policy "Submissions: owner update draft/under_review"
  on public.submissions for update using (
    auth.uid() = user_id and status in ('draft', 'under_review', 'revision')
  );

-- Reviewers can read all submissions
create policy "Submissions: reviewer read all"
  on public.submissions for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and badge in ('reviewer', 'editor')
    )
  );


-- ─── Comments ────────────────────────────────────────────────
create table public.comments (
  id          uuid primary key default uuid_generate_v4(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) <= 2000),
  created_at  timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Comments: public read"
  on public.comments for select using (true);

create policy "Comments: auth insert"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Comments: owner delete"
  on public.comments for delete using (auth.uid() = user_id);


-- ─── Ratings ─────────────────────────────────────────────────
create table public.ratings (
  id          uuid primary key default uuid_generate_v4(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       int not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (article_id, user_id)   -- one rating per user per article
);

alter table public.ratings enable row level security;

create policy "Ratings: public read"
  on public.ratings for select using (true);

create policy "Ratings: auth upsert"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "Ratings: owner update"
  on public.ratings for update using (auth.uid() = user_id);


-- ─── Shares (tracking) ──────────────────────────────────────
create table public.shares (
  id          uuid primary key default uuid_generate_v4(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.shares enable row level security;

create policy "Shares: public insert"
  on public.shares for insert with check (true);

create policy "Shares: public read"
  on public.shares for select using (true);


-- ─── Aggregate Views ─────────────────────────────────────────
-- Materialized for performance; refresh periodically or via trigger

create or replace view public.article_stats as
select
  a.id as article_id,
  coalesce(c.cnt, 0) as comment_count,
  coalesce(r.avg_score, 0) as avg_rating,
  coalesce(r.rating_count, 0) as rating_count,
  coalesce(s.share_count, 0) as share_count
from public.articles a
left join (select article_id, count(*) as cnt from public.comments group by article_id) c
  on c.article_id = a.id
left join (select article_id, avg(score)::numeric(2,1) as avg_score, count(*) as rating_count from public.ratings group by article_id) r
  on r.article_id = a.id
left join (select article_id, count(*) as share_count from public.shares group by article_id) s
  on s.article_id = a.id;


-- ─── Indexes ─────────────────────────────────────────────────
create index idx_submissions_user on public.submissions(user_id);
create index idx_comments_article on public.comments(article_id);
create index idx_ratings_article  on public.ratings(article_id);
create index idx_shares_article   on public.shares(article_id);
create index idx_articles_status  on public.articles(status);
