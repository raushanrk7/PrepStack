// LLD — Week 3: Behavioral Design Patterns.
(function () {
  window.PrepStackRegister.notes("lld", 2, {
    concepts: `# Behavioral Design Patterns

## Strategy
**TL;DR:** Encapsulate interchangeable algorithms behind one interface; swap at runtime instead of if/else chains.

- Payment methods, pricing rules, compression algorithms, ranking functions.
- Signal: a switch on "type" that picks behavior → each branch becomes a Strategy class; context holds a reference.
\`\`\`
interface PricingStrategy { double price(Order o); }
class SurgePricing implements PricingStrategy { ... }
class FlatPricing  implements PricingStrategy { ... }
cart.setPricing(new SurgePricing());   // swap without touching Cart
\`\`\`
- Strategy vs State: Strategy is chosen by the CLIENT and rarely self-changes; State transitions INTERNALLY as behavior runs.

## Observer
**TL;DR:** One-to-many dependency: subject changes → all subscribers notified. Decouples publisher from consumer list.

- Notification fan-out, UI data binding, event buses, stock tickers.
- Subject keeps a list of Observer interfaces: subscribe/unsubscribe/notify. Push (data in the call) vs pull (observer queries back).
- Pitfalls to mention: memory leaks from forgotten unsubscribes; ordering/reentrancy; sync notify blocking the publisher (→ queue it).

## Command
**TL;DR:** Reify a request as an object → queue it, log it, undo it.

- Text-editor undo/redo (each command stores its inverse), task queues, remote controls, transactional macros.
- Pieces: Command (execute/undo), ConcreteCommand (binds Receiver + args), Invoker (history stack), Receiver (does work).
- Undo = pop history, call undo(); redo = separate stack. Interviewers love the two-stack detail.

## State
**TL;DR:** Object changes behavior when internal state changes — each state is a class; transitions move a pointer.

- Vending machine (Idle→HasMoney→Dispensing), order lifecycle, elevator, TCP connection, media player.
- Kills the "giant switch on status in every method" smell: each State implements the same interface; invalid actions handled per-state.
\`\`\`
class HasMoneyState implements MachineState {
  insertCoin() { /* add */ }
  selectItem() { machine.setState(new DispensingState()); }
}
\`\`\`

## Chain of Responsibility
**TL;DR:** Pass a request along linked handlers; each handles it or forwards.

- Middleware pipelines (auth → rate-limit → validate), approval workflows (manager → director → VP), logging levels, support escalation.
- Handler has next; canHandle? process : next.handle(request). Discuss: what if no handler matches (default/exception)?

## Template Method
**TL;DR:** Base class fixes the algorithm skeleton; subclasses override individual steps.

- Data pipelines (read→parse→validate→save with format-specific parse), test frameworks (setup/run/teardown), game turns.
- Inheritance-based cousin of Strategy (composition). Prefer Strategy when steps vary independently; Template when the skeleton is truly fixed.

## Iterator & Mediator (know briefly)
- **Iterator**: sequential access without exposing internals — you use it daily (for-each).
- **Mediator**: peers talk through a hub instead of each other (chat room, air-traffic control) — trims N² coupling to N.

## Choosing under interview pressure
| Smell in requirements | Pattern |
|---|---|
| "support multiple X algorithms/methods" | Strategy |
| "notify/subscribe/update others when…" | Observer |
| "undo, history, schedule operations" | Command |
| "behaves differently depending on status" | State |
| "steps of approval/processing pipeline" | Chain of Responsibility |
| "same flow, steps differ per variant" | Template Method |
`,
    qa: [
      { q: "Strategy vs State — they look identical in UML. Difference?", a: "Intent and transition ownership. Strategy: client picks an algorithm; strategies don't know each other; rarely changes mid-flight. State: behavior varies by lifecycle; states trigger their own transitions; object appears to change class over time." },
      { q: "How does Observer decouple, and what's its classic bug?", a: "Subject knows only the Observer interface, not concrete subscribers — new consumers plug in without touching the subject. Classic bug: lapsed listener (never unsubscribed) → memory leak + ghost updates." },
      { q: "How does Command enable undo/redo?", a: "Each command stores what it needs to invert itself (or a memento). Undo stack: execute→push; undo: pop→undo()→push to redo stack; new command clears redo. History is just stacks of objects." },
      { q: "Where does Chain of Responsibility show up in real frameworks?", a: "HTTP middleware (Express/Spring interceptors): auth → rate-limit → validation → handler; servlet filters; logging frameworks' level handlers; exception-handling chains." },
      { q: "Template Method vs Strategy?", a: "Both vary parts of an algorithm. Template: inheritance — base fixes skeleton, subclass overrides hooks; vary ONE step set at compile time. Strategy: composition — whole algorithm swappable at runtime, independently testable. Prefer composition when in doubt." },
      { q: "Why is a naive synchronous Observer risky at scale?", a: "notify() runs every subscriber inline: one slow/throwing observer blocks or breaks the publisher, and reentrant updates can recurse. Production: queue events (async), isolate failures per subscriber, consider ordering guarantees." },
      { q: "Vending machine: why State over flags?", a: "With flags, every method re-checks combinations (if hasMoney && !dispensing…) — n states × m actions of scattered conditionals. State classes localize each mode's behavior + legal transitions; adding a state = one new class (OCP)." },
      { q: "Mediator vs Observer?", a: "Observer: broadcast, publisher doesn't know receivers. Mediator: hub coordinates known colleagues with routing logic (who gets what). Chat room = mediator; 'order-placed event anyone may consume' = observer." }
    ],
    mock: { easy: [], medium: [
      { q: "Design a notification service sending email/SMS/push per user preference. Which patterns and why?", a: "Strategy per channel (NotificationChannel.send), Observer to trigger on domain events (OrderShipped → notify), Factory for channel creation, Chain/Decorator for retry + rate limiting per channel. Classes: NotificationService, ChannelStrategy impls, UserPreferences, Message. Walk an event through the flow." },
      { q: "Design a text editor's undo/redo.", a: "Command pattern: InsertTextCmd/DeleteTextCmd each with execute+undo storing position+text. Editor (receiver), CommandManager (undo/redo stacks). New edit clears redo. Discuss memory: coalesce keystrokes into one command; memento snapshots for complex ops." },
      { q: "Design BookMyShow seat booking (behavioral focus).", a: "State for seat (Available→Held→Booked, TTL on hold), Observer to push seat-map updates to viewing clients, Strategy for pricing (weekend/matinee), Command for the booking transaction with rollback. Concurrency: pessimistic lock or version check on seat hold — mention it before they ask." }
    ], hard: [] }
  });
})();
