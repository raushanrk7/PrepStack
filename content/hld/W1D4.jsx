import { useState } from "react";

const TAG = {
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  DB:  { bg: "#E040FB18", color: "#E040FB", border: "#E040FB40" },
  DS:  { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "sqlnosql", icon: "🗄️", tag: "DB",
    title: "SQL vs NoSQL",
    summary: "SQL = ACID, fixed schema, vertical scale, complex queries. NoSQL = flexible schema, horizontal scale, eventual consistency. Most systems use BOTH.",
    concepts: [
      {
        name: "SQL — ACID Guarantees",
        explanation: "Atomicity (all or nothing), Consistency (always valid state), Isolation (concurrent transactions don't interfere), Durability (survives crash via WAL).",
        example:
`Transfer ₹500 from A to B:
  BEGIN TRANSACTION
  Debit  A: -500  ✅
  Credit B: +500  ✅
  COMMIT

If Credit B fails:
  ROLLBACK → Debit A reversed ✅
  Never partial state

Use SQL when:
  ACID transactions needed ✅ (payments, bookings)
  Complex joins needed ✅
  Schema is stable ✅
  Examples: user accounts, orders, payments`
      },
      {
        name: "NoSQL — Scale + Flexibility",
        explanation: "No fixed schema. Horizontal scale (add nodes). Eventual consistency. No joins — denormalize data. Built for distributed systems.",
        example:
`Document (MongoDB):
  {id:42, name:"Rahul", preferences:{theme:"dark"}}
  {id:99, name:"Alice", age:28}  ← different structure ok ✅

Key-Value (Redis): fast O(1) lookup
Wide Column (Cassandra): massive write throughput
Graph (Neo4j): relationship queries

Use NoSQL when:
  Massive scale (millions writes/sec) ✅
  Flexible schema needed ✅
  Simple access patterns (by userId) ✅
  High availability > consistency ✅
  Examples: activity events, sessions, catalog`
      },
      {
        name: "Hybrid Approach (Real World)",
        explanation: "Most large systems use both. SQL for source of truth. NoSQL for scale, cache, events.",
        example:
`PostgreSQL (SQL):
  users, orders, payments
  → ACID, relationships, consistency ✅

Cassandra (NoSQL):
  user activity, time-series, events
  → massive write scale ✅

Redis (NoSQL):
  cache, sessions, leaderboards ✅

MongoDB (NoSQL):
  product catalog, content
  → flexible schema ✅

Rule:
  Source of truth     → SQL ✅
  Scale/cache/events  → NoSQL ✅`
      },
    ]
  },
  {
    id: "cap", icon: "⚖️", tag: "DB",
    title: "CAP Theorem",
    summary: "Consistency, Availability, Partition Tolerance — can only guarantee 2 of 3. P is mandatory in distributed systems. Real choice: CP vs AP.",
    concepts: [
      {
        name: "CAP — Real Choice is CP vs AP",
        explanation: "Partition tolerance is mandatory (networks fail). Choose between CP (consistent but may be unavailable) or AP (always available but may be stale).",
        example:
`Network partition happens (nodes can't talk):

CP (HBase, Zookeeper, etcd):
  Return ERROR rather than stale data
  "I'd rather be unavailable than wrong"
  Use: payments, inventory, config ✅

AP (Cassandra, DynamoDB, CouchDB):
  Return potentially stale data
  Keep accepting writes on both sides
  Reconcile when partition heals
  "I'd rather be slightly stale than down"
  Use: social feeds, recommendations ✅

CA = single machine only (not distributed)`
      },
      {
        name: "PACELC — More Nuanced",
        explanation: "Even without partitions there's a tradeoff: Latency vs Consistency. Cassandra lets you tune per query.",
        example:
`CAP only covers partition scenario.
PACELC covers normal operation too:

If Partition → C or A
Else → Latency or Consistency

Cassandra example:
  QUORUM reads/writes → consistent, slower
  ONE reads/writes   → fast, eventually consistent
  You choose per query! ✅

Interviewer: "Is Cassandra CP or AP?"
Answer: "AP by default but tunable.
  With QUORUM reads+writes → CP behavior.
  It's configurable not fixed." ✅`
      },
    ]
  },
  {
    id: "sharding", icon: "🔀", tag: "DB",
    title: "Sharding Strategies",
    summary: "Split data across multiple DB servers. Range (simple, hotspot risk), Hash (even, no ranges), Directory (flexible, extra hop). Shard key = most important decision.",
    concepts: [
      {
        name: "Range vs Hash vs Directory",
        explanation: "Range sharding = split by value ranges. Hash sharding = hash(key) % N shards. Directory = lookup table maps key to shard.",
        example:
`Range sharding:
  userId 1-10M   → Shard 1
  userId 10-20M  → Shard 2
  ✅ Range queries fast
  ❌ Hotspot: new users always hit last shard

Hash sharding:
  shard = hash(userId) % N
  ✅ Even distribution, no hotspot
  ❌ Range queries scan ALL shards
  ❌ Adding shards = resharding pain

Directory sharding:
  Lookup service: userId → shard
  ✅ Most flexible
  ❌ Extra network hop
  ❌ Lookup service = single point of failure`
      },
      {
        name: "Hotspot Problem + Suffix Fix",
        explanation: "Celebrity/viral content causes one shard to get all traffic. Fix with key suffix (random) to spread across multiple shards.",
        example:
`Celebrity problem:
  All writes for bieber → Shard 3 😱

Suffix fix:
  hash("bieber_0") → Shard 3
  hash("bieber_1") → Shard 7
  hash("bieber_2") → Shard 1

Write: pick random suffix (0,1,2)
Read:  query ALL suffixes, merge results

suffix_count stored in Redis:
  GET hot_user:bieber:suffix_count → 10

Viral post likes:
  INCR post:101:likes_{random_suffix}
  Read: sum all suffix shards ✅
  
  BUT: hit Redis INCR, batch sync to DB
  Kafka → batch 1000 → bulk INSERT ✅
  Return 200 immediately, async rest ✅`
      },
      {
        name: "Cross-Shard Problems",
        explanation: "Joins and transactions across shards are expensive. Fix by denormalizing data and using Saga pattern for transactions.",
        example:
`Cross-shard join:
  Users on Shard 1,2,3
  Orders on Shard A,B,C
  JOIN = query all shards + merge in app 😱
  Fix: denormalize user data into order row ✅

Cross-shard transaction:
  Transfer: user:42(Shard1) → user:99(Shard3)
  
  2PC (two-phase commit):
    Phase 1: "can you commit?" both shards
    Phase 2: both yes → execute
    Slow, complex ❌

  Saga pattern:
    Each step has compensating transaction
    Debit fails → credit reversal queued
    Eventual consistency ✅ most use this

Best fix: design to avoid cross-shard ops
  Shard by entity that belongs together ✅`
      },
    ]
  },
  {
    id: "indexing", icon: "🔍", tag: "DB",
    title: "Indexing + B-Tree",
    summary: "Index = separate sorted B-Tree pointing to rows. O(log N) vs O(N) full scan. Composite index = leftmost prefix rule. Covering index = never touch main table.",
    concepts: [
      {
        name: "B-Tree Structure",
        explanation: "Balanced tree. All leaves at same depth. Leaf nodes linked as linked list for range scans. O(log N) search, insert, delete.",
        example:
`Index (country, plan, age):

Sorted entries in leaf nodes:
  India | free    | 22 → row 4
  India | free    | 30 → row 7
  India | premium | 25 → row 5  ← Priya
  India | premium | 28 → row 1  ← Rahul
  UK    | free    | 19 → row 8
  UK    | premium | 30 → row 3
  US    | free    | 24 → row 2
  US    | premium | 35 → row 6

Leaf nodes linked: L1 → L2 → L3 → L4
Range scan: O(log N) find start
            O(K) scan linked list ✅
Binary search within leaf for range start ✅`
      },
      {
        name: "Composite Index + Leftmost Prefix",
        explanation: "Index (country, plan, age). Must include columns left to right, no gaps. Equality columns first, range column last.",
        example:
`Index: (country, plan, age)

Works:
  WHERE country="India"                  ✅
  WHERE country="India" AND plan="prem"  ✅
  WHERE country="India" AND plan="prem"
        AND age BETWEEN 25 AND 30        ✅

Doesn't work:
  WHERE plan="premium"           ❌ skipped country
  WHERE age > 25                 ❌ skipped both

Partial:
  WHERE country="India" AND age > 25
  → uses country only, age ignored ⚠️

Rule: equality columns FIRST
      range column LAST ✅
      matches leftmost prefix in order`
      },
      {
        name: "Covering Index + When to Index",
        explanation: "Covering index includes all columns query needs — never touches main table. Add index on high cardinality + frequent query columns.",
        example:
`Normal index on (country):
  Search → pointer → fetch full row (2 lookups)

Covering index on (country, name, email):
  All needed data IN index
  Never touch main table ✅ fastest!

Add index when:
  ✅ High cardinality (email, userId)
  ✅ Frequent WHERE/JOIN/ORDER BY column
  ✅ Large table (100K+ rows)

Don't add index:
  ❌ Low cardinality (gender, boolean)
  ❌ Frequently updated columns
  ❌ Small tables (full scan faster)

Debug slow query:
  EXPLAIN SELECT... → Seq Scan = add index ✅`
      },
    ]
  },
  {
    id: "replication", icon: "🔁", tag: "DB",
    title: "Replication Strategies",
    summary: "Master-Slave (reads to replicas), Master-Master (multi DC, conflict risk), Leaderless (Cassandra). WAL streams changes to replicas. Failover via election.",
    concepts: [
      {
        name: "WAL — Write Ahead Log",
        explanation: "Log change to disk FIRST, apply to data SECOND. Sequential writes = fast. Survives crash. Replicas stream WAL to stay in sync.",
        example:
`Without WAL:
  Modify data in memory → crash → LOST 😱

With WAL:
  1. Append to WAL on disk (sequential, fast) ✅
  2. Ack client ✅
  3. Apply to data pages (async, later)

  Crash: replay WAL from last checkpoint ✅

WAL entry contains:
  LSN, operation, table, old/new values,
  transaction ID ← replica knows what to apply

Checkpoint: point where all WAL flushed to disk
  Recovery: replay only WAL AFTER checkpoint ✅
  Default: every 5 min or 1GB WAL

Replica reads WAL:
  "Give me from LSN 5000"
  Apply each entry in order ✅
  Tracks own LSN = replication lag metric`
      },
      {
        name: "Master-Slave + Failover",
        explanation: "One primary (writes only). Multiple replicas (reads only). Auto-failover via election when primary dies. Beware split-brain.",
        example:
`Write: Client → Primary only
Read:  Client → any Replica ✅

Replication lag problem:
  Write at T=0, replica syncs at T=100ms
  Read at T=50ms → stale data 😱

Fix: read-your-own-writes
  After write: route THIS user's reads
  to primary for next 1 min ✅
  OR: timestamp tracking
  OR: sticky sessions ✅

Failover:
  Primary dies → replicas detect heartbeat timeout
  Election: most up-to-date replica wins ✅
  Tools: Patroni (Postgres), Sentinel (Redis) ✅

Split brain fix:
  Fencing tokens (Zookeeper) ✅
  Quorum: need majority to elect primary ✅`
      },
      {
        name: "Master-Master + Leaderless",
        explanation: "Master-Master = multiple primaries, good for multi-DC, conflict risk. Leaderless (Cassandra) = any node, quorum reads/writes.",
        example:
`Master-Master (multi DC):
  Each DC has own primary ✅
  Users write to nearest DC ✅

  Conflict problem:
  P1: name="Rahul Kumar" at 10:00:00.100
  P2: name="Rahul K"    at 10:00:00.200
  Both accepted → conflict 😱

  Resolution:
  Last Write Wins (timestamp) ✅
  Application merge ✅
  Best: route user always to same primary
  → no conflicts possible ✅

Leaderless (Cassandra):
  Write to ANY node ✅
  Quorum: W=2, R=2, N=3 → W+R>N ✅
  No failover needed ✅
  No split brain ✅
  Covered in Day 1 ✅`
      },
    ]
  },
];

const qna = [
  { q: "SQL vs NoSQL — how do you choose?", a: "4 things: (1) Need ACID transactions? → SQL. (2) Need horizontal scale to millions writes/sec? → NoSQL. (3) Schema fixed or flexible? Fixed→SQL, Flexible→NoSQL. (4) Complex queries/joins? Yes→SQL, No→either. Most production systems use both: SQL for transactional data, NoSQL for scale and flexibility." },
  { q: "Is Cassandra CP or AP?", a: "AP by default — prioritizes availability. But tunable: with QUORUM reads+writes you get strong consistency at cost of latency. So it's AP by default but configurable toward CP. Cassandra lets you tune W and R per query. This nuanced answer separates good candidates from great ones." },
  { q: "What is CAP theorem and what's the real choice?", a: "Consistency, Availability, Partition Tolerance. In distributed systems partition tolerance is mandatory (networks will fail). Real choice is CP (consistent, may be unavailable during partition) vs AP (always available, may return stale data). CA = single machine only, not distributed." },
  { q: "How does sharding work and what is the most important decision?", a: "Shard key selection is most important. Good shard key: high cardinality, even distribution, matches access patterns, avoids hotspots, stable over time. Bad: timestamp (all writes to latest), status (uneven), country (some >> others). Hash sharding for even distribution, range for range queries, consistent hashing for elastic scaling." },
  { q: "How do you handle the hotspot/celebrity problem in sharding?", a: "Suffix trick: hash('bieber_0'), hash('bieber_1'), hash('bieber_2') → spread across 3 shards. Write: pick random suffix. Read: query all suffixes, merge. Suffix count stored in Redis. Detect hot keys via write rate monitoring or follower threshold. For likes: INCR in Redis + batch sync to DB via Kafka every 30s." },
  { q: "What is a B-Tree index and how does it work?", a: "Separate sorted tree structure alongside table. Each entry: {key, row_pointer}. O(log N) search vs O(N) full table scan. Leaf nodes linked as linked list for range scans — find start O(log N), scan forward O(K). Binary search within leaf node for range start. Always O(log N) for search, insert, delete." },
  { q: "What is the leftmost prefix rule for composite indexes?", a: "Index (country, plan, age): must include columns left to right without gaps. country alone ✅, country+plan ✅, country+plan+age ✅. plan alone ❌, age alone ❌, country+age ⚠️ (partial). Put equality columns first, range column last for maximum efficiency." },
  { q: "What is WAL and why is it fast?", a: "Write Ahead Log. Log change to disk FIRST, apply to data SECOND. Sequential writes (always append to end) = 100x faster than random disk writes. Survives crash — replay WAL from last checkpoint on recovery. Checkpoint = point where all WAL flushed to data pages. Default every 5 min. Replicas stream WAL to stay in sync. LSN = Log Sequence Number identifies exact position." },
  { q: "What is replication lag and how to fix it?", a: "Async replication: write to primary at T=0, replica syncs at T=100ms. User reads at T=50ms from replica → stale data. Fix: (1) Route this user's reads to primary for 1 min after write. (2) Timestamp tracking — client sends write timestamp, replica checks if past that point. (3) Sticky sessions — same user always hits same replica." },
  { q: "What is split-brain and how to prevent it?", a: "Network partition → both sides think other is dead → both promote themselves to primary → two primaries accepting conflicting writes. Fix: (1) Fencing tokens from Zookeeper — storage rejects writes with old token. (2) Quorum election — need majority (N/2+1) votes to become primary, minority side can't elect → one primary only." },
  { q: "When to use covering index?", a: "When same query runs millions of times and always selects same columns. Covering index includes all needed columns so query never touches main table — just reads from index. Faster because: no second lookup to fetch row. Example: SELECT name, email FROM users WHERE country='India' → covering index on (country, name, email)." },
];

const mock = [
  { q: "You're designing Instagram. The database needs to handle 500M users, 100M posts/day. Walk through your database choices.", a: "Use hybrid approach. PostgreSQL for: user accounts (ACID, unique email constraint), payment records, follow relationships (graph queries). Cassandra for: posts timeline (write-heavy, 100M/day, time-series), user activity events. Redis for: session cache, like counters (INCR + batch sync), online status (ZSet with TTL scores). MongoDB for: post metadata (flexible schema, different media types). Shard PostgreSQL users by userId (hash), Cassandra naturally shards via consistent hashing. Read replicas for PostgreSQL to handle read load." },
  { q: "Design the indexing strategy for: SELECT * FROM orders WHERE userId=42 AND status='pending' AND created_at > '2024-01-01'", a: "Composite index on (userId, status, created_at). userId first — highest cardinality, equality filter, matches primary access pattern. status second — equality filter. created_at last — range filter, must be last per leftmost prefix rule. Consider covering index adding (amount, orderId) if query always selects those. Don't index status alone — low cardinality (pending/completed/cancelled = 3 values). EXPLAIN query to verify Index Scan not Seq Scan." },
  { q: "Primary database crashes. Walk me through exactly what happens and how the system recovers.", a: "Heartbeat timeout detected by replicas and monitoring (Patroni/Sentinel). Replicas check own WAL positions — most up-to-date replica is elected new primary (has highest LSN). Fencing token issued to new primary — old primary's writes rejected even if it recovers. DNS/load balancer updated to point to new primary. App connections rerouted. Old primary comes back → becomes replica, streams WAL from new primary to catch up. Total downtime: 30-60 seconds typically. To minimize: synchronous replication (at least one replica always in sync)." },
  { q: "How would you handle a viral post with 10M likes in 1 hour?", a: "Never hit DB on every like. Return 200 immediately. Produce like event to Kafka. Counter Service reads Kafka, batches 1000 events, INCRBY Redis counter, batch sync to DB every 30s via GETSET (atomic read+reset). Record Service reads Kafka, bulk INSERT 1000 rows to DB, pipeline 1000 SETBIT to Redis. Read path: GET counter from Redis (display count), GETBIT for did-I-like (O(1)), DB query for who liked (paginated, not hot path). DB first, then Redis (source of truth = DB). Redis bitmap per post: 500M users = 62.5MB." },
  { q: "Explain CAP theorem with a real example from a system you'd design.", a: "Building a ticket booking system for concerts. Choose CP: if network partition occurs during booking, better to return error than allow overselling. Last 10 tickets — must be consistent. Use PostgreSQL with synchronous replication. Seat reservation = SELECT FOR UPDATE (row lock) → prevents two users booking same seat. For recommendation system on same platform: choose AP — Cassandra. If partition occurs, show slightly stale recommendations vs show error. Users prefer seeing something over error page. Same platform, different services, different CAP choices based on business requirements." },
];

const S = {
  page:  { minHeight:"100vh", background:"#08080F", color:"#D8D8E8", fontFamily:"'Courier New',monospace" },
  hdr:   { background:"#0D0D1A", borderBottom:"1px solid #1A1A2E", padding:"16px 24px", position:"sticky", top:0, zIndex:100 },
  wrap:  { maxWidth:"860px", margin:"0 auto" },
  tab:   (a,c) => ({ background:"none", border:"none", cursor:"pointer", padding:"10px 18px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"'Courier New',monospace", color:a?c||"#fff":"#444", borderBottom:a?`2px solid ${c||"#E040FB"}`:"2px solid transparent" }),
  card:  (o,tc) => ({ background:"#0D0D1A", border:`1px solid ${o?tc.border:"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"10px" }),
  pre:   { background:"#070710", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"12px 14px", fontSize:"11px", color:"#A8A8C8", lineHeight:"1.8", overflowX:"auto", fontFamily:"'Courier New',monospace", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" },
  qcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#E040FB30":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
  mcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#FF6B3550":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
};

export default function W1D4() {
  const [tab, setTab] = useState("concepts");
  const [openTopic, setOpenTopic] = useState(null);
  const [openQ, setOpenQ] = useState(null);
  const [openM, setOpenM] = useState(null);
  const [search, setSearch] = useState("");

  const ft = topics.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.concepts.some(c => c.name.toLowerCase().includes(search.toLowerCase())));
  const fq = qna.filter(q => !search || q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase()));
  const fm = mock.filter(m => !search || m.q.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div style={{ ...S.wrap, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <div style={{ fontSize:"9px", color:"#E040FB", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 4</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>SQL vs NoSQL · CAP · Sharding · Indexing · Replication</div>
          </div>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background:"#0A0A14", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"8px 12px", color:"#E8E8F0", fontFamily:"inherit", fontSize:"11px", outline:"none", width:"160px" }} />
        </div>
        <div style={{ ...S.wrap, display:"flex", borderTop:"1px solid #1A1A2E", marginTop:"12px" }}>
          <button style={S.tab(tab==="concepts")} onClick={() => setTab("concepts")}>📚 Concepts ({topics.length})</button>
          <button style={S.tab(tab==="qna")} onClick={() => setTab("qna")}>❓ Q&A ({qna.length})</button>
          <button style={S.tab(tab==="mock","#FF6B35")} onClick={() => setTab("mock")}>🎯 Mock ({mock.length})</button>
        </div>
      </div>

      <div style={{ ...S.wrap, padding:"24px 24px 60px" }}>
        {tab === "concepts" && (
          <div>
            {ft.length === 0 && <div style={{ color:"#444", textAlign:"center", padding:"40px" }}>No results for "{search}"</div>}
            {ft.map(topic => {
              const tc = TAG[topic.tag] || TAG.HLD;
              const isOpen = openTopic === topic.id;
              return (
                <div key={topic.id} style={S.card(isOpen, tc)}>
                  <button onClick={() => setOpenTopic(isOpen ? null : topic.id)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <span style={{ fontSize:"20px", flexShrink:0 }}>{topic.icon}</span>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:"700", color:"#fff" }}>{topic.title}</div>
                        <div style={{ fontSize:"11px", color:"#555", marginTop:"2px", lineHeight:"1.5" }}>{topic.summary}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0, marginLeft:"10px" }}>
                      <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"3px", background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, letterSpacing:"1px" }}>{topic.tag}</span>
                      <span style={{ color:isOpen?"#E040FB":"#333", fontSize:"20px", lineHeight:1 }}>{isOpen?"−":"+"}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop:"1px solid #111120" }}>
                      {topic.concepts.map((c, i) => (
                        <div key={i} style={{ padding:"14px 18px", borderBottom:i<topic.concepts.length-1?"1px solid #0A0A14":"none" }}>
                          <div style={{ fontSize:"11px", fontWeight:"700", color:tc.color, letterSpacing:"1px", marginBottom:"5px" }}>{c.name}</div>
                          <div style={{ fontSize:"12px", color:"#888", lineHeight:"1.7", marginBottom:"8px" }}>{c.explanation}</div>
                          <pre style={S.pre}>{c.example}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "qna" && (
          <div>
            <div style={{ fontSize:"10px", color:"#444", letterSpacing:"2px", marginBottom:"16px" }}>QUESTIONS YOU ASKED — KEY FOR INTERVIEWS</div>
            {fq.length === 0 && <div style={{ color:"#444", textAlign:"center", padding:"40px" }}>No results for "{search}"</div>}
            {fq.map((item, i) => {
              const isOpen = openQ === i;
              return (
                <div key={i} style={S.qcard(isOpen)}>
                  <button onClick={() => setOpenQ(isOpen ? null : i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"12px 16px", display:"flex", gap:"10px", alignItems:"flex-start", textAlign:"left" }}>
                    <span style={{ fontSize:"10px", color:"#FF6B35", background:"#FF6B3515", border:"1px solid #FF6B3530", padding:"2px 7px", borderRadius:"3px", flexShrink:0, marginTop:"1px" }}>Q{i+1}</span>
                    <div style={{ fontSize:"12px", color:"#CCC", fontWeight:"600", lineHeight:"1.6" }}>{item.q}</div>
                    <span style={{ color:isOpen?"#E040FB":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen?"−":"+"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding:"12px 16px", borderTop:"1px solid #0A0A14", display:"flex", gap:"10px", alignItems:"flex-start" }}>
                      <span style={{ fontSize:"10px", color:"#69F0AE", background:"#69F0AE15", border:"1px solid #69F0AE30", padding:"2px 7px", borderRadius:"3px", flexShrink:0, marginTop:"1px" }}>ANS</span>
                      <div style={{ fontSize:"12px", color:"#888", lineHeight:"1.8" }}>{item.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "mock" && (
          <div>
            <div style={{ padding:"12px 16px", background:"#0D0D1A", border:"1px solid #FF6B3530", borderRadius:"8px", marginBottom:"20px" }}>
              <div style={{ fontSize:"10px", color:"#FF6B35", letterSpacing:"2px", marginBottom:"4px" }}>🎯 MOCK INTERVIEW — Senior SDE L5/L6</div>
              <div style={{ fontSize:"12px", color:"#666", lineHeight:"1.6" }}>Try to answer mentally first. Then expand for model answer. Focus on scale reasoning, tradeoffs, edge cases.</div>
            </div>
            {fm.length === 0 && <div style={{ color:"#444", textAlign:"center", padding:"40px" }}>No results for "{search}"</div>}
            {fm.map((item, i) => {
              const isOpen = openM === i;
              return (
                <div key={i} style={S.mcard(isOpen)}>
                  <button onClick={() => setOpenM(isOpen ? null : i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 18px", display:"flex", gap:"10px", alignItems:"flex-start", textAlign:"left" }}>
                    <span style={{ fontSize:"10px", color:"#FF6B35", background:"#FF6B3515", border:"1px solid #FF6B3530", padding:"2px 7px", borderRadius:"3px", flexShrink:0, marginTop:"2px", whiteSpace:"nowrap" }}>INT {i+1}</span>
                    <div style={{ fontSize:"13px", color:"#DDD", fontWeight:"600", lineHeight:"1.6" }}>{item.q}</div>
                    <span style={{ color:isOpen?"#FF6B35":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen?"−":"+"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding:"14px 18px", borderTop:"1px solid #0A0A14" }}>
                      <div style={{ fontSize:"10px", color:"#FF6B35", letterSpacing:"2px", marginBottom:"8px" }}>MODEL ANSWER</div>
                      <div style={{ fontSize:"12px", color:"#999", lineHeight:"1.9" }}>{item.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
