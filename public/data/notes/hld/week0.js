(function () {
  window.PrepStackRegister.notes("hld", 0, {
    concepts: `# Load Balancing, Reverse Proxy & Microservices

## HLD — Load Balancing

### L4 vs L7 Load Balancing

L4/L7 refer to OSI model layers:

\`\`\`
Layer 7 → Application  (HTTP, HTTPS, DNS, FTP)
Layer 6 → Presentation (SSL/TLS encryption)
Layer 5 → Session      (connection management)
Layer 4 → Transport    (TCP, UDP, ports)
Layer 3 → Network      (IP addresses, routing)
Layer 2 → Data Link    (MAC addresses)
Layer 1 → Physical     (cables, signals)
\`\`\`

|        | L4 (Transport) | L7 (Application) |
|--------|-----------------|-------------------|
| Sees   | IP + TCP/UDP    | HTTP headers, URLs, cookies |
| Speed  | Faster          | Slightly slower |
| Smarts | Low             | High |
| Example| AWS NLB         | AWS ALB, Nginx |

**L4 Load Balancer:** Sees only IP address + Port. Knows "request came from 192.168.1.1 to port 443." Doesn't know URL/headers/content.

**L7 Load Balancer:** Sees full HTTP request — URL path, headers, cookies, query params. Can route \`/api\` vs \`/static\` differently.

\`\`\`
L4 (dumb but fast):
  Client: "I want to connect to port 443"
  L4 LB: "ok forwarding to S3" (random/RR)
  Has no idea it's a /checkout request

L7 (smart):
  Client: GET /api/checkout
  L7 LB: "this is /api → route to App Server"
          "this is /static → route to CDN"
          "this user has cookie X → route to S2"
\`\`\`

- L4 use case: raw speed, simple TCP forwarding, databases, gaming servers, video streaming (AWS NLB)
- L7 use case: smart routing, SSL termination, rate limiting, A/B testing, most web apps (AWS ALB, Nginx, Envoy)
- Real systems use **both**: \`Internet → L4 (absorb DDoS, raw TCP) → L7 (smart routing) → Servers\`

### Load Balancing Algorithms

- **Round Robin** — simplest, works when all servers are identical
- **Weighted Round Robin** — Server A gets 3x traffic vs Server B; good for heterogeneous fleets
- **Least Connections** — route to server with fewest active connections; better for long-lived connections (WebSockets, video streaming)
- **IP Hash** — \`hash(client_IP) % N\`; same client always hits same server (sticky sessions, but fragile if server goes down)
- **Least Response Time** — combines active connections + response latency (Nginx Plus, HAProxy)

### Modern / Advanced Algorithms

- **Power of Two Choices (P2C)** — Pick 2 random servers, route to the less loaded one. Mathematically reduces max load from O(log N) to O(log log N). Used by Envoy, Nginx, Cloudflare. **This is the modern standard to mention in interviews.**
- **EWMA (Exponentially Weighted Moving Average)** — tracks response time with decay so a server that was slow 10s ago but is fast now isn't penalized forever. Used by Envoy.
- **Consistent Hashing at LB level** — used when you need request affinity without sticky sessions. Common in API Gateways, gRPC load balancing.

### Real System Flow

\`\`\`
Client
  ↓
DNS Load Balancer (GeoDNS → route to nearest region)
  ↓
L7 Load Balancer (ALB/Nginx → route by URL path, headers)
  ↓
Service Mesh / Sidecar (Envoy → P2C + EWMA per microservice)
  ↓
Cache Layer (Consistent Hashing → Redis Cluster)
  ↓
DB Shards (Consistent Hashing → which shard owns this key)
\`\`\`

**Interview tip:** When asked "how do you scale service X", always mention: (1) LB algorithm + why (P2C for stateless, consistent hashing for cache/DB), (2) health checks (active vs passive), (3) session handling (stateless preferred, else Redis session store).

### Q&A: When to Choose Which LB Algorithm

**Q: When do we choose consistent hashing vs round robin/P2C/least-conn?**

The core decision: is the service **stateless** or **stateful**?
\`\`\`
Stateless → any server can handle any request
            → Round Robin / P2C / Least Conn

Stateful  → same client must hit same server
            → Consistent Hashing / IP Hash
\`\`\`

- **Consistent Hashing** used when same key must always go to the same server: Cache layer (Redis/Memcached — else every request is a cache miss on a different node), DB Sharding, Search Index, Rate Limiting.
- **Round Robin / P2C / Least Conn** used when any server can handle any request: stateless app servers, API Gateway routing, microservices.

Decision rules:
\`\`\`
All servers identical + short requests        → Round Robin
All servers identical + variable request time  → Least Connections
Heterogeneous servers (diff hardware)          → Weighted Round Robin
Modern microservices (Envoy, service mesh)     → P2C + EWMA (best default)
\`\`\`

One-line rule: *"Need same request → same server? → Consistent Hashing. Need just spread load evenly? → P2C / Least Conn. Simple + identical servers? → Round Robin."*

**Q: Is hashing used in load balancing algorithms?**
- Consistent Hashing ✅ hashes the data key
- IP Hash LB ✅ hashes client IP
- Round Robin, P2C, Least Connections ❌ no hashing at all

**Q (user's own example — validated as correct): "If I want to see One Piece movie on Netflix — login is stateless (any server), but One Piece content info is stateful (consistent hashing)?"**
Answer: Exactly right.
\`\`\`
Step 1: Login → L7 LB → stateless (P2C/RR) → any Auth Server
Step 2: Search "One Piece" → L7 LB → stateless → any Search Server
        → Search Server asks Cache: hash("content:onepiece") → always same Cache Node
Step 3: Play → L7 LB → any Video Server (stateless)
        → Video chunks in storage: hash("onepiece-movie/chunk1") → always same Storage Node
\`\`\`
One-line: *Your request routing → Stateless → P2C/RR. Content/data fetching → Stateful → Consistent Hashing.*

**Q: Why does the app server go to Cache instead of the Load Balancer going directly to Cache?**
LB is deliberately "dumb" — it only knows which servers are alive/less loaded and which URL path maps to which pool. It does NOT know business logic, what to do on a cache miss, user permissions, or how to query DB as fallback. The App Server is the "brain": checks subscription, asks cache, falls back to DB on miss, applies business rules, returns clean response.
- Exception: **static assets** (\`/static/*\`) can be routed directly LB → CDN/Cache since no business logic is needed.

**Q: "But I thought these [cache] servers are mapped on a ring and everyone has their own cache — so we hit them directly and check via quorum?"**
This confuses two different rings:
\`\`\`
Ring 1: App Servers (stateless) — P2C/RR, NOT consistent hashing, ANY server handles ANY request
Ring 2: Cache Nodes (stateful) — Consistent Hashing, SAME key ALWAYS → SAME cache node
\`\`\`
The user's mental model (consistent-hash → node → quorum read across replicas) is *exactly correct* — just for the **DB/Storage layer** (Cassandra/DynamoDB), not the app-server layer. A **local/in-process cache** on app servers is a real but inferior pattern: 6 app servers each caching independently → 6x DB load, 6x memory, inconsistent data. This is why a **dedicated cache layer** (Redis Cluster) exists — one copy, consistent hashing ensures the same key always lands on the same cache node regardless of which stateless app server handled the request.

**Q: "Does cache have its own load balancer, or do we hash directly since an LB in front would be meaningless?"**
Correct instinct — **no LB in front of cache.**
\`\`\`
❌ Wrong: App Server → LB → Cache Node   (LB would round-robin, breaking key affinity)
✅ Right: App Server → hash(key) → Cache Node directly
\`\`\`
The app server (or its Redis client library, e.g. Jedis/ioredis) runs the consistent-hashing logic locally and calls the correct cache node directly.
\`\`\`python
cache_ring = SortedList([C1:287M, C2:450M, C3:756M])
def get_cache_node(key):
    pos = hash(key)
    idx = cache_ring.bisect_left(pos)
    return cache_ring[idx % len(cache_ring)]
node = get_cache_node("onepiece")  # → always C2
\`\`\`
If C2 goes down, the app server's local ring detects it (health check/connection failure) and remaps to C3 (next clockwise) — no LB needed for failure detection either.

### Which Layer Does What — Full-Stack Summary Table

| Layer | Hashing | Replication | Gossip |
|---|---|---|---|
| App Servers | None (P2C) | None | None |
| Cache (Redis) | Consistent | Light (1x) | None |
| DB (Cassandra) | Consistent | Heavy (3x) | ✅ Yes |

Rule: *"Does this layer store SOURCE OF TRUTH data? YES → heavy replication, gossip, quorum, hinted handoff (Cassandra/DynamoDB). NO → light/no replication (App servers, Cache)."*
- App Server dies → no data loss, just restart (stateless)
- Cache dies → cache miss, DB fallback self-heals, not catastrophic
- DB dies → real data loss (orders, messages, money) → must replicate heavily

---

## HLD — Microservices / Service Decomposition

**Q: "Should we have different servers for different services like login and app server?"**

Yes — called **Service Decomposition / Microservices**.

\`\`\`
Monolith: one big server/codebase handles Login, Search, Payment, Recommendations, Notifications
Microservices: Auth Service, Search Service, Payment Service, Recommendation Service, Notification Service
  — each deployed & scaled independently
\`\`\`

**Why split:** Black Friday scenario — Payment gets 100x traffic, Search/Auth normal. Monolith must scale the entire app (wasteful); microservices scale only Payment. Similarly, a bug in Auth in a monolith takes down everything; in microservices, only Auth goes down (fault isolation).

\`\`\`
Client → API Gateway (reverse proxy)
  ├── /auth/*      → Auth Service
  ├── /search/*    → Search Service
  ├── /stream/*    → Streaming Service
  ├── /recommend/* → Recommendation Service
  └── /payment/*   → Payment Service

Each service has its OWN LB:
Auth Service LB → Auth S1,S2,S3 (P2C, stateless)
Search LB       → Search S1,S2   (P2C, stateless)
Payment LB      → Pay S1,S2,S3   (P2C, stateless)
     ↓
Shared Cache Layer (Redis, consistent hashing)
Shared DB Layer   (Cassandra, consistent hashing)
\`\`\`

**When NOT to split:** small team (<10 engineers), early-stage startup, tightly coupled services. At Netflix/Amazon/Adobe scale — microservices absolutely.

Interview one-liner: *"Separate services let each component scale independently, fail in isolation, and be deployed without affecting others. The tradeoff is operational complexity — service discovery, inter-service communication, distributed tracing."*

---

## HLD — Reverse Proxy, SSL, DDoS

### Reverse Proxy

**Forward Proxy** (in front of client, hides client identity) vs **Reverse Proxy** (in front of server, hides which backend server handled the request — Nginx, LBs, CDNs).

\`\`\`
Client → api.adobe.com (reverse proxy/Nginx)
              ↓ decides where to send:
         /api/images  → Image Service
         /api/auth    → Auth Service
         /api/export  → Export Service
         /static      → CDN/File Server
\`\`\`

What it handles: (1) **SSL Termination** — decrypts HTTPS, forwards plain HTTP internally; (2) **Load Balancing**; (3) **Caching** static responses; (4) **Rate Limiting**; (5) **Compression** (gzip); (6) **Security** — hides internal server IPs, absorbs DDoS.

\`\`\`nginx
server {
  listen 443 ssl;
  server_name api.adobe.com;
  ssl_certificate /etc/ssl/cert.pem;
  location /api/images { proxy_pass http://image-service:8080; }
  location /api/auth   { proxy_pass http://auth-service:8081; }
  location /static     { proxy_pass http://cdn-service:8082; proxy_cache my_cache; }
}
\`\`\`

\`\`\`
Internet → Firewall → Reverse Proxy (Nginx: SSL, rate limit, cache) → Load Balancer → App Servers → DB/Cache
\`\`\`

Interview one-liner: *"Reverse proxy sits in front of servers — handles SSL termination, caching, rate limiting, and hides internal infrastructure. Clients always talk to the proxy, never directly to backend servers."*

### SSL/TLS (Brief)

SSL/TLS encrypts data in transit. Without it, \`password=abc123\` is sniffable in plaintext; with it, gibberish to interceptors.

**Handshake:** (1) client lists supported encryptions, (2) server picks one + sends certificate, (3) client verifies cert (signed by trusted CA), (4) both agree on a session key, (5) rest of communication uses fast symmetric encryption. One-time cost ~100ms, then fast.

**Why terminate at reverse proxy:** app servers avoid crypto overhead; one cert to manage; internal network trusted anyway.

### DDoS (Brief)

Distributed Denial of Service — attacker's bot army floods requests (e.g. 2M req/sec vs your 10K req/sec capacity → server dies).

Types: **Volume attack** (raw bandwidth flood), **Protocol attack** (SYN flood — half-open TCP connections exhaust server), **App layer** (smart HTTP requests to expensive endpoints — hardest to detect).

Reverse proxy/CDN (Cloudflare) absorbs it via rate limiting, IP blacklists, CAPTCHA, traffic pattern analysis — real servers never see the attack traffic. Cloudflare's capacity ~184 Tbps (2024).

Interview one-liners: *"SSL → encrypts data in transit, terminate at proxy so backend doesn't handle crypto overhead. DDoS → flood attack to overwhelm server, reverse proxy/CDN like Cloudflare absorbs it before reaching your infra."*`,
    qa: [
    { q: 'When do you use consistent hashing vs round robin / P2C / least-connections for load balancing?', a: `Ask: is the service stateless or stateful? Stateless (any server can handle any request, e.g. app servers, API gateway routing) -> Round Robin / P2C / Least Connections. Stateful (same key must always hit the same server, e.g. cache nodes, DB shards, search index, rate limiting) -> Consistent Hashing or IP Hash. One-liner: need same request -> same server? Consistent hashing. Just need to spread load evenly? P2C/Least Conn. Simple identical servers? Round Robin.` },
    { q: 'What is Power of Two Choices (P2C) and why is it the modern default?', a: `Pick 2 random servers, route to whichever is less loaded. This mathematically reduces max load from O(log N) to O(log log N) with almost no overhead, and is used by Envoy, Nginx, and Cloudflare. It is the answer to reach for in interviews when asked about modern load balancing, alongside EWMA (Exponentially Weighted Moving Average) for tracking response time with decay.` },
    { q: 'Why does the app server go to the cache instead of the load balancer going directly to the cache?', a: `The load balancer is deliberately dumb: it only tracks which servers are alive/less loaded and which URL path maps to which pool. It has no business logic, doesn't know what to do on a cache miss, doesn't check permissions, and can't query the DB as a fallback. The app server is the brain that does all of that. Exception: static assets can be routed directly LB -> CDN/Cache since no business logic is needed.` },
    { q: 'Does the cache have its own load balancer in front of it?', a: `No. A load balancer in front of cache nodes would round-robin requests and break key affinity (the same key must always land on the same cache node). Instead, the app server (or its Redis client library) runs the consistent-hashing logic locally and calls the correct cache node directly -- no LB needed, and no LB needed for failure detection either since the client's local ring detects a dead node via connection failure and remaps to the next clockwise node.` },
    { q: "L4 vs L7 load balancing -- what's the practical difference?", a: `L4 sees only IP + TCP/UDP port -- fast but dumb, used for raw TCP forwarding, databases, gaming, video streaming (e.g. AWS NLB). L7 sees the full HTTP request (URL, headers, cookies) -- can route /api differently from /static, do SSL termination, rate limiting, A/B testing (e.g. AWS ALB, Nginx, Envoy). Real systems use both together: Internet -> L4 (absorbs DDoS, raw TCP) -> L7 (smart routing) -> servers.` },
    { q: 'Why split a monolith into microservices?', a: `Independent scaling and fault isolation. Example: on Black Friday, Payment gets 100x traffic while Search/Auth stay normal -- a monolith must scale the entire app (wasteful), while microservices scale only Payment. Similarly a bug in Auth in a monolith can take down everything; in microservices, only Auth goes down. Tradeoff: operational complexity -- service discovery, inter-service communication, distributed tracing. Not worth it for small teams (fewer than 10 engineers) or early-stage startups.` }
  ],
    mock: { easy: [], medium: [], hard: [] },
    days: {}
  });
})();
