// LLD — Week 1: OOP Fundamentals & SOLID Principles.
(function () {
  window.PrepStackRegister.notes("lld", 0, {
    concepts: `# OOP Fundamentals & SOLID Principles

## The four OOP pillars (say them precisely)
- **Encapsulation**: data + the operations on it live together; internals hidden behind an interface. Not "private fields" — it's protecting INVARIANTS (wallet.debit() can refuse; a public balance setter can't).
- **Abstraction**: expose what, hide how. Callers depend on the contract, so the implementation can change.
- **Inheritance**: is-a reuse of interface + behavior. Powerful, easily abused — see LSP.
- **Polymorphism**: one call site, many behaviors — the mechanism that lets new types plug in without touching callers. The engine behind almost every design pattern.

## SOLID

### S — Single Responsibility
- A class should have **one reason to change** (one stakeholder/axis of change), not "does one thing."
- Smell: Report class that computes AND formats AND emails. Three reasons to change → three classes.
- Test: describe the class in one sentence without "and."

### O — Open/Closed
- Open for extension, closed for modification: add behavior with NEW code, not edits to working code.
- Mechanism: polymorphism — new subclass/strategy instead of another else-if branch.
- Smell: switch(type) that grows every sprint. Each case → a class behind an interface; often a registry/factory map replaces the switch.

### L — Liskov Substitution
- A subtype must be usable wherever the base is, without the caller knowing: no stronger preconditions, no weaker postconditions, no surprise exceptions.
- Canonical violation: Square extends Rectangle — setWidth silently changes height, breaking Rectangle-based code. Fix: don't inherit; both are Shapes with area().
- Smell: subclass overriding a method to throw UnsupportedOperation or to no-op.

### I — Interface Segregation
- Many small role-interfaces beat one fat one; clients shouldn't depend on methods they don't use.
- Smell: implements with six stubbed methods. Split Machine into Printer/Scanner/Fax; a class implements what it truly is.

### D — Dependency Inversion
- High-level policy depends on ABSTRACTIONS, not concrete details; details depend on the same abstractions.
- Practice: OrderService takes a PaymentGateway interface in its constructor; StripeGateway implements it. Tests inject a fake; swapping providers touches zero business logic.
- DI (injection) is the technique; DIP is the principle it serves.

\`\`\`
// DIP in one glance
class OrderService {
  private final PaymentGateway gateway;      // abstraction
  OrderService(PaymentGateway g) { this.gateway = g; }   // injected
  void checkout(Order o) { gateway.charge(o.total()); }
}
// new StripeGateway() lives in main/wiring — never inside OrderService
\`\`\`

## Composition over inheritance
- Inheritance: compile-time, single-parent, inherits everything (fragile base class).
- Composition: runtime-swappable parts, mix per instance, test pieces in isolation — Duck has-a FlyBehavior beats a MountainDuck/RubberDuck class tree.
- Litmus: inheriting to REUSE code → compose. Genuine is-a with a stable contract → inherit.

## How this is graded in interviews
- You'll rarely be asked "define SRP" — you'll be shown/asked to write code and expected to keep responsibilities separated, program to interfaces, and justify each abstraction. SOLID vocabulary is for JUSTIFYING choices out loud.
`,
    qa: [
      { q: "Encapsulation in one sentence that isn't 'private fields'?", a: "Bundling state with the only operations allowed to change it, so class invariants can't be violated from outside — wallet.debit(amount) can enforce balance ≥ 0; a public setter cannot." },
      { q: "SRP says 'one reason to change' — what's a reason?", a: "An axis of change / stakeholder: business rules vs persistence format vs presentation. A class serving finance AND ops AND email will be edited for three unrelated causes — split along those lines." },
      { q: "How does OCP eliminate a growing switch(type)?", a: "Each branch becomes a class implementing a common interface; a map/factory picks the implementation. Adding a type = adding a class + registration — existing, tested code stays untouched." },
      { q: "Why exactly does Square-extends-Rectangle violate LSP?", a: "Code holding a Rectangle assumes setWidth leaves height alone (a postcondition). Square breaks that, so substituting it changes caller-visible behavior. The is-a of math isn't the is-a of mutable behavior contracts." },
      { q: "ISP vs SRP — how do they differ?", a: "SRP shapes the CLASS (one reason to change); ISP shapes the CLIENT-facing interface (depend only on what you use). A class can be cohesive yet still force clients through a fat interface — that's the ISP smell." },
      { q: "DIP vs dependency injection?", a: "DIP: the design principle — policy depends on abstractions. DI: the wiring technique (constructor params, containers) commonly used to achieve it. You can inject concretes (no DIP) or satisfy DIP without a framework." },
      { q: "When is inheritance the right call?", a: "True is-a with a stable base contract, where subtypes vary behavior but honor every caller assumption (LSP holds): Piece→Rook, InputStream family. If the motive is code reuse or the base keeps changing — compose." },
      { q: "What's the fragile base class problem?", a: "Subclasses silently depend on base-class implementation details (call order, self-calls); an innocent base edit breaks children. Composition confines you to the public contract, so internals can change safely." }
    ],
    mock: { easy: [], medium: [
      { q: "Design a Parking Lot — focus on where SOLID shows up.", a: "Entities: ParkingLot→Floor→Spot(type), Vehicle hierarchy, Ticket, Payment. SRP: allocation, pricing, payment in separate classes. OCP: SpotAllocationStrategy + FeeStrategy interfaces (add EV pricing = new class). LSP: Vehicle subtypes only vary data (size) — behavior via strategies, not overrides that surprise. DIP: ParkingService takes PaymentProcessor interface. Code the park()→ticket→unpark()→fee flow." },
      { q: "Design a Library Management system.", a: "Book (catalog info) vs BookCopy (physical item, state: Available/Issued/Reserved) — the split interviewers test. Member, Loan (copy+member+dates), Catalog (search by title/author — SRP separate from lending), FineStrategy per member type, NotificationService (interface) for due reminders. Walk checkout: verify limits → issue copy → create loan; return: fine calc via strategy. Reservations = queue per Book with observer on return." },
      { q: "You're shown a UserManager doing validation, DB writes, password hashing, and email. Refactor it live.", a: "Name the SRP breach and the axes: UserValidator, UserRepository (interface + impl — DIP), PasswordHasher (interface: swap bcrypt/argon2 — OCP), NotificationSender. UserService orchestrates via constructor-injected interfaces; each unit testable with fakes. Show the before/after constructor and one test double to prove the point." }
    ], hard: [] }
  });
})();
