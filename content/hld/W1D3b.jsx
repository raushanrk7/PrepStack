import { useState } from "react";

const TAG = {
  MQ:  { bg: "#69F0AE18", color: "#69F0AE", border: "#69F0AE40" },
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  INF: { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "why", icon: "📬", tag: "HLD",
    title: "Why Message Systems Exist",
    summary: "Decouple producers from consumers. Buffer traffic spikes. Enable async processing. Guarantee delivery. Fan-out events to multiple consumers independently.",
    concepts: [
      {
        name: "Core Problems Solved",
        explanation: "Direct HTTP calls = tight coupling, speed mismatch, no retry. Message systems decouple services, buffer traffic, enable async, guarantee delivery.",
        example:
`Without messaging (direct HTTP):
  Order Svc -> Payment Svc (sync, waits)
  Order Svc -> Inventory Svc (sync, waits)
  Order Svc -> Email Svc (sync, waits)
  
  Payment down? Order fails 😱
  Inventory slow? User waits 5s 😱
  No retry on failure 😱

With messaging:
  Order Svc -> Message System -> return 200ms
  Payment Svc reads when ready ✅
  Inventory Svc reads when ready ✅
  Email Svc reads when ready ✅
  
  Any service down? Messages wait ✅
  Speed mismatch? Buffer absorbs ✅
  Failure? Retry from queue ✅

3 core problems solved:
  1. Decoupling (services independent) ✅
  2. Speed mismatch (producer != consumer rate) ✅
  3. Reliability (retry, durability) ✅`
      },
    ]
  },
  {
    id: "kafka", icon: "⚡", tag: "MQ",
    title: "Apache Kafka",
    summary: "Distributed commit log. Messages STORED on disk (7 days default). Pull-based consumers. Multiple consumer groups read same topic independently. Replay possible. Built for massive throughput.",
    concepts: [
      {
        name: "Core Architecture",
        explanation: "Topics split into partitions (ordered log). Producers hash key to partition. Consumers pull at own pace. Consumer groups share partitions. Replicated across brokers.",
        example:
`Topic "orders" - 3 partitions, RF=2:
  Broker 1: P0(primary), P1(replica)
  Broker 2: P1(primary), P2(replica)
  Broker 3: P2(primary), P0(replica)

Producer:
  hash(orderId) % 3 -> P1
  metadata says P1 = Broker 2
  write directly to Broker 2 ✅

Consumer Groups:
  payment-service group:
    3 consumers, 3 partitions
    each consumer owns 1 partition
  
  analytics-service group:
    reads SAME topic independently ✅
    own offset, own pace

__consumer_offsets: tracks each group's position
Retention: messages kept 7 days regardless ✅`
      },
      {
        name: "Key Kafka Commands + Config",
        explanation: "Producers configure acks for durability. Consumers commit offsets. Topics created with partition count and replication factor.",
        example:
`Create topic:
  kafka-topics.sh --create
    --topic orders
    --partitions 6
    --replication-factor 3

Produce:
  producer = KafkaProducer(
    bootstrap_servers=['b1:9092'],
    acks='all',           <- wait all ISR ✅
    retries=3,
    key_serializer=...,
    value_serializer=...
  )
  producer.send('orders', key=orderId, value=payload)

Consume:
  consumer = KafkaConsumer(
    'orders',
    group_id='payment-service',
    auto_offset_reset='earliest',
    enable_auto_commit=False  <- manual commit ✅
  )
  for msg in consumer:
    process(msg)
    consumer.commit()  <- commit AFTER processing

Monitor lag:
  kafka-consumer-groups.sh
    --describe --group payment-service`
      },
      {
        name: "What Kafka Offers",
        explanation: "Massive throughput (~1M msg/sec). Message replay. Multiple independent consumer groups. Time-based retention. Exactly-once via transactions. Compacted topics for KV store.",
        example:
`UNIQUE KAFKA FEATURES:

1. Replay:
   Consumer crashed for 2 days?
   Seek back to old offset, re-read ✅
   Payment service missed events? Replay ✅

2. Multiple independent consumers:
   payment-service:  reads orders topic (offset 500)
   analytics-service: reads orders topic (offset 480)
   notification-svc:  reads orders topic (offset 501)
   ALL independent, own pace ✅

3. Compacted topics:
   Only LATEST value per key stored
   Deletes old versions automatically
   Acts like distributed KV store ✅

4. Exactly-once semantics:
   Kafka transactions (v0.11+)
   Atomic produce + consume + commit ✅

5. Throughput:
   ~1M messages/second per broker ✅
   Linear scaling with partitions ✅

6. Log-based architecture:
   Sequential disk writes (WAL-like)
   100x faster than random writes ✅`
      },
      {
        name: "Kafka Pros and Cons",
        explanation: "Built for massive throughput and event streaming. Overkill for simple task queues. Complex to operate. Best when multiple services need same events or replay is needed.",
        example:
`PROS:
  Massive throughput ~1M/sec ✅
  Message replay (any time window) ✅
  Multiple consumer groups ✅
  Fault tolerant (RF=3) ✅
  Ordered per partition ✅
  Log retention (audit trail) ✅
  Ecosystem: Kafka Streams, ksqlDB ✅

CONS:
  Complex to operate (Zookeeper/KRaft)
  No per-message TTL (whole topic only)
  No built-in DLQ (must implement)
  No complex routing rules
  Overkill for simple task queues
  Min viable cluster = 3 brokers
  Consumer must poll (not push)

BEST FOR:
  Event streaming (activity, clicks) ✅
  Multiple services react to same event ✅
  Event replay needed ✅
  Audit logs ✅
  Real-time analytics pipelines ✅
  Microservices event backbone ✅`
      },
    ]
  },
  {
    id: "rabbitmq", icon: "🐰", tag: "MQ",
    title: "RabbitMQ",
    summary: "Traditional message broker. Messages DELETED after consumption. Push-based (broker pushes to consumers). Complex routing via exchanges. Built-in DLQ. Best for task queues and complex routing.",
    concepts: [
      {
        name: "Core Architecture",
        explanation: "Producer -> Exchange -> Queue -> Consumer. Exchange decides routing (direct, fanout, topic, headers). Message deleted after consumer acks. Push-based delivery.",
        example:
`Architecture:
  Producer -> Exchange -> Binding -> Queue -> Consumer

Exchange types:
  Direct:  route by exact routing key
           orders.payment -> payment queue
           orders.email -> email queue

  Fanout:  broadcast to ALL bound queues
           notification -> push Q, sms Q, email Q

  Topic:   pattern matching routing key
           orders.*.india -> india queue
           orders.premium.* -> premium queue
           *.*.failed -> dlq

  Headers: route by message headers
           {type: premium} -> premium queue

Queue properties:
  durable:    survives RabbitMQ restart ✅
  exclusive:  only one consumer ✅
  auto-delete: deleted when no consumers`
      },
      {
        name: "RabbitMQ Commands + Config",
        explanation: "Publishers send to exchange with routing key. Consumers subscribe to queues. Acks control when message deleted. Prefetch limits in-flight messages per consumer.",
        example:
`Publish:
  channel.exchange_declare(
    exchange='orders',
    exchange_type='direct',
    durable=True
  )
  channel.basic_publish(
    exchange='orders',
    routing_key='payment',  <- routing key
    body=json.dumps(payload),
    properties=pika.BasicProperties(
      delivery_mode=2,  <- persistent ✅
    )
  )

Consume:
  def callback(ch, method, props, body):
    process(body)
    ch.basic_ack(delivery_tag=method.delivery_tag)
    <- ack AFTER processing ✅
    <- message deleted ONLY after ack ✅
  
  channel.basic_qos(prefetch_count=10)
  <- max 10 unacked msgs per consumer ✅
  channel.basic_consume(
    queue='payment-queue',
    on_message_callback=callback
  )

Dead Letter Queue:
  channel.queue_declare(
    queue='payment-queue',
    arguments={
      'x-dead-letter-exchange': 'dlx',
      'x-message-ttl': 30000  <- 30s TTL
    }
  )`
      },
      {
        name: "What RabbitMQ Offers",
        explanation: "Built-in DLQ, message TTL per message, complex routing, push-based delivery, management UI, per-message priority. Best for task distribution and complex routing patterns.",
        example:
`UNIQUE RABBITMQ FEATURES:

1. Per-message TTL:
   Message expires if not consumed in Xms ✅
   Kafka: only topic-level retention

2. Built-in Dead Letter Queue:
   x-dead-letter-exchange config
   Failed messages auto-routed to DLQ ✅
   Kafka: must implement manually

3. Message Priority:
   x-max-priority: 10
   High priority processed first ✅
   Kafka: no priority concept

4. Complex routing:
   Topic exchange: *.payment.india
   Headers exchange: {type:premium} -> queue
   Kafka: no routing logic

5. Push-based:
   Broker pushes to consumer ✅
   Lower latency for small queues
   Kafka: consumer must poll

6. Management UI:
   Web dashboard out of box ✅
   Monitor queues, exchanges, rates

7. Per-message ack:
   Each message individually acked
   Fine-grained control ✅`
      },
      {
        name: "RabbitMQ Pros and Cons",
        explanation: "Best for task queues, complex routing, priority queues. Not designed for replay or massive throughput. Message deleted after consumption (not a log).",
        example:
`PROS:
  Per-message TTL ✅
  Built-in DLQ ✅
  Complex routing (exchanges) ✅
  Message priority ✅
  Push-based (lower latency) ✅
  Management UI out of box ✅
  Lower ops complexity than Kafka ✅
  Good for RPC pattern ✅

CONS:
  No replay (deleted after ack) ❌
  One consumer per message ❌
  (unless fanout exchange)
  Lower throughput ~50K/sec vs Kafka 1M
  Not designed for streaming
  Multiple consumers = multiple queues

BEST FOR:
  Task queue (one task one worker) ✅
  Background jobs ✅
  Complex routing rules ✅
  Priority queues ✅
  RPC (request-reply) pattern ✅
  Email/SMS sending queue ✅
  Simple async decoupling ✅`
      },
    ]
  },
  {
    id: "pubsub", icon: "📻", tag: "MQ",
    title: "Pub/Sub (Redis + Google Cloud Pub/Sub)",
    summary: "Publishers broadcast to ALL subscribers instantly. NOT stored (Redis) or short retention (GCP). Fire-and-forget. Offline subscriber misses messages. Best for real-time fanout.",
    concepts: [
      {
        name: "Redis Pub/Sub",
        explanation: "Pure in-memory broadcast. Zero persistence. Message delivered to ALL current subscribers or lost. Microsecond latency. Perfect for WebSocket routing and cache invalidation.",
        example:
`Publisher (any server):
  redis.publish('user:42:notifications', payload)

Subscriber (WebSocket server):
  redis.subscribe('user:42:notifications')
  for message in pubsub.listen():
    push_via_websocket(message)

Key behaviors:
  Subscriber offline? Message LOST ❌
  No storage, no replay ❌
  ALL subscribers get same message ✅
  Microsecond delivery ✅

Real use - WebSocket message routing:
  User A (Server 1) sends to User B:
  Server 1: PUBLISH user:B:msgs "hello"
  Server 2 subscribed: receives ✅
  Server 2 pushes to User B's WebSocket ✅
  Server 3,4 subscribed: receive + ignore ✅

Cache invalidation broadcast:
  Product price changes:
  PUBLISH cache:invalidate "product:101"
  All app servers subscribed:
  -> each deletes their local cache ✅`
      },
      {
        name: "Google Cloud Pub/Sub + AWS SNS",
        explanation: "Managed pub/sub with persistence and delivery guarantees. Unlike Redis, messages stored until acknowledged. Fan-out to multiple subscriptions. At-least-once delivery.",
        example:
`GCP Pub/Sub:
  Topic: orders
  Subscription 1: payment-sub (Payment Svc)
  Subscription 2: analytics-sub (Analytics)
  Subscription 3: notification-sub (Notif)

  Publish once -> all 3 subscriptions get copy ✅
  Each subscription = independent queue ✅
  Message retained until each sub acks ✅
  (Unlike Redis where offline = lost)

AWS equivalent:
  SNS (Simple Notification Service) = pub/sub
  SQS (Simple Queue Service) = queue
  
  Pattern: SNS -> multiple SQS queues
  Publish to SNS topic
  Fan-out to SQS queues per service ✅
  Each SQS = durable queue for that service ✅

vs Kafka:
  GCP Pub/Sub: managed, less config
  Kafka: more control, replay, ordering ✅
  Use GCP Pub/Sub for cloud-native apps ✅
  Use Kafka for complex stream processing ✅`
      },
      {
        name: "Redis Pub/Sub vs Kafka vs RabbitMQ Fanout",
        explanation: "All three can fan-out but very differently. Redis = instant no storage. Kafka = stored replay possible. RabbitMQ fanout exchange = push to multiple queues.",
        example:
`Fanout comparison:

Redis Pub/Sub:
  Instant ✅, no storage ❌, no replay ❌
  Offline subscriber misses ❌
  Use: real-time only (WebSocket routing) ✅

Kafka (multiple consumer groups):
  Stored ✅, replay ✅, each group independent ✅
  Consumer pulls (slight delay) 😬
  Use: when replay needed, audit trail ✅

RabbitMQ Fanout Exchange:
  Copies to all bound queues ✅
  Each queue = separate consumer group ✅
  Push-based (faster for small volume) ✅
  Message deleted per queue after ack ❌
  Use: simple fanout, push needed ✅

Real example - Uber ride completed:
  Redis: NOT suitable (critical event, can't lose)
  RabbitMQ fanout: push to payment Q + notif Q ✅
  Kafka: payment-group + notif-group both read ✅
  Kafka preferred: replay, audit, scale ✅`
      },
    ]
  },
  {
    id: "comparison", icon: "📊", tag: "HLD",
    title: "Core Differences + Decision Framework",
    summary: "Kafka = log (keep+replay). RabbitMQ = queue (delete after). Pub/Sub = broadcast (instant). Different primitives for different problems. Most systems use 2-3 together.",
    concepts: [
      {
        name: "Full Comparison Table",
        explanation: "Each system makes different tradeoffs. Storage, delivery model, routing complexity, throughput, consumer model all differ. Choose based on your primary requirement.",
        example:
`Feature          | Kafka        | RabbitMQ     | Redis Pub/Sub
─────────────────────────────────────────────────────────────────
Storage          | 7 days disk  | Until acked  | NONE
Replay           | YES ✅       | NO ❌        | NO ❌
After consume    | KEPT ✅      | DELETED      | N/A
Multi consumers  | Groups ✅    | Fanout only  | ALL subscribers
Throughput       | ~1M/sec ✅   | ~50K/sec     | Very fast
Delivery         | Pull         | Push ✅      | Push ✅
Routing          | Simple       | Complex ✅   | Channel-based
DLQ              | Manual       | Built-in ✅  | None
Per-msg TTL      | No           | YES ✅       | No
Priority         | No           | YES ✅       | No
Ordering         | Per partition| Per queue    | None
Ops complexity   | High         | Medium       | Low ✅
Offline consumer | Catches up ✅| Misses if Q  | LOSES msg ❌
                 |              | full/expired |`
      },
      {
        name: "Decision Framework",
        explanation: "Choose based on primary requirement: need replay? Kafka. Need complex routing or priority? RabbitMQ. Need instant broadcast? Redis. Need managed cloud? GCP Pub/Sub or SNS+SQS.",
        example:
`CHOOSE KAFKA WHEN:
  Multiple services react to same event ✅
  Event replay needed (audit, debugging) ✅
  Massive throughput (>50K/sec) ✅
  Event streaming / real-time analytics ✅
  "I want a log, not a queue" ✅

CHOOSE RABBITMQ WHEN:
  Task queue (one task, one worker) ✅
  Complex routing rules needed ✅
  Per-message TTL needed ✅
  Priority queues needed ✅
  Simple async, low volume ✅
  RPC request-reply pattern ✅

CHOOSE REDIS PUB/SUB WHEN:
  Real-time broadcast, loss ok ✅
  WebSocket message routing ✅
  Cache invalidation broadcast ✅
  Microsecond latency needed ✅
  No persistence needed ✅

CHOOSE GCP PUB/SUB / SNS WHEN:
  Cloud-native, managed service ✅
  Fan-out with persistence ✅
  Multiple independent subscribers ✅
  Don't want to manage Kafka cluster ✅`
      },
      {
        name: "Real System Designs",
        explanation: "Real systems often use multiple messaging systems together. Each for its specific strength.",
        example:
`Uber:
  Kafka:      ride events (replay, audit) ✅
  RabbitMQ:   driver push notifications ✅
              (push-based, task per driver)
  Redis P/S:  real-time location broadcast ✅

Instagram:
  Kafka:      activity events, analytics ✅
  Redis P/S:  live notification fanout ✅

E-commerce (Order flow):
  Kafka:
    "order.created" -> payment, inventory,
                       analytics, fraud
    Multiple consumers, audit trail ✅
  
  RabbitMQ:
    Email queue (priority: transactional > promo)
    SMS queue (TTL: OTP expires in 5min) ✅
  
  Redis Pub/Sub:
    "invalidate cache: product:101"
    All app servers clear local cache ✅

Rule of thumb:
  Events/streaming -> Kafka ✅
  Tasks/jobs -> RabbitMQ ✅
  Real-time fanout -> Redis Pub/Sub ✅`
      },
      {
        name: "When Kafka Replaces RabbitMQ",
        explanation: "Kafka can do most of what RabbitMQ does (except per-message TTL and priority). But adds replay and scale. Growing trend: teams start with RabbitMQ, migrate to Kafka at scale.",
        example:
`Kafka doing RabbitMQ things:

Task queue (one task one worker):
  1 partition -> 1 consumer ✅
  Ordered processing guaranteed ✅

Fanout to multiple services:
  Multiple consumer groups ✅
  Each group = independent subscription ✅

DLQ in Kafka:
  After N retries -> produce to orders.DLQ
  Manual but works ✅

What Kafka CANNOT do:
  Per-message TTL ❌ (only topic-level)
  Message priority ❌
  Complex routing rules ❌
  (needs app-level filtering)

What tips you toward Kafka:
  >50K messages/second
  Need replay anytime
  Multiple teams consume same events
  Building event-driven microservices

What tips you toward RabbitMQ:
  <50K messages/second
  Need per-message TTL (OTPs!)
  Need priority (payments > promotions)
  Simple use case, want less ops burden`
      },
    ]
  },
];

const qna = [
  { q: "Core difference between Kafka and RabbitMQ?", a: "Fundamental model difference. Kafka = distributed log (newspaper): messages stored on disk for 7 days, multiple consumer groups read same topic independently, can replay, pull-based. RabbitMQ = traditional queue (post office): message deleted after consumer acknowledges, one consumer processes each message, push-based. Use Kafka when multiple services need same events or replay needed. Use RabbitMQ for task queues where each job done by exactly one worker." },
  { q: "What is Kafka consumer group and why important?", a: "Consumer group = multiple instances of same service sharing partitions of a topic. Max useful consumers = partition count (extra consumers idle). Different groups read same topic INDEPENDENTLY — each maintains own offset. payment-service group at offset 500, analytics-service group at offset 480 — both reading same 'orders' topic, neither affects the other. This is how Kafka enables fan-out without copying messages." },
  { q: "Why does RabbitMQ have exchanges and Kafka doesn't?", a: "Different routing philosophies. Kafka: producer decides partition (via key hash), no routing logic in broker. Simple but requires producers to know structure. RabbitMQ: exchange handles routing — direct (exact key), fanout (all queues), topic (pattern matching), headers (message attributes). Producers send to exchange with routing key, exchange decides which queues get the message. RabbitMQ is more flexible for complex routing; Kafka is simpler and faster." },
  { q: "Redis Pub/Sub vs Kafka — when to use Redis?", a: "Redis Pub/Sub: no storage, message lost if subscriber offline, instant delivery to all current subscribers, microsecond latency. Use for: WebSocket message routing across servers (message can arrive at any server, need to route to correct one), cache invalidation broadcast (tell all app servers to clear a cached item), real-time fanout where brief offline period = message loss is acceptable. Kafka when you can't lose messages, need replay, or need audit trail." },
  { q: "What is RabbitMQ Dead Letter Queue and how does it work?", a: "Built-in DLQ: configure x-dead-letter-exchange on a queue. Messages auto-route to DLQ when: consumer rejects (nack), message TTL expires, queue length exceeded. Application processes from DLQ separately — alert engineers, investigate root cause, replay after fix. Kafka needs manual DLQ implementation: catch exception, produce to topic.DLQ, commit offset to move on. RabbitMQ DLQ advantage: per-message TTL enables OTP expiry (SET x-message-ttl:300000 = OTP dies in 5 min)." },
  { q: "How does message ordering work in Kafka vs RabbitMQ?", a: "Kafka: ordering guaranteed within a partition only. Same key always goes to same partition (via hash) so all messages for same entity (same orderId, same userId) are ordered. Cross-partition ordering not guaranteed. RabbitMQ: ordering within a single queue, per consumer. Multiple consumers on same queue = ordering lost (consumer A processes msg 3 while B processes msg 2). Use one consumer per queue or careful consumer design for strict ordering." },
  { q: "What is the SNS + SQS pattern and why use it?", a: "AWS pattern replacing Kafka/RabbitMQ in cloud-native apps. SNS (Simple Notification Service) = pub/sub topic. SQS (Simple Queue Service) = durable queue. Pattern: publish once to SNS, SNS fans-out to multiple SQS queues (one per service). Each SQS is an independent durable queue — service offline? Messages wait in SQS. Retry, DLQ all built into SQS. Simpler than Kafka to operate (fully managed), but less replay capability and lower throughput ceiling." },
  { q: "How does Kafka achieve ~1M messages/second throughput?", a: "Several design decisions: (1) Sequential disk writes (like WAL) — 100x faster than random writes, OS page cache makes reads fast. (2) Zero-copy: kernel sends data directly to network socket, no user-space copy. (3) Batching: producer batches messages, sends in bulk, consumer fetches in bulk — amortizes network overhead. (4) Partitioning: multiple partitions = parallel writes across brokers. (5) Consumer pull: broker never tracks individual consumer state beyond offset — simple and scalable." },
  { q: "When would you use Google Cloud Pub/Sub instead of Kafka?", a: "Cloud-native apps on GCP where you don't want to manage Kafka cluster. GCP Pub/Sub: fully managed, auto-scales, per-message ack (like RabbitMQ), fan-out with persistence (unlike Redis), integrates natively with GCP services (BigQuery, Dataflow). Use Kafka when: need replay to arbitrary offset (GCP Pub/Sub retains 7 days but can't seek to specific offset), need exactly-once semantics with transactions, need advanced stream processing (Kafka Streams), or running multi-cloud/on-prem." },
];

const mock = [
  { q: "Design the messaging architecture for a food delivery platform (like Swiggy). Order placed, restaurant notified, driver assigned, customer updated at each step.", a: "Kafka as event backbone. Topic 'orders' with orderId as partition key — guarantees ordering per order. Multiple consumer groups: restaurant-service (notifies restaurant), driver-service (finds and assigns driver), notification-service (updates customer), analytics-service (business metrics). All read 'orders' topic independently. For driver notification specifically: RabbitMQ push to driver app (push-based, driver needs instant notification, not pulling from Kafka). Redis Pub/Sub for real-time driver location broadcast to customer's app via WebSocket server. DLQ: failed restaurant notifications go to orders.DLQ, alert engineer, retry after fixing restaurant service." },
  { q: "You're building an OTP system. User requests OTP, must expire in 5 minutes, retry if SMS fails. What messaging system?", a: "RabbitMQ — specifically because of per-message TTL. Kafka has no per-message TTL (only topic-level retention). Config: queue with x-message-ttl: 300000 (5 min in ms). OTP message auto-expires from queue after 5 min — even if SMS consumer is processing slow, stale OTPs never delivered. x-dead-letter-exchange: dlx so expired OTPs go to DLQ (useful for monitoring how many expire). Retry: consumer rejects on SMS failure, RabbitMQ re-queues with backoff (via nack + requeue: false + DLQ with TTL). Prefetch=1 ensures consumer only holds one OTP at a time, preventing hoarding." },
  { q: "Your startup is at 10K orders/day considering Kafka vs RabbitMQ. What do you recommend?", a: "RabbitMQ at this scale. 10K orders/day = ~0.1 orders/second — nowhere near needing Kafka's 1M/sec throughput. RabbitMQ advantages at small scale: simpler to operate (no Zookeeper, no partition management), built-in DLQ without custom code, management UI for visibility, push-based (better latency for small volume), lower resource requirements (single RabbitMQ node vs minimum 3 Kafka brokers). Start with RabbitMQ. Migrate to Kafka when: >10 services consuming same events, need replay for debugging production issues, >50K messages/second, or building real-time analytics pipeline. Most companies never reach Kafka scale — don't add complexity prematurely." },
  { q: "How would you implement fan-out notifications for Instagram: user posts → notify 10M followers?", a: "Two-step approach. Step 1: Post created → produce to Kafka 'posts' topic. Step 2: Fan-out Service reads from Kafka, pushes to follower notification queues. For celebrities with 10M followers: async fan-out in batches (not synchronous). Fan-out Service: reads post event, queries follower DB in pages of 1000, for each page produces 1000 notification messages to Kafka 'notifications' topic. Notification workers consume 'notifications' topic: check user preferences (GETBIT push:subscribers userId), send push via FCM/APNS. Redis Pub/Sub for ONLINE users: if user has open WebSocket connection, Pub/Sub delivers instantly. Offline users: notification queued and delivered on next app open. Total latency from post to notification: seconds for online users, minutes acceptable for offline (batch fan-out)." },
];

const S = {
  page:  { minHeight:"100vh", background:"#08080F", color:"#D8D8E8", fontFamily:"'Courier New',monospace" },
  hdr:   { background:"#0D0D1A", borderBottom:"1px solid #1A1A2E", padding:"16px 24px", position:"sticky", top:0, zIndex:100 },
  wrap:  { maxWidth:"860px", margin:"0 auto" },
  tab:   (a,c) => ({ background:"none", border:"none", cursor:"pointer", padding:"10px 18px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"'Courier New',monospace", color:a?c||"#fff":"#444", borderBottom:a?`2px solid ${c||"#69F0AE"}`:"2px solid transparent" }),
  card:  (o,tc) => ({ background:"#0D0D1A", border:`1px solid ${o?tc.border:"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"10px" }),
  pre:   { background:"#070710", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"12px 14px", fontSize:"11px", color:"#A8A8C8", lineHeight:"1.8", overflowX:"auto", fontFamily:"'Courier New',monospace", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" },
  qcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#69F0AE30":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
  mcard: (o) => ({ background:"#0D0D1A", border:`1px solid ${o?"#FF6B3550":"#1A1A2E"}`, borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }),
};

export default function W1D3b() {
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
            <div style={{ fontSize:"9px", color:"#69F0AE", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 3B</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>Kafka vs RabbitMQ vs Pub/Sub — Core Differences</div>
          </div>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background:"#0A0A14", border:"1px solid #1A1A2E", borderRadius:"6px", padding:"8px 12px", color:"#E8E8F0", fontFamily:"inherit", fontSize:"11px", outline:"none", width:"160px" }} />
        </div>
        <div style={{ ...S.wrap, display:"flex", borderTop:"1px solid #1A1A2E", marginTop:"12px" }}>
          <button style={S.tab(tab==="concepts")} onClick={() => setTab("concepts")}>📚 Concepts ({topics.length})</button>
          <button style={S.tab(tab==="qna")} onClick={() => setTab("qna")}>❓ Q&A ({qna.length})</button>
          <button style={S.tab(tab==="mock","#FF6B35")} onClick={() => setTab("mock")}>🎯 Mock ({mock.length})</button>
        </div>
      </div>

      <div style={{ ...S.wrap, padding:"24px 24px 60px" }}>
        {tab === "concepts" && (
          <div>
            {ft.length === 0 && <div style={{ color:"#444", textAlign:"center", padding:"40px" }}>No results for "{search}"</div>}
            {ft.map(topic => {
              const tc = TAG[topic.tag] || TAG.MQ;
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
            <div style={{ fontSize:"10px", color:"#444", letterSpacing:"2px", marginBottom:"16px" }}>QUESTIONS — KEY FOR INTERVIEWS</div>
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
              <div style={{ fontSize:"12px", color:"#666", lineHeight:"1.6" }}>Try to answer mentally first. Focus on choosing the right messaging system and justifying tradeoffs.</div>
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
