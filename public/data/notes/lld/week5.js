// LLD — Week 6: Mock Interviews & Review.
(function () {
  window.PrepStackRegister.notes("lld", 5, {
    concepts: `# LLD Interview Framework & Review

## The 45-minute LLD script
**TL;DR:** Requirements → entities → relationships → behaviors → code one flow → extend. Budget your minutes.

### Timeline
- **0–5 min — scope**: ask 3–5 clarifying questions (scale? concurrency? which features are in/out?). State assumptions out loud and write them down.
- **5–15 min — model**: nouns → candidate classes; verbs → methods; pick the 4–7 classes that matter. Draw relationships (has-a vs is-a — default to has-a).
- **15–30 min — design the behaviors**: key methods with signatures, the state machine if there's a lifecycle, patterns where justified (name the pattern AND the reason).
- **30–40 min — code the core flow**: one end-to-end use case in real code (book a seat, execute a move, add an expense). Working core > complete skeleton.
- **40–45 min — extend & harden**: they WILL ask "now add X" — answer via your seams (new strategy/state/subclass). Mention concurrency + validation if untouched.

## SOLID-violation code review (favorite senior-round format)
Spot these fast:
- **SRP**: class named Manager/Util doing IO + logic + formatting → split by reason-to-change.
- **OCP**: switch/if-else on a type code that grows per feature → polymorphism or strategy map.
- **LSP**: subclass throwing UnsupportedOperation / overriding to no-op (Square extends Rectangle) → the hierarchy is wrong; compose instead.
- **ISP**: interface with 12 methods, implementers stubbing most → split into role interfaces.
- **DIP**: new DatabaseClient() inside business logic; static singletons everywhere → inject the abstraction.

## Common LLD interview mistakes
1. **Coding before scoping** — 5 questions first, always.
2. **Class explosion** — 15 anemic classes with getters; interviewers want behavior-rich objects.
3. **Pattern-forcing** — Singleton+Factory+Observer on tic-tac-toe unprompted. Patterns need a stated problem.
4. **Ignoring the lifecycle** — most domains (order, booking, game) are state machines; not drawing one is a miss.
5. **No code at all** — diagrams don't compile; land one working flow.
6. **Silent concurrency** — say where races live (inventory, seat hold, counters) even if told to skip it.
7. **Not listening** — the interviewer's "what if…" is the rubric; chase it, don't defend the old design.

## Rapid-recall pattern table
| Need | Pattern |
|---|---|
| One instance, global access | Singleton (mention testing cost) |
| Create by type/config | Factory / Abstract Factory |
| Complex construction, many optionals | Builder |
| Wrap for new behavior, stackable | Decorator |
| Incompatible interface bridge | Adapter |
| Tree of part-whole | Composite |
| Swappable algorithm | Strategy |
| Notify many on change | Observer |
| Lifecycle behavior change | State |
| Undo / queue / audit ops | Command |
| Pipeline of handlers | Chain of Responsibility |
| Fixed skeleton, variable steps | Template Method |

## Self-review checklist after each mock
- Did I ask about scale/concurrency/persistence before designing?
- Can each class state its single responsibility in one sentence?
- Could tomorrow's likely feature land without editing existing classes?
- Is there at least one interface a test can fake?
- Did I code a complete use case, and does it actually handle the unhappy path?
`,
    qa: [
      { q: "First five minutes of an LLD interview — what exactly?", a: "Clarify scope (features in/out), scale (single node? concurrent users?), persistence (in-memory ok?), and extensions they care about. Write assumptions down. This buys design targets and prevents building the wrong thing." },
      { q: "How do you justify using a pattern without pattern-forcing?", a: "Name the PROBLEM first, then the pattern as its known solution: 'pricing varies by rules that will grow — I'll put it behind a Strategy so new rules don't modify Cart.' Problem→pattern, never pattern→problem." },
      { q: "Square-extends-Rectangle: what's the violation and the fix?", a: "LSP: setWidth breaking height invalidates code written against Rectangle. Fix: don't inherit — separate types behind a common Shape interface (area()), or immutable value types where 'set' doesn't exist." },
      { q: "Interviewer adds a requirement that breaks your design. Best response?", a: "Treat it as the test it is: identify which class absorbs the change, refactor the seam openly ('movement was hardcoded; extracting a strategy'), and note what you'd have asked earlier. Grace under redesign scores higher than a lucky first draft." },
      { q: "What does an 'anemic domain model' look like and why is it penalized?", a: "Classes = fields + getters/setters; all logic in a God 'Service'. It's procedural code wearing OOP syntax — no encapsulation, invariants unenforced. Push behavior into the entity that owns the data (seat.hold(), wallet.debit())." },
      { q: "When is Singleton defensible, and what do you say about its costs?", a: "Truly single, stateless-ish infrastructure: config, connection pool, logger. Always add: it hides dependencies and hurts testability, so expose it through an injected interface — the singleton-ness is a wiring detail, not a design feature." },
      { q: "How do you show concurrency awareness when told 'ignore threading'?", a: "One sentence per hotspot: 'seat hold is check-then-act — under concurrency this becomes an atomic putIfAbsent or a versioned update.' Flags the races, respects the scope, costs ten seconds." },
      { q: "Composition vs inheritance — the interview-safe default?", a: "Default to composition (has-a): flexible at runtime, no fragile-base problems, testable pieces. Reserve inheritance for genuine is-a with a stable base contract (Piece hierarchy). If you're inheriting to reuse code, compose instead." }
    ],
    mock: { easy: [], medium: [
      { q: "MOCK: Design a parking lot (45-min run — checkpoint yourself).", a: "Scope: floors? vehicle types? pricing? Model: ParkingLot→Floor→Spot(type), Vehicle hierarchy, Ticket, Gate. Behaviors: SpotAllocationStrategy (nearest/random), FeeStrategy (hourly/flat/by-type), Spot lifecycle (Free→Held→Occupied). Code: park() end-to-end — find spot, issue ticket, unpark computes fee. Extensions: EV spots = new SpotType + strategy entry; concurrency: spot allocation is the race — lock per floor or atomic claim." },
      { q: "MOCK: Review this design — OrderManager does validation, payment via 'new StripeClient()', inventory, email, and switch(type) for discounts. Find the violations and refactor.", a: "SRP: four responsibilities → OrderValidator, PaymentService, InventoryService, NotificationService. DIP: new StripeClient → inject PaymentGateway interface. OCP: discount switch → DiscountStrategy map. Orchestrate via a thin OrderService; domain events (Observer) for email so ordering isn't coupled to notification. Each piece now unit-testable with fakes." },
      { q: "MOCK: Design a rate limiter library other teams will embed (API + internals).", a: "Public API: RateLimiter.allow(key) → boolean (+ allowOrThrow, remaining()). Builder config: algorithm, capacity, refill, clock. Internals: Strategy per algorithm (TokenBucket, SlidingWindowLog, FixedWindow), per-key state in ConcurrentHashMap, injected Clock for tests. Discuss: thread-safety per key (CAS/striped locks), memory (expire idle keys), and why the library must never block callers." }
    ], hard: [] }
  });
})();
