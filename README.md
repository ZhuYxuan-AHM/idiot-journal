# I.D.I.O.T. 若智 学刊

**Interdisciplinary Discourse on Irrational Outcomes in Technology**
*(技术中非理性结果的跨学科讨论)*

[![Open Access](https://img.shields.io/badge/Open_Access-CC_BY_4.0-green.svg)](#) [![Peer Reviewed](https://img.shields.io/badge/Peer_Reviewed-Double_Blind-blue.svg)](#)

> “当所有人都说技术很伟大时，谁在研究它让我们变蠢的时刻？”

**I.D.I.O.T. (若智)** 是一本国际性开放获取学术期刊，致力于严谨的科学视角研究非理性、荒谬和适得其反的行为——从被技术迷惑的人类，到迷惑人类的AI，再到在两者之间上演壮观愚行的组织群体。

我们不反对技术，我们反对在技术面前放弃批判性思维。我们发表别人习以为常的：失败、荒谬、以及荒诞的行为。在愚行被习以为常之前，把它们记录下来。

🌐 **官方网站 / 投稿系统:** [https://idiotjournal.org](https://idiotjournal.org) 

---

## 📜 为什么需要这本期刊？

在技术狂热达到顶峰的时代——每份新闻稿都承诺革命，每个管理者都在转发同一篇LinkedIn文章——批判性的声音不仅受欢迎，而且必需。

* **当所有人都说技术很伟大时，** 谁在研究它让我们变蠢的时刻？
* **当人类对机器做出难以解释的事情时，** 谁给这些行为一个正式的名字？
* **当炒作淹没了证据时，** 谁在坚持测量？
* **当荒谬被视为理所当然时，** 谁在我们忘记笑之前保存记录？

**答案是：我们。**

## 🎯 目标与范围 (Aims & Scope)

本刊欢迎以下八大领域的原创研究、综述、案例分析和理论贡献：

1.  **人类迷惑行为学 (Human Bewilderment Studies)**：技术迷信、数字拜物教、货物崇拜式计算。
2.  **AI荒唐行为学 (AI Absurdity Analysis)**：AI的幻觉、谄媚、计算性痴呆、以及“基准测试剧场”。
3.  **诊断与干预疗法 (Ruozhi Diagnosis & Intervention)**：识别、分类和治疗非理性技术行为的临床式框架。
4.  **组织管理荒诞学 (Management Ruozhi Studies)**：当CEO读了一篇博客就下令全公司转型（高管博客文综合征）。
5.  **商业荒诞学 (Commercial Absurdism)**：AI洗涤、气化软件、靠演示视频吹起的估值泡沫。
6.  **若智哲理 (Ruozhi Philosophy)**：对技术傲慢的哲学探究，从庄子到埃吕尔的智慧传统。
7.  **若智的治理与伦理 (Ruozhi Governance & Ethics)**：政策失败、监管荒谬、技术采纳中的伦理盲点。
8.  **若智典藏 (The Ruozhi Archives)**：精选的历史性技术愚行案例。为后人保存，为预防引用。

## 📝 投稿指南 (Submission Guidelines)

I.D.I.O.T. 采用**滚动投稿模式**，实行严格的**双盲同行评审**。

* **完全免费：** 免收文章处理费 (APC)，所有内容在 CC BY 4.0 协议下开放。
* **强制结构：** 论文必须遵循特定的“四章+附录”病理分析框架（详见官网模板）。
* **格式要求：** 接受 PDF 格式上传，使用 APA 第7版引用格式。
* **在线投递：** 请使用本站的“在线投稿工具”进行 Markdown 实时排版或直接上传 PDF。

## 🏛️ 招募编委会 (Call for Editors)

我们正在组建创始编委会。如果您是以下领域的学者或资深从业者：HCI（人机交互）、认知科学、AI伦理、STS（科学技术与社会）、组织行为学、技术哲学或行为经济学。

欢迎加入我们！请发送您的简历或学术主页至：
✉️ **[yuxuanzhu83@gmail.com](mailto:yuxuanzhu83@gmail.com)** 

---

## 💻 平台技术栈 (For Developers)

本刊的底层投递与评审系统完全开源。

* **Frontend:** React 19 + Vite + TypeScript
* **Backend:** Supabase (PostgreSQL + Auth + Storage)
* **PDF Processing:** `pdf-lib` (用于发表时的页眉/元数据自动注入)
* **Deployment:** Vercel

### 本地运行向导

```bash
git clone [https://github.com/ZhuYxuan-AHM/idiot-journal.git](https://github.com/ZhuYxuan-AHM/idiot-journal.git)
cd idiot-journal
npm install
npm run dev
