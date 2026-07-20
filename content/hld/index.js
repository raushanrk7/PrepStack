// HLD Study Notes — Auto Registry
// Add new day files here as you create them

export const HLD_DAYS = [
  {
    id: "W1D1",
    week: "Week 1",
    day: "Day 1",
    title: "Load Balancing · Consistent Hashing · Replication · Gossip",
    tags: ["LB", "Hashing", "Replication"],
    file: "./W1D1.jsx",
  },
  {
    id: "W1D2",
    week: "Week 1",
    day: "Day 2",
    title: "Caching — Redis Internals · Data Structures · Eviction · CDN",
    tags: ["Redis", "Cache", "CDN"],
    file: "./W1D2.jsx",
  },
  {
    id: "W1D3",
    week: "Week 1",
    day: "Day 3",
    title: "Message Queues — Kafka · RabbitMQ · Delivery · DLQ · Patterns",
    tags: ["Kafka", "MQ", "Delivery"],
    file: "./W1D3.jsx",
  },
  {
    id: "W1D3b",
    week: "Week 1",
    day: "Day 3B",
    title: "Kafka vs RabbitMQ vs Pub/Sub — Core Differences",
    tags: ["Kafka", "RabbitMQ", "PubSub"],
    file: "./W1D3b.jsx",
  },
  {
    id: "W1D4",
    week: "Week 1",
    day: "Day 4",
    title: "SQL vs NoSQL · CAP · Sharding · Indexing · Replication",
    tags: ["SQL", "NoSQL", "CAP", "Sharding"],
    file: "./W1D4.jsx",
  },
  {
    id: "W1D4b",
    week: "Week 1",
    day: "Day 4B",
    title: "Relational · Key-Value · Document · Graph DB",
    tags: ["MySQL", "MongoDB", "Redis", "Neo4j"],
    file: "./W1D4b.jsx",
  },
  {
    id: "W1D5",
    week: "Week 1",
    day: "Day 5",
    title: "API Gateway · JWT · Rate Limiting · Service Discovery · Circuit Breaker",
    tags: ["API", "JWT", "RateLimit", "CircuitBreaker"],
    file: "./W1D5.jsx",
  },
  {
    id: "W1D6",
    week: "Week 1",
    day: "Day 6",
    title: "Bloom Filter · WebSocket/SSE · Pub-Sub · Saga · DNS",
    tags: ["BloomFilter", "WebSocket", "Saga", "DNS"],
    file: "./W1D6.jsx",
  },
  // Add new days below:
  // { id: "W2D1", week: "Week 2", day: "Day 1", title: "...", tags: [...], file: "./W2D1.jsx" },
];

export const getByTag = (tag) =>
  HLD_DAYS.filter(d => d.tags.includes(tag));

export const getByWeek = (week) =>
  HLD_DAYS.filter(d => d.week === week);
