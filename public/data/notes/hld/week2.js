(function () {
  window.PrepStackRegister.notes("hld", 2, {
    concepts: `# Consistent Hashing, Red-Black Trees & Replication

## HLD — Consistent Hashing (Deep Dive)

### The Problem It Solves

Normal hashing: \`server = hash(key) % N\`. If you add/remove a server, N changes → almost every key remaps → cache misses everywhere → disaster at scale.

### How It Works — The Ring

Imagine a ring (0 to 2³²). Hash each server → place on ring. Hash each key → place on ring. Key goes to the first server clockwise from it.

\`\`\`
        S1 (hash=100)
       /
Ring: 0 -------- 360
       \\
        S2 (hash=200) → S3 (hash=300)

Key at hash=150 → goes to S2
Key at hash=250 → goes to S3
\`\`\`

When a server is removed: only keys between it and its predecessor remap — typically only ~1/N of keys, not all of them.

### Virtual Nodes

One server gets multiple positions on the ring (e.g. S1 appears 150 times). Without this, distribution is uneven (one server could get 60% of keys by luck). Virtual nodes smooth distribution and let you give powerful servers more virtual nodes (heterogeneous weighting). Used in Cassandra, DynamoDB, Redis Cluster, Memcached.

### Q&A: Is Lookup Linear Search?

**Q: "Do we linear search in server list, next pos which is higher than key will be holding your data?"**

**Exactly right intuition.** The ring is conceptual — in code it's a sorted array/list of server positions, and lookup is **binary search**, not linear.

\`\`\`
Servers hashed to positions:
S1 → 100, S3 → 270, S2 → 450, S4 → 700
Sorted array: [100, 270, 450, 700]  → S1  S3   S2   S4

hash("user:42") = 380
Binary search in [100,270,450,700] → first value >= 380 is 450 → S2 owns this key
\`\`\`

**Wrap-around:** if hash exceeds all positions (e.g. 850, none ≥ it exists), wrap to index 0 (this is the "clockwise on a ring" behavior).

\`\`\`python
import bisect
servers = sorted([100, 270, 450, 700])
server_map = {100: "S1", 270: "S3", 450: "S2", 700: "S4"}

def get_server(key_hash):
    idx = bisect.bisect_left(servers, key_hash)  # O(log N) binary search
    if idx == len(servers):
        idx = 0  # wrap around
    return server_map[servers[idx]]

print(get_server(380))  # → S2
print(get_server(850))  # → S1 (wrap)
\`\`\`

With virtual nodes: same bisect, just on a bigger merged sorted array (N × vnode_count entries) — still O(log N).

**Summary table (from transcript):**

| Question | Answer |
|---|---|
| Is it linear search? | No — binary search O(log N) |
| "Clockwise" means? | Next entry in sorted array ≥ key hash |
| Wrap-around? | If no entry ≥ key, take index 0 |
| Data structure? | Sorted array + map of position→server |
| Virtual nodes change algo? | No, same bisect on a bigger array |

### Q&A: How Are Positions Defined? New Hashing for a Key?

A server doesn't get one hash — you hash derived strings like \`"ServerName#VnodeIndex"\`:

\`\`\`python
import hashlib
def hash_fn(key):
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**32)

positions = [hash_fn("S1#0"), hash_fn("S1#1"), hash_fn("S1#2")]  # 3 vnodes for S1
\`\`\`

A **key** is hashed directly, no \`#index\` suffix: \`hash_fn("user:42")\`, \`hash_fn("order:XYZ")\`.

**Why MD5/SHA1 and not Python's built-in \`hash()\`?** Built-in \`hash()\` is salted per-process-restart and differs across machines — all nodes must agree on the same ring, so a deterministic hash (MD5/SHA1) is required.

**Real systems' hashing approaches (table):**

| System | How they hash server positions |
|---|---|
| Cassandra | MD5(token + node_ip) — token ranges |
| Redis Cluster | Doesn't use consistent hashing — fixed 16384 slots, \`CRC16(key) % 16384\` |
| Memcached (ketama) | MD5("ip:port-i") per vnode |
| Envoy | xxHash (faster than MD5, good distribution) |

**Redis Cluster detail:** 16384 fixed slots; e.g. Slots 0–5460 → Node A, 5461–10922 → Node B, 10923–16383 → Node C. Node added → reassign slot ranges (manually or automatically); no virtual nodes needed since 16384 slots is already fine-grained.

Key interview line: *"Server positions and key positions live on the same ring using the same hash function. The only difference is the input string — servers use name#index to generate multiple vnodes, keys use their actual value."*

### Q&A: What Happens on Add/Remove Server?

**Case 1 — Remove a Server (S2 crashes):**
\`\`\`
Before: [287M(S1), 432M(S1), 600M(S2), 756M(S2), 900M(S3), 1100M(S3)]
"user:42"(550M) → S2 ;  "order:9"(700M) → S2 ;  "item:5"(800M) → S3 (unaffected)

After removing S2:
[287M(S1), 432M(S1), 900M(S3), 1100M(S3)]
"user:42" → S3 ; "order:9" → S3 ; "item:5" → S3 (unchanged)
\`\`\`
Only S2's keys moved — everything else untouched.

**Case 2 — Add a Server (S4 joins, vnodes at 600M/800M):**
\`\`\`
Before: [287M(S1),432M(S1),756M(S2),900M(S3)]
After:  [287M(S1),432M(S1),600M(S4),756M(S2),800M(S4),900M(S3)]
"user:42"(550M) → now S4 (moved from S2); "order:9"(700M) → stays at S2
\`\`\`
S4 only "steals" from its immediate predecessor.

**The math:**
\`\`\`
Normal hashing: Add 1 server → ~100% keys remap
Consistent hashing: Add/remove 1 server → only ~1/N keys remap
\`\`\`
With 10 servers, only ~10% of keys move — the difference between a smooth deploy and a cache-stampede outage.

**Cache stampede without consistent hashing:** server removed → 100% cache miss → all requests hit DB simultaneously → DB dies → cascading failure. With consistent hashing: only ~10% miss → small DB spike → cache repopulates gradually → system survives.

**What actually happens to data (two scenarios):**
- **Cache (Redis/Memcached):** no explicit migration — keys just cache-miss on next request, app fetches from DB, repopulates cache. No migration because cache is a copy.
- **Database/Storage (Cassandra, DynamoDB):** actual data migration — coordinator says "S4 owns slots X-Y," S2 streams that data to S4.

Interview answer: *"Only the keys between the failed node and its predecessor on the ring need to remap — roughly 1/N of total keys. Those keys fall to the next clockwise server. For a cache layer this means a temporary miss rate spike of ~1/N. For persistent storage like Cassandra, replica nodes already hold copies so there's no data loss — just a coordinator reassignment."*

### Q&A: "Is removal O(N) for servers? After removal do we transfer data, or just redirect? What does the cache store?"

**Q1: Is removal O(N)?**

**No — O(log N) lookup, O(V log N) removal** (V = virtual node count), IF using the right data structure.

\`\`\`python
# Plain array — bad:
for i in range(V):
    pos = hash_fn(f"S2#{i}")
    idx = bisect.bisect_left(ring, pos)  # O(log N)
    ring.pop(idx)                        # O(N) shift 😬
# Total: O(V * N)

# Real systems use sorted dict / balanced BST:
from sortedcontainers import SortedList
ring = SortedList()          # Red-Black tree internally
ring.add(pos)                # O(log N)
ring.remove(pos)             # O(log N) ✅
\`\`\`

| Operation | Plain Array | SortedList/BST |
|---|---|---|
| Add server | O(N) | O(V log N) |
| Remove server | O(N) | O(V log N) |
| Find server for key | O(log N) | O(log N) |

**Q2: After removing, do we transfer data?** Depends entirely on the layer:
- **Cache (Redis, Memcached):** NO explicit transfer. S2 removed → keys remap to S3 → next request is a MISS → app fetches from DB, stores in S3. "Data self-heals through normal cache misses. No migration needed because cache is a COPY of DB data."
- **Persistent Storage (Cassandra, DynamoDB):** YES — actual migration. System knows S2 owned key range [500M-756M]; if graceful shutdown, S2 streams data to S3; if crashed, replicas kick in.

**Q3: What does the cache actually store?** The RESULT, not instructions — a plain hashmap: \`{"user:42": {...}, "order:XYZ": {...}}\`. Consistent hashing only tells you WHICH server to ask; that server does a simple hashmap lookup internally.

**Summary table:**

| Question | Cache (Redis) | Storage (Cassandra) |
|---|---|---|
| Transfer data on removal? | ❌ No, self-heals | ✅ Yes, explicit migration |
| What if server crashes? | Cache miss → DB fallback | Replicas serve the data |
| What's stored? | key → serialized value in RAM | key → value on disk + RAM |
| Data loss on crash? | ✅ Yes (cache rebuilt from DB) | ❌ No (replicas exist) |

### Q&A: "Does every server have full access to all data? How do sorted list/BST work?"

**Q1: Does every node know the full ring?** Yes — every node holds a **complete copy of the ring metadata** (tiny, few KB even for 1000 nodes), but NOT the actual data (which is distributed, each server owns only its slice).

Propagation via **Gossip Protocol**: "S1 joins → tells S2,S3 → S2 tells S4,S5 → ... like a rumor spreading, every node eventually knows about every other node." Client request → any node (coordinator) → coordinator has full ring → knows which node owns the key → forwards (1 hop). No node needs all the data, just all the metadata.

**Q2: How SortedList/BST works (built from scratch):**

Plain sorted array insert requires an O(N) shift:
\`\`\`
ring = [100, 287, 432, 600, 756, 900]
ring.insert(3, 500) → everything after index 3 shifts right → O(N)
\`\`\`

**BST fix** — left child < parent < right child, insertion is just a pointer change, O(log N) (no shifting). "Find next clockwise" = **inorder successor** search, O(log N).

**Problem with plain BST:** if you insert already-sorted data (100,200,300,400,500), it degenerates into a linked list → O(N), not O(log N).

**Red-Black Tree** self-balances automatically via 4 rules (detailed further below) — guarantees O(log N) regardless of insertion order.

\`\`\`
ring = SortedList([100, 287, 432, 600, 756, 900])
ring.add(500)               # O(log N) — BST insert + rebalance
ring.remove(600)            # O(log N) — BST delete + rebalance
idx = ring.bisect_left(470) # O(log N) — inorder successor
\`\`\`

**Summary table:**

| | Array | BST | Red-Black Tree |
|---|---|---|---|
| Insert | O(N) | O(N) worst | O(log N) always |
| Delete | O(N) | O(N) worst | O(log N) always |
| Find next | O(log N) | O(log N) avg | O(log N) always |
| Balanced? | N/A | ❌ No | ✅ Auto |

---

## LLD-adjacent — Red-Black Trees (Internals)

*(Studied specifically because they back the consistent-hashing ring's O(log N) guarantees — good pure-DS interview material.)*

### Why Red-Black Trees Exist

\`\`\`
BST height determines speed.
Height = O(log N) → fast
Height = O(N)     → slow (linked list)
We need a guarantee that height stays O(log N) no matter insertion order.
\`\`\`

### The 4 Rules

\`\`\`
1. Every node is RED or BLACK
2. Root is always BLACK
3. RED node cannot have RED child (no two consecutive reds)
4. Every path from root to NULL must have same number of BLACK nodes
\`\`\`
These four rules together guarantee height ≤ 2·log N.

**Intuition:** RED nodes = "temporary/flexible" (loosely attached); BLACK nodes = "structure/skeleton." Rule 4 is the key balancing rule — if every root→leaf path has the same black count, the tree can't be too skewed (worst case: all-black path length L vs red-black alternating path length 2L → max ratio 2x → height ≤ 2 log N).

### Building a Tree Step by Step (Insert 10, 20, 30, 15)

\`\`\`
Step 1: Insert 10 → 10(B)  [root always black]
Step 2: Insert 20 → 10(B) → 20(R)  [new nodes start RED; no violation]
Step 3: Insert 30 → 10(B)→20(R)→30(R)  ← VIOLATION (20R→30R consecutive reds)

Fix: Rotation + Recolor
Before:  10(B) → 20(R) → 30(R)
After:        20(B)
             /    \\
          10(R)   30(R)
(20 becomes new subtree root, turns BLACK; 10 turns RED)

Step 4: Insert 15 → 10(R)→15(R) violation again (uncle = 30R)

Fix decision tree when you hit a violation — ask: is the UNCLE red or black?
  UNCLE RED   → Recolor only: Parent→BLACK, Uncle→BLACK, Grandparent→RED (recheck upward)
  UNCLE BLACK → Rotate + Recolor (restructure subtree)

Back to Step 4 (uncle 30R is red) → Recolor:
Final tree:
      20(B)
     /    \\
  10(B)   30(B)
     \\
     15(R)

Rule 2: Root 20 is BLACK ✅
Rule 3: No consecutive reds ✅
Rule 4: All root→leaf paths have 2 blacks ✅
\`\`\`

### Rotations

\`\`\`
Left Rotation (right side heavy):     Right Rotation (left side heavy):
    X(B)          Y(B)                    Y(B)          X(B)
       \\         /                       /                \\
       Y(R) → X(R)                    X(R)   →            Y(R)
\`\`\`

### Why Height ≤ 2 log N

\`\`\`
Shortest possible path: all BLACK nodes → height = log N
Longest possible path: alternating RED-BLACK → height = 2 log N (red can't be consecutive)
So worst case height = 2 log N → all operations O(log N) guaranteed
\`\`\`

### Summary of All Insert Cases

\`\`\`
New node always starts RED.
If parent is BLACK → done, no violation.
If parent is RED → violation, fix it:
   Uncle RED?  → Recolor parent+uncle BLACK, grandparent RED → move up and recheck
   Uncle BLACK + you're outer child (LL/RR)? → Single rotation + recolor
   Uncle BLACK + you're inner child (LR/RL)? → Double rotation + recolor
\`\`\`

### Connection Back to Consistent Hashing

\`\`\`
Ring = Red-Black Tree
add("S2#0", pos=600)   → insert 600 into RBT → O(log N)
remove("S2#0")         → delete 600 from RBT → O(log N)
find_server(key=470)   → inorder successor in RBT → O(log N)
Guaranteed fast because RBT never degrades to O(N) no matter insertion order.
\`\`\`

---

## HLD — Replication, Quorum, Gossip, Hinted Handoff (Cassandra-style)

### Replication on the Ring

Replicate to the next **N clockwise nodes** (N = replication factor, usually 3):

\`\`\`
Ring: [100(S1), 287(S2), 432(S3), 600(S4), 756(S5), 900(S6)]
RF=3
"user:42" hashes to 550M
→ Primary  = S4 (600M)
→ Replica1 = S5 (756M)
→ Replica2 = S6 (900M)
So S4, S5, S6 ALL hold "user:42"
\`\`\`

Node failure: S4 crashes → next clockwise = S5 serves data, S6 also has it as backup → zero data loss, zero downtime.

### Write Strategies

**Strategy 1 — Write to All (strong consistency):** coordinator writes to all 3, waits for ALL to confirm. ✅ always in sync ❌ slow (limited by slowest node), fails if one node down.

**Strategy 2 — Quorum Write (Cassandra's approach):**
\`\`\`
RF=3, Quorum = majority = R/2+1 = 2
Coordinator writes to S4,S5,S6, waits for ANY 2 to confirm → success
\`\`\`

### Quorum Read

\`\`\`
Coordinator asks S4 and S5.
S4 returns version 5 (10:00:01), S5 returns version 4 (10:00:00).
Take version 5 (latest) → return to client. Also repair S5 in background (read repair).
\`\`\`

### CAP Tradeoff via W/R

\`\`\`
Write Quorum (W) + Read Quorum (R) > Replication Factor (N) → guaranteed overlap → strong consistency

N=3: W=2,R=2 → W+R=4>3 → always overlap ✅ consistent
     W=1,R=1 → W+R=2<3 → might miss latest write ❌
\`\`\`
Cassandra lets you configure W/R: speed → W=1,R=1 (eventual); consistency → W=2,R=2 (strong); max safety → W=3,R=3.

### Recovering a Dead Node That Comes Back

Two mechanisms:
1. **Hinted Handoff** (during downtime) — S5 kept a "hint" log ("S4 missed these writes while down"); when S4 returns, S5 sends the missed writes.
2. **Anti-entropy (periodic)** — nodes compare data using **Merkle Trees**; find differences, sync only the diff, runs constantly in background.

### Merkle Tree

\`\`\`
         hash(all)
        /          \\
  hash(left)    hash(right)
   /      \\      /       \\
h(1-25) h(26-50) h(51-75) h(76-100)
\`\`\`
S4 and S5 compare root hash first — same → fully in sync; different → go one level down, find exactly which subtree differs, sync only that range. O(log N) comparison instead of O(N).

### Interview Cheat Sheet

| Question | Answer |
|---|---|
| How many copies? | Replication factor (usually 3) |
| Which nodes? | Next N clockwise on ring |
| How writes sync? | Quorum — W out of N confirm |
| How reads work? | Quorum — R out of N, take latest |
| Node crashes? | Other replicas serve, no data loss |
| Node rejoins? | Hinted handoff + merkle tree sync |
| Tune consistency? | Adjust W and R values |

### Q&A: Which cases need replication vs just mapping?

**Just Mapping (no replication):** Cache layer (Redis, Memcached) — DB is source of truth, cache loss is just a miss, not disaster (session cache, API response cache, computed results cache).

**Replication Needed:** Primary data stores where losing data = actual business loss (user profiles in Cassandra, order history in DynamoDB, bank transactions, WhatsApp messages).

Rule of thumb: *"Is this data reconstructible? YES → just mapping (cache, computed results, sessions). NO → replication needed (user data, orders, messages, files)."*

### Q&A: When a node comes online, does it get the full ring? How does ring update on add/remove/crash?

**Fresh node joining:** contacts a **seed node** (hardcoded config, e.g. \`cassandra.yaml: seed_provider: seeds: "S1:9042, S2:9042"\`) → announces its ring positions → seed gossips this to others (spreads in seconds) → new node receives full ring state → data migration begins (takes ownership of key ranges from previous owners).

**Every node stores locally:** (1) Ring metadata (tiny, few KB) — \`{450M→S7, 600M→S4, ...}\`; (2) Its own data slice (can be GBs/TBs).

**Three lifecycle cases:**
\`\`\`
Case 1 — Graceful Add: S7 announces via gossip → all nodes update ring copy → S7 receives data migration
Case 2 — Graceful Remove (nodetool decommission): announces "leaving" → migrates data FIRST → then ring updates → shuts down (no data loss)
Case 3 — Crash (unplanned): detected via heartbeat timeout → gossip spreads "S4 is down" → marked DOWN (not deleted) → requests for S4's keys go to replicas → if down too long, admin manually removes from ring
\`\`\`

**Local ring copy visualization:**
\`\`\`
┌─────────────────────────────────┐
│ Node S3's local ring metadata   │
├──────────┬──────────────────────┤
│ Position │ Owner                │
│ 100M     │ S1 (192.168.1.1)     │
│ 287M     │ S2 (192.168.1.2)     │
│ 432M     │ S3 (192.168.1.3) ←ME │
│ 600M     │ S4 (192.168.1.4)     │
└──────────┴──────────────────────┘
\`\`\`

**Summary tables:**

| Scenario | Mapping Only | Replication |
|---|---|---|
| Cache (Redis) | ✅ | ❌ |
| Session store | ✅ | ❌ |
| DB (Cassandra) | ✅ | ✅ |
| File storage | ✅ | ✅ |
| Message store | ✅ | ✅ |

| Event | Ring Updated? | Data Migrated? |
|---|---|---|
| Node joins | ✅ via gossip | ✅ neighbors send slice |
| Graceful leave | ✅ via gossip | ✅ before leaving |
| Crash | ✅ marked DOWN | ❌ replicas cover |
| Rejoin after crash | ✅ marked UP | ✅ hinted handoff |

### Q&A: "Eventually all data are stored somewhere on a master and all?"

**No — there is no master.** This is a common misconception.

\`\`\`
❌ Wrong: MASTER (has all data) → S1, S2, S3 (just copies/backups)

✅ Correct (truly distributed): 12-node ring, RF=3
"user:42"  lives on → S4, S5, S6 ONLY
"order:99" lives on → S7, S8, S9 ONLY
NO single node has all data. NO master exists.
\`\`\`

Cluster of 6 nodes, 100 keys, RF=3: each node holds ~50 keys (its range + replicas of neighbors); total storage = 100 keys × 3 copies = 300 key-copies spread across 6 nodes (~50 each). The 3 replicas are **equal** — none is "master." Read can go to any of the 3; write goes to all 3 (quorum confirms 2). This is called **leaderless replication** (Cassandra, DynamoDB).

**Contrast — some systems DO have a leader:**
\`\`\`
Leaderless (Cassandra, DynamoDB): all replicas equal, any can serve read/write, eventual consistency, higher availability
Leader-based (MongoDB, MySQL replication): 1 primary + N secondaries, writes → only primary, primary dies → election, stronger consistency
\`\`\`

The **coordinator node** handles the "someone must have all data" illusion: client connects to any node → that node (coordinator) checks the ring, knows which nodes own the key, asks quorum, stitches together the result. Client never knows data was split; no node had ALL data.

**Summary table:**

| Belief | Reality |
|---|---|
| Someone stores all data | ❌ No — data is sharded |
| 3 replicas = 1 master + 2 backups | ❌ No — all 3 are equal |
| One node coordinates everything | ❌ Any node can coordinate |
| Adding nodes = more copies of all data | ❌ More nodes = each node holds less |
| Total data grows with RF | ✅ Yes — 3x storage cost |

### Gossip Protocol, Heartbeat, Hinted Handoff (Deep Dive)

### 1. Heartbeat

Periodic "I'm alive" signal, every N seconds. Node considered dead only after **missed 3 consecutive heartbeats** (~9-10s), not immediately — avoids false positives from network hiccups or GC pauses.

Two types:
\`\`\`
Active (Push): node broadcasts "I'm alive" to everyone — simple but O(N²) messages, noisy
Passive (Ping-Pong): Node A pings B, B must pong within timeout, else marked suspect
\`\`\`
Cassandra uses passive with gossip layered on top.

### 2. Gossip Protocol

Heartbeat tells you IF a node is alive; gossip spreads WHAT is happening across the cluster. Every T seconds (e.g. 1s), each node picks 1-3 random nodes and exchanges state.

\`\`\`
S1's state: { S1: {status:UP, ring_pos:[...], version:42}, S4: {status:DOWN, version:15}, ... }
Version number increments every heartbeat; higher version = more recent info.
\`\`\`

**How it spreads (exponential):**
\`\`\`
T=0s: only S1 knows S4 is DOWN
T=1s: S1 gossips with S3 → S3 knows too
T=2s: S1,S3 gossip with 2 more → 4 nodes know
T=3s: 8 nodes know...
Spreads O(log N) rounds → 100-node cluster converges in ~7 seconds
\`\`\`

**Why random peers, not fixed neighbors?** Fixed chain (S1→S2→S3→S4) — if S2 dies, S3/S4 never get updates (single point of failure in the chain). Random selection: even if some nodes are down, info still reaches everyone — more resilient.

### 3. Hinted Handoff

Kicks in when a write arrives but the target node is DOWN.

\`\`\`
Write "user:42" → should go to S4,S5,S6. S6 is DOWN.
Coordinator picks next available node S7:
"S7, store this write temporarily with a HINT that it belongs to S6"
S7 stores: {data: {...}, hint: {intended_for: S6, timestamp, retry_after: S6 comes back}}

When S6 comes back:
S6 rejoins → gossip spreads → S7 sees hints → sends missed writes → S6 catches up → S7 deletes hints
\`\`\`

**Expiry:** hints have a default expiry (3 hours in Cassandra). If S6 down longer, hints expire and Anti-entropy repair (Merkle tree) kicks in instead — slower but handles long outages.

### How All Three Work Together

\`\`\`
Normal:  Heartbeat "I'm alive" every few seconds; Gossip spreads ring state/versions
S6 crashes: Heartbeat stops → suspect threshold → gossip spreads "S6 DOWN" → ring updated
Write during downtime: Hinted handoff → S7 holds write temporarily
S6 comes back: heartbeat resumes → gossip spreads "S6 UP" → S7 sends missed writes → S6 catches up
\`\`\`

**Summary table:**

| Mechanism | Purpose | Frequency | Who Does It |
|---|---|---|---|
| Heartbeat | Detect node alive/dead | Every ~1-3s | Every node |
| Gossip | Spread cluster state | Every ~1s | Every node, random peers |
| Hinted Handoff | Handle writes during downtime | On write failure | Coordinator node |

### Q&A: "How is DOWN actually decided? Is gossip one-way or two-way?"

**Q1 — Not a binary decision; 3-stage process:** \`ALIVE → SUSPECT → DOWN\` (not instant DOWN).

- **Stage 1 (SUSPECT):** S2 hasn't heard from S6 for > threshold (~10s) → marks SUSPECT, gossips it. If other nodes also haven't heard from S6, confidence grows; if someone did hear from S6 recently, they counter-gossip and S6 is unmarked.
- **Stage 2 (Confirmed DOWN):** multiple nodes independently report SUSPECT with no counter-evidence → cluster reaches consensus → DOWN, ring updated, hinted handoff kicks in.

**Cassandra's Phi Accrual Failure Detector:** doesn't use a fixed timeout — tracks statistics of heartbeat arrival intervals per node. If normal interval is ~1s and the gap is now 8s, that's statistically abnormal → phi score rises. \`phi < 8 → fine, phi > 8 → SUSPECT, phi > 12 → DOWN\`. Better than fixed timeout because it adapts to each node's own normal pattern (fewer false positives on naturally slower networks).

**Q2 — Gossip is two-way (push-pull), never one-way.** Uses 3 message types:
\`\`\`
GossipDigestSyn  → "Here's digest of what I know" (just version numbers, tiny)
GossipDigestAck  ← "Here's what I have newer + what I need from you"
GossipDigestAck2 → "Here's what you were missing"

S1 ──SYN──────► S3
S1 ◄──ACK─────  S3
S1 ──ACK2─────► S3
\`\`\`
3 messages total per round; both nodes fully synced after. **Why digest first, not full state?** Full state per gossip round for 100 nodes = ~100KB, and every node gossips every second — massive traffic at scale. Digest (just version numbers) is tiny; full data only flows when a version mismatch is actually found.

**Edge case — disagreement:** higher version number always wins (acts as a logical clock).

**Summary:**
\`\`\`
Is DOWN instant? → No. ALIVE → SUSPECT → DOWN, needs multiple nodes to agree, Phi accrual uses stats not fixed timeout
Is gossip one-way? → No. Always push-pull (3 messages): SYN → ACK → ACK2
Disagreement? → Higher version number wins (logical clock)
\`\`\`

### Q&A: "Does gossip send ALL version numbers of the ring, or selectively?"

Two related but distinct questions were asked and answered:

**Sub-question A (selective delta):** Level 1 — send only digests (version numbers), not full state. Level 2 — delta compression: only send what changed since the last gossip with that specific peer (tracked via \`endpointStateMap\`). Level 3 — selective peer choice: 1-3 random nodes per round, smart mix of live/suspect/recently-down nodes. First-time meeting two nodes → must send ALL versions (no delta history yet); afterward, delta only.

**Message size example:** \`GossipDigestSyn\` ≈ 20 bytes header + 8 bytes/node digest → for 100 nodes ≈ 820 bytes; \`GossipDigestAck\` only for mismatched nodes (~200 bytes each); total per round ≈ 2-3KB for a 100-node cluster (vs 100KB+ if sending everything).

**Sub-question B (clarifying: does the digest include ALL node versions?):** Yes — the SYN digest **does** include ALL known node version numbers every time (not partial), because if S1 only sent a partial digest, S3 would assume S1 knows nothing about the rest and would waste bandwidth sending full state unnecessarily. But this digest is small: 1 entry = ~8 bytes; 100 nodes = 800 bytes; 1000 nodes = 8KB; only at 10,000+ nodes does this get large enough that Kafka/Cassandra-scale systems split into gossip sub-clusters (~200-300 nodes each).

\`\`\`
Digest   = ALL node versions, always
Data     = ONLY nodes where version differs
Peers    = 1-3 random nodes per round
\`\`\``,
    qa: [
    { q: "Is looking up a key's server a linear search around the hash ring?", a: `No -- the ring is conceptual. In code it's a sorted array (or balanced BST) of server positions, and lookup is binary search: find the first position >= the key's hash (O(log N)). If no position is >= the key's hash, wrap around to index 0 -- that wrap-around is the 'clockwise on a ring' behavior. Virtual nodes don't change the algorithm, just the size of the sorted array being searched.` },
    { q: 'Is removing a server from the ring O(N)?', a: `Not if you use the right data structure. A plain array requires an O(N) shift per removal; a SortedList/Red-Black-Tree-backed ring gives O(V log N) removal (V = virtual node count) and O(log N) lookup, regardless of insertion order.` },
    { q: 'After a server is removed from the ring, does data get migrated?', a: `Depends on the layer. For a cache (Redis/Memcached), no explicit migration happens -- keys just remap to the next server and cache-miss on the next request; the app repopulates from the DB. For persistent storage (Cassandra/DynamoDB), yes -- the coordinator knows the removed node's key range and streams that data to the new owner (or replicas already have it if the node crashed).` },
    { q: 'Does one node in a replicated cluster store all the data, like a master?', a: `No -- this is a common misconception. In a leaderless system like Cassandra/DynamoDB, a key with replication factor 3 lives on exactly 3 nodes, and no node has ALL the data. The 3 replicas are equal (no master); any of them can serve reads, writes go to all 3 with quorum confirmation. A coordinator node (any node the client happens to connect to) checks the ring and forwards the request -- the client never knows the data was sharded.` },
    { q: 'How does a brand-new node find out about the rest of the cluster?', a: `It contacts a hardcoded seed node, announces its ring positions, and the seed gossips this to the rest of the cluster (spreads in O(log N) rounds, seconds for a 100-node cluster). Every node keeps a full copy of the ring metadata (tiny, a few KB) but never all of the actual data (which stays sharded).` },
    { q: 'What happens when a node just goes quiet -- is it declared DOWN immediately?', a: `No -- it's a 3-stage process: ALIVE -> SUSPECT -> DOWN. A missed heartbeat past a threshold marks a node SUSPECT and gossips it; if other nodes independently agree with no counter-evidence, the cluster reaches consensus and marks it DOWN. Cassandra's Phi Accrual Failure Detector uses statistics of each node's normal heartbeat interval rather than a fixed timeout, which reduces false positives on naturally slower nodes.` }
  ],
    mock: { easy: [], medium: [], hard: [] },
    days: {}
  });
})();
