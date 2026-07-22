// DSA — Week 3: Trees, Graphs & Traversals.
(function () {
  window.PrepStackRegister.notes("dsa", 2, {
    concepts: `# Trees, Graphs & Traversals

## Binary trees
**TL;DR:** Almost every tree problem is a traversal with per-node work — pick DFS or BFS, then decide what flows down (parameters) and up (return values).

### Traversals
- **DFS**: preorder (node,L,R — copy/serialize), inorder (L,node,R — sorted order in BST), postorder (L,R,node — compute from children: heights, delete).
- **BFS**: level order with a queue; loop level-size times per level. Right-side view, zigzag, level averages.
- Recursive DFS = clean; iterative with explicit stack = show you can (inorder: push left spine, pop, go right).

### The recursion design questions
1. What does the function return upward? (height, isBalanced, sum)
2. What flows downward as parameters? (path, bounds, target)
3. Where's the answer collected? (return value vs a shared best)
- **Diameter / max path sum**: postorder — return best single-arm to parent, update global with both arms. This "return arm, record arch" pattern solves a family of problems.

## Binary Search Trees
- Invariant: left subtree < node < right subtree — **entire subtrees**, not just children.
- **Validate BST**: pass (min,max) bounds down, or check inorder is strictly increasing.
- K-th smallest: inorder stops at k. Insert/delete/search: O(h) — O(log n) balanced, O(n) degenerate. LCA in BST: walk from root; split point (one target each side) is the answer.

## Tries
- Character-by-character tree for prefix queries: node = children map + isEnd flag.
- Insert/search O(L). Use for: autocomplete, word search on grids (prune by prefix), Word Search II, replace words.
\`\`\`
class TrieNode:
    def __init__(self):
        self.children = {}   # char -> TrieNode
        self.isEnd = False
\`\`\`

## Graphs
**TL;DR:** Model as adjacency list; then it's BFS (shortest hops / levels), DFS (reachability, components, cycles), topo sort (dependencies), or union-find (dynamic connectivity).

### Representations
- Adjacency list dict/array of neighbor lists — O(V+E) space, the default. Matrix only for dense or O(1) edge checks. Grid = implicit graph (4 neighbors).

### BFS vs DFS
- **BFS**: shortest path in UNWEIGHTED graphs (first arrival = fewest edges). Rotting oranges / multi-source: seed queue with all sources. 01-matrix distance.
- **DFS**: connected components, flood fill, cycle detection, path existence. Number of Islands: DFS/BFS sink each island, count launches.
- Mark visited WHEN ENQUEUING (BFS), not when dequeuing — else duplicates blow up the queue.

### Topological sort (DAG ordering)
- **Kahn's/BFS**: repeatedly remove indegree-0 nodes. Processed count < V → cycle. Course Schedule I/II.
- DFS variant: postorder reversed; back-edge to an in-progress (gray) node = cycle.

### Union-Find (Disjoint Set)
- find with path compression + union by rank → near-O(1) amortized (α(n)).
- Use when edges arrive incrementally or you only need "same component?": Redundant Connection, Accounts Merge, counting components, Kruskal's MST.
\`\`\`
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path compression
        x = parent[x]
    return x
\`\`\`

### Weighted shortest path (know the names)
- **Dijkstra** (non-negative weights): min-heap of (dist, node), O(E log V). Network Delay Time, Path With Minimum Effort.
- Bellman-Ford: negative edges, O(VE). Cheapest Flights ≤K stops = BFS/DP by edge-count layers.
`,
    qa: [
      { q: "Which traversal gives sorted order in a BST?", a: "Inorder (L, node, R) — by the BST invariant everything left is smaller, right is larger. Basis for k-th smallest and validate-by-monotone-inorder." },
      { q: "Why do BST validations with only child comparisons fail?", a: "The invariant binds whole subtrees: a right-grandchild can be < grandparent while > parent. Fix: pass (min,max) bounds down, tightening at each step, or check inorder monotonicity." },
      { q: "Diameter of a binary tree — the key trick?", a: "Postorder returning the best single arm (1 + max(L,R)) to the parent, while updating a global best with the arch (L + R + 1 nodes / L+R edges). Return-arm-record-arch generalizes to max path sum." },
      { q: "When BFS over DFS in a graph?", a: "Shortest path by edge count (unweighted), level-by-level processing, or spreading from multiple sources simultaneously (rotting oranges). DFS for components, cycles, and when path structure matters." },
      { q: "How does Kahn's algorithm detect a cycle?", a: "Nodes enter the queue only at indegree 0. A cycle's nodes never reach 0, so they're never processed — finished count < V ⇒ cycle. Doubles as Course Schedule's answer." },
      { q: "Union-Find vs DFS for connectivity?", a: "Static graph, one query pass → DFS is fine. Edges arriving over time or many same-component queries → union-find (path compression + rank ≈ O(1) per op, no re-traversal)." },
      { q: "Why must Dijkstra's weights be non-negative?", a: "Its greedy invariant — once popped, a node's distance is final — breaks if a later negative edge could shorten it. Negative edges → Bellman-Ford (or DAG relaxation in topo order)." },
      { q: "Trie vs hashmap of words?", a: "Hashmap: O(L) exact lookup only. Trie: shares prefixes (memory on common-prefix sets) and answers prefix queries — autocomplete, startsWith, wildcard search — which a hashmap can't do without scanning." }
    ],
    mock: { easy: [], medium: [
      { q: "Number of Islands — solve and state complexity.", a: "Scan grid; on each '1', increment count and sink the island (DFS/BFS flipping to '0' or visited). Each cell visited O(1) times → O(mn) time, O(mn) worst-case stack/queue. Follow-up: union-find version for dynamic land-adding (Islands II)." },
      { q: "Course Schedule II — return a valid order.", a: "Build adjacency + indegrees. Kahn's: queue all indegree-0, pop→append to order→decrement neighbors, enqueue new zeros. len(order)<V → cycle → return []. O(V+E). Mention DFS-postorder-reverse as the alternative." },
      { q: "Lowest Common Ancestor of a binary tree (not BST).", a: "Recurse: return node if it's null or matches a target; get L=solve(left), R=solve(right). Both non-null → current node is LCA; else bubble the non-null side up. O(n). Contrast with the BST walk-from-root O(h) version." },
      { q: "Word Search II (grid + word list) — why trie + DFS?", a: "Build a trie of the words; DFS each cell advancing a trie pointer — dead prefix prunes immediately, and one traversal finds all words (vs re-DFS per word). Mark found at isEnd nodes; unmark cells on backtrack; optionally prune exhausted trie leaves. O(cells · 4^maxLen) worst case, far better in practice." }
    ], hard: [] }
  });
})();
