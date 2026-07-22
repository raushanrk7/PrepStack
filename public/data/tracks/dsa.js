// DSA — module structure (v3). Topics auto-derive from week notes via `from.week`.
(function () {
  window.PrepStackRegister.track("dsa", {
    name: "DSA — Data Structures & Algorithms",
    icon: "🧮",
    blurb: "Pattern-based DSA prep: arrays to graphs to dynamic programming, with curated practice sets.",
    modules: [
      { id: "arrays", title: "Arrays, Strings & Two Pointers", blurb: "Two pointers, sliding window, prefix sums, string patterns.", from: { week: 0 } },
      { id: "stacks-heaps", title: "Hashing, Stacks, Queues & Heaps", blurb: "Hash patterns, monotonic stack, deque, top-K heaps, intervals.", from: { week: 1 } },
      { id: "trees-graphs", title: "Trees, Graphs & Traversals", blurb: "DFS/BFS, BST, tries, topological sort, union-find, Dijkstra.", from: { week: 2 } },
      { id: "dp", title: "Dynamic Programming", blurb: "Memo vs tabulation, 1D/2D DP, knapsack family, string DP.", from: { week: 3 } }
    ]
  });
})();
