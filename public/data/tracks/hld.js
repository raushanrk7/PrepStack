// HLD — module structure (v3). Topics auto-derive from the week notes referenced by `from.week`.
(function () {
  window.PrepStackRegister.track("hld", {
    name: "HLD — High-Level / System Design",
    icon: "🏛️",
    blurb: "From CAP theorem and consistent hashing to designing Twitter, Uber, and WhatsApp end-to-end.",
    modules: [
      { id: "foundations", title: "Scalability & Load Balancing", blurb: "Scaling models, load balancers, consistent hashing, DNS & CDN.", from: { week: 0 } },
      { id: "caching", title: "Caching Deep Dive", blurb: "Cache strategies, Redis internals, CDN edges, invalidation & stampede.", from: { week: 1 } },
      { id: "databases", title: "Databases, Sharding & Consistency", blurb: "SQL vs NoSQL, replication, isolation levels, sharding, CAP & quorum.", from: { week: 2 } },
      { id: "messaging", title: "Messaging & Streaming", blurb: "Queues vs streams, Kafka internals, pub-sub, delivery semantics.", from: { week: 3 } },
      { id: "resilience", title: "APIs, Auth & Resilience", blurb: "Gateway, JWT/OAuth, rate limiting, circuit breakers, leader election, S3, bloom filters.", from: { week: 4 } },
      { id: "case-studies", title: "Design Case Studies & Mock", blurb: "Rate limiter, notifications, Tinder, Twitter trends, crawler, fraud detection + interview framework.", from: { week: 5 } }
    ]
  });
})();
