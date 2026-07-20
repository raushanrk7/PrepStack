// DSA — Data Structures & Algorithms track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "Arrays, Strings & Two Pointers",
    days: [
      D("Array manipulation patterns", "https://neetcode.io/roadmap"),
      D("Two pointers technique", "https://neetcode.io/roadmap"),
      D("Sliding window technique", "https://neetcode.io/roadmap"),
      D("String manipulation & pattern matching", "https://neetcode.io/roadmap"),
      D("Prefix sums & difference arrays", "https://neetcode.io/roadmap"),
      D("Practice: 5 array/string problems (easy-medium)", "https://leetcode.com/problem-list/array/", "design"),
      D("Practice: 5 two-pointer/sliding-window problems", "https://leetcode.com/tag/two-pointers/", "design")
    ]
  };
  const week2 = {
    title: "Hashing, Stacks & Queues",
    days: [
      D("Hash maps & sets — patterns", "https://neetcode.io/roadmap"),
      D("Stack-based problems (monotonic stack)", "https://neetcode.io/roadmap"),
      D("Queue & deque patterns", "https://neetcode.io/roadmap"),
      D("Heaps / priority queues", "https://neetcode.io/roadmap"),
      D("Intervals problems", "https://neetcode.io/roadmap"),
      D("Practice: monotonic stack problems", "https://leetcode.com/tag/monotonic-stack/", "design"),
      D("Practice: heap/priority queue problems", "https://leetcode.com/tag/heap-priority-queue/", "design")
    ]
  };
  const week3 = {
    title: "Trees, Graphs & Traversals",
    days: [
      D("Binary trees — DFS/BFS traversals", "https://neetcode.io/roadmap"),
      D("Binary search trees", "https://neetcode.io/roadmap"),
      D("Tries", "https://neetcode.io/roadmap"),
      D("Graph representations & BFS/DFS", "https://neetcode.io/roadmap"),
      D("Topological sort & union-find", "https://neetcode.io/roadmap"),
      D("Practice: tree traversal problems", "https://leetcode.com/tag/binary-tree/", "design"),
      D("Practice: graph BFS/DFS problems", "https://leetcode.com/tag/graph/", "design")
    ]
  };
  const week4 = {
    title: "Dynamic Programming",
    days: [
      D("DP fundamentals: memoization vs tabulation", "https://neetcode.io/roadmap"),
      D("1D DP patterns (climbing stairs, house robber)", "https://neetcode.io/roadmap"),
      D("2D DP patterns (grid paths, edit distance)", "https://neetcode.io/roadmap"),
      D("Knapsack variants", "https://neetcode.io/roadmap"),
      D("String DP (LCS, palindromes)", "https://neetcode.io/roadmap"),
      D("Practice: DP problems set 1", "https://leetcode.com/tag/dynamic-programming/", "design"),
      D("Practice: DP problems set 2", "https://leetcode.com/tag/dynamic-programming/", "design")
    ]
  };

  window.PrepStackRegister.track("dsa", {
    name: "DSA — Data Structures & Algorithms",
    icon: "🧮",
    blurb: "Pattern-based DSA prep: arrays to graphs to dynamic programming, with curated practice sets.",
    durations: {
      4: [week1, week2, week3, week4],
      6: [week1, week2, week3, week4, { ...week3, title: "Advanced Graphs & Backtracking" }, { ...week4, title: "DP Review & Mixed Mock" }],
      8: [week1, week2, week3, week4, { ...week1, title: "Binary Search & Sorting" }, { ...week3, title: "Advanced Graphs & Backtracking" }, { ...week4, title: "Greedy & Bit Manipulation" }, { ...week4, title: "Mixed Mock Review" }]
    }
  });
})();
