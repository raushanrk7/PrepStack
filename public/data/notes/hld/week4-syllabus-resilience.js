// HLD — syllabus supplement: Resilience & Storage (PDFs 17-24: circuit breakers, redundancy,
// leader election, blob/S3, bloom filters, big data). Merges into week 4 (APIs, Auth & Advanced Patterns).
(function () {
  window.PrepStackRegister.notes("hld", 4, {
    concepts: `# Resilience & Storage Patterns (Syllabus Deep-Dive)

## Circuit breakers
**TL;DR:** Stop hammering a failing dependency; fail fast and give it room to recover.

### The three states
- **Closed** (normal): calls flow; failures counted in a rolling window.
- **Open** (tripped): threshold exceeded → calls fail immediately (or serve fallback) without hitting the dependency. Prevents thread-pool exhaustion and cascading failure.
- **Half-open**: after a cooldown, let a few probe requests through — success closes the breaker, failure re-opens.
- Pair with: timeouts (a breaker without timeouts never trips on hangs), bulkheads (isolate thread pools per dependency), fallbacks (cached/default response). Libraries: Resilience4j, Envoy outlier detection.

## Data redundancy & recovery
- **Redundancy layers**: RAID (disk), replication (node), multi-AZ (data center), multi-region (geo), backups (time — protects against deletes/corruption that replication happily copies!).
- **RPO** (how much data you may lose) vs **RTO** (how long to recover) — every DR design is priced against these two numbers.
- Backup hygiene: automated, incremental + periodic full, stored off-site/off-account, and **restore-tested** — an untested backup is a hope, not a plan.
- Point-in-time recovery: base backup + WAL/binlog replay to any moment.

## Leader election
**TL;DR:** Symmetric nodes must agree on one coordinator — and re-agree automatically when it dies.

- Naive "smallest ID wins" breaks on **split brain**: a partition creates two leaders. Real elections need **quorum** (majority) — only a partition side with a majority can elect.
- **Raft essentials** (say this much): terms increment per election; candidate requests votes, majority wins; leader heartbeats followers; missed heartbeats → new election with randomized timeouts (avoids split votes). Old leader rejoining sees a higher term and steps down.
- In practice you don't implement it — you lease it: ZooKeeper (ephemeral znodes), etcd (lease + campaign), or a DB row with TTL lock. Kubernetes controllers use exactly this.
- **Fencing tokens**: monotonically increasing leader epoch attached to writes so a paused-then-resumed old leader's writes are rejected.

## Blob storage & S3 internals
- Object store model: flat namespace, whole-object writes, HTTP API, metadata per object — no partial updates, no POSIX. Massive durability via erasure coding/replication across AZs.
- **Erasure coding** (vs 3x replication): split object into k data + m parity shards — survive m losses at ~1.5x overhead instead of 3x. Why cold tiers are cheap.
- Design uses: anything large + immutable — images, videos, logs, backups, data-lake files. DB stores the METADATA + S3 key; blob lives in object storage. Presigned URLs offload transfer.
- Multipart upload: parallel chunks, resumable, required >5GB.

## Bloom filters
**TL;DR:** Tiny probabilistic set: "definitely not present" or "probably present."

- k hash functions set k bits; query checks all k bits. False POSITIVES possible (tunable via size/k), false negatives never. No deletes (counting variant allows).
- ~10 bits/element ≈ 1% false-positive rate — memorize that number.
- Where it shows up: LSM/SSTable read path (skip files that can't contain the key — Cassandra/RocksDB), cache-penetration guard (block queries for keys that don't exist), URL-seen set in crawlers, "username taken?" prefilter.

## Big data tools (orientation level)
- **Batch**: HDFS/S3 data lake + Spark (in-memory DAG, replaced MapReduce) for ETL/aggregation. Hive = SQL-on-files.
- **Streaming**: Kafka as the backbone; Flink/Spark Streaming for windowed aggregations, exactly-once via checkpointing.
- **Lambda architecture** (batch layer + speed layer, merged at query) vs **Kappa** (stream-only, replay the log to recompute). Modern default: Kappa-ish on Kafka.
- **OLTP vs OLAP**: row-store transactional DB vs column-store warehouse (Redshift/BigQuery/ClickHouse — scan few columns of billions of rows). Feed OLAP via CDC (Debezium) rather than dual writes.
`,
    qa: [
      { q: "Walk through circuit breaker states.", a: "Closed: normal, counting failures in a window. Open: threshold tripped → instant failure/fallback, dependency gets breathing room. Half-open: after cooldown, probes decide — success closes, failure re-opens. Must pair with timeouts or hangs never trip it." },
      { q: "Why do backups still matter if you have replication?", a: "Replication faithfully copies your mistakes — DROP TABLE, ransomware, corruption propagate instantly. Backups are time-redundancy: restore to before the event. Different failure class entirely; also test the restore." },
      { q: "RPO vs RTO?", a: "RPO: max acceptable data loss (backup/replication frequency sets it). RTO: max acceptable downtime (recovery automation sets it). Both drive DR spend: pilot light vs warm standby vs active-active." },
      { q: "What is split brain and what prevents it?", a: "A partition where both sides believe they lead → divergent writes. Prevention: quorum — only a side holding a majority may elect/accept writes; the minority side stalls. Plus fencing tokens so a zombie ex-leader's writes get rejected." },
      { q: "Why randomized election timeouts in Raft?", a: "If all followers timed out together they'd all become candidates and split the vote repeatedly. Randomization staggers candidacy so someone usually wins round one. Simple trick, core to Raft's liveness." },
      { q: "Erasure coding vs 3x replication?", a: "EC: k data + m parity shards — survive m failures at ~(k+m)/k overhead (~1.5x) vs 3x storage; cost is reconstruction CPU/IO and latency. Hot data → replication; warm/cold bulk → EC. It's why S3-class storage is cheap." },
      { q: "Can a bloom filter false-negative? Where's it used in databases?", a: "Never — a present element set its bits; absence of any bit proves absence. False positives, yes (tunable). LSM engines keep one per SSTable so point reads skip files that can't contain the key — turning k disk reads into ~1." },
      { q: "Lambda vs Kappa architecture?", a: "Lambda: parallel batch (accurate, slow) + speed (fresh, approximate) layers merged at read — two codebases. Kappa: everything is a stream; recompute by replaying the log (Kafka retention). Prefer Kappa unless batch-only assets already dominate." },
      { q: "How should a service store user-uploaded videos?", a: "Object storage (S3): client uploads via presigned/multipart directly, DB row keeps metadata + key, CDN fronts delivery, lifecycle rules tier old content to cold storage. Never blobs in the DB — it bloats storage, backups, and replication." }
    ],
    mock: { easy: [], medium: [
      { q: "Your payment service calls a flaky fraud-check API and threads pile up until the whole service dies. Fix the resilience story.", a: "Timeout every call (e.g., 300ms) → circuit breaker per dependency (trip at failure-rate threshold, half-open probes) → bulkhead thread pool so fraud-check can't consume payment's threads → fallback policy (queue for async review or conservative decline). Add retry WITH jitter only on idempotent calls, and alert on breaker-open as a symptom." },
      { q: "Design leader election for a scheduler service running 3 replicas.", a: "Don't hand-roll Raft: use etcd/ZooKeeper lease — replicas campaign on a key with TTL; holder is leader, renews heartbeat; crash → lease expires → new election. Guard actions with the lease epoch as a fencing token (workers reject stale-epoch commands). Discuss: what the followers do (warm standby), clock-skew caution with TTLs, and why quorum store placement matters (3 nodes, separate AZs)." },
      { q: "Design the storage layer for a log-analytics product ingesting 1TB/day.", a: "Kafka ingest → stream processor (Flink) for real-time alerts (Kappa) → raw events to S3 (partitioned by date/tenant, Parquet columnar, EC-backed) → ClickHouse/BigQuery for interactive queries, loaded via the stream. Bloom-filter/minmax indexes prune scans; lifecycle: hot 7d in warehouse, warm 90d S3-IA, Glacier after. Cost per GB at each tier is the discussion the interviewer wants." }
    ], hard: [] }
  });
})();
