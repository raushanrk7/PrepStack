// LLD — module structure (v3). Topics auto-derive from week notes via `from.week`.
(function () {
  window.PrepStackRegister.track("lld", {
    name: "LLD — Low-Level / Object Design",
    icon: "🧱",
    blurb: "SOLID principles, GoF design patterns, and classic object-design interview problems from Parking Lot to Splitwise.",
    modules: [
      { id: "oop-solid", title: "OOP Fundamentals & SOLID", blurb: "Four pillars, SRP/OCP/LSP/ISP/DIP, composition over inheritance.", from: { week: 0 } },
      { id: "creational-structural", title: "Creational & Structural Patterns", blurb: "Factory, Builder, Singleton, Adapter, Decorator, Composite, Facade, Proxy.", from: { week: 1 } },
      { id: "behavioral", title: "Behavioral Patterns", blurb: "Strategy, Observer, Command, State, Chain of Responsibility, Template Method.", from: { week: 2 } },
      { id: "concurrency-api", title: "Concurrency & API Design", blurb: "Thread-safety, producer-consumer, thread pools, REST, idempotency, DI.", from: { week: 3 } },
      { id: "advanced", title: "Advanced LLD Problems", blurb: "Chess, file system, LRU/LFU, elevator, Splitwise debt simplification.", from: { week: 4 } },
      { id: "framework", title: "Interview Framework & Mocks", blurb: "45-min script, SOLID-violation review, common mistakes, full mocks.", from: { week: 5 } }
    ]
  });
})();
