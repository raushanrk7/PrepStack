import { useState } from "react";

const TAG = {
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  DS:  { bg: "#E040FB18", color: "#E040FB", border: "#E040FB40" },
  INF: { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "lb", icon: "⚖️", tag: "HLD",
    title: "Load Balancing",
    summary: "Distributes traffic across servers. L4=TCP level (fast). L7=HTTP level (smart routing). P2C is modern default used by Envoy/Cloudflare.",
    concepts: [
      {
        name: "L4 vs L7",
        explanation: "L4 sees IP+port only — fast but dumb. L7 sees full HTTP — smart routing by URL, headers, cookies. Real systems use both: L4 first (DDoS), L7 second (routing).",
        example:
`L4 (AWS NLB): sees IP:port only
  → no idea if request is /checkout or /static
  → good for: DB traffic, gaming, raw TCP

L7 (ALB/Nginx): sees full HTTP request
  /api     → App Servers
  /static  → CDN
  /premium → Premium server pool

Real stack: Internet → L4 (absorb DDoS) → L7 (smart route) → Servers`
      },
      {
        name: "Algorithms — Round Robin → P2C",
        explanation: "Round Robin (identical servers). Least Connections (variable request duration). P2C+EWMA (modern default — picks 2 random, routes to less loaded).",
        example:
`Round Robin:   S1→S2→S3→S1...
               good for identical servers, short requests

Least Conn:    route to server with fewest active connections
               good for WebSockets, long-lived connections

P2C:           pick 2 random servers → send to less loaded
               O(log log N) max load vs O(log N) round robin ✅
               used by Envoy, Nginx, Cloudflare

EWMA:          tracks response time with decay
               slow 10s ago but fast now? not penalized ✅`
      },
      {
        name: "When Consistent Hash vs P2C",
        explanation: "Stateless service (app servers) → P2C/RR. Stateful (cache, DB shards) → Consistent Hashing. Using RR on cache = cache miss every request.",
        example:
`Cache (stateful):
  hash("onepiece") must ALWAYS → C2
  Round Robin: miss every time 😱
  Consistent Hash: always same node ✅

App Servers (stateless):
  POST /checkout → any server fine
  → P2C / Round Robin ✅

Full stack:
  API Gateway  → P2C      (stateless)
  Cache Layer  → Consistent Hash (stateful)
  DB Shards    → Consistent Hash (stateful)`
      },
    ]
  },
  {
    id: "ch", icon: "🔵", tag: "HLD",
    title: "Consistent Hashing",
    summary: "Hash ring distributes keys so adding/removing server remaps only ~1/N keys. Virtual nodes ensure even distribution. Red-Black Tree for O(log N) operations.",
    concepts: [
      {
        name: "The Ring + Binary Search",
        explanation: "Servers and keys hashed to same 0→2³² ring. Key goes to first server clockwise = bisect_left on sorted array. O(log N) not O(N).",
        example:
`Sorted ring: [100(S1), 287(S2), 450(S3), 700(S4)]

hash("user:42") = 380
bisect_left([100,287,450,700], 380) = index 2
→ 450 → S3 owns "user:42" ✅ O(log N)

Wrap-around: hash=850, no value ≥ 850
→ index 0 → S1 ✅

Data structure: Red-Black Tree (not plain array)
  Plain array insert/delete: O(N) shift
  RBT: O(log N) always guaranteed ✅`
      },
      {
        name: "Virtual Nodes",
        explanation: "Each server hashed multiple times using ServerName#index. Powerful server = more vnodes = more traffic. Same binary search on bigger sorted array.",
        example:
`hash("S1#0") = 287M → position on ring
hash("S1#1") = 432M → position on ring
hash("S1#2") = 900M → position on ring

hash("S2#0") = 150M → position on ring
hash("S2#1") = 500M → position on ring

Merged sorted array:
[150M(S2), 287M(S1), 432M(S1), 500M(S2), 900M(S1)]

Powerful server → more vnodes → more traffic ✅`
      },
      {
        name: "Add / Remove Server",
        explanation: "Only ~1/N keys remap. Only keys between removed server and its predecessor move to next clockwise server. Everything else untouched.",
        example:
`Remove S2 from [100(S1), 432(S2), 756(S3)]:

Keys 101-432 were at S2
→ now map to 756 → S3 (next clockwise) ✅
→ S1 keys: untouched ✅
→ S3 own keys: untouched ✅
Only ~33% affected (1/N)

vs Normal hashing hash(key) % N:
  N changes → 100% keys remap 😱
  Cache stampede → DB dies 😱`
      },
      {
        name: "How Redis Cluster Does It",
        explanation: "Redis uses fixed 16384 slots (not consistent hashing). slot = CRC16(key) % 16384. Each node owns a slot range. Simpler than consistent hashing for fixed clusters.",
        example:
`Redis Cluster: 16384 fixed slots
  slot = CRC16("user:42") % 16384 = 7842
  Node A: slots 0-5460
  Node B: slots 5461-10922  ← slot 7842 here
  Node C: slots 10923-16383

Client library computes slot directly
→ connects to correct node (1 hop) ✅
No LB needed ✅

vs Cassandra: true consistent hashing + vnodes`
      },
    ]
  },
  {
    id: "rep", icon: "🔁", tag: "DS",
    title: "Replication + Quorum",
    summary: "Next RF=3 clockwise nodes store copies. All replicas equal — no master (leaderless). Quorum: W+R > N guarantees consistent reads. Used in Cassandra, DynamoDB.",
    concepts: [
      {
        name: "Leaderless Replication",
        explanation: "No master. All RF=3 replicas equal. Any node can serve reads/writes. Any node can be coordinator — looks up ring, routes to owner (1 hop).",
        example:
`❌ Wrong mental model:
  MASTER (all data) → S1,S2,S3 (copies)

✅ Correct:
  "user:42"  lives on S4,S5,S6 only
  "order:99" lives on S7,S8,S9 only
  NO single node has all data
  NO master exists

Coordinator = ANY node
  Has ring metadata (few KB, all nodes have this)
  Looks up: "user:42" → S4,S5,S6
  Forwards request (1 hop) ✅
  Does NOT store all data`
      },
      {
        name: "Quorum Reads/Writes",
        explanation: "W = write quorum, R = read quorum. W+R > N → always overlap → consistent. Cassandra lets you tune W and R per query for speed vs safety tradeoff.",
        example:
`N=3 (replication factor)
W=2, R=2 → W+R=4 > 3 → always overlap → consistent ✅

Write: coordinator sends to S4,S5,S6
       waits for 2 to confirm → success ✅
       S6 slow? doesn't matter — 2 confirmed

Read:  coordinator asks S4,S5
       both return data
       take latest version (timestamp) ✅
       repair stale one in background

Tune for speed:   W=1, R=1 (eventual consistency)
Tune for safety:  W=3, R=3 (all must agree)`
      },
    ]
  },
  {
    id: "gossip", icon: "📡", tag: "DS",
    title: "Gossip + Heartbeat + Hinted Handoff",
    summary: "Gossip spreads cluster state in O(log N) rounds via random peer exchange. Phi Accrual detects failures. Hinted Handoff handles writes during node downtime.",
    concepts: [
      {
        name: "Gossip Protocol — Two-Way Push-Pull",
        explanation: "Every 1s each node picks 1-3 random peers. Exchange full version digest (ALL node versions, 8 bytes each). Only transfer data where versions differ. Both nodes fully synced in 3 messages.",
        example:
`S1 → S3: SYN  {S1:v42, S2:v38, S4:v15}
           ↑ digest of ALL node versions (tiny)

S3 → S1: ACK  {S2:v45 (newer), S6:UP:v55}
           ↑ what I have newer + what I need from you

S1 → S3: ACK2 {S7:v51, S9:v33}
           ↑ what you were missing

3 messages → both fully synced ✅
100 nodes → O(log N) ≈ 7 rounds → all know ✅`
      },
      {
        name: "Heartbeat + Phi Accrual Failure Detection",
        explanation: "Nodes send heartbeats every few seconds. Phi Accrual uses statistics (not fixed timeout) to declare SUSPECT then DOWN. 3 stages, never instant.",
        example:
`ALIVE → SUSPECT → DOWN  (never instant)

Phi Accrual:
  Tracks heartbeat intervals per node
  S6 normally: 1.0s, 1.1s, 0.9s...
  Gap suddenly 8s → statistically abnormal
  phi > 8  → SUSPECT
  phi > 12 → DOWN

Why not fixed timeout?
  Slow network → heartbeats naturally slower
  Phi adapts to each node's normal pattern
  Fewer false positives ✅

Multiple nodes must agree before DOWN`
      },
      {
        name: "Hinted Handoff + Merkle Tree",
        explanation: "S6 DOWN during write → neighbour S7 stores write with hint. S6 recovers → S7 delivers missed writes. Merkle tree for efficient diff sync after long outage.",
        example:
`S6 DOWN → write "user:42" arrives:
  S7 stores: { data: user:42, hint: for_S6 }
  Main write succeeds (quorum W=2 met) ✅
  Hint expires after 3 hours

S6 recovers:
  Gossip spreads "S6 UP"
  S7 sends hints → S6 catches up ✅

S6 down > 3hrs (hints expired):
  Merkle Tree sync kicks in
  S6 vs S4 compare hash tree
  Only sync the diff (not full data) ✅`
      },
    ]
  },
  {
    id: "proxy", icon: "🔀", tag: "INF",
    title: "Reverse Proxy + SSL + DDoS",
    summary: "Reverse proxy sits in front of servers. Handles SSL termination, caching, rate limiting, hides internal infrastructure. Cloudflare absorbs DDoS before it reaches your servers.",
    concepts: [
      {
        name: "Reverse Proxy vs Forward Proxy",
        explanation: "Forward proxy sits in front of CLIENT (VPN, bypass restrictions). Reverse proxy sits in front of SERVERS (Nginx, CDN). Client never knows which backend server handled it.",
        example:
`Forward Proxy (client side):
  Client → Proxy → Internet
  Internet doesn't know real client IP
  Use: VPN, bypass geo restrictions

Reverse Proxy (server side):
  Client → Nginx → Your Servers
  Client doesn't know which server handled it
  Use: SSL termination, load balancing, caching

Nginx reverse proxy config:
  /api/images → Image Service :8080
  /api/auth   → Auth Service  :8081
  /static     → CDN           :8082`
      },
      {
        name: "SSL Termination + DDoS Protection",
        explanation: "SSL terminated at proxy — backend servers get plain HTTP. DDoS hits Cloudflare (184 Tbps capacity) not your servers. Attacker can't even reach your infrastructure.",
        example:
`SSL:
  Client ──HTTPS──► Nginx (decrypt here)
                        ↓ plain HTTP internally
                    App Servers
  One certificate to manage ✅
  Backend servers don't handle crypto overhead ✅

DDoS:
  Normal capacity: 10K req/sec
  Attack: 2M req/sec → hits Cloudflare
  Cloudflare: 184 Tbps absorption capacity
  Your servers: only get clean traffic ✅

Full stack:
  Internet → Cloudflare (DDoS) → 
  L4 LB → L7 Nginx (SSL, routing) → App Servers`
      },
    ]
  },
  {
    id: "arch", icon: "🏗️", tag: "HLD",
    title: "Full Stack Architecture",
    summary: "No LB in front of cache — app server directly hashes to cache node. Microservices each have own LB. Cache and DB accessed via consistent hashing directly.",
    concepts: [
      {
        name: "No LB for Cache — Direct Hash",
        explanation: "LB would break key affinity (round-robin = cache misses). App server runs hashing locally via client library. Jedis/ioredis handle routing automatically.",
        example:
`❌ Wrong: App Server → LB → Cache
          LB round-robins → same key hits C1,C2,C3
          cache miss every time 😱

✅ Right: App Server → hash("onepiece") → C2 directly
          Client library computes CRC16(key) % 16384
          Connects directly to correct node (1 hop) ✅

Cache node failure:
  Client detects connection error
  Refreshes metadata → remaps ring
  No LB needed for failover ✅`
      },
      {
        name: "Complete System Stack",
        explanation: "Client → CDN → L4 → L7 → Microservices (each own LB, P2C) → Cache (direct hash, no LB) → DB (consistent hash + replication).",
        example:
`Client
  ↓ HTTPS
CDN (static assets, consistent hash by URL)
  ↓
L4 LB (DDoS, raw TCP, AWS NLB)
  ↓
L7 / API Gateway (SSL, path routing, Nginx)
  ↓ /auth /search /stream /payment
Microservices — each has own LB (P2C, stateless)
  ↓ direct hash — NO LB
Cache Layer (Redis Cluster, consistent hash)
  ↓ consistent hash + RF=3 replication
DB Layer (Cassandra, gossip, quorum)

Rule:
  Stateless → P2C / Round Robin
  Stateful  → Consistent Hashing`
      },
    ]
  },
];

const qna = [
  { q: "How is next server found in consistent hashing — linear or binary search?", a: "Binary search O(log N). Ring = sorted array. bisect_left finds first position ≥ key hash. Wrap to index 0 if none found. Use Red-Black Tree (SortedList) not plain array — O(log N) guaranteed for add/remove/search vs O(N) array shift." },
  { q: "How are server positions defined on the ring?", a: "hash('ServerName#VnodeIndex') using MD5/SHA1 % 2³². Same hash function for keys (raw key string, no #index suffix). MD5 used because deterministic across machines — Python built-in hash() changes every restart." },
  { q: "When a server is removed do we transfer data to next server?", a: "Depends on layer. Cache: NO — just cache misses that self-heal via DB fallback. Storage (Cassandra): YES if graceful shutdown (migrate first, then update ring). If crash: replicas cover instantly, hinted handoff catches up later." },
  { q: "Does every node have all data — is there a master?", a: "No master. Data sharded — each key on RF=3 nodes only. No single node has all data. All replicas equal (leaderless). Any node can be coordinator — has full ring metadata (tiny, few KB) but only its own data slice." },
  { q: "Is gossip one-way or two-way?", a: "Two-way push-pull. 3 messages: SYN (digest of ALL node versions) → ACK (what I have newer + what I need) → ACK2 (what you were missing). Both nodes fully synced. Digest = ALL node versions ~8 bytes/node. For 100 nodes = 800 bytes total." },
  { q: "Does gossip SYN send ALL node version numbers?", a: "Yes — ALL node versions in every SYN digest. Complete digest needed so receiver knows exactly what to send back. For 100 nodes = 800 bytes per SYN. Data only flows in ACK/ACK2 where versions differ. First time two nodes meet: full exchange. After: delta only." },
  { q: "How is a node declared DOWN — is it instant?", a: "3 stages: ALIVE → SUSPECT → DOWN. Cassandra uses Phi Accrual Failure Detector — statistics-based, not fixed timeout. Tracks each node's normal heartbeat intervals. Gap > threshold → statistically abnormal → SUSPECT. Multiple nodes must agree before DOWN." },
  { q: "When to use Consistent Hashing vs Round Robin?", a: "Consistent Hashing when same key must always hit same server (cache, DB shards, rate limiter counters). Round Robin/P2C when stateless — any server handles any request (app servers, API gateway). Using RR on cache = cache miss on every request since different node every time." },
  { q: "What are L4 and L7 load balancers?", a: "OSI model layers. L4 (Transport) sees only IP+port — fast, can't inspect content, good for raw TCP. L7 (Application) sees full HTTP — can route by URL path, headers, cookies. Real systems use both: L4 first for DDoS/speed, L7 second for smart routing." },
  { q: "Does cache have its own load balancer?", a: "No. LB in front of cache breaks key affinity (round-robin = same key hits different nodes = cache misses every time). App server directly computes which cache node via consistent hashing. Redis Cluster client libraries (Jedis, ioredis) handle routing automatically." },
  { q: "Should different services have separate servers?", a: "Yes — microservices. Each service has own servers + LB, scales independently. Payment spike on Black Friday = scale only payment service. Failure in auth = only auth goes down. Monolith is fine for small teams/early stage — split when you feel the pain." },
];

const mock = [
  { q: "Design the caching layer for a service with 500M users. Walk me through data structure choices.", a: "Start with what data home page needs: user profile (Hash — HMGET for multiple fields in 1 round trip), watch history (List + LTRIM to cap at 10 items, DB fallback for older), trending (ZSet with score = views/(age+2)^1.5, hourly buckets not per-view). Session-based TTL (EXPIRE on every request, 30min inactivity). Active invalidation on plan/profile change. Don't cache age/gender — rarely read, wastes RAM at 500M scale." },
  { q: "A server in your Cassandra cluster goes down. Walk me through exactly what happens.", a: "1. Other nodes detect via heartbeat timeout → Phi Accrual marks SUSPECT then DOWN. 2. Gossip spreads status across cluster in O(log N) rounds. 3. Ring updated — requests for that node's keys route to replicas (already have RF=3 copies). 4. Writes during downtime → Hinted Handoff on neighbour nodes. 5. Node recovers → gossip spreads UP → neighbour delivers hints → node catches up. 6. If down > 3hrs → Merkle tree sync for full diff." },
  { q: "Why would you choose consistent hashing over modulo hashing for a cache layer?", a: "Modulo hashing: hash(key) % N. Adding/removing server changes N → 100% keys remap → massive cache stampede → DB overwhelmed. Consistent hashing: adding/removing server remaps only ~1/N keys. At Netflix scale with 10 servers, 10% cache miss vs 100% is the difference between a smooth deploy and a DB outage. Virtual nodes ensure even distribution without hotspots." },
  { q: "You have a cache cluster and app servers. Draw the request flow for 'GET user:42 profile'.", a: "Request hits L7 LB (Nginx) → routes to app server via P2C. App server runs hash('user:42:profile') using CRC16 % 16384 = slot 7842 → slot table says Cache Node C2. App server calls C2 directly (no LB). C2 HIT → return. C2 MISS → app server queries DB → stores in C2 with TTL → return. On next request: always C2 (key affinity) → HIT. No LB in front of cache — LB would break key affinity." },
  { q: "How does gossip protocol scale? What if we have 10,000 nodes?", a: "Gossip is O(log N) convergence. 10,000 nodes → ~14 rounds → ~14 seconds for full cluster to know. Each round: every node gossips with 1-3 random peers. SYN digest = 10,000 × 8 bytes = 80KB (acceptable). Data only in ACK/ACK2 where versions differ (usually tiny). For very large clusters (10,000+): split into sub-clusters of 200-300 nodes, gossip within sub-cluster, bridge nodes connect sub-clusters." },
];

const S = {
  page:  { minHeight:"100vh", background:"#08080F", color:"#D8D8E8", fontFamily:"'Courier New',monospace" },
  hdr:   { background:"#0D0D1A", borderBottom:"1px solid #1A1A2E", padding:"16px 24px", position:"sticky", top:0, zIndex:100 },
  wrap:  { maxWidth:"860px", margin:"0 auto" },
  tab:   (a) => ({ background:"none", border:"none", cursor:"pointer", padding:"10px 18px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"'Courier New',monospace", color:a?"#fff":"#444", borderBottom:a?"2px solid #E040FB":"2px solid transparent" }),
  card:  (o, tc) => ({ background:"#0D0D1A", border:`1px solid ${o?tc.border:"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"10px" }),
  pre:   { background:"#070710", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"12px 14px", fontSize:"11px", color:"#A8A8C8", lineHeight:"1.8", overflowX:"auto", fontFamily:"'Courier New',monospace", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" },
  qcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#E040FB30":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
  mcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#FF6B3550":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
};

export default function W1D1() {
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
      {/* Header */}
      <div style={S.hdr}>
        <div style={{ ...S.wrap, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <div style={{ fontSize:"9px", color:"#E040FB", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 1</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>Load Balancing · Consistent Hashing · Replication · Gossip</div>
          </div>
          <input
            placeholder="🔍 Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background:"#0A0A14", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"8px 12px", color:"#E8E8F0", fontFamily:"inherit", fontSize:"11px", outline:"none", width:"160px" }}
          />
        </div>
        <div style={{ ...S.wrap, display:"flex", borderTop:"1px solid #1A1A2E", marginTop:"12px" }}>
          <button style={S.tab(tab==="concepts")} onClick={() => setTab("concepts")}>📚 Concepts ({topics.length})</button>
          <button style={S.tab(tab==="qna")} onClick={() => setTab("qna")}>❓ Q&A ({qna.length})</button>
          <button style={S.tab(tab==="mock")} onClick={() => setTab("mock")}>🎯 Mock Interview ({mock.length})</button>
        </div>
      </div>

      <div style={{ ...S.wrap, padding:"24px 24px 60px" }}>

        {/* CONCEPTS TAB */}
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
                      <span style={{ color:isOpen?"#E040FB":"#333", fontSize:"20px", lineHeight:1 }}>{isOpen ? "−" : "+"}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop:"1px solid #111120" }}>
                      {topic.concepts.map((c, i) => (
                        <div key={i} style={{ padding:"14px 18px", borderBottom:i < topic.concepts.length-1 ? "1px solid #0A0A14" : "none" }}>
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

        {/* Q&A TAB */}
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
                    <span style={{ color:isOpen?"#E040FB":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen ? "−" : "+"}</span>
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

        {/* MOCK INTERVIEW TAB */}
        {tab === "mock" && (
          <div>
            <div style={{ padding:"12px 16px", background:"#0D0D1A", border:"1px solid #FF6B3530", borderRadius:"8px", marginBottom:"20px" }}>
              <div style={{ fontSize:"10px", color:"#FF6B35", letterSpacing:"2px", marginBottom:"4px" }}>🎯 MOCK INTERVIEW — Senior SDE L5/L6</div>
              <div style={{ fontSize:"12px", color:"#666", lineHeight:"1.6" }}>These are real interview-style questions for this session. Try to answer mentally first, then expand to see the model answer. Focus on tradeoffs, scale reasoning, and edge cases.</div>
            </div>
            {fm.length === 0 && <div style={{ color:"#444", textAlign:"center", padding:"40px" }}>No results for "{search}"</div>}
            {fm.map((item, i) => {
              const isOpen = openM === i;
              return (
                <div key={i} style={S.mcard(isOpen)}>
                  <button onClick={() => setOpenM(isOpen ? null : i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 18px", display:"flex", gap:"10px", alignItems:"flex-start", textAlign:"left" }}>
                    <span style={{ fontSize:"10px", color:"#FF6B35", background:"#FF6B3515", border:"1px solid #FF6B3530", padding:"2px 7px", borderRadius:"3px", flexShrink:0, marginTop:"2px", whiteSpace:"nowrap" }}>INT {i+1}</span>
                    <div style={{ fontSize:"13px", color:"#DDD", fontWeight:"600", lineHeight:"1.6" }}>{item.q}</div>
                    <span style={{ color:isOpen?"#FF6B35":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen ? "−" : "+"}</span>
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
