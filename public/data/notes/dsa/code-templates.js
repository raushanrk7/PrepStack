// DSA — C++/Java code templates + STL/Collections toolkit. Each `##` becomes a Topic in the
// matching module, each `###` a Lesson. Canonical interview patterns, written for recall.
(function () {
  const R = window.PrepStackRegister;

  // ---------- Week 0 (Arrays module): STL toolkit + array pattern templates ----------
  R.notes("dsa", 0, {
    concepts: `
## C++ STL & Java Collections Toolkit

The 20% of syntax you use in 95% of interview solutions. Drill until typing is automatic.

### Vectors / ArrayList & Strings

\`\`\`cpp
vector<int> v = {3,1,2};
v.push_back(4);            // O(1) amortized
v.pop_back();
sort(v.begin(), v.end());                    // ascending
sort(v.rbegin(), v.rend());                  // descending
reverse(v.begin(), v.end());
int mx = *max_element(v.begin(), v.end());
string s = "abc"; s += 'd'; s.substr(1, 2);  // "bc"
to_string(42); stoi("42");
\`\`\`

\`\`\`java
List<Integer> v = new ArrayList<>(List.of(3,1,2));
v.add(4); v.remove(v.size()-1);
Collections.sort(v);
Collections.sort(v, Collections.reverseOrder());
int mx = Collections.max(v);
String s = "abc" + "d"; s.substring(1, 3);   // "bc"
String.valueOf(42); Integer.parseInt("42");
\`\`\`

### Custom sort / comparators

\`\`\`cpp
// sort pairs by second desc, then first asc
sort(v.begin(), v.end(), [](auto& a, auto& b){
    if (a.second != b.second) return a.second > b.second;
    return a.first < b.first;
});
\`\`\`

\`\`\`java
list.sort((a, b) -> {
    if (a[1] != b[1]) return b[1] - a[1];   // second desc
    return a[0] - b[0];                     // first asc
});
\`\`\`

### HashMap / HashSet / ordered maps

\`\`\`cpp
unordered_map<string,int> cnt;         // avg O(1)
cnt["apple"]++;                        // missing key auto-inits to 0
if (cnt.count("apple")) { ... }
map<int,int> ordered;                  // red-black tree, O(log n), sorted keys
unordered_set<int> seen; seen.insert(5); seen.count(5);
\`\`\`

\`\`\`java
Map<String,Integer> cnt = new HashMap<>();
cnt.merge("apple", 1, Integer::sum);   // or getOrDefault
TreeMap<Integer,Integer> ordered = new TreeMap<>(); // sorted, O(log n)
Set<Integer> seen = new HashSet<>(); seen.add(5); seen.contains(5);
\`\`\`

### Stack, Queue, Deque, PriorityQueue

\`\`\`cpp
stack<int> st; st.push(1); st.top(); st.pop();
queue<int> q; q.push(1); q.front(); q.pop();
deque<int> dq; dq.push_front(1); dq.push_back(2);
priority_queue<int> maxHeap;                              // default MAX-heap
priority_queue<int, vector<int>, greater<int>> minHeap;   // min-heap
\`\`\`

\`\`\`java
Deque<Integer> st = new ArrayDeque<>(); st.push(1); st.peek(); st.pop();
Queue<Integer> q = new ArrayDeque<>(); q.offer(1); q.peek(); q.poll();
PriorityQueue<Integer> minHeap = new PriorityQueue<>();               // default MIN-heap
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
\`\`\`

**Gotcha to say out loud:** C++ \`priority_queue\` defaults to a **max**-heap; Java \`PriorityQueue\` defaults to a **min**-heap. Interviewers love this mix-up.

## Array Pattern Templates (C++/Java)

One template per pattern — memorize the skeleton, adapt the condition.

### Two pointers (sorted array)

\`\`\`cpp
int l = 0, r = n - 1;
while (l < r) {
    int sum = a[l] + a[r];
    if (sum == target) return {l, r};
    sum < target ? l++ : r--;
}
\`\`\`

\`\`\`java
int l = 0, r = n - 1;
while (l < r) {
    int sum = a[l] + a[r];
    if (sum == target) return new int[]{l, r};
    if (sum < target) l++; else r--;
}
\`\`\`

**Trigger:** sorted input, pair/triplet with condition. O(n) after O(n log n) sort.

### Sliding window (variable size)

\`\`\`cpp
unordered_map<char,int> win;
int l = 0, best = 0;
for (int r = 0; r < n; r++) {
    win[s[r]]++;
    while (/* window invalid, e.g. */ win[s[r]] > 1) {
        win[s[l]]--; l++;
    }
    best = max(best, r - l + 1);
}
\`\`\`

\`\`\`java
Map<Character,Integer> win = new HashMap<>();
int l = 0, best = 0;
for (int r = 0; r < n; r++) {
    win.merge(s.charAt(r), 1, Integer::sum);
    while (win.get(s.charAt(r)) > 1) {
        win.merge(s.charAt(l), -1, Integer::sum); l++;
    }
    best = Math.max(best, r - l + 1);
}
\`\`\`

**Trigger:** "longest/shortest substring/subarray with property". Each index enters and leaves once → O(n).

### Prefix sum + hashmap

\`\`\`cpp
// count subarrays summing to k (LC 560)
unordered_map<long long,int> seen{{0,1}};
long long run = 0; int ans = 0;
for (int x : a) {
    run += x;
    if (seen.count(run - k)) ans += seen[run - k];
    seen[run]++;
}
\`\`\`

\`\`\`java
Map<Long,Integer> seen = new HashMap<>(); seen.put(0L, 1);
long run = 0; int ans = 0;
for (int x : a) {
    run += x;
    ans += seen.getOrDefault(run - k, 0);
    seen.merge(run, 1, Integer::sum);
}
\`\`\`

**Trigger:** "number of subarrays with sum k" — prefix[j] - prefix[i] = k ⇒ look up prefix[j] - k.
`
  });

  // ---------- Week 1 (Stacks/Heaps module) ----------
  R.notes("dsa", 1, {
    concepts: `
## Stack & Heap Templates (C++/Java)

### Monotonic stack (next greater element)

\`\`\`cpp
// indices of next warmer day (LC 739)
stack<int> st;  // holds indices, temps decreasing
vector<int> ans(n, 0);
for (int i = 0; i < n; i++) {
    while (!st.empty() && t[i] > t[st.top()]) {
        ans[st.top()] = i - st.top(); st.pop();
    }
    st.push(i);
}
\`\`\`

\`\`\`java
Deque<Integer> st = new ArrayDeque<>();
int[] ans = new int[n];
for (int i = 0; i < n; i++) {
    while (!st.isEmpty() && t[i] > t[st.peek()]) {
        int j = st.pop(); ans[j] = i - j;
    }
    st.push(i);
}
\`\`\`

**Trigger:** "next greater/smaller", histogram areas, stock spans. Each index pushed+popped once → O(n).

### Top-K with a size-K heap

\`\`\`cpp
// K largest: keep a MIN-heap of size k
priority_queue<int, vector<int>, greater<int>> pq;
for (int x : a) {
    pq.push(x);
    if ((int)pq.size() > k) pq.pop();   // evict smallest
}
// pq now holds the k largest; top() is the kth largest
\`\`\`

\`\`\`java
PriorityQueue<Integer> pq = new PriorityQueue<>(); // min-heap
for (int x : a) {
    pq.offer(x);
    if (pq.size() > k) pq.poll();
}
\`\`\`

**Say why:** O(n log k) beats full sort O(n log n); the heap of the *opposite* kind of what you want is the trick.

### Merge intervals

\`\`\`cpp
sort(iv.begin(), iv.end());          // by start
vector<vector<int>> out{iv[0]};
for (auto& cur : iv) {
    if (cur[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], cur[1]);
    else out.push_back(cur);
}
\`\`\`

\`\`\`java
Arrays.sort(iv, (a, b) -> a[0] - b[0]);
List<int[]> out = new ArrayList<>(); out.add(iv[0]);
for (int[] cur : iv) {
    int[] last = out.get(out.size()-1);
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.add(cur);
}
\`\`\`

**Trigger:** meetings/ranges overlap questions. Sort by start, then one linear merge pass.
`
  });

  // ---------- Week 2 (Trees/Graphs module) ----------
  R.notes("dsa", 2, {
    concepts: `
## Tree & Graph Templates (C++/Java)

### BFS (level order / shortest unweighted path)

\`\`\`cpp
queue<int> q; q.push(src);
vector<int> dist(n, -1); dist[src] = 0;
while (!q.empty()) {
    int u = q.front(); q.pop();
    for (int v : adj[u]) if (dist[v] == -1) {
        dist[v] = dist[u] + 1; q.push(v);
    }
}
\`\`\`

\`\`\`java
Queue<Integer> q = new ArrayDeque<>(); q.offer(src);
int[] dist = new int[n]; Arrays.fill(dist, -1); dist[src] = 0;
while (!q.isEmpty()) {
    int u = q.poll();
    for (int v : adj.get(u)) if (dist[v] == -1) {
        dist[v] = dist[u] + 1; q.offer(v);
    }
}
\`\`\`

### DFS (recursive) + grid islands

\`\`\`cpp
void dfs(int r, int c) {
    if (r < 0 || r >= R || c < 0 || c >= C || g[r][c] != '1') return;
    g[r][c] = '0';                       // mark visited in place
    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
}
\`\`\`

\`\`\`java
void dfs(char[][] g, int r, int c) {
    if (r < 0 || r >= g.length || c < 0 || c >= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';
    dfs(g,r+1,c); dfs(g,r-1,c); dfs(g,r,c+1); dfs(g,r,c-1);
}
\`\`\`

### Topological sort (Kahn's / BFS in-degree)

\`\`\`cpp
vector<int> indeg(n, 0);
for (auto& [u, v] : edges) indeg[v]++;
queue<int> q;
for (int i = 0; i < n; i++) if (!indeg[i]) q.push(i);
vector<int> order;
while (!q.empty()) {
    int u = q.front(); q.pop(); order.push_back(u);
    for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
}
// order.size() < n  ⇒  cycle (course schedule impossible)
\`\`\`

\`\`\`java
int[] indeg = new int[n];
for (int[] e : edges) indeg[e[1]]++;
Queue<Integer> q = new ArrayDeque<>();
for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
List<Integer> order = new ArrayList<>();
while (!q.isEmpty()) {
    int u = q.poll(); order.add(u);
    for (int v : adj.get(u)) if (--indeg[v] == 0) q.offer(v);
}
\`\`\`

### Union-Find (path compression + rank)

\`\`\`cpp
vector<int> par(n); iota(par.begin(), par.end(), 0);
function<int(int)> find = [&](int x){ return par[x] == x ? x : par[x] = find(par[x]); };
auto unite = [&](int a, int b){ par[find(a)] = find(b); };
\`\`\`

\`\`\`java
int[] par = new int[n];
for (int i = 0; i < n; i++) par[i] = i;
int find(int x) { return par[x] == x ? x : (par[x] = find(par[x])); }
void unite(int a, int b) { par[find(a)] = find(b); }
\`\`\`

### Dijkstra (min-heap)

\`\`\`cpp
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;  // {dist, node}
vector<int> dist(n, INT_MAX); dist[src] = 0; pq.push({0, src});
while (!pq.empty()) {
    auto [d, u] = pq.top(); pq.pop();
    if (d > dist[u]) continue;                    // stale entry — skip
    for (auto [v, w] : adj[u])
        if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.push({dist[v], v}); }
}
\`\`\`

\`\`\`java
PriorityQueue<int[]> pq = new PriorityQueue<>((a,b) -> a[0] - b[0]);
int[] dist = new int[n]; Arrays.fill(dist, Integer.MAX_VALUE);
dist[src] = 0; pq.offer(new int[]{0, src});
while (!pq.isEmpty()) {
    int[] top = pq.poll(); int d = top[0], u = top[1];
    if (d > dist[u]) continue;
    for (int[] e : adj.get(u))
        if (dist[u] + e[1] < dist[e[0]]) { dist[e[0]] = dist[u] + e[1]; pq.offer(new int[]{dist[e[0]], e[0]}); }
}
\`\`\`

**Say the stale-entry line** (\`if (d > dist[u]) continue\`) — it's what makes lazy-deletion Dijkstra correct.
`
  });

  // ---------- Week 3 (DP module) ----------
  R.notes("dsa", 3, {
    concepts: `
## DP Templates (C++/Java)

### Memoization skeleton (top-down)

\`\`\`cpp
unordered_map<int,long long> memo;
long long f(int i) {
    if (i <= 1) return i;                 // base case
    if (memo.count(i)) return memo[i];
    return memo[i] = f(i-1) + f(i-2);     // recurrence
}
\`\`\`

\`\`\`java
Map<Integer,Long> memo = new HashMap<>();
long f(int i) {
    if (i <= 1) return i;
    return memo.computeIfAbsent(i, k -> f(k-1) + f(k-2));
}
\`\`\`

**Recipe to narrate:** 1) define state in one sentence, 2) base cases, 3) recurrence, 4) memoize. Convert to tabulation only if asked or if recursion depth is a risk.

### 0/1 Knapsack (1D rolling array)

\`\`\`cpp
vector<long long> dp(W + 1, 0);
for (int i = 0; i < n; i++)
    for (int w = W; w >= wt[i]; w--)          // BACKWARD ⇒ each item used once
        dp[w] = max(dp[w], dp[w - wt[i]] + val[i]);
\`\`\`

\`\`\`java
long[] dp = new long[W + 1];
for (int i = 0; i < n; i++)
    for (int w = W; w >= wt[i]; w--)
        dp[w] = Math.max(dp[w], dp[w - wt[i]] + val[i]);
\`\`\`

**The interview one-liner:** inner loop backward = 0/1 (item once); forward = unbounded (coin change). Being able to explain *why* is the differentiator.

### LCS (2D)

\`\`\`cpp
vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
for (int i = 1; i <= m; i++)
    for (int j = 1; j <= n; j++)
        dp[i][j] = (a[i-1] == b[j-1]) ? dp[i-1][j-1] + 1
                                      : max(dp[i-1][j], dp[i][j-1]);
\`\`\`

\`\`\`java
int[][] dp = new int[m + 1][n + 1];
for (int i = 1; i <= m; i++)
    for (int j = 1; j <= n; j++)
        dp[i][j] = a.charAt(i-1) == b.charAt(j-1) ? dp[i-1][j-1] + 1
                 : Math.max(dp[i-1][j], dp[i][j-1]);
\`\`\`

**Family:** edit distance, longest palindromic subsequence (LCS with reverse), diff tools. State: "dp[i][j] = LCS length of first i chars of a and first j of b."
`
  });
})();
