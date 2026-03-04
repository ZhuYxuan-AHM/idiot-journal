# I.D.I.O.T. 若智

**Interdisciplinary Discourse on Irrational Outcomes in Technology**

An international open-access academic journal platform for the rigorous study of irrational, absurd, and counterproductive behaviors at the intersection of humans and technology.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vite + React + TypeScript | SPA with bilingual EN/中文 UI |
| Backend | Supabase | Auth, PostgreSQL, Row Level Security |
| Deploy | Vercel | Auto CI/CD from GitHub |
| Code | GitHub | Version control |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/idiot-journal.git
cd idiot-journal
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in SQL Editor:

```bash
# Copy contents of supabase/migrations/001_initial.sql
# Paste into Supabase SQL Editor → Run
```

3. Copy your project URL and anon key from Settings → API

### 3. Environment Variables

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Run Locally

```bash
npm run dev
# Opens at http://localhost:5173
```

> **Demo Mode**: The app runs fully without Supabase using mock data. Just skip steps 2-3.

### 5. Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Vite

## Project Structure

```
src/
├── components/
│   ├── layout/        NavBar, Footer, AuthModal
│   ├── articles/      SocialBar, StarRating
│   ├── profile/       LevelBar
│   ├── preview/       PaperPreview (Markdown → journal format)
│   └── ui/            StatusBadge, LanguageToggle
├── hooks/
│   ├── useAuth.ts     Supabase auth + demo mode fallback
│   └── useArticles.ts Article fetching + share tracking
├── i18n/              EN/ZH translations
├── lib/
│   ├── supabase.ts    Client init (graceful fallback)
│   ├── types.ts       All TypeScript interfaces
│   ├── markdown.ts    MD parser for paper preview
│   ├── templates.ts   Mandatory paper templates EN/ZH
│   └── demo-data.ts   Mock data for offline dev
├── styles/
│   └── global.css     Design system (CSS variables)
├── App.tsx            Page routing + all page renders
└── main.tsx           Entry point
```

## Database Schema

See `supabase/migrations/001_initial.sql` for full schema:

- **profiles** — User accounts with level/badge system
- **articles** — Published papers with bilingual content
- **submissions** — User paper uploads with review workflow
- **comments** — Article discussions
- **ratings** — 1-5 star ratings (one per user per article)
- **shares** — Share tracking
- **article_stats** — Aggregated view for performance

All tables use Row Level Security (RLS).

## User Level System

| Level | EN Title | 中文 | XP Required |
|-------|----------|------|-------------|
| 1 | Curious Observer | 好奇观察者 | 0 |
| 2 | Skeptical Apprentice | 质疑学徒 | 200 |
| 3 | Ruozhi Analyst | 若智分析师 | 600 |
| 4 | Senior Diagnostician | 高级诊断师 | 1,400 |
| 5 | Chief Absurdity Officer | 首席荒谬官 | 3,000 |

Badges: Reader → Author → Reviewer → Editor

## Eight Research Domains

1. Human Bewilderment Studies / 人类迷惑行为学
2. AI Absurdity Analysis / AI荒唐行为分析学
3. Ruozhi Diagnosis & Intervention / 若智诊断与干预疗法
4. Management Ruozhi Studies / 管理若智行为学
5. Commercial Absurdism / 商业荒诞学
6. Ruozhi Philosophy / 若智哲理
7. Ruozhi Governance & Ethics / 若智的治理与伦理
8. The Ruozhi Archives / 若智典藏

## License

Content: CC BY 4.0
Code: MIT
