// DSA — per-week study plan + curated videos (NeetCode, Abdul Bari, Striver).
(function () {
  const R = window.PrepStackRegister;
  const yt = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

  const plan = (order, outcome, drill) => [
    "## How to attack this week",
    "1. **Learn the pattern** (one video), then read Concepts for the template.",
    "2. **Solve 3 problems per pattern**: 1 guided, 2 cold with a 25-min timer.",
    "3. **Q&A aloud** — complexity answers must be instant.",
    "4. Log every miss in My Notes with the trigger you failed to spot.",
    "",
    "**Order:** " + order,
    "",
    "**You're done when:** " + outcome,
    "",
    "**Drill:** " + drill
  ].join("\n");

  R.notes("dsa", 0, {
    plan: plan(
      "two pointers → sliding window → prefix sums → string patterns",
      "given a fresh problem you can name the pattern within 2 minutes from the constraint/ask shape.",
      "3Sum, Longest Substring Without Repeats, Product Except Self, Trapping Rain Water — cold."
    ),
    resources: [
      { name: "Two pointers pattern", link: yt("neetcode two pointers"), type: "video", by: "NeetCode" },
      { name: "Sliding window pattern", link: yt("neetcode sliding window"), type: "video", by: "NeetCode" },
      { name: "Striver A2Z sheet (arrays)", link: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/", type: "practice", by: "Striver" },
      { name: "NeetCode roadmap", link: "https://neetcode.io/roadmap", type: "practice", by: "NeetCode" },
      { name: "Practice: LeetCode — Two Pointers", link: "https://leetcode.com/tag/two-pointers/", type: "practice", by: "LeetCode" },
      { name: "Practice: LeetCode — Sliding Window", link: "https://leetcode.com/tag/sliding-window/", type: "practice", by: "LeetCode" },
      { name: "Theory: GFG — Arrays", link: "https://www.geeksforgeeks.org/array-data-structure-guide/", type: "article", by: "GeeksforGeeks" },
      { name: "Theory: GFG — Sliding Window technique", link: "https://www.geeksforgeeks.org/window-sliding-technique/", type: "article", by: "GeeksforGeeks" }
    ]
  });

  R.notes("dsa", 1, {
    plan: plan(
      "hashmap patterns → monotonic stack → deque → heaps (top-K) → intervals",
      "you reach for size-K min-heap and monotonic stack without prompting when the trigger phrases appear.",
      "Daily Temperatures, Largest Rectangle, K Closest Points, Merge Intervals, LRU Cache — cold."
    ),
    resources: [
      { name: "Monotonic stack explained", link: yt("neetcode monotonic stack daily temperatures"), type: "video", by: "NeetCode" },
      { name: "Heap / priority queue patterns", link: yt("neetcode heap top k elements"), type: "video", by: "NeetCode" },
      { name: "Heaps theory (build-heap O(n))", link: yt("abdul bari heap sort"), type: "video", by: "Abdul Bari" },
      { name: "Intervals pattern", link: yt("neetcode merge intervals"), type: "video", by: "NeetCode" },
      { name: "Practice: LeetCode — Stack", link: "https://leetcode.com/tag/stack/", type: "practice", by: "LeetCode" },
      { name: "Practice: LeetCode — Heap (Priority Queue)", link: "https://leetcode.com/tag/heap-priority-queue/", type: "practice", by: "LeetCode" },
      { name: "Theory: GFG — Stack", link: "https://www.geeksforgeeks.org/stack-data-structure/", type: "article", by: "GeeksforGeeks" },
      { name: "Theory: GFG — Heap", link: "https://www.geeksforgeeks.org/heap-data-structure/", type: "article", by: "GeeksforGeeks" }
    ]
  });

  R.notes("dsa", 2, {
    plan: plan(
      "tree DFS/BFS → BST properties → tries → graph BFS/DFS → topo sort → union-find → Dijkstra",
      "you can code BFS, DFS, topo sort, and union-find templates from memory in under 5 min each.",
      "Number of Islands, Course Schedule II, LCA, Word Search II, Network Delay Time — cold."
    ),
    resources: [
      { name: "Graph algorithms playlist", link: yt("striver graph series"), type: "video", by: "Striver" },
      { name: "Tree patterns (DFS/BFS)", link: yt("neetcode binary tree"), type: "video", by: "NeetCode" },
      { name: "Dijkstra & shortest paths theory", link: yt("abdul bari dijkstra algorithm"), type: "video", by: "Abdul Bari" },
      { name: "Union-Find explained", link: yt("neetcode union find"), type: "video", by: "NeetCode" },
      { name: "Practice: LeetCode — Tree", link: "https://leetcode.com/tag/tree/", type: "practice", by: "LeetCode" },
      { name: "Practice: LeetCode — Graph (BFS/DFS)", link: "https://leetcode.com/tag/breadth-first-search/", type: "practice", by: "LeetCode" },
      { name: "Theory: GFG — Binary Tree", link: "https://www.geeksforgeeks.org/binary-tree-data-structure/", type: "article", by: "GeeksforGeeks" },
      { name: "Theory: GFG — Graph algorithms", link: "https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/", type: "article", by: "GeeksforGeeks" }
    ]
  });

  R.notes("dsa", 3, {
    plan: plan(
      "memo vs tabulation → 1D DP → 2D/LCS family → knapsack (0/1 vs unbounded) → string DP",
      "for any DP you can state dp[i]'s meaning in one sentence before writing code — and spot knapsack in disguise.",
      "Coin Change, House Robber II, LCS, Partition Equal Subset, Longest Palindromic Substring — cold."
    ),
    resources: [
      { name: "DP playlist (patterns first)", link: yt("striver dynamic programming series"), type: "video", by: "Striver" },
      { name: "DP on LeetCode walkthroughs", link: yt("neetcode dynamic programming"), type: "video", by: "NeetCode" },
      { name: "DP theory (LCS, knapsack derivations)", link: yt("abdul bari dynamic programming"), type: "video", by: "Abdul Bari" },
      { name: "Practice: LeetCode — Dynamic Programming", link: "https://leetcode.com/tag/dynamic-programming/", type: "practice", by: "LeetCode" },
      { name: "Practice: LeetCode DP study plan", link: "https://leetcode.com/studyplan/dynamic-programming/", type: "practice", by: "LeetCode" },
      { name: "Theory: GFG — Dynamic Programming", link: "https://www.geeksforgeeks.org/dynamic-programming/", type: "article", by: "GeeksforGeeks" }
    ]
  });
})();
