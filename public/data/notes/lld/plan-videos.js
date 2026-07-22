// LLD — per-week study plan + curated videos (Concept && Coding first — the LLD reference channel).
(function () {
  const R = window.PrepStackRegister;
  const yt = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  const ccPlaylist = "https://www.youtube.com/playlist?list=PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW";

  const plan = (order, outcome, drill) => [
    "## How to attack this week",
    "1. **Watch** the topic video (Resources), then close it.",
    "2. **Code along from memory** — every pattern must be typed, not read.",
    "3. **Q&A aloud**, then do the Practice problems with a 45-min timer.",
    "",
    "**Order:** " + order,
    "",
    "**You're done when:** " + outcome,
    "",
    "**Drill:** " + drill
  ].join("\n");

  R.notes("lld", 0, {
    plan: plan(
      "OOP pillars → SRP/OCP → LSP/ISP/DIP → Parking Lot → Library",
      "you can refactor a God-class live, naming each SOLID violation as you split it.",
      "Parking Lot end-to-end in code (park→ticket→fee), then Library checkout flow."
    ),
    resources: [
      { name: "SOLID principles with Java examples", link: yt("concept and coding solid principles"), type: "video", by: "Concept && Coding" },
      { name: "LLD playlist (full course)", link: ccPlaylist, type: "video", by: "Concept && Coding" },
      { name: "Parking Lot LLD", link: yt("concept and coding parking lot low level design"), type: "video", by: "Concept && Coding" },
      { name: "awesome-low-level-design (text + solutions)", link: "https://github.com/ashishps1/awesome-low-level-design", type: "github" }
    ]
  });

  R.notes("lld", 1, {
    plan: plan(
      "Factory/Abstract Factory → Builder → Singleton pitfalls → Adapter/Decorator → Composite/Facade → Vending Machine → Splitwise",
      "for each pattern you can state the PROBLEM it solves in one sentence before the structure.",
      "Vending machine with two payment types; Splitwise addExpense with all three split types."
    ),
    resources: [
      { name: "Design patterns playlist (creational+structural)", link: ccPlaylist, type: "video", by: "Concept && Coding" },
      { name: "Factory vs Abstract Factory", link: yt("concept and coding factory design pattern"), type: "video", by: "Concept && Coding" },
      { name: "Decorator pattern (Pizza example)", link: yt("concept and coding decorator design pattern"), type: "video", by: "Concept && Coding" },
      { name: "Refactoring Guru — pattern reference", link: "https://refactoring.guru/design-patterns", type: "article" }
    ]
  });

  R.notes("lld", 2, {
    plan: plan(
      "Strategy → Observer → Command → State → Chain/Template → BookMyShow → Cab booking",
      "you can pick the right behavioral pattern from a requirement phrase in <10 seconds (table in Concepts).",
      "BookMyShow with seat-hold state machine; notification design with Observer+Strategy."
    ),
    resources: [
      { name: "Strategy & Observer patterns", link: yt("concept and coding strategy observer design pattern"), type: "video", by: "Concept && Coding" },
      { name: "State pattern (vending machine)", link: yt("concept and coding state design pattern"), type: "video", by: "Concept && Coding" },
      { name: "BookMyShow LLD", link: yt("concept and coding bookmyshow low level design"), type: "video", by: "Concept && Coding" },
      { name: "Chain of Responsibility", link: yt("concept and coding chain of responsibility design pattern"), type: "video", by: "Concept && Coding" }
    ]
  });

  R.notes("lld", 3, {
    plan: plan(
      "races & locks → producer-consumer → thread pools → API design/idempotency → DI → Rate limiter → Elevator",
      "you can implement a thread-safe token bucket and defend every lock (or its absence).",
      "code BlockingQueue producer-consumer from scratch; design the rate-limiter class API."
    ),
    resources: [
      { name: "Multithreading & concurrency (Java)", link: yt("concept and coding multithreading java"), type: "video", by: "Concept && Coding" },
      { name: "Thread pools & executor internals", link: yt("arpit bhayani thread pool"), type: "video", by: "Arpit Bhayani" },
      { name: "Idempotency in APIs", link: yt("arpit bhayani idempotency api"), type: "video", by: "Arpit Bhayani" },
      { name: "Rate limiter LLD", link: yt("concept and coding rate limiter low level design"), type: "video", by: "Concept && Coding" }
    ]
  });

  R.notes("lld", 4, {
    plan: plan(
      "Chess → generalized board games → file system (Composite) → LRU/LFU → Elevator scheduling → Splitwise simplify",
      "your chess design survives 'add a new piece' and your cache survives 'switch to LFU' without edits to existing classes.",
      "LRU cache from scratch in 20 min; chess move-validation flow on paper."
    ),
    resources: [
      { name: "Chess LLD", link: yt("concept and coding chess low level design"), type: "video", by: "Concept && Coding" },
      { name: "Elevator system LLD", link: yt("concept and coding elevator low level design"), type: "video", by: "Concept && Coding" },
      { name: "LRU cache implementation", link: yt("neetcode lru cache"), type: "video", by: "NeetCode" },
      { name: "File system design (Composite)", link: yt("low level design in memory file system"), type: "video" }
    ]
  });

  R.notes("lld", 5, {
    plan: plan(
      "framework recap → SOLID-violation spotting → 2 full 45-min mocks (random problems) → review",
      "two mocks done: requirements asked, state machine drawn, one flow coded, extension handled.",
      "random picks from: parking lot, splitwise, elevator, vending machine, BookMyShow — timer on."
    ),
    resources: [
      { name: "LLD mock interview", link: yt("low level design mock interview machine coding"), type: "video" },
      { name: "Machine coding round tips", link: yt("concept and coding machine coding round"), type: "video", by: "Concept && Coding" },
      { name: "awesome-low-level-design solutions", link: "https://github.com/ashishps1/awesome-low-level-design", type: "github" }
    ]
  });
})();
