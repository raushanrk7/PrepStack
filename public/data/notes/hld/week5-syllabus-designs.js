// HLD — syllabus supplement: Design Case Studies (PDFs 25-35). Merges into week 5 (Mock & Review).
(function () {
  window.PrepStackRegister.notes("hld", 5, {
    concepts: `# Design Case Studies (Syllabus 25–35)

## E-commerce product listing
- Read-heavy catalog: product service + DB, but LISTING is a search problem → Elasticsearch index fed by CDC from the catalog DB.
- Facets (brand/price/rating) = ES aggregations. Cache hot category pages (Redis, short TTL) + CDN for images.
- Inventory is separate & write-hot: don't join at query time — denormalize a "in stock" flag refreshed async; exact check only at add-to-cart/checkout.
- Ranking: relevance × business signals (margin, CTR) — precompute scores offline, blend at query.

## Rate limiter (as a system)
- Algorithms: token bucket (bursts ok — the default), sliding window counter (smooth, cheap), sliding log (exact, memory-heavy), fixed window (boundary burst flaw — know why it's wrong).
- Distributed: counters in Redis (INCR + EXPIRE, atomic via Lua) keyed user:api:window. Race-free because Redis is single-threaded per key.
- Placement: API gateway middleware. Return 429 + Retry-After + X-RateLimit-* headers.
- Scale: shard Redis by key; local in-process pre-limit to cut Redis round-trips; eventual sync acceptable (limits are approximate by nature).

## Notification service
- Ingest API → Kafka topic → per-channel consumer groups (email/SMS/push workers) → provider gateways (SES, Twilio, FCM) behind circuit breakers.
- Must-discuss: user preferences & quiet hours (filter before enqueue), rate limiting per user (don't spam), retries with DLQ, **idempotency key per notification** so retries don't double-send, template rendering service.
- Priority lanes: OTP ≠ marketing — separate topics/pools so bulk sends never delay OTPs.

## Realtime abuse masker (profanity in chat/comments)
- Inline path must be fast: trie/Aho-Corasick automaton of banned terms (multi-pattern match in O(text length)) in the message path; regex lists don't scale.
- Two tiers: synchronous cheap filter (mask/block instantly) + async ML classifier (context, evasion like l33t) via queue — flags borderline content for review/retroactive action.
- Updates: word list versioned, hot-reloaded (pub/sub config push). Per-locale lists. Audit log of actions.

## Tinder feed / recommendations
- Geo problem first: find candidates within X km → **geohash/quadtree index** (Redis GEO or PostGIS), shard by region.
- Precompute candidate queues per user offline (nightly + streaming updates): filter (age/prefs/already-swiped) → rank (ELO-ish desirability, activity, ML score) → store top-N in Redis list; serve = pop.
- Swipes are write-heavy events → Kafka; matches = pair lookup (did B like A? — check likes store, on hit create match + notify both).
- Already-swiped exclusion: bloom filter per user in front of the exact store.

## Twitter trends
- Stream counting problem: tweets → Kafka → windowed count per hashtag (Flink, tumbling/sliding windows e.g. 5-min buckets over 1-hr window).
- Exact counts of everything are wasteful → **count-min sketch** + heavy-hitters (top-K per window) — bounded memory, small overcount acceptable.
- Trend ≠ popular: score = current velocity vs historical baseline (z-score) — "#breakfast" is always big, a trend is a spike. Per-geo trends = partition counters by region.
- Serve from a small precomputed top-K store (Redis sorted set), refreshed every minute.

## URL shortener & Pastebin (the classics, compressed)
- Shortener: counter → base62 (or KGS pre-generating keys) beats hashing (collisions). 301 vs 302 = caching vs analytics. Read-heavy → cache code→URL; DB is a simple KV. Estimate: 100M/day writes ≈ 1.2K wps — trivial; reads dominate.
- Pastebin adds: content in object storage (S3) when large, metadata in DB, expiry via lazy check + sweeper, dedup via content hash.

## Fraud detection
- Two loops: **inline scoring** (<100ms budget: rules engine + lightweight model on precomputed features from a feature store) decides approve/decline/step-up; **offline loop** (batch training, label feedback from chargebacks) improves the model.
- Features need history (txn count last 24h per card) → streaming aggregation into the feature store (Kafka→Flink→Redis).
- Graph angle: shared device/card/address across accounts → fraud rings (graph DB / connected components offline).
- Trade-off to voice: false positives cost customers, false negatives cost money — threshold is a business dial, plus manual-review queue for the gray zone.

## Recommendation engine
- Candidate generation (cheap, thousands: collaborative filtering / item-item similarity / embeddings ANN lookup) → ranking (expensive model on hundreds) → re-ranking rules (diversity, freshness, business).
- Offline: train embeddings/similarity matrices (Spark) → publish to serving store. Online: user recent actions adjust in-session (streaming).
- Cold start: new user → popularity/onboarding interests; new item → content-based features until interactions accrue.
- Feedback loop caution: you recommend what's clicked, which gets clicked more — exploration (small % random/fresh) keeps the system honest.

## Web crawler
- Frontier queue (priority by page rank/freshness) → fetcher pool (async IO) → parser → dedup → storage + new URLs back to frontier.
- **Politeness is the core constraint**: per-domain queues + delay (robots.txt honored) — shard the frontier BY DOMAIN so one host is never hammered by parallel workers.
- Dedup two layers: URL-seen (bloom filter + exact store) and content-seen (simhash for near-duplicates).
- Traps: infinite calendars/session URLs → depth limits, URL normalization, per-domain page budgets. Scale: frontier in Kafka/Redis, checkpointing for restart, DNS caching (it becomes the bottleneck).
`,
    qa: [
      { q: "Why does product listing use a search engine instead of the catalog DB?", a: "Listing = full-text + facets + ranking over many attributes — B-tree queries can't do relevance or aggregations efficiently. CDC pipes catalog changes into Elasticsearch; DB stays source of truth, ES is a rebuildable read model." },
      { q: "Why is fixed-window rate limiting flawed?", a: "Boundary burst: 100/min allows 100 at 0:59 + 100 at 1:01 — 200 in 2 seconds. Sliding window counter (weighted blend of adjacent windows) or token bucket fixes it cheaply." },
      { q: "How does a notification service avoid double-sending on retry?", a: "Idempotency key per logical notification (event-id + user + channel); delivery worker checks/records it atomically before calling the provider. At-least-once delivery + idempotent send = effectively-once." },
      { q: "Why Aho-Corasick for profanity filtering?", a: "Matches ALL banned patterns in one pass over the text (O(n + matches)) via a trie with failure links — thousands of words at chat speed. Per-word regex scan is O(words × text) and dies at scale." },
      { q: "How do you find 'nearby users' efficiently?", a: "Geo index: geohash prefixes (Redis GEO) or quadtree — bucket the world, query the user's cell + neighbors, refine by exact distance. Naive lat/long range scans on a B-tree can't bound 2D distance." },
      { q: "Count-min sketch — what does it give Twitter trends?", a: "Frequency estimates for unbounded key cardinality in fixed memory (hash into d×w counters, take min — never undercounts). Pair with a top-K heap for heavy hitters. Exact per-hashtag counters for the whole firehose don't fit RAM." },
      { q: "What makes something a 'trend' rather than just popular?", a: "Velocity vs baseline: score spikes (current window count / historical average, z-score), not raw volume. Otherwise evergreen tags own the list forever. Decay + per-region computation complete the answer." },
      { q: "Inline fraud check has a 100ms budget — how?", a: "Precomputed features (streaming-aggregated into a feature store) + fast rules + a small model; heavy analysis is async. The trick is moving computation off the request path — score reads features, never computes history." },
      { q: "Crawler: why shard the frontier by domain?", a: "Politeness: one domain's URLs go to one queue/worker with enforced delay — parallel workers can never gang up on a host. Also localizes robots.txt state and per-domain budgets. Shard by URL hash and you DDoS people." },
      { q: "Recommendations: why two stages (candidates then ranking)?", a: "Can't run an expensive model on 100M items per request. Cheap recall narrows to ~1K candidates (ANN/similarity), precision model ranks those. Funnel architecture = the standard answer for any large-corpus ranking system." }
    ],
    mock: { easy: [], medium: [
      { q: "Design Twitter Trends end-to-end (45-min mock).", a: "Requirements: top-K hashtags per region, ~1-min freshness, firehose scale. Tweets→Kafka (partition by hashtag)→Flink sliding windows: count-min sketch + top-K heap per region → velocity score vs baseline (stored historical averages) → publish top-K to Redis sorted sets → API reads Redis, CDN 30s. Discuss: memory bounds (sketch), spam/bot filtering before counting, backfill on restart via Kafka replay." },
      { q: "Design a notification service for an e-commerce platform (45-min mock).", a: "API + event consumers → preference/quiet-hours filter → priority topics (transactional vs marketing) in Kafka → channel workers (email/SMS/push) with provider adapters, circuit breakers, rate limits per provider → idempotency store, retries with backoff → DLQ + status tracking table. Fan-out estimate, template service, and OTP-lane isolation are the differentiators." },
      { q: "Design a web crawler to index 1B pages/month (45-min mock).", a: "Estimate: ~385 pages/s sustained. Frontier: Kafka topics sharded by domain-hash, priority scoring; fetchers: async IO pools honoring robots.txt + crawl-delay per domain; parse → URL normalize → bloom+exact URL-seen, simhash content dedup → store HTML in S3, metadata/link-graph in DB → recrawl scheduler by change frequency. Traps, DNS caching, checkpoint/restart, politeness proof — walk one URL through the loop." },
      { q: "Design Tinder's swipe feed (45-min mock).", a: "Geo-sharded user index (geohash) → offline candidate generation per user (filters + ranking) into Redis queues → serve = pop N; swipes→Kafka→likes store; match check on right-swipe (has target liked me?) → match record + push via notification service. Bloom filter for already-seen, ELO-style desirability balancing, cold start for new users, and why precompute beats query-time search." }
    ], hard: [] }
  });
})();
