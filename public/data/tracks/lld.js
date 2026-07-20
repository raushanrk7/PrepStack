// LLD — Low-Level / Object Design track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "OOP Fundamentals & SOLID Principles",
    days: [
      D("Encapsulation, abstraction, inheritance, polymorphism refresher", "https://refactoring.guru/design-patterns/what-is-pattern"),
      D("Single Responsibility Principle (SRP)", "https://en.wikipedia.org/wiki/Single-responsibility_principle"),
      D("Open/Closed Principle (OCP)", "https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle"),
      D("Liskov Substitution Principle (LSP)", "https://en.wikipedia.org/wiki/Liskov_substitution_principle"),
      D("Interface Segregation + Dependency Inversion (ISP, DIP)", "https://en.wikipedia.org/wiki/Dependency_inversion_principle"),
      D("Design: Parking Lot system", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Library Management system", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };

  const week2 = {
    title: "Creational & Structural Design Patterns",
    days: [
      D("Factory Method & Abstract Factory", "https://refactoring.guru/design-patterns/factory-method"),
      D("Builder pattern", "https://refactoring.guru/design-patterns/builder"),
      D("Singleton (+ thread-safety pitfalls)", "https://refactoring.guru/design-patterns/singleton"),
      D("Adapter & Decorator", "https://refactoring.guru/design-patterns/decorator"),
      D("Composite & Facade", "https://refactoring.guru/design-patterns/composite"),
      D("Design: Vending Machine", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Splitwise (expense sharing)", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };

  const week3 = {
    title: "Behavioral Design Patterns",
    days: [
      D("Strategy pattern", "https://refactoring.guru/design-patterns/strategy"),
      D("Observer pattern", "https://refactoring.guru/design-patterns/observer"),
      D("Command pattern", "https://refactoring.guru/design-patterns/command"),
      D("State pattern", "https://refactoring.guru/design-patterns/state"),
      D("Chain of Responsibility & Template Method", "https://refactoring.guru/design-patterns/chain-of-responsibility"),
      D("Design: BookMyShow (movie ticket booking)", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Cab booking system (Uber/Ola LLD)", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };

  const week4 = {
    title: "Concurrency & API Design in LLD",
    days: [
      D("Thread safety, locks & mutexes in OOP design", "https://docs.oracle.com/javase/tutorial/essential/concurrency/"),
      D("Producer-consumer, thread pools", "https://docs.oracle.com/javase/tutorial/essential/concurrency/pools.html"),
      D("Concurrent data structures", "https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/package-summary.html"),
      D("API design principles (idempotency, versioning)", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Extensible, testable class design (dependency injection)", "https://martinfowler.com/articles/injection.html"),
      D("Design: Rate Limiter (class-level)", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Elevator system", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };

  const week5 = {
    title: "Advanced LLD Problems",
    days: [
      D("Chess game design", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Board games generalized design (tic-tac-toe)", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Notification system (observer + strategy)", "https://github.com/ashishps1/awesome-low-level-design"),
      D("File system / directory structure design", "https://github.com/ashishps1/awesome-low-level-design"),
      D("LRU Cache design (data structure + OOP)", "https://leetcode.com/problems/lru-cache/"),
      D("Design: Chess game engine", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: LRU Cache with eviction policies", "https://leetcode.com/problems/lru-cache/", "design")
    ]
  };

  const week6 = {
    title: "Mock Interviews & Review",
    days: [
      D("Revisit weakest pattern #1", "https://refactoring.guru/design-patterns"),
      D("Revisit weakest pattern #2", "https://refactoring.guru/design-patterns"),
      D("LLD interview framework: requirements → classes → relationships → code", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Code review practice: spotting SOLID violations", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Common LLD interview mistakes", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Full mock #1: random LLD problem, 45 min timebox", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Full mock #2 + review notes", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };

  const w4_1 = {
    title: "OOP, SOLID & Creational Patterns",
    days: [
      D("SOLID principles (1/day pace, compressed)", "https://en.wikipedia.org/wiki/SOLID"),
      D("SRP + OCP with code examples", "https://en.wikipedia.org/wiki/Single-responsibility_principle"),
      D("LSP + ISP + DIP with code examples", "https://en.wikipedia.org/wiki/Liskov_substitution_principle"),
      D("Factory, Builder, Singleton", "https://refactoring.guru/design-patterns/creational-patterns"),
      D("Adapter, Decorator, Composite", "https://refactoring.guru/design-patterns/structural-patterns"),
      D("Design: Parking Lot system", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Vending Machine", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };
  const w4_2 = {
    title: "Behavioral Patterns & Booking Systems",
    days: [
      D("Strategy & Observer patterns", "https://refactoring.guru/design-patterns/strategy"),
      D("Command & State patterns", "https://refactoring.guru/design-patterns/command"),
      D("Chain of Responsibility & Template Method", "https://refactoring.guru/design-patterns/chain-of-responsibility"),
      D("API design principles for LLD interviews", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Dependency injection & testable design", "https://martinfowler.com/articles/injection.html"),
      D("Design: BookMyShow", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Splitwise", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };
  const w4_3 = {
    title: "Concurrency & Advanced Problems",
    days: [
      D("Thread safety & locks in OOP design", "https://docs.oracle.com/javase/tutorial/essential/concurrency/"),
      D("Producer-consumer & thread pools", "https://docs.oracle.com/javase/tutorial/essential/concurrency/pools.html"),
      D("Concurrent data structures", "https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/package-summary.html"),
      D("LRU Cache design", "https://leetcode.com/problems/lru-cache/"),
      D("Chess / board game design", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Design: Elevator system", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: Cab booking (Uber/Ola LLD)", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };
  const w4_4 = week6;

  const week7testing = {
    title: "Testing & Refactoring for LLD",
    days: [
      D("Unit testing OOP designs", "https://martinfowler.com/bliki/UnitTest.html"),
      D("Refactoring smells & how to fix them", "https://refactoring.guru/refactoring/smells"),
      D("Designing for extensibility & change", "https://refactoring.guru/design-patterns/what-is-pattern"),
      D("Mocking & test doubles", "https://martinfowler.com/articles/mocksArentStubs.html"),
      D("Reviewing real GitHub LLD solutions", "https://github.com/ashishps1/awesome-low-level-design"),
      D("Design: Notification system (observer + strategy)", "https://github.com/ashishps1/awesome-low-level-design", "design"),
      D("Design: File system / directory structure", "https://github.com/ashishps1/awesome-low-level-design", "design")
    ]
  };

  window.PrepStackRegister.track("lld", {
    name: "LLD — Low-Level / Object Design",
    icon: "🧱",
    blurb: "SOLID principles, GoF design patterns, and classic object-design interview problems from Parking Lot to Splitwise.",
    durations: {
      4: [w4_1, w4_2, w4_3, w4_4],
      6: [week1, week2, week3, week4, week5, week6],
      8: [week1, week2, week3, week4, week5, week7testing, week6, { ...week6, title: "Final Mock Round" }]
    }
  });
})();
