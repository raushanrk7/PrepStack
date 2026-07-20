(function () {
  window.PrepStackRegister.notes("hld", 1, {
    concepts: `# Caching Deep Dive: Patterns, Redis Internals & CDN

## HLD — Caching (Day 2, Full Deep Dive)

### Why Cache Exists

\`\`\`
DB read from disk: seek 5-10ms + read 1-2ms ≈ 10ms per query
Cache read from RAM: ≈ 0.1ms
Cache is 100x faster than DB.

Netflix, 10M users watching simultaneously, each pings server every 5s = 2M req/sec hitting DB
DB capacity ≈ 10,000 queries/sec → 2,000,000 >> 10,000 → DB dies, everything goes down

With cache (95% hit rate typical): only 5% of requests reach DB → DB load drops 20x
\`\`\`

### Cache Patterns

### Cache Aside (Lazy Loading) — most common

\`\`\`
READ:  App → Cache → HIT? return ✅ | MISS? App queries DB → App stores in Cache → return
WRITE: App → writes to DB → App DELETES key from Cache (not update)
\`\`\`
**Why delete, not update, on write?** Race condition: two simultaneous writes racing to update the cache could leave the cache stale forever with the "losing" write's value. Delete → next read is a guaranteed-fresh DB fetch.

✅ Only caches what's requested (no wasted memory); DB failure doesn't break writes.
❌ First request always a cold miss; brief staleness window between DB write and cache delete.

### Write Through

\`\`\`
WRITE: App → Cache AND DB simultaneously, synchronously
READ:  App → Cache → always HIT (except first ever access)
\`\`\`
✅ Cache always in sync, reads always fast. ❌ Write latency doubles; cache fills with data nobody reads; cache failure breaks writes.

### Write Back (Write Behind)

\`\`\`
WRITE: App → Cache only (immediate return); Cache → DB async, later
READ:  App → Cache → HIT (always warm)
\`\`\`
✅ Fastest writes; DB gets efficient batched writes; handles write spikes well. ❌ Data loss risk if cache crashes before syncing. Used for gaming scores, analytics counters, social-media likes (approximate OK) — **NOT** for payments/orders/user data.

### Write Around

\`\`\`
WRITE: App → DB directly (cache untouched)
READ:  App → Cache → HIT? return | MISS? fetch DB → store in cache
\`\`\`
✅ Cache not polluted by write-heavy data rarely read again. ❌ First read always a miss. Used for logs, bulk imports, one-time writes.

### Comparison Table

| Pattern | Write Speed | Read Speed | Data Safety | Stale Risk |
|---|---|---|---|---|
| Cache Aside | Fast (DB) | Fast | ✅ Safe | Brief |
| Write Through | Slow (both) | Fastest | ✅ Safe | None |
| Write Back | Fastest | Fastest | ❌ Risky | None |
| Write Around | Fast (DB) | First miss | ✅ Safe | Brief |

**Interview decision framework:**
\`\`\`
Read heavy, occasional writes?           → Cache Aside (Netflix, Twitter)
Read heavy, must never be stale?         → Write Through (banking dashboards)
Write heavy, some data loss ok?          → Write Back (gaming, analytics, likes)
Write once, read rarely?                 → Write Around (logs, audit trails)
\`\`\`

### Redis Internals

**What is Redis:** In-memory key-value store ("Remote Dictionary Server"). Data in RAM (~0.1ms reads), optional disk persistence, single-threaded for commands.

**Why single-threaded yet fast:** Multi-threaded DBs need locks/mutex/coordination for concurrent access (lock contention, context switching, race conditions). Redis's single thread executes commands one-by-one — no locks needed ever, no context switching, atomic by default. Combined with RAM-only access (0.0001ms vs 10ms disk / 0.1ms SSD), Redis hits 100K-1M ops/sec.

**What about I/O?** Single thread uses **multiplexed I/O** (epoll/kqueue) — like a waiter who doesn't wait at each table, takes orders and moves on, comes back when ready. Thousands of connections handled via an event loop, no thread-per-connection needed.

**Redis Cluster (scaling):** 16384 fixed hash slots, \`slot = CRC16(key) % 16384\`. Each node has 1 primary + 1 replica; primary dies → replica promoted. Client computes slot directly — no LB needed, client library handles routing.

**Persistence:** RDB (snapshot every N seconds, small/fast restart, risk losing last N seconds) vs AOF (append-only log of every write, safer/larger/slower restart). Typically both: RDB for backups, AOF for durability (replayed on top of RDB snapshot).

**Redis vs Memcached:**

| Feature | Redis | Memcached |
|---|---|---|
| Data structures | 6+ types | String only |
| Persistence | ✅ Yes | ❌ No |
| Replication | ✅ Yes | ❌ No |
| Pub/Sub | ✅ Yes | ❌ No |
| Lua scripting | ✅ Yes | ❌ No |
| Memory | Slightly more | Slightly less |
| Speed | ~equal | ~equal |

Use Memcached for pure max-speed simple caching; Redis for almost everything else.

**Interview one-liners:**
\`\`\`
Why Redis fast? → RAM + single thread (no lock contention) + multiplexed I/O (event loop)
Why single threaded? → Avoids lock contention/context switching; commands atomic by default
Why ZSet uses skip list not BST? → Simpler implementation, better cache locality, author's choice
Redis Cluster hashing? → CRC16(key) % 16384 fixed slots, NOT consistent hashing (unlike Cassandra)
\`\`\`

### Redis Data Structures (with real examples)

### 1. String
\`\`\`
SET user:42:name "Rahul" ; GET user:42:name → "Rahul"
INCR page:views → 1,2,3... (atomic counter, no race condition even across 1000 servers)
SETEX session:abc "data" 3600 → expires in 1hr
\`\`\`
Use for: cache values, counters, session tokens, feature flags.

### 2. Hash
\`\`\`
HSET user:42 name "Rahul" plan "premium"
HGET user:42 plan → "premium"
\`\`\`
Key advantage over String: fetch ONLY the field you need, not the entire JSON blob. At 500M users, fetching one 7-byte field vs a 1KB JSON blob is a massive difference. Use for: user profiles, product details, config settings.

### 3. List
\`\`\`
LPUSH feed:user:99 "post:101"   # push new post to top
LRANGE feed:user:99 0 9         # get first 10 (feed read)
LPUSH queue:emails "job1" ; RPOP queue:emails  # simple job queue
\`\`\`
Use for: activity/news feeds, task queues, chat history, "recent items."

### 4. Set
\`\`\`
SADD likes:post:101 "user:42"     # duplicates ignored automatically
SISMEMBER likes:post:101 "user:42" → 1
SINTER friends:rahul friends:alice → mutual friends
SCARD visitors:2024-05-23 → unique visitor count
\`\`\`
Use for: who liked/followed/watched, unique visitors, tags, mutual connections, block/mute lists.

### 5. Sorted Set (ZSet) — most powerful
\`\`\`
ZADD leaderboard 15000 "rahul" ; ZADD leaderboard 23000 "alice"
ZRANGE leaderboard 0 -1 WITHSCORES   # sorted ascending
ZREVRANGE trending 0 9               # top 10 trending
ZADD requests:user:42 <timestamp> "req1"   # rate limiting via score=timestamp
ZREMRANGEBYSCORE requests:user:42 0 (now-60s)  # sliding window cleanup
\`\`\`
Use for: leaderboards, trending content, rate limiting, priority queues, time-series data.

### 6. Bitmap
\`\`\`
SETBIT watched:video:101:2024-05-23 userId 1
GETBIT watched:video:101:2024-05-23 userId → 1 or 0
BITCOUNT watched:video:101:2024-05-23 → total viewers today
\`\`\`
Extremely memory efficient: 1M users tracked = 125KB only. Use for: daily active users, video/post-seen tracking, feature flag rollout per user.

### Netflix Real-System Mapping

\`\`\`
Video metadata cache    → Hash
User watch history      → List
Trending videos         → Sorted Set (score = views × recency)
Unique daily viewers    → Bitmap
Session tokens          → String + TTL
Rate limiting           → Sorted Set (score = timestamp)
\`\`\`

### Q&A: "Same cache server for same key/userId? Or different dict per request type?"

The **key string itself** separates everything — not request type. One cache server is just ONE giant hashmap: \`{"user:42:profile"→Hash, "user:42:feed"→List, "user:42:session"→String, "leaderboard"→ZSet, ...}\`. No separate dicts per type. Convention: \`resource:id:attribute\` (e.g. \`user:42:profile\`, \`video:101:meta\`). Different services own different key patterns; two services accidentally using the same key causes a \`WRONGTYPE\` error. Same userID can span multiple cache nodes because different key strings (e.g. \`user:42:profile\` vs \`user:42:feed\`) hash to different positions — this is fine, no coordination needed.

### Q&A: "Who decides the key?"

**You (the developer) decide the key.** Redis has no schema — no tables, no columns. The key is just a string you define, at three levels: (1) individual developer for small teams, (2) team convention (documented pattern, e.g. \`{service}:{resource}:{id}:{attribute}\`), (3) internal SDK/library that auto-generates keys consistently across large orgs.

**Key design rules:** (1) always namespace (\`user:42\` not \`42\`); (2) keep it short (millions of keys × long names = wasted RAM); (3) use a consistent separator (colon \`:\` is Redis standard); (4) include a version if schema changes (\`user:42:profile:v2\` avoids stampede during migration).

### Q&A: "Do we send the key after hashing, or does it get hashed at the cache server?"

Key is sent as a **plain string**; hashing happens **client-side** (app server / client library).
\`\`\`
1. redis.get("user:42:profile")
2. Redis CLIENT LIBRARY hashes internally: slot = CRC16("user:42:profile") % 16384 → Node C2
3. Client sends the plain string key to C2: GET user:42:profile (no hash sent over network)
4. C2 looks up its own internal hashmap, returns value
\`\`\`
Two distinct hashes exist: **Routing hash** (client-side, CRC16, decides which node, never sent over network) vs **Storage hash** (internal to the Redis process, decides which memory bucket). Client-side routing avoids an extra network hop (client → correct node directly, 1 hop) vs server-side forwarding (client → any node → forwards, 2 hops).

### Q&A: "How do we decide which data store based on key? What defines type?"

**The key alone tells Redis nothing about type — the COMMAND you use decides.**
\`\`\`
SET  user:42:feed "hello"     → String
LPUSH user:42:feed "post:1"   → List
HSET  user:42:feed name "x"   → Hash
\`\`\`
The **first command** used on a new key **locks its type permanently**. Using an incompatible command afterward (\`HSET\` on a key that was created via \`LPUSH\`) throws \`WRONGTYPE Operation against a key holding the wrong kind of value\`. Redis internally stores \`{type, encoding, value}\` alongside every key. To change purpose, you must use a **different key name** (e.g. \`user:42:feed\` = LIST, \`user:42:feed:settings\` = HASH, \`user:42:feed:seen\` = SET) — same type CAN be reused across many different keys with completely different intentions (the key name expresses intention, the type is just the storage mechanism).

**Storage location clarification:** type has nothing to do with WHERE a key is stored — \`hash(key) % buckets\` decides the bucket; two keys of the same type (e.g. two Lists) can live in totally different buckets because their key strings hash differently.

### Redis Internal Hash Table (Bucket/Collision Mechanics)

Redis uses a **hash table**, not an array with numbered slots.

\`\`\`
index: [0]  [1]  [2]  [3]  [4]  [5]  [6]  [7]
        │         │              │
       NULL  "user:42"  NULL   "feed:99"  NULL...
\`\`\`
Empty bucket = **NULL pointer**, not "-1" (no wasted memory for empty slots — just an 8-byte NULL). Collision handling = **chaining** (linked list per bucket):
\`\`\`
bucket[3] → "user:42:profile" → "user:42:feed" → NULL
\`\`\`
Each entry stores \`{key, type, encoding, value pointer, lru_clock, lfu_freq}\`.

**In C internally (Redis is written in C):**
\`\`\`c
typedef struct dictEntry {
    void *key;
    union { void *val; uint64_t u64; int64_t s64; double d; } v;
    struct dictEntry *next;
} dictEntry;

typedef struct redisObject {
    unsigned type:4;      // STRING/LIST/HASH/SET/ZSET
    unsigned encoding:4;  // how stored internally
    unsigned lru:24;      // last access time (or LFU freq, reused field)
    int refcount;
    void *ptr;            // pointer to actual data
} robj;
\`\`\`
The **bucket** is a typeless \`dictEntry*\` pointer; the **entry** holds a generic \`void*\` that can point to ANY data structure; the **\`robj\`** wrapper is where the actual \`type\` field lives. Chain: \`bucket[3] → dictEntry{key, val→robj{type:LIST, ptr→quicklist[...]}, next}\`.

**Redis stores the actual plain key string**, not just its hash — required for (1) collision verification (confirm it's really the key you're looking for, not a hash collision) and (2) \`SCAN\`-based pattern matching, which needs to compare literal key strings against a glob pattern. Memory cost: ~20 bytes/key average × millions of keys = tens of MB, acceptable.

**Resizing (rehashing):** Redis tracks load factor (\`total_keys / total_buckets\`); load > 1.0 → double bucket array size and rehash (background, incremental, non-blocking); load < 0.1 → halve. This keeps chains short and lookup O(1) average.

### Eviction Policies

Redis lives in RAM; when full, must either reject writes or evict old keys.

| Policy | Behavior |
|---|---|
| \`noeviction\` (default) | Don't evict — reject new writes with OOM error. Use for Redis-as-primary-DB / session store where you can't afford ANY data loss |
| \`allkeys-lru\` | Evict Least Recently Used key across ALL keys. Most common, general cache use |
| \`volatile-lru\` | Same as allkeys-lru but ONLY evicts keys that have a TTL set; keys without TTL are protected |
| \`allkeys-lfu\` | Evict Least Frequently Used key across ALL keys — better than LRU for skewed access (e.g. a key popular for months but idle 1 day would be wrongly evicted under LRU but kept under LFU) |
| \`allkeys-random\` | Evict a random key — rarely used |
| \`volatile-ttl\` | Evict the key with the SHORTEST remaining TTL first |

**TTL (Time To Live)** is separate from eviction — automatic expiry after N seconds: \`SET session:42 "token" EX 3600\`. Used for sessions, OTPs, cache entries, rate-limit windows.

**LRU vs LFU decision examples:**
\`\`\`
E-commerce product pages (recency matters)   → LRU
YouTube video metadata (top 1000 = 90% traffic, some viral forever) → LFU
News website (today's hot, last week's cold) → LRU
Gaming leaderboard (top players always hit)  → LFU
\`\`\`

**How Redis implements LRU — approximate, not true LRU:** true LRU (doubly linked list + hashmap) has memory overhead; Redis instead samples N random keys (default N=5) and evicts the least-recently-used among that sample — less memory, close enough in practice, higher N = more accurate.

**Config:**
\`\`\`
maxmemory 4gb
maxmemory-policy allkeys-lru
\`\`\`

**Decision framework:**
\`\`\`
Pure cache, general use?              → allkeys-lru
Popular content, skewed access?       → allkeys-lfu
Mix of permanent + temporary keys?    → volatile-lru
All keys have TTL?                    → volatile-ttl
Redis as primary DB?                  → noeviction
\`\`\`

### Q&A: Internal storage for eviction (buckets, "-1"?)

**Q: "Does it pick N random keys and delete their data? Do these keys get stored in an array, do we maintain open slots marked -1 if no key?"**

No "-1" markers — empty bucket = NULL pointer (confirmed as correct intuition). Full internal picture:
\`\`\`
bucket[0]: NULL
bucket[1]: → [user:42:feed, LIST, lru:1000] → [user:99:feed, LIST, lru:800]
bucket[3]: → [leaderboard, ZSET, lru:999]
\`\`\`
Eviction uses the same structure: for \`allkeys-lru\`, pick 5 random buckets, compare \`lru_clock\` field of each entry, delete the entry with the lowest (oldest) value. For \`allkeys-lfu\`, same mechanism but compares \`lfu_freq\` instead.

### Q&A: "Two dicts overall — is that the complete picture?"

Confirmed: **exactly two hash tables total** in Redis — no extra hidden data structures.
\`\`\`
Main Dict:   ALL keys + values (every key, regardless of TTL)
Expiry Dict: ONLY keys that have a TTL set (a small index/subset of Main Dict)
\`\`\`
No separate LRU list exists either — the LRU/LFU tracking field (\`robj.lru\`, 24 bits) lives **inside every value object in the Main Dict**. For LFU mode, Redis reuses the same 24-bit field with a different interpretation: top 16 bits = last decay time, bottom 8 bits = access frequency counter.

### TTL Internals — Lazy + Active Expiry, Absolute Timestamps

**Q: What happens when TTL expires? How is it maintained/updated?**

Two mechanisms work together:
- **Lazy Expiry (primary):** Redis does NOT scan-and-delete the instant TTL hits 0 (too expensive at scale). Instead: next \`GET\` on that key checks "is TTL expired?" → if yes, deletes it right then, returns NULL. Key sits dead in memory until someone actually requests it.
- **Active Expiry (secondary):** background job every 100ms picks 20 random keys **with TTL**, deletes any expired ones; if >25% were expired, repeats immediately (else waits for next cycle). This cleans up unaccessed expired keys.

**Storage:** TTL is stored as an **absolute Unix timestamp** (e.g. \`expire_at = current_time + 3600 = 1716003600\`), NOT a countdown — avoids needing per-second decrement across millions of keys; check is a simple O(1) comparison \`current_time > expire_at?\`. The \`TTL key\` command converts this back to "seconds remaining" for display.

**Overflow question raised by user:** Unix timestamp today (~1.7 billion) fits easily in the expiry dict's **int64** value (won't overflow for ~292 million years). But the \`robj.lru\` field is only **24 bits** (max ~16.7 million) — it stores a masked/truncated clock that **wraps around every ~194 days**, like an odometer. Redis compensates in comparison logic: \`if (lru_a - lru_b) > (max_lru/2): assume wrap-around occurred, reverse the comparison\`. Practical impact is minimal since most keys don't sit untouched for 194 days, and LRU is approximate anyway.

**Two dicts recap:**
\`\`\`
Main dict:   "onepiece:meta" → value (robj with type, encoding, lru, ptr)
Expiry dict: "onepiece:meta" → 1716003600 (absolute expiry timestamp; only if TTL set)

PERSIST onepiece:meta → removes entry from expiry dict only; main dict entry stays.
Key expires → removed from BOTH dicts.
\`\`\`

**Q: "The cache never fetches from DB itself, right? It's the app's responsibility?"**
Confirmed: **Redis is dumb storage.** It stores key-value, expires keys, evicts keys — but knows nothing about the DB and never fetches or repopulates itself. On a cache miss Redis just returns NULL and is done; the app must go to DB, get data, and explicitly tell Redis to store it. This is exactly why cache patterns (Aside/Through/Back) exist — they define what the APP does, not what Redis does automatically. One-liner: *"Redis = warehouse, DB = factory, App = worker. Worker checks warehouse first; empty? goes to factory, brings goods back. Warehouse never goes to the factory itself."*

### Distributed Locks / Mutex in Redis

**Q: "Who sets the mutex — Redis server or client?"**

The **client** implements locking using Redis commands; Redis itself has **no concept of "lock"** — it just atomically stores a key.

\`\`\`
SET lock:onepiece "1" NX EX 10
NX = only set if Not eXists
EX = auto-expire in 10s (safety net for crashes)

Client 1: SET ... NX EX 10 → success, has lock
Client 2: SET ... NX EX 10 → fail (key exists) → retry/wait
Client 1: finishes → DEL lock:onepiece (release)
Client 2: SET ... NX EX 10 → success now
\`\`\`
Atomic because Redis is single-threaded — no two clients can race on the same \`SET NX\`.

**Why \`EX\` matters (crash safety):** if Client 1 crashes mid-operation without releasing the lock, without \`EX\` the lock is stuck forever and everyone blocks. With \`EX 10\`, the lock auto-deletes after 10s and the system self-recovers.

\`\`\`python
def get_with_lock(key):
    lock_key = f"lock:{key}"
    acquired = redis.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            value = db.query(key)
            redis.set(key, value, ex=3600)
            return value
        finally:
            redis.delete(lock_key)
    else:
        time.sleep(0.1)
        return redis.get(key)  # probably cached now
\`\`\`

**Q: "What does EXPIRE actually mean — does it mean 'never set again'?"** No — \`EX 10\` just means the key auto-deletes after 10 seconds; after deletion, the NEXT \`SET NX\` on that key succeeds normally (nothing is "permanently blocked").

**Follow-up problem — lock TTL shorter than processing time:** if payment processing takes longer than the lock's \`EX\` value, the lock expires mid-processing and a second consumer can acquire it, causing double-processing. **Fix — Watchdog/Lock Renewal pattern:** a background thread renews the lock's TTL periodically (e.g. every 10s) while the main thread is still processing; if the main thread crashes, the watchdog dies with it and the lock naturally expires via \`EX\`. This is the basis of **Redlock**, and libraries like **Redisson** (Java) implement it automatically (\`lock.lock()\` auto-renews internally). Netflix/Uber use this pattern for distributed locking in production.

**Idempotency-based duplicate-payment prevention (from the Uber mock, related topic):** combine a Redis distributed lock (\`SET lock:payment:123 NX EX 30\`) with a DB existence check (\`SELECT * FROM payments WHERE rideId=123\`) inside the lock — this prevents the race where two "at-least-once" duplicate messages both check "not exists" before either has inserted.

### Cache Stampede (Thundering Herd)

**What it is:** popular key's TTL expires at the exact moment thousands of concurrent requests arrive → all get cache MISS simultaneously → all hit DB at once → DB dies.

**3 Solutions:**

1. **Mutex Lock** — first request acquires a lock (\`SET lock:X NX EX 10\`), fetches from DB, populates cache, releases; others wait for the lock then read the now-warm cache. Problem: if the lock holder crashes without \`EX\`, others wait forever — fixed by always setting \`EX\`.

2. **Probabilistic Early Expiry** — don't wait for TTL to hit 0; randomly refresh before expiry based on a formula (\`current_time - (ttl_remaining × β × log(rand()))\`), or simply: when TTL is <10% remaining, each request has an X% chance to refresh early. By the time real TTL hits 0, cache is already fresh.

3. **Background Refresh** — separate soft_ttl/hard_ttl pair. At \`soft_ttl\` a background job quietly fetches fresh data and resets TTL; by \`hard_ttl\` the cache already has fresh data, so no miss ever happens. Used by Netflix, Facebook.

**Bonus — Cache Warming:** prevent cold-start stampede when a brand-new cache node comes online empty — pre-populate it with top N popular keys from DB before it takes live traffic.

**Which solution when:** simple system → mutex lock; high traffic, can't wait → background refresh (Netflix approach); avoid complexity → probabilistic early expiry; large scale → use all three together.

### Q&A: The soft_ttl/hard_ttl gap the user caught

**Q: "Refresh happens only if someone requests after soft_ttl — otherwise it just expires, right?"** This is a real gap the user correctly identified: **request-triggered** soft-TTL refresh ("stale-while-revalidate") only works if traffic exists between soft and hard TTL; for low-traffic keys with no requests in that window, the key still expires and the next request is a miss (stampede risk re-emerges).

**Real fix — dedicated background job** independent of requests: maintain a separate ZSET as an "expiry tracker" (\`ZADD expiry:tracker <soft_ttl_timestamp> "key_name"\`), and every 60 seconds scan \`ZRANGEBYSCORE expiry:tracker 0 (now)\` to proactively refresh keys approaching expiry — no request needed to trigger it.

**Best-practice combination:**
\`\`\`
High traffic keys (homepage)     → stale-while-revalidate (traffic guarantees the refresh happens)
Low traffic keys (obscure content) → dedicated background job with ZSET tracker
Critical keys (payment config, auth) → no TTL at all, manual invalidation only
\`\`\`

**Q: "What do you mean by 'refresh' — updating the key's value, or something else?"** Refresh means fetching fresh data from DB **and overwriting** the cached value, **not just extending the TTL** on stale data. \`EXPIRE onepiece:meta 3600\` alone (just resetting TTL) would leave stale data alive for another hour — the correct refresh is \`fresh_data = DB.query(...); SET onepiece:meta fresh_data EX 3600\` (new value + new TTL together).

**Q: "What happens at TTL — do they just get removed, or refreshed?"** TTL hitting 0 **just deletes the key** — nothing more. Redis has zero knowledge of the DB and never refreshes anything on its own; that responsibility is entirely the app's (this reinforces the "cache is dumb storage" principle above). One-liner: *"TTL = expiry date on food. When it expires, food thrown away. You go buy fresh food yourself. Redis doesn't buy the food for you."*

**Q: "What exactly do soft_ttl and hard_ttl mean?"** **Hard TTL** = the real Redis TTL (\`SET key val EX 3600\`) — Redis deletes the key when it hits 0. **Soft TTL** is NOT a Redis feature at all — it's a threshold YOU check in application code (\`if redis.ttl(key) < 600: refresh_now()\`), used purely to trigger a proactive refresh before the real (hard) expiry happens.

### CDN — Content Delivery Network

**The problem without a CDN:** server in Mumbai, user in New York → round trip ~200ms network latency; 1M users worldwide all hitting one Mumbai server → overwhelmed, high latency for everyone.

**What CDN does:** 200+ edge servers worldwide (Points of Presence). User routes to nearest edge node — latency drops from 200ms to ~5ms.

**What CDN caches:** ✅ static assets (images/CSS/JS/fonts), videos, mostly-static HTML, cacheable API responses. ❌ dynamic personalized data, real-time data, authenticated responses.

**Request flow:** first request (cache miss) — edge pulls from origin, caches, returns; all future requests from that region hit the edge (HIT), origin never touched again.

### Pull CDN vs Push CDN

**Pull CDN (most common):** CDN pulls from origin only on first request (origin does nothing upfront). Good for unpredictable/large content libraries — Netflix, YouTube use this.

**Push CDN:** you push content to ALL edge nodes upfront, before any request. First user anywhere is always a HIT. Good for known-popular content, small libraries, predictable traffic (sports events, movie releases).

| | Pull | Push |
|---|---|---|
| First request | Miss possible | Always HIT |
| Storage | Only popular | Everything |
| Control | CDN decides | You decide |
| Use case | Large library | Known popular |
| Example | Netflix browse | Movie release day |

**CDN + Consistent Hashing:** edge nodes use consistent hashing to decide which edge caches what content — \`hash("onepiece.jpg") → Edge Node NY\` — ensures all NY-area users always hit the same edge node (max cache hit rate), unlike round-robin which would cause a miss on every different edge.

**Cache Invalidation on CDN:**
1. **TTL expiry** — \`Cache-Control: max-age=86400\`, simple but stale up to 24hrs.
2. **Purge API** — Cloudflare/Akamai provide \`POST /purge {url}\` → deletes from all edges, instant but costs API calls.
3. **Versioned URLs** — \`onepiece-v2.jpg\` instead of overwriting \`onepiece-v1.jpg\`; new URL = automatic fresh fetch, old URL harmlessly stays cached. Best practice for static assets.

**Providers:** Cloudflare (most popular, free tier), AWS CloudFront, Akamai (enterprise/oldest), Fastly (developer friendly).

Interview one-liner: *"CDN = geographically distributed cache for static content. Reduces latency by serving from nearest edge node. Pull CDN = lazy load on first request. Push CDN = preload known popular content. Invalidation via TTL, purge API, or versioned URLs."*

### Cache Invalidation

Phil Karlton: *"There are only two hard things in Computer Science: cache invalidation and naming things."*

**The core problem:** DB updates but the cache copy doesn't — e.g. user upgrades to premium in DB but cache still says "free," so the app denies premium content despite the DB being correct.

### 4 Strategies

1. **TTL Based (Passive)** — just let it expire naturally (up to N seconds stale). Good for non-critical/rarely-changing data (video metadata, product descriptions). Bad for payment status/permissions.

2. **Write Through Invalidation (Active Delete)** — every DB write immediately \`DEL\`s the cache key. Delete (not update) avoids race conditions where two concurrent writes could leave the cache with a stale "winner" value; a delete guarantees the next read is a fresh DB fetch.

3. **Event Driven Invalidation** — a message queue propagates the invalidation across decoupled services: \`{event: "user.plan.updated", user_id: 42, new_plan: "premium"}\` → Cache Service subscribes and invalidates. Used by Uber, LinkedIn at scale.

4. **Cache Aside with Version** — store a version number alongside cached data; compare to DB's version on every read, refresh if mismatched. Expensive (DB call every read) — only for critical data.

**Granularity:** Key-level (\`DEL user:42:plan\` — precise, efficient) vs Pattern-level (\`DEL user:42:*\` conceptually — broader, more misses).

**Distributed invalidation problem:** with multiple cache nodes, an invalidation message could be lost if a node is temporarily down (it comes back still stale). Solutions: TTL as a safety net (data expires eventually regardless), invalidation via a durable message queue (guaranteed delivery), or versioning (stale data detected on next read).

**Which strategy when:**
\`\`\`
Data changes rarely, some staleness ok? → TTL based
Data changes, must be fresh quickly?    → Active delete on write
Microservices, decoupled teams?         → Event driven (Kafka/SQS)
Critical data, cannot afford stale?     → Version based + TTL safety net, or skip cache entirely
\`\`\`

Interview one-liner: *"Cache invalidation = ensuring cache stays consistent with source of truth. TTL = passive, accept staleness window. Active delete = on every write, delete key. Event driven = decouple via message queue. Versioning = detect stale on read. In practice use ALL: active delete for known writes + TTL as safety net for missed invalidations + short TTL for critical data."*

### Q&A: Pattern deletion (\`DEL user:42:*\`) — how does it actually work?

Redis does **NOT** support pattern-based \`DEL\` directly — \`DEL user:42:*\` doesn't work; \`DEL\` needs exact key names.

**Option 1 — SCAN + DEL (correct way):**
\`\`\`
SCAN 0 MATCH user:42:* COUNT 100   → returns matching keys in small batches
DEL <each key>                     → delete them individually/in bulk
\`\`\`
\`\`\`python
cursor = 0; keys_to_delete = []
while True:
    cursor, keys = redis.scan(cursor, match="user:42:*", count=100)
    keys_to_delete.extend(keys)
    if cursor == 0: break
if keys_to_delete: redis.delete(*keys_to_delete)
\`\`\`
**Why \`SCAN\` not \`KEYS\`?** \`KEYS user:42:*\` scans the entire keyspace at once and, since Redis is single-threaded, **blocks all other commands** — with 1M keys, Redis freezes for seconds. \`SCAN\` iterates in small non-blocking batches, safe for production.

**Option 2 — Track keys yourself:** maintain \`SADD user:42:keys "user:42:plan"\` etc. as you create keys, then on invalidation \`SMEMBERS user:42:keys\` gives exactly the keys to delete (plus clean up the tracker set itself) — O(N) for just this user's keys, no full-keyspace scan.

**Option 3 — Namespace + Versioning (cleanest):** \`user:42:v1:plan\` → bump to \`user:42:v2:plan\` on change; old v1 keys are simply never requested again and clean themselves up via TTL — no explicit deletion needed at all.

### Q&A: "Do they store all keys, or just the hashed value?"

Redis stores the **full plain key string**, not just a hash. This is necessary because: (1) \`SCAN\`'s pattern matching needs the literal string to compare against a glob pattern (a hash number tells you nothing about whether it matches \`user:42:*\`); (2) collision verification inside a bucket needs the original string to confirm "is this really the key I'm looking for, or a hash collision with a different key." Memory cost is small (~20 bytes average key length) and considered worth it — hence key-naming brevity still matters at scale (100M keys × longer names = GBs difference).

### Q&A: Eviction Policy Scope — Instance-level, not per-key

**Q: "Does eviction policy apply in general, or at key/content level?"**

Eviction policy is set **once for the entire Redis instance** (\`CONFIG SET maxmemory-policy allkeys-lru\`) — there is no per-key or per-content-type policy. The only per-key lever you have is **TTL** — e.g. with \`volatile-lru\`, only keys that HAVE a TTL are eviction candidates; keys without TTL are automatically protected. Common production pattern: either mix permanent (no-TTL) keys with a \`volatile-*\` policy in one instance, or (cleaner) **run separate Redis instances** — one for pure cache (\`allkeys-lru\`, everything evictable) and one for session/config data (\`noeviction\`, never evicted).

**Follow-up Q: "What happens under \`volatile-lru\` when ALL keys have no TTL and a new key comes in — does it just reject the write?"** Confirmed yes — if \`volatile-lru\`/\`volatile-lfu\`/\`volatile-ttl\`/\`volatile-random\` find **zero eviction candidates** (no TTL keys exist), the write is rejected with an OOM error, functionally identical to \`noeviction\`. This is flagged as a dangerous misconfiguration risk: teams assuming \`volatile-lru\` "protects" their permanent keys can be surprised when forgetting to set TTL on cache keys causes the whole instance to start rejecting writes. Safety recommendation: use \`allkeys-lru\` for pure cache (always has eviction candidates, never rejects), and only use \`volatile-*\` when TTL presence is guaranteed.`,
    qa: [
    { q: 'Cache-aside: on a write, why delete the cache key instead of updating it?', a: `Two concurrent writes racing to update the cache could leave it stale forever with the 'losing' write's value. Deleting instead guarantees the next read is a fresh DB fetch. This is the standard cache-aside (lazy loading) pattern used by Netflix and Twitter for read-heavy workloads.` },
    { q: 'Why is Redis single-threaded, and how is it still so fast?', a: `A single thread means no locks, no context switching, and every command is atomic by default -- multi-threaded stores need coordination overhead for concurrent access. Combined with RAM-only access (~0.1ms vs ~10ms disk) and multiplexed I/O (epoll/kqueue event loop handling thousands of connections without a thread per connection), Redis reaches 100K-1M ops/sec.` },
    { q: "What's the real difference between a cache's eviction policy and its TTL?", a: `TTL is a per-key expiry you set explicitly (SET key val EX 3600) -- unrelated to memory pressure. Eviction policy (allkeys-lru, allkeys-lfu, volatile-lru, noeviction, etc.) is set once for the whole Redis instance and decides what to remove when memory is full. A dangerous misconfiguration: under volatile-lru, if zero keys have a TTL, there are no eviction candidates and new writes get rejected with an OOM error -- functionally identical to noeviction.` },
    { q: 'What causes a cache stampede and how do you prevent it?', a: `A popular key's TTL expires at the exact moment thousands of concurrent requests arrive -- all miss simultaneously and hammer the DB at once. Three fixes: (1) a mutex lock so only the first request repopulates the cache while others wait; (2) probabilistic early expiry, refreshing slightly before the real TTL; (3) background refresh via a soft/hard TTL pair, so a background job refreshes before real expiry ever happens (what Netflix and Facebook do).` },
    { q: "Why can't you just DEL a wildcard pattern like user:42:* in Redis?", a: `Redis's DEL needs exact key names -- there's no built-in pattern delete. The correct approach is SCAN (not KEYS, which blocks the single-threaded server on large keyspaces) to iterate matching keys in small non-blocking batches, then DEL each one. Alternatives: track a set of a user's keys yourself, or use a versioned key namespace (user:42:v2:...) so old keys simply age out via TTL.` },
    { q: 'Pull CDN vs push CDN -- when do you use each?', a: `Pull CDN fetches from origin lazily on first request -- good for large, unpredictable content libraries (Netflix browsing). Push CDN preloads content to all edges upfront so the first request anywhere is always a hit -- good for known-popular, predictable content (a movie release day). CDN edge selection itself commonly uses consistent hashing so all users in a region hit the same edge node for maximum hit rate.` }
  ],
    mock: { easy: [], medium: [], hard: [
      { q: 'Design the caching layer for the Netflix homepage (500M users): user profile, watch history, trending videos, watched-flags. Full transcript of a senior/L5-L6 style grilling, with scoring.', a: `### Mock Interview #1 — Netflix Homepage Redis Design (Senior SDE / L5-L6 style)

*User asked Claude to switch into strict "interviewing for Meta/MSFT senior position" mode. Full transcript of the grilling below — genuinely excellent interview-prep material.*

**Setup:** Designing Netflix home page for 500M users. Home page needs: (1) user's name+plan, (2) watch history (last 10 videos), (3) trending videos globally with view counts, (4) has-this-user-watched-each-trending-video (✓ badges).

### Q1 — User Profile: Hash vs String?

Candidate initially said "String, no point of Hash for single data." Interviewer pushback: the profile needs BOTH name AND plan — two String keys = 2 network round trips; one Hash key = 1 round trip via \`HMGET user:42 name plan\`. At 500M users this round-trip difference matters enormously. **Verdict: Hash wins for multi-field profiles fetched together.**

Follow-up: candidate then over-included fields (age, gender). Interviewer pushed: "Should these even be cached? How often do they change vs how often does home page need them?" Correct instinct confirmed: don't cache fields the page doesn't read. Memory calculation exercise: candidate's naive \`500M × 20 bytes × 2 fields = 20GB\` missed Redis's per-key/per-field overhead (~150-200 bytes realistic total incl. metadata/pointers) → realistic estimate closer to **100GB**, reinforcing "cache only what's actually needed."

Interviewer caught a missed **security/compliance field**: \`profile_type: "kids"/"adult"\` for content filtering — "wrong value cached → kids sees adult content → legal liability at Netflix scale." This is called out as the kind of field that separates L5 from L6 thinking.

**Expected final schema:**
\`\`\`
HSET user:{id}
  name         "Rahul"    (UI display)
  plan         "premium"  (access control)
  avatar_url   "cdn/x.jpg"(UI display)
  profile_type "adult"    (content filtering — security)

TTL: session-based not time-based
  EXPIRE user:{id} 1800  ← refresh on every active request (30min inactivity window)
Invalidate immediately on: plan change → DEL user:{id}; profile change → DEL user:{id}
\`\`\`
Candidate's TTL reasoning ("1hr, if no login within that hour no need") was flagged as incomplete — doesn't handle a user actively watching for 3hrs straight (mid-session cache miss). Correct pattern: **session-based TTL that refreshes on every request**, not a fixed clock.

**Score: Q1 = 7.5/10.**

### Q2 — Key Naming Strategy

Candidate proposed an elaborate short-code registry (e.g. auto-shortened key segments with a reverse-mapping API). Interviewer rejected this as **over-engineering**: (1) the registry itself becomes a new dependency/failure point, (2) 3am production debugging becomes a nightmare with cryptic codes, (3) the candidate had already stated the correct answer themselves — \`{resource}:{id}:{attribute}\` (e.g. \`user:42:plan\`, \`post:101:likes\`) is the actual industry standard at Meta/Google: short enough, meaningful enough, no registry needed.

**Score: Q2 = 5/10** — "creative but over-engineered; you actually stated the correct answer yourself."

### Q3 — Watch History (unbounded List problem)

Candidate correctly identified capping at last N items with a DB fallback for more, but initially confused **eviction policy (\`allkeys-lru\`)** with **List ordering** — these are unrelated Redis mechanisms (LRU affects which entire KEYS get evicted under memory pressure; it has nothing to do with the internal order of items inside one List). Interviewer also corrected a complexity misconception: \`LRANGE key 0 9\` is **O(K)** where K=10 fetched items, not O(N) of the full list.

**The actual fix (candidate derived independently after a nudge): \`LTRIM\`.**
\`\`\`
LPUSH user:42:history "video:55"
LTRIM user:42:history 0 9     ← keep only last 10, every single write
\`\`\`
This keeps the list permanently bounded — O(1) push, O(10) trim (constant) — exactly what Netflix does; deeper history pages are served from the DB.

**Score: Q3 = 7/10.**

### Q4 — Trending ZSet: Score Formula, Windowing, Cleanup

This was the deepest exchange of the mock and the user derived most of the industry-standard solution **independently**:

- **Naive formula** (\`views × recency_factor\`) was pushed on: what about a midnight hard-reset dropping a 9.9M-view video to 0 instantly? User self-corrected to a **sliding window** (rolling 24hr, not calendar-day reset) — praised as smart, correct direction.
- Interviewer pushed the actual industry formula (borrowed from Reddit/HackerNews): 
  \`\`\`
  score = views / (age_in_hours + 2)^gravity      (gravity typically 1.5–1.8)
  \`\`\`
  User correctly reasoned: \`gravity=0\` → pure view count, old viral videos never leave trending (bad); \`gravity=1.5\` → sweet spot, balances popularity vs recency; \`gravity=3\` → recency dominates too aggressively, trending changes too fast (bad UX).
- **Per-view ZSET entries would be catastrophic at scale** (10M views/video/day = billions of entries). User derived **hourly bucketing** independently: \`ZADD video:101:views <hourly_count> "bucket:2024-05-23-14"\` — only 24 entries/video max, rolling-window sum = last-24hr views. Called out explicitly as "exactly what YouTube/Netflix does" (Twitter uses 1-min buckets, YouTube uses 1hr).
- **Update frequency:** user reasoned every-view updates (millions/sec) aren't worth it; hourly batch recompute is fine since "trending doesn't need second-level accuracy." Praised as senior-level tradeoff reasoning.
- **Efficient recompute (standout answer, zero hints given):** user independently proposed maintaining an \`active:videos:current\` SET — only videos that received ≥1 view in the last hour get recomputed (10M videos total but maybe only 1000 active/hour) — "This is exactly how Netflix does it. You arrived at it independently."
- **Cleanup command** (\`ZREMRANGEBYSCORE trending 0 {threshold}\` to remove near-zero-score stale videos) — user didn't recall the exact command; interviewer supplied it.

**Score progression through Q4:** sliding window 10/10, bucketing 10/10, gravity formula 8/10, update frequency 9/10, active-SET optimization 10/10 (standout), cleanup command 0/10 (didn't know it). **Overall Q4 = 8.5/10 — "strongest answer so far."**

### Q5 — Watched-Flag Bitmap (500 Billion Keys Problem)

Naive approach (\`u:{id}:vid:{id}:watched\` per user per video) = **500M users × 1000 trending videos = 500 BILLION keys** — flagged as the core scale problem to solve.

User correctly identified **Bitmap** as the fix, then correctly reasoned **bitmap-per-VIDEO (not per-user)**: "since trending will be changing we need to maintain only for however many are trending" — validated as exactly right, because bitmaps per video can simply be deleted (\`DEL watched:video:101\`) the instant a video leaves trending, whereas per-user bitmaps would persist forever for every user regardless of activity.

\`\`\`
SETBIT watched:video:101 42 1    # mark user 42 watched video 101
GETBIT watched:video:101 42      # check → 1 or 0
\`\`\`

**Memory math (done correctly by candidate):** 1M users → 1M bits / 8 = 125KB per video; 500M users → 62.5MB per video; ×1000 trending videos = **62.5GB total** — vs the naive String approach's ~25TB (500B keys × ~50 bytes) — a **400x memory improvement**.

**Score: Q5 = 10/10 — perfect answer, across bitmap choice, per-video reasoning, SETBIT/GETBIT syntax, and memory math.**

### Overall Mock #1 Scorecard

| Question | Topic | Score |
|---|---|---|
| Q1 | User Profile Hash | 7.5/10 |
| Q2 | Key Naming | 6/10 |
| Q3 | Watch History | 7/10 |
| Q4 | Trending ZSet | 8.5/10 |
| Q5 | Bitmap watched flag | 10/10 |
| **Overall** | | **7.8/10** |

**Honest hire assessment (verbatim structure from transcript):**
- **Strengths:** strong data-structure instincts, good scale reasoning, active-SET optimization (standout/independent), bitmap memory math, sliding-window+bucketing, event-driven thinking, never argued when corrected (took feedback well).
- **Gaps:** exact Redis command syntax (\`HMGET\`, \`LTRIM\`, \`ZREMRANGEBYSCORE\`), session-based TTL pattern, security/compliance fields (\`profile_type\`), incomplete memory-overhead calculations.
- **Verdict: "PASS TO NEXT ROUND."** Realistic level: **Strong L4 / Borderline L5** — "not in thinking (already L5 level), gap is in execution speed and syntax fluency." Explicit note: candidate had never used Redis before this session, which the interviewer called "extremely impressive" given the reasoning quality shown.

**Recommended homework (verbatim from transcript):** skim once through \`GET SET INCR SETEX\` (String), \`HGET HSET HMGET HGETALL HINCRBY\` (Hash), \`LPUSH LRANGE LTRIM\` (List), \`SADD SREM SISMEMBER SCARD\` (Set), \`ZADD ZRANGE ZRANK ZREMRANGEBYSCORE ZINCRBY ZREVRANK\` (ZSet), \`SETBIT GETBIT BITCOUNT\` (Bitmap), \`TTL EXPIRE DEL SCAN\` (general).` }
    ] },
    days: {}
  });
})();
