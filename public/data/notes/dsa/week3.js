// DSA — Week 4: Dynamic Programming.
(function () {
  window.PrepStackRegister.notes("dsa", 3, {
    concepts: `# Dynamic Programming

## The DP method
**TL;DR:** DP = recursion + caching of overlapping subproblems. Define the state precisely and the rest follows.

### The 5-step interview script
1. **State**: what does dp[i] (or dp[i][j]) MEAN? Say it in a sentence.
2. **Recurrence**: dp[i] in terms of smaller states — driven by "what's the last choice?"
3. **Base cases**.
4. **Order**: memoized top-down (write the recursion, add @cache) or tabulated bottom-up (fill smallest first).
5. **Answer location** + complexity (states × work per state).

### Memoization vs tabulation
- Top-down: natural to derive, only visits reachable states, recursion overhead/stack limits.
- Bottom-up: no recursion, enables **space optimization** (dp[i] depends only on dp[i-1] → keep two rows / two vars).

## 1D DP
- **Climbing Stairs / Fibonacci**: dp[i]=dp[i-1]+dp[i-2] — the hello world.
- **House Robber**: dp[i]=max(dp[i-1], dp[i-2]+num[i]) — take or skip. Circular version: run twice excluding first or last.
- **Coin Change (min coins)**: dp[a]=1+min(dp[a-c] for c in coins) — unbounded, O(amount·coins).
- **Word Break**: dp[i] = any dp[j] and s[j:i] in dict.
- **LIS**: O(n²) dp[i]=longest ending at i; O(n log n) patience version — tails array + binary search (know both).

## 2D / grid DP
- **Unique Paths / Min Path Sum**: dp[i][j] from top/left — rolling 1D row suffices.
- **Longest Common Subsequence**: match → 1+dp[i-1][j-1]; else max(drop one side). Edit Distance is the same table with three ops (insert/delete/replace) — both O(mn).
- Interval DP (harder): dp[l][r] over substrings — palindromic substrings, burst balloons; iterate by length.

## Knapsack family
**TL;DR:** Choose items under a budget — the most-reused DP shape.

- **0/1 knapsack** (each item once): dp[w]=max(dp[w], dp[w-wt]+val), iterate w **downward** so each item is used once.
- **Unbounded** (reuse allowed — coin change): iterate w upward.
- **Subset Sum / Partition Equal Subset**: 0/1 with booleans, target = total/2.
- **Count combinations vs permutations**: loop items outside, amount inside → combinations (Coin Change II); loops swapped → permutations (Combination Sum IV). This ordering subtlety is a favorite follow-up.

## String DP
- Palindromic substrings/longest: expand around 2n-1 centers (O(n²), O(1) space) usually beats the DP table.
- Longest Palindromic SUBSEQUENCE = LCS(s, reverse(s)).
- Decode Ways: dp[i] from one-digit (nonzero) and two-digit (10–26) takes — watch the '0' edge cases.

## Recognizing DP in the wild
- "How many ways", "min/max cost to reach", "longest/shortest sequence with property", "can you partition" → DP smells.
- Constraints hint the state: n ≤ 20 → bitmask; n ≤ 500 → O(n²) table; n ≤ 10⁵ → O(n) or O(n log n).
- Greedy vs DP: if a local exchange argument proves greedy safe (activity selection), skip DP; if choices interact across the future, DP.
`,
    qa: [
      { q: "What makes a problem DP-able?", a: "Optimal substructure (answer composes from subproblem answers) + overlapping subproblems (same states recur — caching pays). Without overlap it's plain divide & conquer." },
      { q: "Memoization vs tabulation — tradeoffs?", a: "Top-down: easier to derive, visits only needed states, but recursion depth/overhead. Bottom-up: iterative, cache-friendly, enables rolling-array space optimization; must get fill order right." },
      { q: "Why iterate weight DOWNWARD in 0/1 knapsack's 1D form?", a: "dp[w-wt] must reflect the PREVIOUS item row. Downward means it's still last-round's value (item used ≤ once); upward would let the same item be reused — which is exactly the unbounded variant." },
      { q: "Coin Change II vs Combination Sum IV — same numbers, different answers. Why?", a: "Loop order. Coins outer/amount inner counts each multiset once (combinations). Amount outer/coins inner counts every ordering (permutations). State the meaning of dp under each ordering." },
      { q: "LIS in O(n log n)?", a: "tails[k] = smallest possible tail of an increasing subsequence of length k+1. For each x, binary-search the first tail ≥ x and replace (or append). Length of tails = LIS length; tails is NOT the actual subsequence." },
      { q: "House Robber circular (first and last adjacent)?", a: "Answer = max(rob(houses[0..n-2]), rob(houses[1..n-1])) — the two linear cases 'skip last' and 'skip first'. Reduces new problem to solved one; O(n)." },
      { q: "Edit Distance recurrence?", a: "Equal chars: dp[i][j]=dp[i-1][j-1]. Else 1+min(dp[i-1][j] delete, dp[i][j-1] insert, dp[i-1][j-1] replace). Base: distance to empty string = length. O(mn) time, O(min(m,n)) space with rolling rows." },
      { q: "How do constraints hint the intended DP?", a: "n≤20 → bitmask/subset DP (2^n); n≤100–500 → O(n²)/O(n³) tables; n≤10⁵ → O(n log n) (LIS patience) or O(n) 1D DP. Reverse-engineer complexity from limits before designing." }
    ],
    mock: { easy: [], medium: [
      { q: "Coin Change (min coins) — full derivation.", a: "State dp[a] = min coins to make amount a. Recurrence dp[a]=1+min(dp[a-c]) over coins c≤a; base dp[0]=0, unreachable=∞. Bottom-up a:1→amount. O(amount·coins) time, O(amount) space. Return -1 if dp[amount] is ∞. Note greedy fails (coins 1,3,4, amount 6)." },
      { q: "Partition Equal Subset Sum — reduce and solve.", a: "Total odd → false. Else target=total/2; 0/1-knapsack boolean dp over items, w downward: dp[w] |= dp[w-num]. dp[0]=true. O(n·target) time, O(target) space (bitset trick for speed). It's subset-sum in disguise — say so." },
      { q: "Longest Palindromic Substring — compare approaches.", a: "1) Expand around each of 2n-1 centers: O(n²) time, O(1) space — the interview default. 2) DP table dp[l][r]: same time, O(n²) space. 3) Manacher's O(n) — name it, don't code it unasked. Track best (start,len) while expanding." },
      { q: "Burst Balloons — why is the state 'last balloon burst', and what's the recurrence?", a: "Thinking 'first burst' couples neighbors unpredictably; picking k as the LAST burst in (l,r) makes l and r its fixed neighbors. dp[l][r]=max over k of dp[l][k]+dp[k][r]+a[l]·a[k]·a[r], padded with 1s, iterate by interval length. O(n³). The classic interval-DP reframe." }
    ], hard: [] }
  });
})();
