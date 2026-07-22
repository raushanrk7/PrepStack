// DSA — Week 2: Hashing, Stacks, Queues, Heaps & Intervals.
(function () {
  window.PrepStackRegister.notes("dsa", 1, {
    concepts: `# Hashing, Stacks, Queues, Heaps & Intervals

## Hash maps & sets
**TL;DR:** Trade O(n) space for O(1) lookup — the most common O(n²)→O(n) upgrade.

### Patterns
- **Complement lookup**: Two Sum — for each x, is target-x already seen?
- **Grouping by canonical key**: Group Anagrams — key = sorted string or 26-count tuple.
- **Seen-set**: detect duplicates/cycles; Longest Consecutive Sequence — only start counting when x-1 not in set (each element visited twice → O(n)).
- **Frequency map**: top-K, majority element, valid anagram.
Collisions: know that worst case degrades to O(n) per op; Java treeifies buckets, Python uses open addressing. Say "expected O(1)".

## Monotonic stack
**TL;DR:** A stack kept sorted (increasing or decreasing) by popping violators — answers "next greater/smaller element" in O(n).

### Template & uses
\`\`\`
# Next greater element to the right
stack = []            # holds indices, values decreasing
for i, x in enumerate(nums):
    while stack and nums[stack[-1]] < x:
        j = stack.pop()
        ans[j] = x    # x is j's next greater
    stack.append(i)
\`\`\`
- Daily Temperatures, Next Greater Element, Stock Span.
- **Largest Rectangle in Histogram**: increasing stack; on pop, width = i - stack[-1] - 1.
- Each index pushed/popped once → O(n) despite the inner while.

### Classic stack problems
- Valid Parentheses (push open, match close), Min Stack (pair each entry with running min), evaluate RPN, decode string \`3[a2[c]]\` (two stacks: counts + strings).

## Queues & deques
- **Queue**: BFS ordering (week 3), rate-limiter sliding logs.
- **Monotonic deque**: Sliding Window Maximum — front holds the max's index; pop back while smaller than incoming, pop front when it leaves the window. O(n).

## Heaps / priority queues
**TL;DR:** O(log n) insert/extract of the min (or max) — for "K-th", "top K", "merge K", and streaming problems.

### The K-pattern rule
- **Top K largest → min-heap of size K** (evict the smallest; what remains is the top K). O(n log K).
- K-th largest in a stream: keep the same size-K min-heap; root is the answer.
- **Merge K sorted lists**: heap of (head value, list index) — pop min, push its successor. O(N log K).
- **Two heaps**: running median — max-heap of lower half + min-heap of upper half, rebalance to sizes n and n or n+1.
- Heapify is O(n), not O(n log n) — mention it.

## Intervals
**TL;DR:** Sort by start (usually), then sweep, comparing each interval with the last kept one.

- **Overlap test**: a.start ≤ b.end and b.start ≤ a.end. Merged end = max of ends.
- **Merge Intervals**: sort by start; extend current if overlap else push new.
- **Non-overlapping intervals (min removals)**: sort by END, greedily keep earliest-ending — classic exchange-argument greedy.
- **Meeting Rooms II (min rooms)**: sort starts and ends separately, two pointers; or min-heap of end times — heap size = rooms in use.
- **Sweep line**: convert to (+1 at start, -1 at end) events, sort, running sum = concurrent count.
`,
    qa: [
      { q: "Longest Consecutive Sequence in O(n) — how?", a: "Put all in a set. For each x with x-1 NOT in the set (sequence start), walk x+1, x+2… counting. Every element is visited at most twice, so O(n) despite the inner loop." },
      { q: "When do you reach for a monotonic stack?", a: "Any 'next/previous greater/smaller element' question, stock span, daily temperatures, histogram rectangle. Signal phrase: an element's answer depends on the nearest bigger/smaller neighbor." },
      { q: "Why is the monotonic stack O(n)?", a: "Each index is pushed once and popped at most once, so total work across all iterations of the inner while is ≤ n. Same amortized argument as sliding window." },
      { q: "Top 10 largest of 1M items — which heap and why?", a: "MIN-heap of size 10: if incoming > root, pop root, push it. O(n log 10). A max-heap of all items is O(n) space and O(n + 10 log n) — fine but the size-K min-heap generalizes to streams." },
      { q: "How does Min Stack support getMin in O(1)?", a: "Store (value, minSoFar) pairs — each entry remembers the min at its depth; pop restores the previous min automatically. Or keep a second stack pushed only when a new min arrives." },
      { q: "Sliding Window Maximum — why a deque, not a heap?", a: "Deque keeps indices in decreasing value order: front is always the window max; expired indices pop from front, dominated values pop from back — strict O(n). Heap works but is O(n log n) with lazy deletion of stale entries." },
      { q: "Running median of a stream?", a: "Two heaps: max-heap for the lower half, min-heap for the upper. Push to one, rebalance so sizes differ ≤1. Median = root of bigger heap (or average of both roots). O(log n) per insert, O(1) query." },
      { q: "Min meeting rooms — two approaches?", a: "1) Sort starts and ends separately; sweep with two pointers — a meeting starting before the earliest end needs a new room. 2) Min-heap of end times: reuse the room if earliest end ≤ new start; heap's max size = answer. Both O(n log n)." }
    ],
    mock: { easy: [], medium: [
      { q: "Largest Rectangle in Histogram — walk through the stack solution.", a: "Maintain an increasing-height stack of indices. When h[i] < stack top, pop: height = popped bar, right boundary = i, left boundary = new stack top → width = i - stack[-1] - 1; track max area. Append sentinel 0 to flush. Each bar pushed/popped once → O(n)." },
      { q: "LRU Cache — design with O(1) get and put.", a: "Hashmap key→node + doubly-linked list in recency order. get: move node to head. put: insert/update at head; if over capacity evict tail. All ops O(1). (In Java, LinkedHashMap with accessOrder does this natively — say so, then implement manually.)" },
      { q: "Merge K sorted lists — compare approaches.", a: "1) Min-heap of K heads: O(N log K), the standard. 2) Pairwise divide-and-conquer merging: also O(N log K), no heap. 3) Concatenate + sort: O(N log N) — simpler, worse. State N=total nodes and justify heap entry = (val, listIdx, node)." }
    ], hard: [] }
  });
})();
