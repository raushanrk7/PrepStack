// DSA — Week 1: Arrays, Strings & Two Pointers.
(function () {
  window.PrepStackRegister.notes("dsa", 0, {
    concepts: `# Arrays, Strings & Two Pointers

## Core array patterns
**TL;DR:** Most easy/medium array problems reduce to a handful of reusable patterns — learn the pattern, not the problem.

### Recognize the pattern from the ask
- "Subarray sum / count" → prefix sums or sliding window
- "Sorted array + pair/target" → two pointers
- "Longest/shortest window satisfying X" → sliding window
- "In-place rearrange" → swap with pointer partitioning (Dutch flag)
- "Next greater/smaller element" → monotonic stack (week 2)

## Two pointers
**TL;DR:** Two indices moving with purpose — O(n) instead of O(n²) nested loops.

### Variants
- **Opposite ends** (sorted): pair-sum — sum too small → left++, too big → right--. Two Sum II, 3Sum, Container With Most Water.
- **Fast & slow**: cycle detection (Floyd), middle of linked list, remove-duplicates in place.
- **Same direction / writer-reader**: reader scans, writer marks the next slot to fill — in-place filtering (Move Zeroes, Remove Element).

\`\`\`
# 3Sum core: sort, fix i, two-pointer the rest; skip duplicates
nums.sort()
for i in range(n - 2):
    if i and nums[i] == nums[i-1]: continue
    l, r = i + 1, n - 1
    while l < r:
        s = nums[i] + nums[l] + nums[r]
        if s < 0: l += 1
        elif s > 0: r -= 1
        else: record; advance l,r past duplicates
\`\`\`

## Sliding window
**TL;DR:** A window [l, r] that grows on the right and shrinks on the left, maintaining an invariant. Each index enters/leaves once → O(n).

### Fixed vs variable
- **Fixed size k**: max sum of k elements — add entering, subtract leaving.
- **Variable**: expand r; while invariant broken, shrink l. Longest Substring Without Repeating Chars, Min Window Substring.

\`\`\`
# Longest substring without repeats
seen = {}; l = 0; best = 0
for r, ch in enumerate(s):
    if ch in seen and seen[ch] >= l:
        l = seen[ch] + 1          # jump left past the duplicate
    seen[ch] = r
    best = max(best, r - l + 1)
\`\`\`
Rule: window answers "longest/shortest contiguous run satisfying a condition" — if the condition isn't monotonic with window growth, plain sliding window breaks (needs deque tricks).

## Prefix sums & difference arrays
- **Prefix**: P[i] = sum of first i elements → range sum [l,r] = P[r+1]-P[l] in O(1).
- **Prefix + hashmap**: count subarrays with sum k — for each P[r], add count of P[r]-k seen so far. (Subarray Sum Equals K.)
- **Difference array**: apply many range updates lazily — diff[l]+=v, diff[r+1]-=v, prefix-sum once at the end.

## String essentials
- Strings are arrays — every pattern above applies.
- **Anagram checks**: 26-count array beats sorting (O(n) vs O(n log n)).
- **Palindromes**: two pointers from ends; or expand-around-center for longest palindromic substring (O(n²) is accepted).
- Know your language's cost model: string concat in a loop is O(n²) in Java/Python (immutable) — use a builder/list-join.

## Complexity quick table
| Approach | Time | When |
|---|---|---|
| Brute nested loops | O(n²) | baseline, mention then beat it |
| Two pointers (sorted) | O(n log n) sort + O(n) | pairs/triples with target |
| Sliding window | O(n) | contiguous window condition |
| Prefix + hashmap | O(n) | subarray sums/counts |
`,
    qa: [
      { q: "When do two pointers beat a hashmap for pair-sum?", a: "Sorted input (or sorting allowed): two pointers use O(1) space vs the hashmap's O(n); hashmap wins on unsorted data you can't sort (needs original indices) at O(n) time, O(n) space." },
      { q: "How do you avoid duplicate triples in 3Sum?", a: "Sort first; skip i when nums[i]==nums[i-1]; after finding a match, advance l and r past all equal values. Sorting makes duplicates adjacent so skipping is O(1)." },
      { q: "Why is sliding window O(n) despite the nested while loop?", a: "Amortized: each index is added by r once and removed by l at most once — total pointer movement ≤ 2n. Bound the pointer movements, not the loop nesting." },
      { q: "Fixed vs variable sliding window — one example each?", a: "Fixed: max sum of any k consecutive elements (slide, add/subtract edges). Variable: longest substring without repeating characters (expand right, contract left on violation)." },
      { q: "Count subarrays summing to k (negatives allowed) — approach?", a: "Prefix sums + hashmap of counts: for each prefix P, answer += count[P-k], then count[P]++. O(n). Sliding window fails here because negatives break monotonicity." },
      { q: "Fast & slow pointers — what do they solve?", a: "Cycle detection (they meet iff a cycle exists — Floyd), cycle start (reset one to head, advance both by 1), middle of list (fast 2x), and by extension Happy Number / Find Duplicate Number." },
      { q: "When would you use a difference array?", a: "Many range updates, one final read: flight bookings, meeting-room load. Each update O(1) (diff[l]+=v, diff[r+1]-=v); one prefix pass materializes the result. m updates: O(n+m) vs O(n·m)." },
      { q: "Check if two strings are anagrams — optimal?", a: "26-int count array (or hashmap for unicode): increment for one string, decrement for the other, all zeros = anagram. O(n) time, O(1) space; beats sorting's O(n log n)." }
    ],
    mock: { easy: [], medium: [
      {
        q: "Trapping Rain Water — derive the two-pointer solution.",
        a: "Water at i = min(maxLeft, maxRight) - h[i]. Two pointers with running maxes: whichever side's max is smaller is the binding constraint, so process and advance that side. **O(n) time, O(1) space** vs the prefix-array O(n)-space version.",
        code: [
          { lang: "cpp", src:
`int trap(vector<int>& h) {
    int l = 0, r = h.size() - 1, lMax = 0, rMax = 0, water = 0;
    while (l < r) {
        if (h[l] < h[r]) {              // left is the binding side
            lMax = max(lMax, h[l]);
            water += lMax - h[l];
            l++;
        } else {
            rMax = max(rMax, h[r]);
            water += rMax - h[r];
            r--;
        }
    }
    return water;
}` },
          { lang: "java", src:
`int trap(int[] h) {
    int l = 0, r = h.length - 1, lMax = 0, rMax = 0, water = 0;
    while (l < r) {
        if (h[l] < h[r]) {
            lMax = Math.max(lMax, h[l]);
            water += lMax - h[l];
            l++;
        } else {
            rMax = Math.max(rMax, h[r]);
            water += rMax - h[r];
            r--;
        }
    }
    return water;
}` }
        ],
        video: { name: "NeetCode — Trapping Rain Water", link: "https://www.youtube.com/watch?v=ZI2z5pq0TqA" }
      },
      {
        q: "Minimum Window Substring — outline the algorithm.",
        a: "Need-count hashmap of t; expand r consuming needs, track 'missing'; when missing==0 contract l while window stays valid, recording the best. Each pointer moves ≤ n. **O(|s|+|t|)**. Classic variable window with a satisfaction counter.",
        code: [
          { lang: "cpp", src:
`string minWindow(string s, string t) {
    unordered_map<char,int> need;
    for (char c : t) need[c]++;
    int missing = t.size(), l = 0, start = 0, best = INT_MAX;
    for (int r = 0; r < (int)s.size(); r++) {
        if (need[s[r]]-- > 0) missing--;         // consumed a needed char
        while (missing == 0) {                   // window valid — try shrinking
            if (r - l + 1 < best) { best = r - l + 1; start = l; }
            if (++need[s[l]] > 0) missing++;      // l char becomes needed again
            l++;
        }
    }
    return best == INT_MAX ? "" : s.substr(start, best);
}` }
        ],
        video: { name: "NeetCode — Minimum Window Substring", link: "https://www.youtube.com/watch?v=jSto0O4LJbs" }
      },
      {
        q: "Product of Array Except Self, no division, O(1) extra space.",
        a: "Output array = prefix products left-to-right; second pass right-to-left multiplies a running suffix product into each slot. Two passes, **O(n)**, output array doesn't count as extra space.",
        code: [
          { lang: "cpp", src:
`vector<int> productExceptSelf(vector<int>& a) {
    int n = a.size();
    vector<int> res(n, 1);
    for (int i = 1; i < n; i++) res[i] = res[i-1] * a[i-1];  // prefix
    int suf = 1;
    for (int i = n - 1; i >= 0; i--) { res[i] *= suf; suf *= a[i]; }
    return res;
}` }
        ],
        video: { name: "NeetCode — Product of Array Except Self", link: "https://www.youtube.com/watch?v=bNvIQI2wAjk" }
      }
    ], hard: [] }
  });
})();
