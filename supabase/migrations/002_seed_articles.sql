-- ╔══════════════════════════════════════════════════════════════╗
-- ║  I.D.I.O.T. 若智 — Seed Data: Initial Articles             ║
-- ║  Run AFTER 001_initial.sql in Supabase SQL Editor           ║
-- ╚══════════════════════════════════════════════════════════════╝

INSERT INTO public.articles (id, vol, issue, featured, published_at, classification, title_en, title_zh, authors, affiliation, abstract_en, abstract_zh, keywords, model_examined, status, cover_url)
VALUES
(
  'a0000001-0001-0001-0001-000000000001',
  '1', '1', true, '2026-03-01',
  'Human Bewilderment',
  'The Spreadsheet Priest: A Phenomenological Study of Office Workers Who Pray Before Pressing Ctrl+S',
  '表格神父：对按下Ctrl+S前祈祷的办公室职员的现象学研究',
  'Jane Doe, Marcus Webb',
  'Institute of Workplace Irrationality',
  'Through 18 months of ethnographic fieldwork across 14 organizations, we document the rise of techno-superstitious rituals. 43.7% of surveyed employees report performing ritualistic behaviors before critical digital operations, including verbal incantations, physical gestures, and preventive emotional bargaining with inanimate software.',
  '通过14个组织、18个月的田野调查，我们记录了现代职场中技术迷信仪式的兴起。43.7%的受访员工承认在关键数字操作前执行仪式性行为，包括口头咒语和对无生命软件的情感谈判。',
  'techno-superstition, workplace ritual, digital animism',
  'N/A', 'published',
  'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=340&fit=crop'
),
(
  'a0000001-0001-0001-0001-000000000002',
  '1', '1', false, '2026-02-15',
  'AI Absurdity',
  'Benchmark Theater: How MMLU Scores Predict Nothing About Real-World Reasoning',
  '基准测试剧场：MMLU分数如何对现实推理毫无预测力',
  'Alice Wang, Bob Chen',
  'Institute of AI Skepticism',
  'We demonstrate that LLMs achieving over 90% on MMLU consistently fail at elementary logical reasoning outside standard benchmark formats, revealing systematic benchmark-overfitting that questions evaluation validity itself.',
  '我们证明了在MMLU上达90%的LLM在标准格式之外的基础逻辑推理上持续失败，揭示了系统性的「基准过拟合」现象。',
  'benchmark gaming, MMLU, reasoning failure',
  'GPT-4o, Gemini 1.5', 'published',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop'
),
(
  'a0000001-0001-0001-0001-000000000003',
  '1', '1', false, '2026-02-01',
  'Commercial Absurdism',
  'The AI Washing Machine: 500 Startups That Added AI to Their Name Without Changing Their Product',
  'AI洗衣机：500家只改名字不改产品就加上AI的创业公司',
  'Carlos Rivera, Diana Park',
  'School of Entrepreneurial Delusion',
  'We analyzed 500 startups that rebranded with AI between 2023-2025. In 73.2% of cases, the core product remained identical. Average valuation increase was 340%, while actual AI integration was limited to a ChatGPT API wrapper. We introduce the AI Washing Index (AWI).',
  '分析了2023-2025年500家加AI名的创业公司，73.2%核心产品未变，平均估值提升340%，实际AI集成仅为ChatGPT API包装。提出AI洗涤指数(AWI)。',
  'AI washing, startup culture, valuation bubble',
  'N/A', 'published',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop'
),
(
  'a0000001-0001-0001-0001-000000000004',
  '1', '1', false, '2026-01-20',
  'Management Ruozhi',
  'When the CEO Read a Blog Post: Tracing AI Adoption Disasters to Single Medium Articles',
  '当CEO读了一篇博客：追溯灾难性AI采纳决策的单篇Medium文章源头',
  'Eva Schmidt, Frank Torres',
  'Center for Organizational Foolishness',
  'Through interviews with 87 middle managers across Fortune 500 companies, we trace how single viral blog posts triggered organization-wide AI mandates. In 61% of cases, the CEO had no technical briefing beyond the original article. We term this Executive Blog-Post Syndrome (EBPS).',
  '访谈87名世界500强中层管理者，追溯单篇病毒博客如何触发全组织AI指令。61%的CEO除原文外未获任何技术简报。命名为「高管博客文综合征(EBPS)」。',
  'executive decision-making, AI mandate, organizational irrationality',
  'N/A', 'published',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop'
),
(
  'a0000001-0001-0001-0001-000000000005',
  '1', '1', false, '2026-01-10',
  'Ruozhi Philosophy',
  'The Paradox of the Intelligent Fool: Toward a Unified Theory of Technological Hubris',
  '智者千虑必有一失：技术傲慢的统一理论初探',
  'Yuki Tanaka',
  'Department of Philosophy of Technology',
  'Drawing on Heidegger, Ellul, and Zhuangzi, this paper proposes a framework for why increased technological capability correlates with decreased critical judgment. We argue this is not a bug but a structural feature of the human-technology relationship.',
  '借鉴海德格尔、埃吕尔和庄子，提出理解技术能力增强与批判性判断下降相关性的哲学框架。我们认为这是人与技术关系的结构性特征。',
  'philosophy of technology, hubris, Zhuangzi, critical theory',
  'N/A', 'published',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=340&fit=crop'
);
