// Famous interview sheets & global prep resources, categorized with "what it covers" descriptions.
// Rendered grouped on the track-level Resources tab (r.category → section, r.desc → subtitle).
(function () {
  const R = window.PrepStackRegister;

  // ---------- DSA: the famous sheets ----------
  R.resources("dsa", [
    {
      category: "Famous Sheets",
      name: "Striver SDE Sheet (191)",
      desc: "191 most-asked problems, topic-wise (arrays → graphs → DP). The standard 1–2 month interview sprint.",
      link: "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/",
      type: "practice", by: "Striver"
    },
    {
      category: "Famous Sheets",
      name: "Striver A2Z Sheet (455)",
      desc: "Full beginner-to-advanced course order: every pattern with theory links. Pick this if starting from scratch.",
      link: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/",
      type: "practice", by: "Striver"
    },
    {
      category: "Famous Sheets",
      name: "Blind 75",
      desc: "The classic minimum set: 75 problems covering every core pattern. Best bang-per-problem for limited time.",
      link: "https://leetcode.com/problem-list/oizxjoit/",
      type: "practice", by: "LeetCode"
    },
    {
      category: "Famous Sheets",
      name: "NeetCode 150",
      desc: "Blind 75 + 75 more, each with a free video solution. Best when you want an explained walkthrough per problem.",
      link: "https://neetcode.io/practice",
      type: "practice", by: "NeetCode"
    },
    {
      category: "Famous Sheets",
      name: "Grind 75",
      desc: "Blind 75 author's newer list — generates a week-by-week schedule from your available hours.",
      link: "https://www.techinterviewhandbook.org/grind75/",
      type: "practice", by: "Tech Interview Handbook"
    },
    {
      category: "Famous Sheets",
      name: "Love Babbar 450",
      desc: "Exhaustive 450-question GFG-heavy sheet. Good as a question bank per topic, heavy as a linear path.",
      link: "https://www.geeksforgeeks.org/dsa/dsa-sheet-by-love-babbar/",
      type: "practice", by: "GeeksforGeeks"
    },
    {
      category: "Famous Sheets",
      name: "Striver 79 (last-minute)",
      desc: "79-problem revision sheet for the final 1–2 weeks before interviews — assumes you've prepped before.",
      link: "https://takeuforward.org/interview-sheets/strivers-79-last-moment-dsa-sheet-ace-interviews/",
      type: "practice", by: "Striver"
    },
    {
      category: "Company-wise",
      name: "LeetCode company tags",
      desc: "Problems tagged by company + frequency (Google, Amazon, Meta…). Frequency sort needs Premium.",
      link: "https://leetcode.com/company/",
      type: "practice", by: "LeetCode"
    },
    {
      category: "Company-wise",
      name: "Company-wise LeetCode lists (GitHub)",
      desc: "Free community-maintained CSVs of company-wise questions from LeetCode, updated periodically.",
      link: "https://github.com/krishnadey30/LeetCode-Questions-CompanyWise",
      type: "practice", by: "GitHub"
    },
    {
      category: "Company-wise",
      name: "GFG company preparation",
      desc: "Per-company interview experiences, most-asked questions, and prep guides.",
      link: "https://www.geeksforgeeks.org/company-preparation/",
      type: "article", by: "GeeksforGeeks"
    }
  ]);

  // ---------- HLD: global design resources ----------
  R.resources("hld", [
    {
      category: "Famous Sheets",
      name: "System Design Primer",
      desc: "The most-starred system design repo: every building block + solved designs with diagrams.",
      link: "https://github.com/donnemartin/system-design-primer",
      type: "article", by: "GitHub"
    },
    {
      category: "Famous Sheets",
      name: "ByteByteGo newsletter/diagrams",
      desc: "Alex Xu's visual explainers — the diagrams style interviewers expect on the whiteboard.",
      link: "https://blog.bytebytego.com/",
      type: "article", by: "ByteByteGo"
    },
    {
      category: "Company-wise",
      name: "Engineering blogs list",
      desc: "Real-world architectures from Netflix, Uber, Stripe… — quote these in interviews for credibility.",
      link: "https://github.com/kilimchoi/engineering-blogs",
      type: "article", by: "GitHub"
    }
  ]);

  // ---------- LLD ----------
  R.resources("lld", [
    {
      category: "Famous Sheets",
      name: "Awesome Low Level Design",
      desc: "Curated LLD repo: OOD interview questions (parking lot, splitwise…) with solutions in multiple languages.",
      link: "https://github.com/ashishps1/awesome-low-level-design",
      type: "article", by: "GitHub"
    },
    {
      category: "Famous Sheets",
      name: "Refactoring Guru — Design Patterns",
      desc: "All 23 GoF patterns with diagrams, when-to-use, and code. The canonical patterns reference.",
      link: "https://refactoring.guru/design-patterns",
      type: "article", by: "Refactoring Guru"
    }
  ]);

  // ---------- Practice platforms + more sheets (community-shared, curated) ----------
  R.resources("hld", [
    {
      category: "Practice Platforms",
      name: "Hello Interview",
      desc: "Free 'System Design in a Hurry' guides + AI-driven mock interviews. One of the best free SD prep sites.",
      link: "https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction",
      type: "practice", by: "Hello Interview"
    },
    {
      category: "Practice Platforms",
      name: "Codemia — System Design",
      desc: "System-design practice problems with structured feedback, LeetCode-style but for architecture.",
      link: "https://codemia.io/system-design",
      type: "practice", by: "Codemia"
    },
    {
      category: "Video Courses",
      name: "sudoCODE — playlists",
      desc: "Full HLD/LLD playlists (fundamentals → case studies). One of the preferred channels for depth.",
      link: "https://www.youtube.com/@sudocode/playlists",
      type: "video", by: "sudoCODE"
    }
  ]);

  R.resources("dsa", [
    {
      category: "Famous Sheets",
      name: "AlgoMaster 75",
      desc: "Pattern-first 75-problem sheet grouped by technique (sliding window, two pointers…). Great for pattern recognition.",
      link: "https://algomaster.io/practice/dsa-patterns?tab=am-75",
      type: "practice", by: "AlgoMaster"
    },
    {
      category: "Community",
      name: "r/leetcode master resource list",
      desc: "Community-aggregated list of prep resources. A discovery starting point — note: Reddit posts can go stale.",
      link: "https://www.reddit.com/r/leetcode/comments/yrql9i/somebody_asked_me_to_make_this_resource_list/",
      type: "article", by: "Reddit"
    }
  ]);
})();
