import { useState } from "react";

const TAG = {
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  DS:  { bg: "#E040FB18", color: "#E040FB", border: "#E040FB40" },
  INF: { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "why", icon: "⚡", tag: "HLD",
    title: "Why Cache Exists",
    summary: "DB reads ~10ms (disk). Cache reads ~0.1ms (RAM). 100x faster. At scale DB can't handle all requests — cache absorbs 95% of reads.",
    concepts: [
      {
        name: "The DB Problem at Scale",
        explanation: "Disk access is slow. At Netflix/Uber scale, every request hitting DB = DB overwhelmed. Cache sits in front, serves from RAM.",
        example:
`DB read from disk:  ~10ms
Cache read from RAM: ~0.1ms  → 100x faster

Netflix 10M users watching:
  2M req/sec hitting DB
  DB capacity = 10K req/sec
  → DB dies without cache 😱

With 95% cache hit rate:
  Only 100K req/sec reach DB ✅
  DB survives ✅`
      },
    ]
  },
  {
    id: "patterns", icon: "📋", tag: "HLD",
    title: "Cache Patterns",
    summary: "Cache Aside (most common), Write Through (consistent), Write Back (fastest, risky), Write Around (write-once data). Choice depends on read/write ratio and loss tolerance.",
    concepts: [
      {
        name: "Cache Aside (Lazy Loading)",
        explanation: "App manages cache. On READ: check cache first. On WRITE: update DB then DELETE cache key (not update — avoids race conditions).",
        example:
`READ:
  Cache HIT  → return ✅
  Cache MISS → query DB → store in cache → return

WRITE:
  UPDATE DB → DEL cache key  ← delete not update!

Why delete not update?
  W1 updates DB → "Rahul"
  W2 updates DB → "Raj"
  W2 updates cache → "Raj"
  W1 updates cache → "Rahul"  ← overwrites W2! 😱
  Delete is always safe — next read = fresh DB ✅

Used by: Netflix, Twitter ✅`
      },
      {
        name: "Write Through / Write Back / Write Around",
        explanation: "Write Through = cache+DB together (safe, slow). Write Back = cache only async DB (fast, lossy). Write Around = DB only, cache on read (write-once).",
        example:
`Write Through:
  Write → cache + DB simultaneously
  ✅ Always consistent  ❌ 2x write latency
  Use: banking dashboards

Write Back:
  Write → cache only → async sync to DB
  ✅ Fastest writes  ❌ data loss if cache crashes
  Use: gaming scores, social likes (approximate ok)
  NOT: payments, orders, user data

Write Around:
  Write → DB directly (cache bypassed)
  ✅ Cache not polluted  ❌ first read always miss
  Use: logs, bulk imports, audit trails`
      },
    ]
  },
  {
    id: "internals", icon: "⚙️", tag: "HLD",
    title: "Redis Internals",
    summary: "Fast because: RAM (100x) + single thread (no lock contention) + event loop (multiplexed I/O). Two hash tables: main dict + expiry dict. lru field in every robj.",
    concepts: [
      {
        name: "Why Single Thread Yet Fast",
        explanation: "Single thread = no locks, no context switching, no race conditions. All commands atomic. RAM + epoll event loop = 1M ops/sec.",
        example:
`Multi-threaded DB:
  Thread 1 reads "user:42" + Thread 2 writes
  → locks + mutex + contention = slow 😬

Redis single thread:
  Commands execute one by one
  No locks ever needed ✅
  100K - 1M ops/second

I/O: epoll/kqueue event loop
  Like waiter at many tables
  Never waits — processes thousands of
  connections without thread-per-connection ✅`
      },
      {
        name: "Two Hash Tables + TTL Storage",
        explanation: "Main dict: ALL keys+values. Expiry dict: ONLY keys with TTL → stores absolute Unix timestamp (not countdown). Lazy expiry on access + active background job every 100ms.",
        example:
`Main dict:   ALL keys → {type, value ptr, lru}
Expiry dict: ONLY TTL keys → absolute timestamp

SET key value EX 3600:
  expire_at = unix_time + 3600  ← absolute ✅
  NOT countdown (no background decrement needed)

Check: current_time > expire_at? → expired ✅
TTL command: expire_at - current_time = seconds left

Lazy:  delete key on next access if expired
Active: background job every 100ms
        picks 20 random TTL keys
        deletes expired ones ✅`
      },
      {
        name: "LRU Clock + Wrap-Around",
        explanation: "24-bit lru field in every robj stores last access time. 24 bits wraps every ~194 days. Redis handles wrap-around by comparing differences. LFU reuses same field.",
        example:
`robj struct per key:
  type:     STRING/LIST/HASH/SET/ZSET
  encoding: raw/ziplist/quicklist...
  lru:      24-bit timestamp ← last access OR frequency
  ptr:      → actual data

Eviction (allkeys-lru):
  Pick 5 random from main dict
  Compare lru field → evict lowest ✅

Wrap-around (every 194 days):
  if (lru_a - lru_b) > max_lru/2 → swap comparison
  Most keys evicted long before 194 days anyway ✅

LFU: reuses same 24-bit lru field
  Top 16 bits = last decay time
  Bottom 8 bits = access frequency`
      },
    ]
  },
  {
    id: "ds", icon: "🗂️", tag: "HLD",
    title: "Redis Data Structures",
    summary: "6 types: String, Hash, List, Set, ZSet, Bitmap. Type locked by FIRST command used on key. Wrong command = WRONGTYPE error. Key = resource:id:attribute convention.",
    concepts: [
      {
        name: "String + Hash",
        explanation: "String for single values/atomic counters. Hash for objects — HMGET fetches multiple fields in ONE round trip vs multiple GET calls.",
        example:
`String:
  SET  session:42 "token_xyz" EX 3600
  INCR post:101:likes  → atomic, no race ✅
  Use: sessions, counters, feature flags

Hash (multiple fields read together):
  HSET user:42 name "Rahul" plan "premium" avatar "x.jpg"
  HMGET user:42 name plan  → ["Rahul","premium"] ← 1 hop ✅
  HINCRBY user:42 followers 1  → atomic increment
  Use: user profiles, video metadata

GET on a Hash key = WRONGTYPE error ❌
HGET on a String key = WRONGTYPE error ❌
First command sets type permanently`
      },
      {
        name: "List + Set",
        explanation: "List = ordered, use LTRIM after every LPUSH to cap size. Set = unique members, hash table internally O(1) ops. NOT skip list — that's only ZSet.",
        example:
`List (ordered, use LTRIM!):
  LPUSH user:42:history "video:55"
  LTRIM user:42:history 0 9  ← cap at 10 items ✅
  Without LTRIM: 5yrs × 1/day × 500M = 18TB 😱
  DB fallback for older history ✅

Set (unique members, hash table internally):
  SADD  followers:42 "user:99"   → add O(1)
  SREM  followers:42 "user:99"   → remove O(1) ✅
  SISMEMBER followers:42 "u:99"  → check O(1) ✅
  SINTER friends:42 friends:99   → mutual friends
  NOT skip list (that's ZSet only)`
      },
      {
        name: "ZSet + Bitmap",
        explanation: "ZSet = unique + scored + sorted. Skip list + hash table internally. O(log N). Bitmap = 1 bit per user ID. 500M users = 62.5MB. 400x more efficient than string keys.",
        example:
`ZSet (skip list + hash table):
  ZADD leaderboard 2300 "alice"
  ZREVRANGE leaderboard 0 9  → top 10 ✅
  ZREMRANGEBYSCORE trending 0 0.001 → cleanup stale

Trending score formula:
  score = views / (age_hours + 2)^1.5
  gravity=1.5 balances recency + popularity ✅
  gravity=0: old viral stays forever 😱

Hourly buckets (not per-view!):
  ZINCRBY video:101:views 1 "bucket:2024-05-23-14"
  Max 24 entries per video ✅ (not 10M)

Bitmap (1 bit per user):
  SETBIT watched:video:101 42 1
  GETBIT watched:video:101 42  → 0 or 1
  500M users × 1 bit = 62.5MB per video
  vs STRING keys = 25TB  → 400x smaller ✅`
      },
    ]
  },
  {
    id: "eviction", icon: "🗑️", tag: "HLD",
    title: "Eviction Policies",
    summary: "Instance-level policy (not per-key). allkeys-lru most common. volatile-lru dangerous if no keys have TTL — behaves like noeviction and rejects writes.",
    concepts: [
      {
        name: "6 Policies + Edge Cases",
        explanation: "Eviction = instance-level. TTL = only per-key control. volatile-lru with no TTL keys = OOM error (same as noeviction). Best practice: separate Redis instances.",
        example:
`allkeys-lru:    evict LRU across ALL keys ✅ (general cache)
volatile-lru:   evict LRU only among TTL keys
                ⚠️ no TTL keys → rejects writes (OOM)!
allkeys-lfu:    evict least frequently used
                better for skewed access (YouTube, Netflix)
noeviction:     reject writes when full (primary DB)

LRU vs LFU:
  Video popular for months, quiet today
  LRU: evicts it 😱 (recently unused)
  LFU: keeps it ✅ (historically popular)

Best practice:
  Redis 1: cache     → allkeys-lru
  Redis 2: sessions  → noeviction
  Separate instances, different policies ✅`
      },
    ]
  },
  {
    id: "stampede", icon: "🐃", tag: "HLD",
    title: "Cache Stampede + CDN + Invalidation",
    summary: "Stampede = popular key TTL expires, thousands hit DB simultaneously. Fix: mutex lock, background refresh. CDN = edge nodes. Invalidation = hardest problem in CS.",
    concepts: [
      {
        name: "Cache Stampede — 3 Fixes",
        explanation: "TTL expires → 10,000 simultaneous cache misses → DB overwhelmed. Fix with mutex lock (NX EX), background refresh at soft TTL, or probabilistic early expiry.",
        example:
`Problem:
  "onepiece:meta" TTL expires at 10:00:00
  10,000 concurrent requests → all MISS → all hit DB 😱

Fix 1: Mutex Lock
  SET lock:onepiece "1" NX EX 10
  NX = only if not exists (atomic)
  EX = auto-expire if holder crashes
  Client 1: gets lock → fetches DB → stores cache
  Clients 2-9999: wait → then cache HIT ✅

Fix 2: Background Refresh (best)
  soft_ttl = 3000s → refresh trigger
  hard_ttl = 3600s → actual Redis expiry
  Background job at soft_ttl:
    fetch fresh from DB → SET new value + reset TTL ✅
  Hard TTL never hit → no stampede ✅

Fix 3: Probabilistic early expiry
  Near expiry: random() < threshold → refresh early ✅`
      },
      {
        name: "CDN + Cache Invalidation",
        explanation: "CDN = 200+ edge nodes serve static content from nearest location. Pull = lazy. Push = preload. Invalidation: TTL (passive), active delete, event-driven, versioning.",
        example:
`Pull CDN (lazy, large library):
  First request → edge miss → fetch origin → cache
  All future requests → HIT ✅
  Use: Netflix browse, YouTube

Push CDN (proactive, known popular):
  Pre-push to ALL edges before release
  First user anywhere → HIT ✅
  Use: movie release day, sports events

Cache Invalidation:
  TTL:          passive, accept staleness window
  Active delete: UPDATE DB → DEL cache key ✅
  Event-driven: Kafka → Cache Service → DEL
                decoupled ✅ used by Uber, LinkedIn
  Versioning:   user:42:v1:plan → user:42:v2:plan
                version bump = instant invalidation ✅
                old keys expire via TTL

Pattern deletion:
  SCAN not KEYS (KEYS blocks Redis single thread!) ✅`
      },
    ]
  },
];

const qna = [
  { q: "Why delete cache on write instead of updating it?", a: "Race condition. Two simultaneous writes W1 and W2: W2 updates DB last but W1 updates cache last → cache stuck with W1's value forever, W2's DB write invisible. Delete is always safe — next read = fresh DB fetch regardless of write order." },
  { q: "What actually happens when TTL expires?", a: "Redis just deletes the key — no refresh, no DB call. Two mechanisms: Lazy (delete on next access if expired) + Active (background job every 100ms picks 20 random TTL keys, deletes expired). Refresh = YOUR app's responsibility after cache miss." },
  { q: "Does Redis store 3600 or current_time+3600?", a: "Absolute timestamp. expire_at = unix_time + 3600 stored as int64. Check = current_time > expire_at? O(1) comparison, no background decrement. TTL command converts back: expire_at - current_time = seconds remaining. int64 won't overflow for ~292 million years." },
  { q: "Why is Redis single threaded yet fast?", a: "Single thread = no lock contention, no context switching, no race conditions. All commands atomic by default. Speed from RAM (0.1ms) + event loop I/O (epoll handles thousands of connections without thread-per-connection). 100K-1M ops/second." },
  { q: "Who sets the mutex lock for cache stampede — Redis or client?", a: "Client. Redis has NO concept of mutex — just stores key atomically. SET lock:key '1' NX EX 10. NX=only if not exists (atomic due to single thread). EX=auto expire if client crashes. Client implements retry logic and DEL to release. Watchdog thread renews TTL every 10s during long processing." },
  { q: "Does eviction policy apply at instance, key, or content level?", a: "Instance level — one policy for entire Redis. TTL is your only per-key control. volatile-lru with all keys having no TTL = behaves like noeviction (rejects writes with OOM error). Best practice: separate Redis instances for cache (allkeys-lru) vs critical data (noeviction)." },
  { q: "HGET vs GET — what's the difference?", a: "GET = STRING type only, returns full value. HGET = HASH type only, returns one specific field. HMGET = HASH, returns multiple fields in ONE round trip. Using GET on Hash key = WRONGTYPE error. First command on a key permanently locks its type." },
  { q: "Why LTRIM after every LPUSH for watch history?", a: "Without LTRIM: 5 years × 1 video/day = 1825 entries × 500M users = 18TB just for history. LTRIM user:42:history 0 9 keeps only latest 10 items. O(1) push + bounded size. DB fallback for older history pages." },
  { q: "Why Bitmap per VIDEO not per USER for watched flags?", a: "Per video = 1000 bitmaps (one per trending video). When video leaves trending, DEL instantly. Per user = 500M bitmaps persisting forever. Memory: 500M users × 1 bit = 62.5MB per video vs 500B string keys = 25TB. 400x more efficient." },
  { q: "What is cache stampede and how do you fix it?", a: "Popular key TTL expires → thousands of simultaneous misses → all hit DB → DB dies. Fix 1: Mutex lock (SET NX EX) — only one request fetches DB, others wait. Fix 2: Background refresh at soft TTL before hard TTL expires. Fix 3: Probabilistic early expiry near TTL end. In practice use all three." },
  { q: "Why SCAN not KEYS for pattern deletion?", a: "Redis is single threaded. KEYS scans entire keyspace — blocks ALL commands for seconds on large datasets. SCAN iterates in batches of COUNT=100, non-blocking, other commands process between batches. Alternative: track keys in SET, or use versioning (cleanest)." },
];

const mock = [
  { q: "Design the Redis schema for Netflix home page for 500M users. What structures, keys, TTL?", a: "HSET user:{id} name plan avatar profile_type — Hash for multi-field profile, HMGET for 1 round trip. LPUSH+LTRIM user:{id}:history capped at 10 items (DB fallback for more). ZADD trending {score} video:id where score=views/(age+2)^1.5 with hourly buckets not per-view. SETBIT watched:video:{id} userId 1 for watched flags — 62.5MB per video vs 25TB with strings. Session TTL: EXPIRE user:{id} 1800 on every request (inactivity expiry). Active invalidation on plan change." },
  { q: "What happens when volatile-lru policy is set but no keys have TTL?", a: "volatile-lru only evicts keys that have TTL set. If ALL keys have no TTL, Redis finds zero eviction candidates. New write arrives → OOM error, write rejected. Behaves exactly like noeviction. This is a dangerous misconfiguration — if you forget to set TTL on cache keys with volatile-lru, Redis silently starts rejecting writes. Fix: use allkeys-lru for pure cache, or guarantee all cache keys have TTL." },
  { q: "Walk me through exactly what happens when a Redis key's TTL expires.", a: "TTL hits 0 → key sits dead in memory (Redis doesn't proactively scan). Two cleanup mechanisms: (1) Lazy expiry — next GET/HGET checks expiry dict, current_time > expire_at → delete key, return NULL. (2) Active expiry — background job every 100ms picks 20 random entries from expiry dict, deletes expired ones, repeats if >25% were expired. Your app gets NULL → treats as cache miss → queries DB → stores fresh value with new TTL." },
  { q: "How does Redis store TTL internally? Is it a countdown timer?", a: "Not a countdown. Redis stores absolute Unix timestamp in a separate expiry dict alongside main dict. expire_at = current_unix_time + 3600. Check = current_time > expire_at (O(1) comparison). No background decrement threads. Expiry dict only contains keys that have TTL set — background job scans only this smaller dict, not all keys. Keys without TTL never appear in expiry dict." },
  { q: "Design a rate limiter using Redis. Handle 100 req/min per user.", a: "Use ZSet with score = timestamp. On each request: ZADD requests:user:42 {now} 'req:{uuid}'. ZREMRANGEBYSCORE requests:user:42 0 (now-60000). count = ZCARD requests:user:42. count >= 100 → reject (429). Else → allow. Wrap in Lua script for atomicity. ZSet auto-sorts by timestamp, range removal cleans old requests, ZCARD gives current window count. TTL on key for cleanup: EXPIRE requests:user:42 60." },
];

const S = {
  page:  { minHeight:"100vh", background:"#08080F", color:"#D8D8E8", fontFamily:"'Courier New',monospace" },
  hdr:   { background:"#0D0D1A", borderBottom:"1px solid #1A1A2E", padding:"16px 24px", position:"sticky", top:0, zIndex:100 },
  wrap:  { maxWidth:"860px", margin:"0 auto" },
  tab:   (a) => ({ background:"none", border:"none", cursor:"pointer", padding:"10px 18px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"'Courier New',monospace", color:a?"#fff":"#444", borderBottom:a?"2px solid #E040FB":"2px solid transparent" }),
  card:  (o,tc) => ({ background:"#0D0D1A", border:`1px solid ${o?tc.border:"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"10px" }),
  pre:   { background:"#070710", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"12px 14px", fontSize:"11px", color:"#A8A8C8", lineHeight:"1.8", overflowX:"auto", fontFamily:"'Courier New',monospace", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" },
  qcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#E040FB30":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
  mcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#FF6B3550":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
};

export default function W1D2() {
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
            <div style={{ fontSize:"9px", color:"#E040FB", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 2</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>Caching — Redis Internals · Data Structures · Eviction · CDN</div>
          </div>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background:"#0A0A14", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"8px 12px", color:"#E8E8F0", fontFamily:"inherit", fontSize:"11px", outline:"none", width:"160px" }} />
        </div>
        <div style={{ ...S.wrap, display:"flex", borderTop:"1px solid #1A1A2E", marginTop:"12px" }}>
          <button style={S.tab(tab==="concepts")} onClick={() => setTab("concepts")}>📚 Concepts ({topics.length})</button>
          <button style={S.tab(tab==="qna")} onClick={() => setTab("qna")}>❓ Q&A ({qna.length})</button>
          <button style={S.tab(tab==="mock")} onClick={() => setTab("mock")}>🎯 Mock Interview ({mock.length})</button>
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
