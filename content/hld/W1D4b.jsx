import { useState } from "react";

const TAG = {
  DB:  { bg: "#E040FB18", color: "#E040FB", border: "#E040FB40" },
  HLD: { bg: "#FF6B3518", color: "#FF6B35", border: "#FF6B3540" },
  INF: { bg: "#00BCD418", color: "#00BCD4", border: "#00BCD440" },
};

const topics = [
  {
    id: "relational", icon: "🗄️", tag: "DB",
    title: "Relational DB (SQL) — MySQL + PostgreSQL",
    summary: "Tables with rows and columns. Fixed schema. ACID transactions. Joins across tables. Scale vertically. Source of truth for structured data.",
    concepts: [
      {
        name: "What Relational DB Is",
        explanation: "Data stored in tables with fixed schema. Rows = records. Columns = fields. Tables relate to each other via foreign keys. ACID guarantees via WAL.",
        example:
`users table:
  id | name    | email           | plan
  42 | Rahul   | r@gmail.com     | premium
  99 | Alice   | a@gmail.com     | free

orders table:
  id  | userId | amount | status
  1   | 42     | 500    | paid    <- FK to users.id
  2   | 99     | 200    | pending

JOIN:
  SELECT u.name, o.amount
  FROM users u
  JOIN orders o ON u.id = o.userId
  WHERE u.plan = "premium"

Relationships between tables ✅
Schema enforced upfront ✅
Any ad-hoc query possible ✅`
      },
      {
        name: "MySQL vs PostgreSQL",
        explanation: "MySQL = simpler, faster reads, widely used. PostgreSQL = more features, better standards compliance, better for complex queries. Both are production-grade.",
        example:
`MySQL:
  Most popular web DB (PHP/LAMP stack)
  Slightly faster for simple reads
  Used by: Facebook, Twitter, YouTube ✅
  Storage engines: InnoDB (default, ACID)
  Replication: built-in master-slave
  Tools: Vitess (YouTube), Orchestrator

PostgreSQL:
  More SQL standard compliant
  Better for complex queries/analytics
  JSON support (bridge to document DB) ✅
  Full-text search built-in
  Better indexing options (partial, expression)
  Used by: Instagram, Uber, Twitch ✅
  Tools: Patroni (failover), pgBouncer (pool)

When to choose:
  Simple CRUD web app → MySQL ✅
  Complex queries, analytics → PostgreSQL ✅
  JSON + relational mixed → PostgreSQL ✅`
      },
      {
        name: "MySQL Commands + Indexes",
        explanation: "Core SQL commands. CREATE TABLE defines schema. INDEX for fast lookups. EXPLAIN to debug slow queries. JOIN to combine tables.",
        example:
`CREATE TABLE users (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  email     VARCHAR(255) UNIQUE NOT NULL,
  name      VARCHAR(100),
  plan      ENUM('free','premium') DEFAULT 'free',
  country   VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_country_plan (country, plan)  <- composite
);

INSERT INTO users (email, name) VALUES ('r@g.com', 'Rahul');
SELECT * FROM users WHERE country='IN' AND plan='premium';
UPDATE users SET plan='premium' WHERE id=42;
DELETE FROM users WHERE id=42;

EXPLAIN SELECT * FROM users WHERE country='IN';
  -> type: ref (index used) ✅
  -> type: ALL (full scan, add index!) ❌

Transaction:
  START TRANSACTION;
  UPDATE accounts SET balance = balance - 500 WHERE id=1;
  UPDATE accounts SET balance = balance + 500 WHERE id=2;
  COMMIT;  <- both or neither ✅`
      },
    ]
  },
  {
    id: "keyvalue", icon: "🔑", tag: "DB",
    title: "Key-Value DB",
    summary: "Simplest structure: KEY -> VALUE. Value is opaque (DB doesn't look inside). Only access by exact key. Fastest possible lookup O(1). No querying on values.",
    concepts: [
      {
        name: "How It Works + Commands",
        explanation: "Giant distributed hashmap. Key = unique identifier. Value = anything (string, JSON, blob). DB doesn't care what value contains — only way to access is exact key.",
        example:
`Redis commands:
  SET user:42 "rahul"              <- store
  GET user:42                      <- fetch
  DEL user:42                      <- delete
  EXISTS user:42                   <- check
  EXPIRE user:42 3600              <- TTL
  MGET user:42 user:99             <- batch get

DynamoDB:
  PutItem  {userId: "42", data: {...}}
  GetItem  {userId: "42"}
  DeleteItem {userId: "42"}

Memcached:
  set user:42 0 3600 5 <- TTL 1hr
  rahul
  get user:42 -> rahul

Key design matters:
  user:42:profile  <- structured keys
  rate:user:42     <- feature:entity
  session:abc123   <- type:id`
      },
      {
        name: "Pros, Cons, When to Use",
        explanation: "Fastest possible lookup. No querying by value fields. Perfect for cache, sessions, counters, feature flags. Can't answer 'give me all users in India'.",
        example:
`PROS:
  Fastest O(1) lookup ✅
  Horizontally scalable (hash key -> node)
  Low latency (often in-memory)
  Schema-less (value opaque)
  Simple to reason about

CONS:
  Only access by KEY (no value queries) ❌
  "All users in India" -> impossible ❌
  No relationships between records
  No filtering/aggregations
  Must know exact key upfront

WHEN TO USE:
  Cache:         user:42:profile -> JSON ✅
  Sessions:      session:token -> userId ✅
  Rate limiting: rate:user:42 -> counter ✅
  Feature flags: feature:darkmode -> true ✅
  Leaderboard:   (Redis ZSet) ✅
  Shopping cart: cart:user:42 -> [items] ✅

Rule: I ALWAYS know the exact key ✅
      I need FAST lookup, not queries ✅`
      },
    ]
  },
  {
    id: "documentdb", icon: "📄", tag: "DB",
    title: "Document DB",
    summary: "Stores JSON-like documents. Query on ANY field inside document. Flexible schema — different docs can have different fields. No joins needed (embed related data).",
    concepts: [
      {
        name: "How It Works + Commands",
        explanation: "Each document = self-contained JSON record. Collection = group of documents. Index any field for fast queries. Nested objects and arrays natively supported.",
        example:
`MongoDB document:
{
  _id: "42",
  name: "Rahul",
  country: "India",
  plan: "premium",
  address: {           <- nested object ✅
    city: "Delhi",
    pin: "110001"
  },
  tags: ["active", "verified"],  <- array ✅
  preferences: { theme: "dark" }
}

MongoDB commands:
  db.users.insertOne({name:"Rahul", country:"India"})
  db.users.findOne({_id: "42"})
  db.users.find({country:"India", plan:"premium"})
  db.users.find({age: {$gt: 25}})   <- range query
  db.users.find({tags: "active"})   <- array query
  db.users.updateOne(
    {_id:"42"},
    {$set: {plan:"free"}}
  )

Index any field:
  db.users.createIndex({country: 1})  <- fast! ✅

Aggregation:
  db.users.aggregate([
    {$group: {_id:"$country", count:{$sum:1}}}
  ])  -> {India:5000, US:3000} ✅`
      },
      {
        name: "Pros, Cons, When to Use",
        explanation: "Query on any field. Flexible schema (each document can differ). Nested docs avoid joins. Scales horizontally. Not ideal for complex relationships or strict ACID.",
        example:
`PROS:
  Query on ANY field ✅
  Flexible schema (evolves easily) ✅
  Nested documents (no joins needed) ✅
  Horizontal scaling ✅
  Developer friendly (work with JSON) ✅

CONS:
  Limited join support ❌
  No strong ACID across documents ❌
  Duplicate data (denormalized) ❌
  Storage cost higher (repeated fields)

WHEN TO USE:
  Product catalog:
    {name, price, specs:{storage,color}}
    Different products -> different specs ✅
  
  User profiles:
    Flexible fields per user type ✅
  
  Content (articles, posts):
    Rich nested structure ✅
  
  Event logs with metadata:
    Each event has different fields ✅

vs Key-Value:
  KV: know exact key, fetch it
  Document: query by fields, flexible ✅`
      },
      {
        name: "Nested Document Example",
        explanation: "Embed related data directly in document. One read gets everything. No joins. Product catalog with variants is the classic example.",
        example:
`SQL approach (4 tables + JOIN):
  products table
  product_specs table
  product_variants table
  product_reviews table
  -> JOIN all 4 = complex, slow 😬

Document DB approach (1 document):
{
  _id: "prod:101",
  name: "iPhone 15",
  specs: {
    storage: "256GB",
    battery: "3274mAh"
  },
  variants: [
    {color:"black", price:79999, stock:50},
    {color:"gold",  price:84999, stock:20}
  ],
  reviews: [
    {userId:42, rating:5, text:"Great!"},
    {userId:99, rating:4, text:"Good"}
  ]
}

One read = entire product ✅
No JOIN needed ✅
Add new spec field? Just add it ✅
No schema migration needed ✅`
      },
    ]
  },
  {
    id: "graphdb", icon: "🕸️", tag: "DB",
    title: "Graph DB",
    summary: "Nodes (entities) + Edges (relationships). Query relationships natively. Traversal is O(1) per hop (not O(N) like SQL JOIN). Perfect for social graphs, recommendations, fraud detection.",
    concepts: [
      {
        name: "What Graph DB Is",
        explanation: "Stores entities as nodes and relationships as edges. Each edge has type and direction. Traversing relationships is O(1) per hop — unlike SQL JOINs which slow down with data size.",
        example:
`Nodes:
  (User {id:42, name:"Rahul"})
  (User {id:99, name:"Alice"})
  (User {id:55, name:"Bob"})
  (Post {id:101, title:"..."})

Edges (relationships):
  (Rahul)-[FOLLOWS]->(Alice)
  (Rahul)-[FOLLOWS]->(Bob)
  (Alice)-[LIKES]->(Post 101)
  (Bob)-[CREATED]->(Post 101)

Query (Cypher language - Neo4j):
  "Who does Rahul follow?"
  MATCH (r:User {id:42})-[FOLLOWS]->(friend)
  RETURN friend

  "Friends of friends?"
  MATCH (r:User {id:42})-[FOLLOWS*2]->(fof)
  RETURN fof

  "Mutual friends?"
  MATCH (a:User)-[FOLLOWS]->(mutual)<-[FOLLOWS]-(b)
  WHERE a.id=42 AND b.id=99
  RETURN mutual`
      },
      {
        name: "Graph vs SQL for Relationships",
        explanation: "SQL JOINs slow down as data grows (O(N) scan). Graph DB traversal = O(1) per hop regardless of data size — follows pointers directly between nodes.",
        example:
`SQL for "friends of friends":
  SELECT u3.*
  FROM users u1
  JOIN follows f1 ON u1.id = f1.follower_id
  JOIN follows f2 ON f1.followed_id = f2.follower_id
  JOIN users u3 ON f2.followed_id = u3.id
  WHERE u1.id = 42

  Problem: follows table has 10B rows
  JOIN scans entire table = SLOW 😱

Graph DB same query:
  Start at node 42
  Follow FOLLOWS edges (pointer jump) O(1)
  Follow their FOLLOWS edges O(1)
  Return results

  Data size doesn't matter!
  Each hop = pointer follow = O(1) ✅

Graph wins at:
  Deep relationship traversal ✅
  Variable-depth queries (*2, *3, ...) ✅
  "6 degrees of separation" queries ✅`
      },
      {
        name: "When to Use Graph DB",
        explanation: "Social networks, fraud detection, recommendation engines, knowledge graphs. Anything where relationships ARE the data, not just metadata.",
        example:
`Social network (LinkedIn, Facebook):
  "People you may know" ✅
  "2nd degree connections" ✅
  Neo4j used by LinkedIn ✅

Fraud detection:
  "Find users sharing same device/IP
   within 2 hops of known fraudster"
  Graph traversal perfect for this ✅

Recommendations:
  (Rahul)-[LIKED]->(Movie A)
  (Alice)-[LIKED]->(Movie A)
  (Alice)-[LIKED]->(Movie B)
  -> Recommend Movie B to Rahul ✅

Knowledge graph:
  Google Knowledge Panel
  Entities + relationships ✅

Access control:
  Role -> Permission hierarchies
  "Does this user have access via
   any role chain?" ✅

Tools:
  Neo4j   <- most popular ✅
  Amazon Neptune <- managed AWS ✅
  TigerGraph <- high performance ✅`
      },
    ]
  },
  {
    id: "comparison", icon: "📊", tag: "HLD",
    title: "Full Comparison — When to Use Which",
    summary: "Relational = ACID + complex queries. Key-Value = fastest lookup by key. Document = flexible schema + rich queries. Graph = relationship traversal. Most systems use multiple types.",
    concepts: [
      {
        name: "Comparison Table",
        explanation: "Each DB type has a specific sweet spot. Choosing wrong type = performance pain. Most large systems use 3-4 different DB types together.",
        example:
`Feature         | Relational  | Key-Value   | Document    | Graph
────────────────────────────────────────────────────────────────────────
Query by        | Any column  | Key only    | Any field   | Relationships
Schema          | Fixed       | None        | Flexible    | Flexible
ACID            | Strong ✅   | Usually no  | Usually no  | Varies
Relationships   | JOINs       | None        | Embed       | Native O(1) ✅
Scale           | Vertical    | Massive ✅  | Horizontal  | Moderate
Speed (lookup)  | O(log N)    | O(1) ✅     | O(log N)    | O(1)/hop
Best for        | Transactions| Cache/Sess  | Catalog     | Social/Fraud
Examples        | MySQL/PG    | Redis/Dynamo| MongoDB     | Neo4j`
      },
      {
        name: "Real System — Use Multiple DBs",
        explanation: "No single DB is best for everything. Large systems pick the right tool per use case. Don't use a graph DB for caching, don't use Redis for product catalog.",
        example:
`Instagram architecture:
  PostgreSQL:   user accounts, follow graph (SQL)
                payments, ACID needed ✅
  
  Cassandra:    posts timeline, activity
                write-heavy, scale ✅
  
  Redis:        session cache, counters
                leaderboards, real-time ✅
  
  MongoDB:      media metadata, stories
                flexible schema ✅

LinkedIn:
  MySQL:        member profiles (core data)
  Espresso:     internal KV store
  Neo4j:        social graph queries ✅
  Kafka:        activity streams

Decision questions:
  Need ACID? -> Relational ✅
  Know exact key, need speed? -> Key-Value ✅
  Query on many fields, schema varies? -> Document ✅
  Relationship traversal is primary access? -> Graph ✅`
      },
      {
        name: "DynamoDB — Special Case (KV + Document)",
        explanation: "DynamoDB = Key-Value at heart but supports richer access via sort keys and GSIs. Good middle ground between pure KV and Document DB.",
        example:
`DynamoDB primary key:
  Partition Key (PK) = userId
  Sort Key (SK) = timestamp

Now can query:
  "All items for userId=42" ✅
  "Items for userId=42 after T" ✅
  (more than pure KV!)

GSI (Global Secondary Index):
  Index on ANY attribute
  "All premium users" ✅
  Extra cost but powerful

Comparison:
  Pure KV (Redis):   key only, fastest
  DynamoDB:          key + sort key + GSI
  MongoDB:           any field, richest queries

DynamoDB sweet spot:
  Know partition key always (userId, orderId)
  Need range queries within partition ✅
  Want managed, serverless, auto-scale ✅
  Used by: Amazon, Lyft, Airbnb ✅`
      },
    ]
  },
];

const qna = [
  { q: "MySQL vs PostgreSQL — when to choose which?", a: "MySQL: simpler, faster for basic reads, widely supported, good for standard CRUD web apps, used by Facebook/Twitter/YouTube. PostgreSQL: more feature-rich, better SQL standards, superior for complex queries and analytics, has JSON support bridging relational and document, better indexing options (partial, expression indexes). Choose MySQL for simple web apps, PostgreSQL when you need complex queries, JSON flexibility, or better standards compliance." },
  { q: "Key-Value vs Document DB — what's the key difference?", a: "Key-Value: access ONLY by exact key, value is opaque (DB doesn't look inside), fastest O(1) lookup, no querying on value fields. Document DB: query on ANY field inside document, flexible schema where different documents can have different fields, index any field. Use KV when you always know the exact key and need fast lookup. Use Document when you need to query by different attributes or schema varies per record." },
  { q: "Why is Graph DB faster than SQL for relationship queries?", a: "SQL JOINs scan tables — with 10B rows in follows table, finding friends-of-friends requires joining a huge table, getting slower as data grows. Graph DB stores relationships as physical pointers (edges) between nodes. Each hop follows a pointer = O(1) regardless of total data size. 'Friends of friends of friends' in SQL = 3 expensive JOINs. In graph = 3 pointer follows = still O(1) per hop. Data size doesn't affect traversal speed." },
  { q: "When would you choose a Graph DB over relational?", a: "When relationships ARE the data, not just metadata. Social graphs (LinkedIn connections, Facebook friends), fraud detection (users connected through suspicious chains), recommendation engines (users who liked X also liked Y — collaborative filtering), knowledge graphs, access control hierarchies. If your primary queries are 'find path between', 'mutual connections', 'N degrees of separation' — graph DB wins. For storing user data with relationship as secondary concern — relational is fine." },
  { q: "What is DynamoDB and how is it different from Redis?", a: "Both are NoSQL but different. Redis: pure in-memory, fastest, typically used for cache/sessions/real-time, data structures (ZSet, Bitmap etc), single key access only. DynamoDB: managed AWS service, persistent (survives restart), supports Partition Key + Sort Key enabling range queries within partition, GSIs enable secondary access patterns, auto-scales, serverless pricing. Redis = cache layer. DynamoDB = primary storage that happens to be NoSQL." },
  { q: "Why embed documents instead of joining in MongoDB?", a: "Joins in document DBs are expensive and limited ($lookup = like SQL join, slow). Embedding related data in one document means one read gets everything — no extra queries. Product with specs, variants, reviews in one document = 1 DB read. SQL equivalent = 4 tables + 3 JOINs = slower and complex. Trade-off: duplication of data and larger document size. Use embedding when data is always accessed together and doesn't change independently." },
  { q: "Can PostgreSQL replace MongoDB?", a: "PostgreSQL's JSONB type stores JSON natively with indexing and querying. You can do most document DB operations in PostgreSQL. Many teams use PostgreSQL instead of adding MongoDB. But MongoDB is more optimized for pure document workloads, has better horizontal sharding, and more developer-friendly document-first API. PostgreSQL JSONB is the right choice when you need mostly relational with some flexible fields. MongoDB when document model is primary and you need elastic scale." },
];

const mock = [
  { q: "Design a social network like LinkedIn. What databases would you use and why?", a: "PostgreSQL for core member profiles — structured, ACID, not changing often, need foreign key integrity for connections count. Neo4j (or similar) for the social graph — 'people you may know' and '2nd degree connections' are relationship traversal queries that Graph DB handles in O(1) per hop vs SQL JOIN getting slower with billions of connections. Cassandra for activity feed — write-heavy, time-series, need to fan out to millions of followers. Redis for sessions, online status, profile view counters (KV + real-time structures). Elasticsearch for people/job search — full-text, faceting, ranking. Each DB chosen for its specific strength." },
  { q: "A startup asks: should we use MongoDB or PostgreSQL for our e-commerce platform?", a: "Both together actually. PostgreSQL for: user accounts (ACID, unique email), orders (transactions — must debit and create order atomically), payments (financial data, audit trail). MongoDB for: product catalog (each product has different attributes — phones have storage/RAM, shirts have size/color — flexible schema perfect here), reviews (nested structure, varying fields). This is the classic hybrid approach. Start with PostgreSQL for everything, add MongoDB when product catalog grows complex. Don't use MongoDB for orders/payments — you'll regret losing ACID guarantees when debugging partial transactions." },
  { q: "Design a fraud detection system. What role does a Graph DB play?", a: "Core insight: fraud = relationships between entities, not just individual entity properties. Build graph: nodes are Users, Devices, IPs, Phone Numbers, Bank Accounts. Edges: User USES Device, User LOGGED_FROM IP, User HAS BankAccount. Known fraudster in graph — query: find all users within 2 hops sharing same Device or IP. Graph traversal finds these in milliseconds. SQL alternative: JOIN users-devices-users for 2 hops across billions of rows = minutes. Amazon Neptune or Neo4j for graph. PostgreSQL for raw transaction records. Redis for real-time velocity checks (>5 transactions in 10 min from same device = flag). ML model scores each transaction using graph features as inputs." },
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

export default function W1D4b() {
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
            <div style={{ fontSize:"9px", color:"#E040FB", letterSpacing:"4px", marginBottom:"3px" }}>WEEK 1 · DAY 4B</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#fff" }}>Relational · Key-Value · Document · Graph DB</div>
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
              const tc = TAG[topic.tag] || TAG.DB;
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
                      <span style={{ color:isOpen?"#E040FB":"#333", fontSize:"20px", lineHeight:1 }}>{isOpen?"−":"+"}</span>
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
                    <span style={{ color:isOpen?"#E040FB":"#333", fontSize:"16px", flexShrink:0, marginLeft:"auto" }}>{isOpen?"−":"+"}</span>
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
              <div style={{ fontSize:"12px", color:"#666", lineHeight:"1.6" }}>Try to answer mentally first. Focus on choosing right DB per use case.</div>
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
