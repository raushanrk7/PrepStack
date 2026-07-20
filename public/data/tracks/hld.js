// HLD — High-Level / System Design track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "Scalability & Load Balancing",
    days: [
      D("Horizontal vs vertical scaling", "https://github.com/donnemartin/system-design-primer#scalability"),
      D("Load balancers & algorithms (round robin, least conn, P2C)", "https://github.com/donnemartin/system-design-primer#load-balancer"),
      D("DNS & CDN basics", "https://aws.amazon.com/caching/cdn/"),
      D("L4 vs L7 load balancing", "https://www.nginx.com/resources/glossary/layer-4-load-balancing/"),
      D("Health checks & service discovery basics", "https://microservices.io/patterns/service-registry.html"),
      D("Design: URL Shortener (Bitly)", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/pastebin", "design"),
      D("Design: Pastebin / Rate Limiter", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/pastebin", "design")
    ]
  };

  const week2 = {
    title: "Caching Deep Dive",
    days: [
      D("Cache-aside vs write-through vs write-back", "https://aws.amazon.com/caching/best-practices/"),
      D("Redis internals (data structures, persistence)", "https://redis.io/docs/latest/"),
      D("CDN caching & edge networks", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching"),
      D("Cache invalidation strategies", "https://github.com/binhnguyennus/awesome-scalability#caching"),
      D("Cache stampede & thundering herd", "https://en.wikipedia.org/wiki/Cache_stampede"),
      D("Design: Distributed Cache", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Rate Limiter (token bucket / sliding window)", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };

  const week3 = {
    title: "Databases, Sharding & Consistent Hashing",
    days: [
      D("SQL vs NoSQL tradeoffs", "https://github.com/donnemartin/system-design-primer#sql-or-nosql"),
      D("Replication (leader-follower vs leaderless)", "https://github.com/donnemartin/system-design-primer#replication"),
      D("Sharding strategies", "https://github.com/donnemartin/system-design-primer#sharding"),
      D("Consistent hashing (ring, virtual nodes)", "https://www.youtube.com/@gkcs"),
      D("CAP theorem & quorum reads/writes", "https://github.com/donnemartin/system-design-primer#cap-theorem"),
      D("Design: Instagram / Twitter Feed", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/twitter", "design"),
      D("Design: WhatsApp / Notification system", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };

  const week4 = {
    title: "Messaging & Distributed Systems",
    days: [
      D("Message queues: Kafka vs RabbitMQ", "https://kafka.apache.org/documentation/"),
      D("Pub-sub & event-driven architecture", "https://aws.amazon.com/pub-sub-messaging/"),
      D("Idempotency & exactly-once processing", "https://kafka.apache.org/documentation/#semantics"),
      D("Microservices patterns & API Gateway", "https://microservices.io/patterns/apigateway.html"),
      D("Service mesh (Envoy), circuit breakers", "https://www.envoyproxy.io/docs"),
      D("Design: Ride-hailing system (Uber/Ola)", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Video streaming platform (YouTube/Netflix)", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };

  const week5 = {
    title: "APIs, Auth & Advanced Patterns",
    days: [
      D("API Gateway & BFF pattern", "https://microservices.io/patterns/apigateway.html"),
      D("AuthN/AuthZ: sessions, JWT, OAuth", "https://jwt.io/introduction"),
      D("Rate limiting algorithms (token bucket, sliding window)", "https://github.com/donnemartin/system-design-primer"),
      D("Bloom filters & probabilistic data structures", "https://en.wikipedia.org/wiki/Bloom_filter"),
      D("WebSocket vs SSE vs polling; DNS resolution", "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API"),
      D("Design: API Gateway with rate limiting", "https://microservices.io/patterns/apigateway.html", "design"),
      D("Design: Saga pattern for distributed transactions", "https://microservices.io/patterns/data/saga.html", "design")
    ]
  };

  const week6 = {
    title: "Mock Interviews & Review",
    days: [
      D("Revisit weakest HLD topic #1", "https://github.com/donnemartin/system-design-primer"),
      D("Revisit weakest HLD topic #2", "https://github.com/donnemartin/system-design-primer"),
      D("System design interview framework/checklist", "https://github.com/donnemartin/system-design-primer#how-to-approach-a-system-design-interview-question"),
      D("Capacity estimation & back-of-envelope math", "https://github.com/donnemartin/system-design-primer#step-2-back-of-the-envelope-estimation"),
      D("Trade-off articulation practice", "https://github.com/donnemartin/system-design-primer"),
      D("Full mock #1: random HLD problem, 45 min timebox", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design", "design"),
      D("Full mock #2 + review notes", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design", "design")
    ]
  };

  // 4-week: compressed — merge foundations, then storage/messaging, then practice, then mock.
  const w4_1 = {
    title: "Foundations: Scalability, LB & Caching",
    days: [
      D("Horizontal vs vertical scaling + load balancers", "https://github.com/donnemartin/system-design-primer#scalability"),
      D("L4 vs L7 load balancing, algorithms", "https://www.nginx.com/resources/glossary/layer-4-load-balancing/"),
      D("Caching strategies (aside/through/back)", "https://aws.amazon.com/caching/best-practices/"),
      D("Redis internals + CDN edge caching", "https://redis.io/docs/latest/"),
      D("Cache invalidation & stampede", "https://en.wikipedia.org/wiki/Cache_stampede"),
      D("Design: URL Shortener (Bitly)", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Rate Limiter", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };
  const w4_2 = {
    title: "Databases, Sharding & Consistent Hashing",
    days: [
      D("SQL vs NoSQL, replication", "https://github.com/donnemartin/system-design-primer#sql-or-nosql"),
      D("Sharding strategies", "https://github.com/donnemartin/system-design-primer#sharding"),
      D("Consistent hashing (ring, vnodes, quorum)", "https://www.youtube.com/@gkcs"),
      D("CAP theorem", "https://github.com/donnemartin/system-design-primer#cap-theorem"),
      D("Message queues (Kafka/RabbitMQ) + pub-sub", "https://kafka.apache.org/documentation/"),
      D("Design: Twitter/Instagram Feed", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/twitter", "design"),
      D("Design: WhatsApp / Notifications", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };
  const w4_3 = {
    title: "Microservices, Search & Storage",
    days: [
      D("Microservices patterns & API Gateway", "https://microservices.io/patterns/apigateway.html"),
      D("Service mesh & circuit breakers", "https://www.envoyproxy.io/docs"),
      D("Search & autocomplete", "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html"),
      D("Object storage / distributed file systems", "https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf"),
      D("Monitoring & observability", "https://opentelemetry.io/docs/"),
      D("Design: Ride-hailing (Uber/Ola)", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Video streaming (YouTube/Netflix)", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };
  const w4_4 = {
    title: "Mock Interviews & Review",
    days: [
      D("Revisit weakest topic #1", "https://github.com/donnemartin/system-design-primer"),
      D("Revisit weakest topic #2", "https://github.com/donnemartin/system-design-primer"),
      D("Interview framework/checklist", "https://github.com/donnemartin/system-design-primer#how-to-approach-a-system-design-interview-question"),
      D("Capacity estimation practice", "https://github.com/donnemartin/system-design-primer#step-2-back-of-the-envelope-estimation"),
      D("Trade-off articulation practice", "https://github.com/donnemartin/system-design-primer"),
      D("Full mock #1, 45 min timebox", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design", "design"),
      D("Full mock #2 + review", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design", "design")
    ]
  };

  const week6realtime = {
    title: "Real-time & Streaming Systems",
    days: [
      D("WebSockets vs long polling vs SSE", "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API"),
      D("Presence & typing indicators at scale", "https://github.com/donnemartin/system-design-primer"),
      D("Stream processing (Kafka Streams / Flink concepts)", "https://kafka.apache.org/documentation/streams/"),
      D("Fan-out strategies: push vs pull vs hybrid", "https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/twitter"),
      D("Backpressure & flow control", "https://github.com/donnemartin/system-design-primer"),
      D("Design: Live chat / presence system", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Live leaderboard / real-time analytics", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };

  // 8-week: expanded — same core weeks plus a real-time week, a security/consensus week, and mock.
  const w8_7 = {
    title: "Consensus & Advanced Distributed Systems",
    days: [
      D("Consensus algorithms: Raft vs Paxos", "https://raft.github.io/"),
      D("Distributed transactions (2PC, Saga pattern)", "https://microservices.io/patterns/data/saga.html"),
      D("CRDTs & eventual consistency", "https://crdt.tech/"),
      D("Rate limiting & backpressure at scale", "https://github.com/donnemartin/system-design-primer"),
      D("Security: authn/authz, API rate limiting, DDoS mitigation", "https://owasp.org/www-project-top-ten/"),
      D("Design: Distributed Lock Service", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Payment / Ledger system", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };
  const w8_8 = week6; // final mock+review week reused as week 8

  window.PrepStackRegister.track("hld", {
    name: "HLD — High-Level / System Design",
    icon: "🏛️",
    blurb: "From CAP theorem and consistent hashing to designing Twitter, Uber, and WhatsApp end-to-end.",
    durations: {
      4: [w4_1, w4_2, w4_3, w4_4],
      6: [week1, week2, week3, week4, week5, week6],
      8: [week1, week2, week3, week4, week5, week6realtime, w8_7, w8_8]
    }
  });
})();
