// LLD — Week 2: Creational & Structural Design Patterns.
(function () {
  window.PrepStackRegister.notes("lld", 1, {
    concepts: `# Creational & Structural Design Patterns

## Creational — controlling HOW objects are made

### Factory Method & Abstract Factory
- **Factory Method**: a method decides which concrete class to instantiate — callers get the interface. Kills scattered new + switch(type).
- **Abstract Factory**: a factory of FAMILIES — related products created consistently (DarkThemeFactory → DarkButton + DarkDialog; never mixed).
- Interview signal: "create by config/type/platform" → factory. Registry map (type → supplier) beats a switch for OCP.

### Builder
- Step-by-step construction of objects with many optional parts; ends with build().
- Solves the telescoping constructor (new Pizza(true, false, null, 3, …)) and enables validation at build() so invalid objects never exist.
\`\`\`
Burger b = new Burger.Builder("wheat")
    .patty("veg").cheese(true).build();   // named steps, immutable result
\`\`\`
- Bonus points: builder returns an IMMUTABLE object → thread-safety for free.

### Singleton
- One instance, global access point: config, connection pool, logger.
- Thread-safe options: eager static final; static holder idiom (lazy, no locks); enum (Java, serialization-proof); double-checked locking needs volatile — mention the pitfall.
- ALWAYS volunteer the costs: hidden global state, test coupling — expose it behind an injected interface so callers don't hardcode Singleton.get().

### Prototype (brief)
- Clone a configured instance instead of rebuilding (expensive parse/setup). Watch deep-vs-shallow copy.

## Structural — composing objects into larger shapes

### Adapter
- Bridges an interface you NEED to one you HAVE — wraps the adaptee, translates calls. Third-party SDKs, legacy code.
- e.g. PaymentGateway interface adapting StripeSDK vs RazorpaySDK: your code speaks one language; adapters translate.

### Decorator
- Wraps an object with the SAME interface, adding behavior before/after delegating — stackable at runtime.
- Coffee + Milk + Whip pricing; BufferedInputStream(GzipInputStream(FileInputStream)); middleware wrappers (logging, retry, metrics around a client).
- vs inheritance: n features = n decorators combined freely, not 2^n subclasses.

### Composite
- Tree where leaves and containers share one interface — clients call size()/render()/price() uniformly; containers recurse over children.
- File system (File/Directory), UI trees, org charts, arithmetic expressions.

### Facade
- One simple entry point over a messy subsystem: OrderFacade.placeOrder() internally hits inventory, payment, shipping, notification. Reduces coupling to subsystem details; the subsystem stays reachable for power users.

### Proxy (brief)
- Same interface, controls ACCESS: lazy loading, caching, auth checks, remote stubs, rate limiting. Decorator adds behavior; proxy gates it.

## Choosing fast in interviews
| Requirement phrase | Pattern |
|---|---|
| "create based on type/config" | Factory |
| "families of related objects" | Abstract Factory |
| "many optional fields / complex setup" | Builder |
| "exactly one, shared" | Singleton (+ caveats) |
| "make X work with Y's interface" | Adapter |
| "add features in combinations" | Decorator |
| "tree of parts and wholes" | Composite |
| "hide subsystem complexity" | Facade |
| "control/limit access to it" | Proxy |
`,
    qa: [
      { q: "Factory Method vs Abstract Factory?", a: "Factory Method creates ONE product polymorphically. Abstract Factory groups factory methods to create a consistent FAMILY (all dark-theme widgets) so incompatible members never mix." },
      { q: "What problem does Builder solve that constructors can't?", a: "Telescoping constructors with many optionals: unreadable positional booleans, combinatorial overloads. Builder gives named steps, enforces required-vs-optional, validates once at build(), and can emit an immutable object." },
      { q: "Why does double-checked locking require volatile?", a: "instance = new X() can reorder: the reference becomes visible before the constructor finishes, so another thread reads a half-built object. volatile bans the reorder. Simpler: static-holder idiom or enum." },
      { q: "Adapter vs Decorator vs Proxy — one line each?", a: "Adapter CHANGES the interface (make incompatible fit). Decorator KEEPS it and adds behavior (stackable). Proxy KEEPS it and controls access (lazy/cache/auth). Same wrapping shape, three different intents." },
      { q: "Where does Decorator beat subclassing concretely?", a: "Features that combine: logging+retry+caching around a client = 3 decorators in any mix. Subclassing needs a class per combination (2^n). Java IO streams are the canonical real-world example." },
      { q: "Composite's key design decision?", a: "What the shared interface includes: do leaves expose add/remove children (uniformity, runtime errors) or only containers (type safety, more casts)? Naming that trade-off is the senior answer." },
      { q: "Is Facade just a wrapper class?", a: "It's a curated ENTRY POINT for a use case, hiding subsystem orchestration and coupling. Unlike Adapter it doesn't convert interfaces; unlike Decorator it doesn't match one. It shrinks the surface area callers must know." },
      { q: "How do you keep Singleton from wrecking testability?", a: "Depend on an interface; inject the singleton instance at wiring time (DI container or main). Business classes never call Singleton.getInstance() directly, so tests swap a fake. The 'one instance' becomes deployment detail, not code coupling." }
    ],
    mock: { easy: [], medium: [
      { q: "Design a Vending Machine (creational + state focus).", a: "State pattern for lifecycle (Idle→HasMoney→Dispensing→OutOfStock), Inventory (slot→item,count), PaymentProcessor interface (coins/UPI — factory by payment type), VendingMachine facade for the button panel. Walk: insertMoney→selectItem→validate stock/price→dispense→change. Concurrency note: decrement stock atomically. Extension test: add card payments = new processor class only." },
      { q: "Design Splitwise — where do creational/structural patterns land?", a: "Factory for Split creation by type (equal/exact/percent) with per-type validation; Builder for Expense (payer, amount, participants, optional notes/receipt); Facade ExpenseManager.addExpense() orchestrating validation→splits→balance updates; balances as pairwise map. Observer to notify group members. Show addExpense end-to-end and the OCP claim: new split type = one class + factory registration." },
      { q: "Design a pizza-ordering module where toppings, size, and crust combine freely with pricing.", a: "Base Pizza interface with cost()/description(); Decorator per topping wrapping cost; Builder for the order flow (size, crust required; toppings variadic); Factory for regional menus (Abstract Factory if veg/non-veg families must stay consistent). Price = base + sum of decorators. Discuss why subclass-per-combination explodes and how a new topping ships with zero edits." }
    ], hard: [] }
  });
})();
