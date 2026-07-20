import { useState } from "react";

const TAG = {
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  MQ:  { bg: "#69F0AE18", color: "#69F0AE", border: "#69F0AE40" },
  INF: { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "why", icon: "📬", tag: "HLD",
    title: "Why Message Queues",
    summary: "Direct service calls = tight coupling, speed mismatch, no retry. Queue decouples services, buffers traffic, enables async. User gets 50ms response, queue handles rest.",
    concepts: [
      {
        name: "3 Problems Solved",
        explanation: "Tight coupling (downstream down = upstream fails), speed mismatch (fast producer overwhelms slow consumer), no retry on failure.",
        example:
`Without queue (direct HTTP):
  Order Service → Payment Service
  Payment DOWN → order lost 😱
  10K orders/sec → 100 payments/sec → crash 😱

With queue:
  Order Service → Queue → Payment Service
  Payment DOWN? Messages wait safely ✅
  Speed mismatch? Queue buffers ✅
  Crash? Retry from queue ✅

Sync vs Async:
  Sync:  user waits 5s (payment+inventory+email)
  Async: user gets 200 in 50ms ✅
         queue handles rest in background`
      },
    ]
  },
  {
    id: "kafka", icon: "⚡", tag: "MQ",
    title: "Kafka Architecture",
    summary: "Distributed log. Topics split into partitions (ordered log). Offset = position in partition. Consumer groups share partitions. Messages kept on disk (7 days default). Replicated across brokers.",
    concepts: [
      {
        name: "Topics + Partitions + Offsets",
        explanation: "Topic = category. Partition = ordered log on disk. Offset = message position (always increasing). Producer hashes key to pick partition. Same key → same partition → ordering guaranteed.",
        example:
`Topic "orders" — 3 partitions, RF=2:
  Broker 1: P0-primary, P1-replica
  Broker 2: P1-primary, P2-replica
  Broker 3: P2-primary, P0-replica

Producer routing (two separate steps):
  Step 1: hash(rideId) % 3 = P1  ← message→partition
  Step 2: metadata says P1 = Broker 2 ← partition→broker
  → write directly to Broker 2 (1 hop) ✅

Replicas PULL from primary (follower fetch)
ISR = In-Sync Replicas (caught up with primary)
Messages kept 7 days regardless of consumption ✅`
      },
      {
        name: "Consumer Groups + Rebalancing",
        explanation: "Group = multiple instances of same service sharing partitions. Max useful consumers = partition count. Different groups read same topic independently with own offsets.",
        example:
`Topic: 6 partitions
payment-service group (6 instances):
  Each instance → 1 partition ✅ max parallelism

notification-service group (3 instances):
  Each instance → 2 partitions (still works)

Multiple groups = independent reads:
  payment-service:     P0 offset=500
  analytics-service:   P0 offset=480 (behind, ok)
  All offsets in __consumer_offsets topic ✅

Rebalancing (STOP THE WORLD ⚠️):
  Triggers: consumer joins/leaves/crashes, partition added
  ALL consumers pause during rebalance
  Fix: incremental cooperative (Kafka 2.4+) ✅
       static group membership (group.instance.id) ✅
  Monitor: Consumer Lag = latest_offset - consumer_offset`
      },
      {
        name: "acks + ISR + min.insync.replicas",
        explanation: "acks controls durability. min.insync.replicas=2 with RF=3 is the sweet spot — tolerates 1 failure without being too strict.",
        example:
`acks=0:   fire forget → fastest, data loss possible 😱
acks=1:   primary confirms only
          crash before replica syncs = lost 😬
acks=all: ALL ISR must confirm → safest ✅

RF=3, min.insync.replicas=2:
  1 slow replica removed from ISR
  Still 2 confirm → write succeeds ✅
  2 replicas down → write REJECTED ✅
  (refuse write > risk data loss)

Payment events:  acks=all, min.insync=2 ✅
Driver location: acks=1 (updates every 4s anyway) ✅

Partition count formula:
  consumers needed = peak_rate / consumer_rate
  = 28 rides/sec / 5 per consumer = 6
  Overprovision: 6 × 2 = 12 partitions ✅
  Adding partitions = breaks key ordering 😱 (do upfront!)`
      },
    ]
  },
  {
    id: "delivery", icon: "📦", tag: "MQ",
    title: "Delivery Guarantees",
    summary: "At-most-once (commit before = lossy). At-least-once (commit after = duplicates ok). Exactly-once (Kafka transactions). In practice: at-least-once + idempotency = effectively exactly-once.",
    concepts: [
      {
        name: "3 Guarantees",
        explanation: "Determined by when consumer commits offset relative to processing. At-least-once + idempotency = practically exactly-once without the overhead.",
        example:
`At most once:  commit offset BEFORE processing
               crash after commit = message lost 😱
               Use: logs, metrics (loss acceptable)

At least once: commit offset AFTER processing
               crash before commit = reprocessed
               duplicate possible 😬
               Use: most systems ✅

Exactly once:  Kafka transactions (v0.11+)
               slowest, most complex
               Use: financial transactions only

Practical exactly-once:
  At-least-once + idempotency check in DB
  = no loss + no duplicates ✅
  Used by most production systems`
      },
      {
        name: "Idempotency + Redis Distributed Lock",
        explanation: "Check if already processed before acting. Redis NX lock prevents simultaneous duplicates. Watchdog thread renews lock during long operations.",
        example:
`ride.completed → Payment Service:

1. SET lock:payment:rideId NX EX 30
   fail? → another consumer handling → skip ✅

2. SELECT payments WHERE rideId=123
   exists? → already paid → skip ✅

3. Watchdog: EXPIRE lock:payment:rideId 30
   renews every 10s (prevents expiry) ✅

4. INSERT payments → DEL lock → commit offset ✅

Two duplicates simultaneously:
  Consumer 1: gets NX lock → processes ✅
  Consumer 2: NX fails → skips ✅  no double charge`
      },
    ]
  },
  {
    id: "dlq", icon: "💀", tag: "MQ",
    title: "Dead Letter Queue + Retry",
    summary: "Poison pill = message that always fails, blocks partition forever. DLQ captures after N retries. Exponential backoff + jitter prevents thundering herd on retry.",
    concepts: [
      {
        name: "DLQ + Exponential Backoff",
        explanation: "After N retries with exponential backoff + jitter → move to DLQ. Unblocks partition. Alert on DLQ → investigate → replay after fix.",
        example:
`Attempt 1: fail → wait 1s  + random(0-500ms)
Attempt 2: fail → wait 2s  + random(0-500ms)
Attempt 3: fail → wait 4s  + random(0-500ms)
Attempt 4: fail → wait 8s  + random(0-500ms)
Attempt 5: → produce to "orders.DLQ"
              commit offset → move on ✅

Jitter prevents thundering herd:
  All retries at same time → spike DB 😱
  Jitter spreads them out ✅

Kafka: manual DLQ (produce to topic.DLQ)
RabbitMQ: built-in (x-dead-letter-exchange) ✅`
      },
    ]
  },
  {
    id: "rbmq", icon: "🔀", tag: "MQ",
    title: "RabbitMQ vs Kafka",
    summary: "Kafka = newspaper (keeps messages, multiple readers, replay). RabbitMQ = post office (deletes after delivery, push-based, complex routing). Different tools for different problems.",
    concepts: [
      {
        name: "Core Differences",
        explanation: "Kafka keeps messages (replay possible, multiple consumer groups). RabbitMQ deletes after consumption (one consumer per message). Kafka pull, RabbitMQ push.",
        example:
`Feature       | Kafka          | RabbitMQ
──────────────────────────────────────────────
After consume | Kept (7 days)  | Deleted
Multi readers | ✅ Yes         | ❌ No
Throughput    | ~1M/sec        | ~50K/sec
Push/Pull     | Pull (poll)    | Push (subscribe)
Replay        | ✅ Yes         | ❌ No
Routing       | Simple         | Complex (exchanges)

Use Kafka: multiple services react to same event,
           event replay needed, massive throughput,
           microservices event backbone ✅

Use RabbitMQ: task queue (one task one worker),
              complex routing/priority queues,
              smaller scale, request-reply pattern ✅

When in doubt in interview → Kafka ✅`
      },
    ]
  },
  {
    id: "patterns", icon: "🔔", tag: "INF",
    title: "Real World Patterns",
    summary: "Notification: Formatter per event → notifications topic → Worker per channel. No channel field in formatter. Redis Bitmap for preferences. Redis GEO for nearby drivers.",
    concepts: [
      {
        name: "Notification Architecture",
        explanation: "Formatters transform business events. Workers send via specific channel. No channel field in formatter output — workers self-sufficient. New channel = add worker only. New event = add formatter only.",
        example:
`Business Events:
  ride.accepted ──► RideAccepted Formatter
  ride.completed ──► RideCompleted Formatter
  payment.done ──► Payment Formatter

Each Formatter → notifications topic:
  { type, userId, message }  ← NO channel field! ✅

notifications topic:
  Push Worker    → GETBIT push:subscribers userId
  SMS Worker     → GETBIT sms:subscribers userId
  WhatsApp W.    → GETBIT wa:subscribers userId
  InApp Worker   → GETBIT inapp:subscribers userId
  ↓
  send/skip based on bitmap ✅

New channel? Add worker only ✅
New event?   Add formatter only ✅
Redis Bitmap: 500M users = 62.5MB per channel ✅`
      },
      {
        name: "Redis GEO for Nearby Drivers",
        explanation: "ONE ZSET for all drivers. Score = 52-bit encoded lat/lng. GEOADD auto-updates on new location (same member = score updated, old gone). GEORADIUS finds within radius.",
        example:
`GEOADD drivers:available 72.877 19.076 "driver:42"
→ internally ZSET, nearby = similar scores ✅

Driver moves → GEOADD again:
  Score auto-updated, old position GONE ✅

Find drivers within 2km:
GEORADIUS drivers:available 72.877 19.076 2km ASC
→ score range query → exact distance filter ✅
→ O(log N + M)

Driver offline:
ZREM drivers:available "driver:42" ✅

Surge pricing per geohash grid:
  ZADD surge:multipliers 2.0 "te7ud5r"
  Rider: ZSCORE → 2.0x ✅`
      },
      {
        name: "Compacted Topics",
        explanation: "Keeps only LATEST value per key. Old versions deleted. Acts like distributed key-value store. New service reads from beginning to get current state snapshot.",
        example:
`Regular topic (ride events):
  All messages kept 7 days → full history ✅

Compacted topic (driver location):
  Before: [driver:42:v1, v2, v3, v4]
  After:  [driver:42:v4]  ← only latest ✅

Use compacted:
  Driver location, user profile, feature flags
  (only current state matters) ✅

Use regular:
  Payment events, orders
  (need full audit history) ✅

Delete key: produce tombstone (value=NULL)
  Compaction sees NULL → removes entirely ✅

New service joins:
  Read from beginning → gets current snapshot ✅`
      },
    ]
  },
];

const qna = [
  { q: "Why use message queues instead of direct HTTP calls?", a: "Direct calls cause tight coupling (downstream down = upstream fails), speed mismatch (fast producer overwhelms slow consumer), no retry. Queue decouples services, buffers traffic, enables async. Order Service returns 200ms to user, queue handles payment/notification/analytics in background." },
  { q: "How does Kafka route messages to correct broker?", a: "Two separate routings: (1) Message→Partition: hash(messageKey) % numPartitions, done by producer client library. (2) Partition→Broker: fixed assignment table managed by Kafka controller, updated on broker failure. Producer fetches metadata from controller on startup, caches locally, refreshes on connection failure." },
  { q: "Can you add Kafka partitions dynamically?", a: "Yes but it breaks key-based ordering. hash(key)%6=P3, hash(key)%7=P5 — same key maps to different partition, all ordering guarantees broken. Solution: overprovision partitions upfront (consumers×2). Never add partitions in production without careful migration plan." },
  { q: "What is consumer rebalancing and why dangerous?", a: "Rebalancing = Kafka redistributing partitions among consumers. Triggered by: consumer joins/leaves/crashes, partitions added, heartbeat timeout. ALL consumers stop reading during rebalance (stop the world). Fix: incremental cooperative rebalancing (Kafka 2.4+), static group membership (group.instance.id), tune max.poll.interval.ms high." },
  { q: "What is consumer lag?", a: "Consumer lag = latest partition offset - consumer's current offset. High lag = consumers falling behind. Monitor with kafka-consumer-groups.sh. Fix: optimize consumer processing, add consumers (up to partition count), use internal thread pool to decouple reading from processing." },
  { q: "How prevent duplicate payments with at-least-once delivery?", a: "Redis distributed lock (SET NX EX) + DB idempotency check. Lock prevents simultaneous duplicates. DB check prevents processing if already done. Watchdog thread renews lock TTL every 10s during processing. If crash: lock auto-expires, next consumer acquires, DB check prevents double payment." },
  { q: "RabbitMQ vs Kafka — when to use which?", a: "Kafka: multiple services react to same event, replay needed, massive throughput, event backbone. RabbitMQ: task queue (one task one worker), complex routing/priority, smaller scale. When in doubt in interview → Kafka." },
  { q: "How do services know which Kafka topic to subscribe to?", a: "Hardcoded in service config. consumer = KafkaConsumer(topic='orders', group_id='payment-service'). Consumer polls in infinite loop every 100ms. Different consumer groups read same topic independently — each maintains own offset in __consumer_offsets topic." },
  { q: "Why no LB in front of Redis cache?", a: "LB would round-robin requests breaking key affinity — same key hits different nodes = cache miss every time. App server directly computes which cache node via consistent hashing. Redis Cluster client libraries (Jedis, ioredis) handle routing automatically." },
  { q: "When to use compacted Kafka topic?", a: "When only latest value per key matters, not full history. Driver location, user profile, feature flags. Regular topic for payment events/orders (need full history). Compacted topic acts like distributed key-value store — new service reads from beginning to get current state snapshot. Delete = produce tombstone (NULL value)." },
  { q: "What is acks=all and min.insync.replicas?", a: "acks=all waits for all ISR replicas to confirm — safest, no data loss even on broker crash. min.insync.replicas=2 with RF=3 is sweet spot: tolerates 1 slow replica without blocking all writes. 2 replicas down → write rejected (refuse > risk loss). Payment: acks=all. Driver location: acks=1 (updates every 4s, loss ok)." },
];

const mock = [
  { q: "Design message queue architecture for Uber ride platform. Walk through topics, producers, consumers, partitions.", a: "Topics per lifecycle event: ride.requested, ride.accepted, ride.started, ride.completed, payment.processed. Producer ownership: Ride Service owns ride.* events, Payment Service owns payment.*. Never let Notification Service produce business events. Partition key = rideId (ordering per ride). Partition count = peak/consumer_rate × 2 for headroom. payment-service group: 6 consumers. notification-service group: 3 consumers (reads 2 partitions each). acks=all for payment, acks=1 for location updates." },
  { q: "How do you notify 10,000 nearby drivers when a ride is requested?", a: "Kafka can't push to mobile phones. Driver Matching Service finds nearby drivers via Redis GEORADIUS. Then Notification Server holds 10,000 WebSocket connections (persistent bidirectional). Notification Server pushes to specific driver phones. Driver accepts → WebSocket → Notification Server → produces ride.accepted to Kafka. RabbitMQ pushes to services not phones — WebSocket is correct for mobile." },
  { q: "How does surge pricing work in real time?", a: "Stream processing (not batch) — heavy rain at 5pm needs surge at 5:00pm not 5:30pm. Sliding window: last 5 minutes per geohash grid cell. Count ride.requested events in grid. Count available drivers. score = requests/available_drivers → surge multiplier. Produces to surge.pricing topic. Active SET optimization: SADD active:grids on each request, only recompute active grids hourly. Update every 1-2 minutes. ZADD surge:multipliers 2.0 'te7ud5r'." },
  { q: "A Kafka consumer is processing slowly and lag is building up. Walk through your debugging and fix.", a: "Check consumer lag with kafka-consumer-groups.sh. Identify which partition is lagging. Root cause options: (1) Consumer processing too slow — profile the code, async DB writes, batch processing. (2) Not enough consumers — add more up to partition count limit. (3) Partition count too low — can't increase easily (breaks ordering), so use internal thread pool: consumer reads fast → drops to thread pool → thread pool processes. (4) DB bottleneck downstream — add read replicas, cache hot data. Monitor with consumer lag alerts." },
  { q: "Design the notification system for Uber. Handle push, SMS, WhatsApp, email. Make it extensible.", a: "Formatter per event type: RideAccepted Formatter consumes ride.accepted → produces to notifications topic {type, userId, message} — no channel field. Worker per channel: Push Worker, SMS Worker, WhatsApp Worker — each consumes notifications topic, checks GETBIT channel:subscribers userId (Redis Bitmap), sends or skips. New channel: add worker only, zero changes elsewhere. New event: add formatter only. Duplicate prevention: idempotency key {ride:123:accepted} checked in Redis before sending. Ordering: rideId as partition key in notifications topic." },
];

const S = {
  page:  { minHeight:"100vh", background:"#08080F", color:"#D8D8E8", fontFamily:"'Courier New',monospace" },
  hdr:   { background:"#0D0D1A", borderBottom:"1px solid #1A1A2E", padding:"16px 24px", position:"sticky", top:0, zIndex:100 },
  wrap:  { maxWidth:"860px", margin:"0 auto" },
  tab:   (a) => ({ background:"none", border:"none", cursor:"pointer", padding:"10px 18px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"'Courier New',monospace", color:a?"#fff":"#444", borderBottom:a?"2px solid #69F0AE":"2px solid transparent" }),
  card:  (o,tc) => ({ background:"#0D0D1A", border:`1px solid ${o?tc.border:"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"10px" }),
  pre:   { background:"#070710", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"12px 14px", fontSize:"11px", color:"#A8A8C8", lineHeight:"1.8", overflowX:"auto", fontFamily:"'Courier New',monospace", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" },
  qcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#69F0AE30":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
  mcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#FF6B3550":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
};

export default function W1D3() {
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
            <div style={{ fontSize:"9px", color:"#69F0AE", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 3</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>Message Queues — Kafka · RabbitMQ · Delivery · DLQ · Patterns</div>
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
                      <span style={{ color:isOpen?"#69F0AE":"#333", fontSize:"20px", lineHeight:1 }}>{isOpen?"−":"+"}</span>
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
                    <span style={{ color:isOpen?"#69F0AE":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen?"−":"+"}</span>
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
