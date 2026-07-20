# HLD Study Notes

Interview prep notes for High Level Design (System Design).

## Structure

```
content/hld/
  index.js    <- registry of all days (import this)
  W1D1.jsx    <- Load Balancing + Consistent Hashing
  W1D2.jsx    <- Redis + Caching
  W1D3.jsx    <- Kafka + Message Queues
  W1D3b.jsx   <- Kafka vs RabbitMQ vs Pub/Sub
  W1D4.jsx    <- SQL/NoSQL + CAP + Sharding + Indexing
  W1D4b.jsx   <- DB Types (Relational/KV/Document/Graph)
  W1D5.jsx    <- API Gateway + JWT + Rate Limiting
  W1D6.jsx    <- Bloom Filter + WebSocket + Saga + DNS
```

## Adding New Days

1. Create W2D1.jsx (same structure as existing files)
2. Add entry to index.js HLD_DAYS array
3. Done — auto-appears in router

## Each File Has

- 📚 Concepts tab (expandable cards with code examples)
- ❓ Q&A tab (interview questions with answers)
- 🎯 Mock Interview tab (L5/L6 style questions)
- 🔍 Search (filters across all tabs)
