// HLD — per-week study plan + curated video resources (Gaurav Sen, Arpit Bhayani, sudoCODE first).
// Uses schema v2: plan (markdown) + resources [{name, link, type, by}] merge into each week.
(function () {
  const R = window.PrepStackRegister;
  const yt = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

  const plan = (order, outcome, drill) => [
    "## How to attack this week",
    "1. **Watch first** (Resources tab) — one video per topic at 1.5x, notes closed.",
    "2. **Read Concepts** and diagram each system yourself on paper before peeking.",
    "3. **Self-test with Q&A** — answer aloud BEFORE opening each card.",
    "4. **Practice**: " + drill,
    "",
    "**Order:** " + order,
    "",
    "**You're done when:** " + outcome
  ].join("\n");

  R.notes("hld", 0, {
    plan: plan(
      "scaling basics → LB algorithms → consistent hashing → DNS/CDN → design drills",
      "you can draw a consistently-hashed LB tier with virtual nodes and explain P2C from memory.",
      "design URL shortener + rate limiter in 30 min each, spoken aloud."
    ),
    resources: [
      { name: "What is Load Balancing? / System design basics", link: yt("gaurav sen load balancer system design"), type: "video", by: "Gaurav Sen" },
      { name: "Consistent Hashing explained", link: yt("gaurav sen consistent hashing"), type: "video", by: "Gaurav Sen" },
      { name: "Consistent hashing internals (deep)", link: yt("arpit bhayani consistent hashing"), type: "video", by: "Arpit Bhayani" },
      { name: "System design basics playlist", link: "https://www.youtube.com/playlist?list=PLTCrU9sGyburBw9wNOHebv9SjlE4Elv5a", type: "video", by: "sudoCODE" },
      { name: "Horizontal vs vertical scaling", link: yt("sudocode horizontal vertical scaling"), type: "video", by: "sudoCODE" }
    ]
  });

  R.notes("hld", 1, {
    plan: plan(
      "caching patterns → Redis internals → CDN → invalidation/stampede → distributed cache design",
      "you can explain cache-aside vs write-through with failure cases, and defend a stampede fix.",
      "design a distributed cache (eviction, sharding, hot keys) in 40 min."
    ),
    resources: [
      { name: "Distributed caching / Redis", link: yt("gaurav sen distributed cache system design"), type: "video", by: "Gaurav Sen" },
      { name: "Redis internals series", link: yt("arpit bhayani redis internals"), type: "video", by: "Arpit Bhayani" },
      { name: "Caching strategies", link: yt("concept and coding caching strategies system design"), type: "video", by: "Concept && Coding" },
      { name: "CDN — how it works", link: yt("sudocode cdn content delivery network"), type: "video", by: "sudoCODE" }
    ]
  });

  R.notes("hld", 2, {
    plan: plan(
      "SQL vs NoSQL → replication → isolation levels → sharding → CAP/quorum → feed design",
      "you can walk a write through leader replication, name each isolation anomaly, and shard a feed DB.",
      "design Twitter feed + WhatsApp in 45 min each; say the fan-out trade-off unprompted."
    ),
    resources: [
      { name: "Database sharding", link: yt("gaurav sen database sharding"), type: "video", by: "Gaurav Sen" },
      { name: "Transaction isolation levels (deep)", link: yt("arpit bhayani transaction isolation levels"), type: "video", by: "Arpit Bhayani" },
      { name: "Database replication internals", link: yt("arpit bhayani database replication"), type: "video", by: "Arpit Bhayani" },
      { name: "CAP theorem simplified", link: yt("gaurav sen cap theorem"), type: "video", by: "Gaurav Sen" },
      { name: "SQL vs NoSQL — how to choose", link: yt("concept and coding sql vs nosql"), type: "video", by: "Concept && Coding" }
    ]
  });

  R.notes("hld", 3, {
    plan: plan(
      "queues vs streams → Kafka internals → delivery semantics → pub-sub design → Uber/YouTube drills",
      "you can explain partitions/consumer groups/offsets and pick Kafka vs RabbitMQ with reasons.",
      "design a notification pipeline with retries + DLQ + idempotency in 40 min."
    ),
    resources: [
      { name: "Message queues & Kafka", link: yt("gaurav sen message queue kafka system design"), type: "video", by: "Gaurav Sen" },
      { name: "Kafka internals series", link: yt("arpit bhayani kafka internals"), type: "video", by: "Arpit Bhayani" },
      { name: "Kafka vs RabbitMQ", link: yt("sudocode kafka vs rabbitmq"), type: "video", by: "sudoCODE" },
      { name: "Event-driven architecture", link: yt("concept and coding event driven architecture"), type: "video", by: "Concept && Coding" }
    ]
  });

  R.notes("hld", 4, {
    plan: plan(
      "API gateway → authN/Z (JWT/OAuth) → rate limiting → resilience (breakers, leader election) → bloom/S3/big data",
      "you can sketch gateway middleware order, JWT vs session trade-offs, and a circuit breaker's 3 states.",
      "design an API gateway with rate limiting in 40 min; add auth + breaker on the follow-up."
    ),
    resources: [
      { name: "API Gateway & rate limiting", link: yt("gaurav sen api gateway rate limiter"), type: "video", by: "Gaurav Sen" },
      { name: "JWT / OAuth explained", link: yt("concept and coding jwt oauth authentication"), type: "video", by: "Concept && Coding" },
      { name: "Bloom filters (deep)", link: yt("arpit bhayani bloom filter"), type: "video", by: "Arpit Bhayani" },
      { name: "Leader election / distributed consensus", link: yt("arpit bhayani leader election raft"), type: "video", by: "Arpit Bhayani" },
      { name: "Circuit breaker pattern", link: yt("sudocode circuit breaker microservices"), type: "video", by: "sudoCODE" }
    ]
  });

  R.notes("hld", 5, {
    plan: plan(
      "framework/checklist → capacity estimation → 2 full mocks from the case-study list → review weakest 2 topics",
      "two full 45-min mocks done aloud with diagrams, self-scored against the model answers.",
      "pick randomly: Tinder feed, Twitter trends, crawler, fraud detection — no peeking until done."
    ),
    resources: [
      { name: "How to approach system design interviews", link: yt("gaurav sen how to approach system design interview"), type: "video", by: "Gaurav Sen" },
      { name: "Capacity estimation / back-of-envelope", link: yt("sudocode capacity estimation system design"), type: "video", by: "sudoCODE" },
      { name: "Mock system design interviews", link: yt("system design mock interview gaurav sen"), type: "video", by: "Gaurav Sen" },
      { name: "System Design Primer (text)", link: "https://github.com/donnemartin/system-design-primer", type: "github" }
    ]
  });
})();
