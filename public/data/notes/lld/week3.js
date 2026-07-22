// LLD — Week 4: Concurrency & API Design.
(function () {
  window.PrepStackRegister.notes("lld", 3, {
    concepts: `# Concurrency & API Design in LLD

## Thread-safety fundamentals
**TL;DR:** A race = two threads touching shared mutable state, at least one writing, without ordering. Remove any one of those three.

### The toolbox (in preference order)
1. **Immutability** — no mutation, no race. Value objects, config, messages.
2. **Confinement** — state owned by one thread (actor/event-loop style).
3. **Concurrent data structures** — ConcurrentHashMap, BlockingQueue, atomics.
4. **Locks** — last resort; smallest possible critical section.

### Locks & friends
- **Mutex/synchronized**: one thread in the critical section. Reentrant = same thread may re-acquire.
- **ReadWriteLock**: many readers OR one writer — read-heavy caches.
- **Atomics (CAS)**: lock-free counters/flags; compare-and-swap loop under the hood.
- **Deadlock recipe** (know all 4): mutual exclusion + hold-and-wait + no preemption + circular wait. Standard fix: global lock ordering; or tryLock with timeout.
- check-then-act is the classic race: \`if (!map.contains(k)) map.put(k, v)\` must become one atomic op (putIfAbsent) or be locked.

## Producer-consumer & thread pools
- **BlockingQueue** between producers and consumers = built-in backpressure: put blocks when full, take blocks when empty. This one structure answers half of concurrency LLD.
- **Thread pool**: reuse N workers off a task queue — thread creation is expensive, unbounded threads kill the host. Size ≈ cores for CPU-bound; higher for IO-bound (cores × (1 + wait/compute)).
- **Rejection policy** when queue full: block, drop, caller-runs — say which and why.
\`\`\`
BlockingQueue<Task> q = new ArrayBlockingQueue<>(1000);
producers: q.put(task);            // blocks when full → backpressure
workers:   while (true) { q.take().run(); }
\`\`\`

## Concurrency in classic LLD problems
- **Singleton**: double-checked locking needs volatile; better: enum or static-holder idiom.
- **Rate limiter**: token bucket — synchronized refill-and-consume, or atomic CAS loop on (tokens, lastRefill).
- **Cache (LRU)**: HashMap+DLL is NOT thread-safe; segment/stripe locks or build on ConcurrentHashMap; discuss get() mutating recency order = writes on reads.
- **Booking/inventory**: hold with TTL + optimistic version check on confirm; never lock across user think-time.

## API design principles
**TL;DR:** APIs are forever — design the contract, not just the code.

### REST resource design
- Nouns for resources, verbs from HTTP: GET /orders/42, POST /orders. Nested sparingly (/users/7/orders).
- Status codes that matter: 200/201/204, 400 (bad input), 401 vs 403 (unauthenticated vs unauthorized), 404, 409 (conflict), 429 (rate limited), 5xx (yours).
- Pagination from day one (cursor > offset for large/moving data), filtering/sorting via query params, versioning (/v1/ path or header) before you need it.

### Idempotency
- GET/PUT/DELETE naturally idempotent; POST is not → **Idempotency-Key** header: server stores key→result, replays return the stored result. Essential for payments/retries — a favorite interview probe.

### Contract quality
- Consistent error body: { code, message, details }. Don't leak internals in errors.
- Backward compatibility: additive changes only; never repurpose a field; deprecate with sunset dates.

## Dependency injection & testable design
- Depend on interfaces; receive dependencies via constructor — don't new them inside (hidden coupling, untestable).
- Constructor injection > setter (object always valid) > field (hides deps).
- This is DIP operationalized: unit tests swap real DB/clock/random with fakes. A design that can't be tested without a real DB fails the interview bar.
- Inject a Clock instead of calling now() directly — the small detail that marks senior candidates.
`,
    qa: [
      { q: "What three ingredients make a data race, and what removes each?", a: "Shared + mutable + unordered concurrent access (≥1 write). Remove sharing (confinement), mutability (immutable objects), or unordered access (locks/atomics). Prefer them in that order." },
      { q: "Why does double-checked locking need volatile?", a: "Without it, instance = new X() can be reordered (reference visible before construction completes) — another thread sees a half-built object. volatile forbids that reordering. Cleaner: static holder or enum singleton." },
      { q: "How does BlockingQueue give backpressure?", a: "Bounded queue: put() blocks producers when full, take() blocks consumers when empty — producers automatically slow to consumer speed instead of exhausting memory. Unbounded queues just hide the problem until OOM." },
      { q: "Size a thread pool for CPU-bound vs IO-bound work?", a: "CPU-bound: ≈ number of cores (more just adds context-switching). IO-bound: cores × (1 + wait/compute) since threads idle on IO. Separate pools per workload class so slow IO doesn't starve CPU tasks." },
      { q: "Four deadlock conditions and the standard prevention?", a: "Mutual exclusion, hold-and-wait, no preemption, circular wait — need all four. Cheapest break: impose a global lock-acquisition order (kills circular wait); or tryLock with timeout + backoff." },
      { q: "401 vs 403 vs 409?", a: "401: who are you? (missing/bad credentials). 403: I know you, you're not allowed. 409: request conflicts with current state (duplicate booking, version mismatch) — the optimistic-locking status code." },
      { q: "How do you make POST /payments retry-safe?", a: "Client sends Idempotency-Key (UUID per logical attempt); server atomically stores key→response on first processing and replays the stored response for duplicates. Scope keys per endpoint+user, expire after a window." },
      { q: "Why constructor injection over new inside the class?", a: "Explicit, swappable dependencies: tests inject fakes (in-memory repo, fixed clock), implementations change without editing consumers, and an object can't exist half-wired. new inside = hidden hard coupling." }
    ],
    mock: { easy: [], medium: [
      { q: "Design a thread-safe LRU cache.", a: "Baseline: HashMap + doubly-linked list, O(1) get/put. Thread-safe options: (1) single lock — simple, contended; (2) segmented locks by key hash; (3) ConcurrentHashMap + lock only recency-list updates, accepting slightly stale order. Discuss get() = write (recency) and eviction under race. State the choice by read/write ratio." },
      { q: "Design a rate limiter class (token bucket) safe under concurrency.", a: "State: capacity, tokens, refillRate, lastRefill. allow(): synchronized (or CAS loop) — lazily refill from elapsed time, then consume if tokens ≥ 1. Per-key limiters in ConcurrentHashMap.computeIfAbsent. Contrast sliding-window-log (exact, memory-heavy) and fixed-window (boundary burst)." },
      { q: "Design the API for a URL shortener — endpoints, codes, edge cases.", a: "POST /urls {longUrl, customAlias?} → 201 {shortUrl} (409 alias taken; Idempotency-Key honored). GET /{code} → 301/302 redirect (discuss: 301 caches, kills analytics; 302 preserves them). GET /urls/{code}/stats → 200. 404 unknown, 410 expired, 429 with Retry-After. Validation: URL format, alias charset, auth for stats." }
    ], hard: [] }
  });
})();
