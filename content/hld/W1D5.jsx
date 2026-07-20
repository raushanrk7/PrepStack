import { useState } from "react";

const TAG = {
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  SEC: { bg: "#E040FB18", color: "#E040FB", border: "#E040FB40" },
  INF: { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "apigw", icon: "🚪", tag: "HLD",
    title: "API Gateway",
    summary: "Single entry point for all clients. Handles routing, auth (JWT), rate limiting, SSL, request aggregation (BFF), logging. Decouples clients from internal microservices.",
    concepts: [
      {
        name: "What It Does",
        explanation: "Routes requests to correct service, validates JWT, rate limits, aggregates responses (BFF pattern), terminates SSL. All in one place.",
        example:
`Without Gateway:
  Mobile → Auth Service    (5 separate calls)
  Mobile → User Service    (client knows internals)
  Mobile → Feed Service    (SSL on every service)
  Mobile → Notification    (auth on every service)

With Gateway:
  Mobile → API Gateway → routes internally ✅
  
  Gateway handles:
  /api/users/42  → User Service
  /api/feed      → Feed Service
  /api/orders    → Order Service
  
  Auth:     validate JWT once ✅
  SSL:      terminate once ✅
  Rate:     enforce once ✅
  Log:      one place ✅`
      },
      {
        name: "Request Aggregation (BFF Pattern)",
        explanation: "Backend For Frontend — gateway calls multiple services, merges results, returns one response. Reduces mobile round trips.",
        example:
`Client: GET /api/home  ← one call

Gateway:
  1. Call User Service   → profile
  2. Call Feed Service   → posts
  3. Call Notifications  → alerts
  4. Merge all results
  5. Return ONE response ✅

Without BFF: 3 separate calls from mobile 😬
With BFF: 1 call → faster, less data usage ✅

API Gateway vs Reverse Proxy:
  Reverse Proxy: forward requests, SSL, LB
  API Gateway:   + auth, aggregation, rate limit,
                   API versioning, analytics ✅`
      },
      {
        name: "API Versioning",
        explanation: "Gateway routes /v1 to old service, /v2 to new. Old clients unaffected. Gradual migration.",
        example:
`/v1/users/42 → User Service v1 (old clients) ✅
/v2/users/42 → User Service v2 (new features) ✅

Both versions run simultaneously
Deprecate v1 when nobody uses it ✅

Tools:
  Kong (open source, plugin-based) ✅
  AWS API Gateway (managed, serverless) ✅
  Traefik (cloud native, K8s-friendly) ✅`
      },
    ]
  },
  {
    id: "jwt", icon: "🔑", tag: "SEC",
    title: "JWT — JSON Web Token",
    summary: "Stateless auth token. Header.Payload.Signature. Server verifies signature without DB lookup. Scales horizontally. Add refresh tokens for longer sessions.",
    concepts: [
      {
        name: "Structure + How It Works",
        explanation: "3 parts: header (algorithm), payload (claims/user data), signature (tamper-proof). Server verifies by recomputing signature with SECRET_KEY.",
        example:
`eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjQyfQ.abc123
 ───────────────────  ──────────────────  ──────
      Header              Payload         Signature
  {alg: "HS256"}    {userId:42,         HMAC_SHA256(
                     plan:"premium",     header+payload,
                     exp:1716003600}     SECRET_KEY)

Login:
  Verify credentials → issue JWT → return to client

Every request:
  Client sends: Authorization: Bearer eyJ...
  Gateway: recompute signature → match? ✅
           check exp > now? ✅
           read claims (userId, plan, role)
           No DB lookup needed! ✅`
      },
      {
        name: "Stateless + Refresh Token",
        explanation: "Session: server stores state (doesn't scale). JWT: server stores only SECRET_KEY (scales). Refresh token for longer sessions without frequent logins.",
        example:
`Session approach:
  {session_abc: userId_42} stored in server
  10M users = 10M records 😱
  Must share across servers 😬

JWT approach:
  Server stores only: SECRET_KEY ✅
  Verify by recomputing signature
  Works on ANY server instance ✅

Refresh token pattern:
  access_token:  JWT, expires 1hr  ← short lived
  refresh_token: opaque, expires 30d, stored in DB

  access_token expired?
  → send refresh_token → get new access_token ✅
  
  Logout: delete refresh_token from DB ✅
  Old access_tokens expire naturally ✅`
      },
    ]
  },
  {
    id: "ratelimit", icon: "🚦", tag: "HLD",
    title: "Rate Limiting",
    summary: "Prevents API abuse and DDoS. Token Bucket (allows bursts), Sliding Window (accurate), Fixed Window (simple, boundary burst risk). Centralized Redis for distributed enforcement.",
    concepts: [
      {
        name: "Token Bucket vs Sliding Window",
        explanation: "Token Bucket: bucket refills at constant rate, allows bursts up to bucket size. Sliding Window: rolling time window, accurate, more memory.",
        example:
`Token Bucket:
  bucket_size = 100, refill = 10/sec
  T=0:   100 tokens (full)
  T=1s:  burst 80 requests → 20 tokens left
  T=2s:  refill 10 → 30 tokens
  T=3s:  burst 40 → only 30 allowed, 10 rejected 429
  ✅ Allows bursts  ✅ AWS API Gateway, Stripe

Sliding Window (ZSet in Redis):
  ZADD requests:user:42 {now} "req:uuid"
  ZREMRANGEBYSCORE requests:42 0 (now-60s)
  count = ZCARD requests:42
  count >= 100 → 429 ❌
  ✅ Accurate  ✅ No boundary burst problem

Fixed Window: simple but
  boundary burst: 100 at 10:00:59
                + 100 at 10:01:01 = 200 in 2s 😱`
      },
      {
        name: "Distributed Rate Limiting",
        explanation: "Multiple gateway instances must share state via centralized Redis. Otherwise each instance allows full quota — limit bypassed.",
        example:
`Problem:
  Instance 1: user:42 → 60 requests
  Instance 2: user:42 → 60 requests
  Total: 120 > limit of 100 😱
  Each thinks 60 < 100 ✅

Fix: Centralized Redis counter
  All instances share same Redis:
  Instance 1: INCR user:42:counter → 60
  Instance 2: INCR user:42:counter → 61...120
  Any instance sees same count ✅

Different limits per tier:
  Free plan:    100 req/min
  Premium:      1000 req/min
  Gateway reads plan from JWT claims
  No DB call needed ✅

Response: HTTP 429
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 0
  Retry-After: 30  ← seconds to wait`
      },
    ]
  },
  {
    id: "sd", icon: "🗺️", tag: "INF",
    title: "Service Discovery",
    summary: "Registry of healthy service instances. Services register on startup, send heartbeats. Clients query registry to find instances. Kubernetes DNS makes this transparent.",
    concepts: [
      {
        name: "Client-Side vs Server-Side Discovery",
        explanation: "Client-side: service queries registry, picks instance, calls directly. Server-side: gateway queries registry on behalf of caller. Kubernetes handles both natively.",
        example:
`Client-Side (Eureka/Consul):
  Payment Svc → Registry: "where is User Svc?"
  Registry → [10.0.0.5:8080, 10.0.0.12:8080]
  Payment picks one → calls directly ✅
  ✅ No extra hop  ❌ Logic in every client

Server-Side (API Gateway/K8s):
  Payment Svc → API Gateway
  Gateway → Registry (internally)
  Gateway → User Svc ✅
  ✅ Clients unaware  ❌ Extra hop

Kubernetes (best):
  call http://user-service:8080/users/42
  K8s DNS resolves → routes to healthy pod ✅
  No IP needed, no registry calls ✅`
      },
      {
        name: "Health Checks + Envoy",
        explanation: "Kubernetes liveness (restart if dead) + readiness (remove from routing if not ready). Istio/Envoy uses both + passive outlier detection to route only to healthy pods.",
        example:
`Liveness probe:  is pod alive?
  fails → Kubernetes RESTARTS pod

Readiness probe: is pod ready to serve?
  fails → REMOVED from load balancing ✅
  (not restarted, just isolated)

Envoy health detection:
  1. Active: probes /health every 10s ✅
  2. Passive: watches real traffic errors
     8/10 requests failing → eject pod ✅
  3. Istio control plane: watches K8s pod state
     pod dies → Istio pushes to all Envoys
     "remove 10.0.0.5 from pool" ✅

Full flow (pod crashes → traffic rerouted):
  Pod crash → K8s detects (2s)
  → marks NotReady → Istio notified (3s)
  → pushes to all Envoys (4s)
  → no more traffic to crashed pod ✅`
      },
    ]
  },
  {
    id: "cb", icon: "⚡", tag: "HLD",
    title: "Circuit Breaker",
    summary: "Prevents cascading failures. CLOSED=normal, OPEN=fail fast (no calls made), HALF-OPEN=test recovery. Combine with timeout, retry, bulkhead, fallback.",
    concepts: [
      {
        name: "3 States",
        explanation: "CLOSED: normal operation, track failure rate. OPEN: too many failures, fail fast immediately (no waiting). HALF-OPEN: test if service recovered.",
        example:
`CLOSED (normal):
  Track failures in sliding window
  6/10 requests fail → 60% > 50% threshold
  → OPEN circuit ✅

OPEN (failing):
  Payment calls User Service
  → Circuit Breaker intercepts
  → Returns error IMMEDIATELY ✅
  → No 30s timeout wait ✅
  → Threads freed ✅
  → Stays OPEN for 30s

HALF-OPEN (testing):
  After 30s timeout:
  Let ONE test request through
  Success → CLOSED ✅ normal resumes
  Failure → OPEN again 😱 wait longer

State machine:
  CLOSED ──failures > threshold──► OPEN
    ▲                                │ timeout
    │ success                        ▼
    └────────────────────────── HALF-OPEN`
      },
      {
        name: "Fallback + Bulkhead + Full Pattern",
        explanation: "Fallback = what to return when circuit open. Bulkhead = isolate thread pools per service. Use Timeout→Retry→Circuit Breaker→Fallback together.",
        example:
`Fallback when OPEN:
  Return cached data from Redis ✅
  Return graceful degradation ✅
  Show page without user-specific data ✅
  Never just crash ✅

Bulkhead:
  100 threads total in Payment Service
  Without bulkhead: all 100 wait for slow User Svc 😱
  
  With bulkhead:
  User Svc calls:  20 threads max
  Order Svc calls: 20 threads max
  Core logic:      60 threads
  User Svc slow → only 20 affected ✅

Full resilience pattern (in order):
  1. Timeout (2s):    fail fast, don't wait forever
  2. Retry (3x):      exponential backoff 1s,2s,4s
  3. Circuit Breaker: too many retries? OPEN ✅
  4. Fallback:        cached data or degraded response

Istio config:
  consecutiveErrors: 5
  baseEjectionTime: 30s → no code changes needed ✅`
      },
    ]
  },
];

const qna = [
  { q: "What does an API Gateway do vs a Reverse Proxy?", a: "Reverse proxy: forward requests, SSL termination, load balancing, basic caching. API Gateway: everything reverse proxy does PLUS JWT validation, request aggregation (BFF), rate limiting per user/tier, API versioning (/v1,/v2), developer analytics. Nginx = reverse proxy. Kong, AWS API Gateway = full API gateway." },
  { q: "Why is JWT stateless and why does that matter?", a: "Server stores only SECRET_KEY. Verify by recomputing HMAC signature — no DB lookup needed. Session approach needs server to store {sessionId: userId} for every user (10M users = 10M records, must share across servers). JWT: any server instance can verify with just SECRET_KEY → horizontal scaling works naturally." },
  { q: "What is the boundary burst problem in fixed window rate limiting?", a: "100 requests at 10:00:59 (end of window 1) + 100 requests at 10:01:01 (start of window 2) = 200 requests in 2 seconds despite 100/min limit. Fix: sliding window log (stores all timestamps, expensive) or sliding window counter (weighted previous window + current, efficient — used by Cloudflare)." },
  { q: "How does distributed rate limiting work across multiple gateway instances?", a: "Each gateway instance must share state via centralized Redis. Without sharing: each instance allows full 100 req/min quota independently → same user can make 100×N requests (N=instances). Fix: all instances INCR same Redis key. One instance: INCR user:42:counter → always sees total across all instances." },
  { q: "What is the difference between liveness and readiness probes?", a: "Liveness: is pod alive? Fails → Kubernetes RESTARTS pod (deadlock, stuck). Readiness: is pod ready to serve traffic? Fails → Kubernetes REMOVES pod from service endpoints (not restarted, just isolated). Pod warming up → readiness fails → no traffic sent → once ready → added back automatically." },
  { q: "What are the 3 states of a circuit breaker?", a: "CLOSED: normal operation, track failure rate in sliding window. OPEN: failures exceed threshold → fail fast immediately, no calls made, threads freed, wait timeout period (30s). HALF-OPEN: after timeout, let one test request through. Success → CLOSED. Failure → OPEN again with longer wait." },
  { q: "What is the BFF pattern?", a: "Backend For Frontend. API Gateway calls multiple services (User, Feed, Notifications), merges results, returns one response to client. Without BFF: mobile makes 3+ separate calls. With BFF: 1 call → gateway aggregates → returns merged response. Reduces mobile round trips, latency, data usage." },
  { q: "How does Envoy know which instances are healthy?", a: "Three mechanisms: (1) Active health checks — Envoy probes /health endpoint every 10s. (2) Passive outlier detection — watches real traffic, ejects instances with high error rate. (3) Istio control plane — watches Kubernetes pod state, pushes updates to all Envoy sidecars when pods die or become not-ready." },
  { q: "What is the bulkhead pattern?", a: "Isolate thread pools per downstream service. Payment Service: 20 threads for User Service calls, 20 for Order Service, 60 for core logic. User Service goes slow → only 20 threads affected, other 80 still work. Without bulkhead: all 100 threads wait for slow User Service → Payment Service also dies. Like ship bulkheads: one compartment floods, others stay dry." },
  { q: "What order should you apply resilience patterns?", a: "Timeout → Retry → Circuit Breaker → Fallback. Timeout: fail fast after 2s, don't wait forever. Retry: exponential backoff 1s,2s,4s for transient failures. Circuit Breaker: too many retries failing → OPEN, stop retrying entirely. Fallback: circuit OPEN → return cached data or graceful degradation." },
];

const mock = [
  { q: "Design the authentication system for a platform with 100M users. How does JWT fit in?", a: "Login: POST /auth/login → verify credentials → issue JWT (access_token 1hr) + refresh_token (30 days, stored in DB). Every request: client sends JWT in Authorization header. API Gateway validates: recompute HMAC signature, check expiry, read claims (userId, plan, role). No DB call per request → scales to 100M users. Refresh flow: access_token expires → send refresh_token → verify in DB → new access_token. Logout: delete refresh_token from DB. For social login (Google/GitHub): OAuth 2.0 → exchange code for user info → issue our own JWT." },
  { q: "Your User Service is intermittently slow (10s response time). How do you prevent it from taking down Payment Service?", a: "Layer 1 — Timeout: set 2s timeout on all User Service calls. Don't wait 10s. Layer 2 — Retry: 2 retries with backoff (500ms, 1s). Only retry on timeout/5xx, never on 4xx. Layer 3 — Circuit Breaker: 5 consecutive failures → OPEN for 30s. Fail fast, return cached user data. Layer 4 — Bulkhead: cap User Service thread pool at 20 (not all 100 Payment threads). Layer 5 — Fallback: return cached user profile from Redis. Show partial page rather than error. In Kubernetes: Istio handles CB transparently — no code changes needed." },
  { q: "How would you implement rate limiting for a public API with free (100 req/min) and premium (1000 req/min) tiers?", a: "Token bucket per userId stored in Redis. On each request: API Gateway reads JWT claims to get plan. Gets token bucket: HGET rate:user:42 tokens,last_refill. Compute new tokens: elapsed × refill_rate. tokens >= 1 → allow, DECR. tokens < 1 → 429 with Retry-After header. Use Lua script for atomicity (read+write in one op). Centralized Redis ensures consistency across gateway instances. Different bucket sizes: free=100, premium=1000. Refill rate: free=1.67/sec, premium=16.7/sec. Return headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset." },
  { q: "How do microservices find each other in your architecture?", a: "In Kubernetes: DNS-based service discovery built-in. Services call http://user-service:8080 — K8s DNS resolves to healthy pod IPs. No Consul/Eureka needed. K8s Service object + kube-proxy handles routing + load balancing automatically. Health: readiness probes control which pods receive traffic. With Istio service mesh: Envoy sidecar per pod handles discovery + LB + circuit breaking + mTLS transparently. For multi-cluster or hybrid cloud: Consul Connect for cross-cluster discovery. Key point: in K8s just use service names — infrastructure handles the rest." },
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

export default function W1D5() {
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
            <div style={{ fontSize:"9px", color:"#00BCD4", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 5</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>API Gateway · JWT · Rate Limiting · Service Discovery · Circuit Breaker</div>
          </div>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background:"#0A0A14", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"8px 12px", color:"#E8E8F0", fontFamily:"inherit", fontSize:"11px", outline:"none", width:"160px" }} />
        </div>
        <div style={{ ...S.wrap, display:"flex", borderTop:"1px solid #1A1A2E", marginTop:"12px" }}>
          <button style={S.tab(tab==="concepts","#00BCD4")} onClick={() => setTab("concepts")}>📚 Concepts ({topics.length})</button>
          <button style={S.tab(tab==="qna","#00BCD4")} onClick={() => setTab("qna")}>❓ Q&A ({qna.length})</button>
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
                      <span style={{ color:isOpen?"#00BCD4":"#333", fontSize:"20px", lineHeight:1 }}>{isOpen?"−":"+"}</span>
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
                    <span style={{ color:isOpen?"#00BCD4":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen?"−":"+"}</span>
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
              <div style={{ fontSize:"12px", color:"#666", lineHeight:"1.6" }}>Try to answer mentally first. Then expand for model answer. Focus on scale, tradeoffs, failure scenarios.</div>
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
