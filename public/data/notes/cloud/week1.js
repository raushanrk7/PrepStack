// Cloud & DevOps — Week 2: Managed Services, Serverless & Azure.
(function () {
  window.PrepStackRegister.notes("cloud", 1, {
    concepts: `# Managed Services, Serverless & Azure

## Managed databases
**TL;DR:** Let the cloud run the database; you keep the schema decisions.

### RDS / Aurora
- **RDS**: managed MySQL/Postgres/etc — AWS handles patching, backups, multi-AZ failover, read replicas. You still choose instance size.
- **Aurora**: AWS's cloud-native MySQL/Postgres — storage auto-scales, 6-way replicated across 3 AZs, up to 15 read replicas, faster failover. Costs more.
- **Multi-AZ** (sync standby, for HA) ≠ **read replicas** (async, for read scaling). Classic interview distinction.

### DynamoDB
- Serverless key-value/document store: single-digit-ms at any scale, pay per request.
- Model around access patterns (partition key + sort key); no joins, no ad-hoc queries without GSIs.
- Use when: massive scale, known access patterns, ops-free. Avoid when: relational queries, transactions across many items.

### ElastiCache
- Managed Redis/Memcached. Same caching patterns as any Redis — cache-aside, TTLs, eviction policies.

## Serverless — Lambda & friends
**TL;DR:** Upload a function; cloud runs it per-event, scales to zero, bills per ms.

### Lambda essentials
- Triggers: API Gateway (HTTP), S3 events, SQS, SNS, EventBridge (cron), DynamoDB streams.
- Limits to know: 15-min max runtime, memory 128MB–10GB (CPU scales with memory), **cold starts** (first invoke spins a sandbox — mitigate with provisioned concurrency).
- Stateless by design — persist to S3/DynamoDB; /tmp is ephemeral.

### The event-driven trio
- **SQS** (queue): 1 consumer group, pull, at-least-once, DLQ for poison messages. Decouple + absorb bursts.
- **SNS** (pub/sub): fan-out one event to many subscribers (email, Lambda, SQS).
- **Fan-out pattern**: SNS → multiple SQS queues → independent consumers. Each service gets its own retry/backpressure.

## Load balancing & auto scaling
- **ALB** (L7): routes by path/host/headers, understands HTTP, target groups, health checks. Default choice for web apps.
- **NLB** (L4): TCP/UDP, millions of RPS, static IPs, ultra-low latency. Use for non-HTTP or extreme throughput.
- **Auto Scaling Group**: min/desired/max instances, scales on metrics (CPU, request count), replaces unhealthy instances. Pair with launch template + baked AMI for fast scale-out.

## Azure — the equivalents map
**TL;DR:** Same concepts, different names. Interviewers care that you can translate.

| AWS | Azure | What it is |
|---|---|---|
| EC2 | Virtual Machines | IaaS compute |
| S3 | Blob Storage | Object storage |
| RDS | Azure SQL / Database for PostgreSQL | Managed relational DB |
| DynamoDB | Cosmos DB | Global NoSQL |
| Lambda | Azure Functions | Serverless functions |
| SQS/SNS | Service Bus / Event Grid | Queues & pub/sub |
| EKS | AKS | Managed Kubernetes |
| IAM | Entra ID (AAD) + RBAC | Identity & access |
| CloudWatch | Azure Monitor | Metrics & logs |
| CloudFormation | ARM/Bicep | IaC |

- Azure organizes resources in **resource groups** (deletable as a unit) under **subscriptions**.
- **Entra ID** (formerly Azure AD) is identity-first — deeply tied to Microsoft 365 enterprises; a big reason companies pick Azure.

## Cost optimization
- **Rightsize** (most instances are over-provisioned), **Reserved/Savings Plans** for steady load, **Spot** for interruptible, **scale to zero** with serverless for spiky/low traffic.
- Watch egress: data OUT of the cloud costs money; in is free. Cross-AZ traffic also bills.
- Tag everything; set budgets + alerts before the surprise bill, not after.
`,
    qa: [
      { q: "Multi-AZ vs read replica in RDS?", a: "Multi-AZ: synchronous standby in another AZ, automatic failover, NOT readable — for availability. Read replica: async copy, readable, manual promotion — for read scaling. Production uses both." },
      { q: "When DynamoDB over RDS?", a: "Known, simple access patterns at huge scale with zero ops (sessions, carts, user profiles). Avoid for ad-hoc relational queries, joins, or complex transactions — that's RDS/Aurora territory." },
      { q: "What is a Lambda cold start and how do you reduce it?", a: "First invocation must provision a sandbox + init runtime (100ms–seconds, worse for JVM/.NET). Mitigate: provisioned concurrency, smaller packages, lighter runtimes, keep-warm pings, or move latency-critical paths to containers." },
      { q: "SQS vs SNS?", a: "SQS = queue: consumers pull, each message processed by one consumer, buffering/retry/DLQ. SNS = pub/sub push: fan one event out to many subscribers. Combined (SNS→SQS per service) gives durable fan-out." },
      { q: "ALB vs NLB?", a: "ALB is L7: path/host routing, HTTP-aware, WebSockets — default for web. NLB is L4: raw TCP/UDP, static IP, extreme throughput/low latency — for non-HTTP protocols or when you need fixed IPs." },
      { q: "Name the Azure equivalents of EC2, S3, Lambda, EKS.", a: "Virtual Machines, Blob Storage, Azure Functions, AKS. Bonus: DynamoDB↔Cosmos DB, IAM↔Entra ID + RBAC, CloudWatch↔Azure Monitor." },
      { q: "Your AWS bill doubled. First three things you check?", a: "1) Cost Explorer by service+tag to find the delta. 2) Orphaned resources: unattached EBS, idle instances, old snapshots, NAT egress. 3) Data transfer (egress/cross-AZ) and untagged spikes. Then budgets+alerts so it never surprises again." },
      { q: "Why is a DLQ (dead-letter queue) important?", a: "A poison message that always fails would otherwise retry forever, blocking the queue and burning compute. After N failed receives it moves to the DLQ for inspection — the pipeline keeps flowing and you keep the evidence." }
    ],
    mock: { easy: [], medium: [
      { q: "Design an image-processing pipeline: users upload photos, you generate thumbnails.", a: "Client → presigned URL → S3 original bucket. S3 event → SQS → Lambda resizes → writes thumbnail bucket → CloudFront serves. SQS gives retry + DLQ; Lambda scales with load, zero idle cost. For >15-min jobs swap Lambda for ECS Fargate workers." },
      { q: "Steady 24/7 API plus a nightly batch job — how do you buy compute cheaply?", a: "API: rightsized instances on a Savings Plan/Reserved (steady = commit). Batch: Spot instances behind a queue (interruptible, ~90% off) with checkpointing. Never Spot for the stateful DB; never on-demand for predictable 24/7 load." },
      { q: "Design active-passive multi-region failover for a web app.", a: "Primary region serves; secondary has infra pre-provisioned (pilot light) or scaled-down (warm standby). Data: RDS cross-region read replica / DynamoDB global tables; S3 cross-region replication. Route 53 health checks fail DNS over. Trade-off: cost vs RTO — discuss RPO from replication lag." }
    ], hard: [] }
  });
})();
