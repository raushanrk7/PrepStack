// HLD — syllabus supplement: Database Isolation Levels (PDFs 04-05). Merges into week 2 (Databases).
(function () {
  window.PrepStackRegister.notes("hld", 2, {
    concepts: `# Database Isolation Levels (Syllabus Deep-Dive)

## Why isolation matters
**TL;DR:** Isolation decides what concurrent transactions can see of each other — the dial between correctness and throughput.

### The read anomalies (know by name)
- **Dirty read**: read another txn's UNCOMMITTED write (which may roll back).
- **Non-repeatable read**: same row read twice within a txn returns different committed values.
- **Phantom read**: same RANGE query returns new/removed rows the second time (another txn inserted/deleted).
- **Lost update**: two read-modify-writes interleave; one overwrites the other.

## The four levels
| Level | Dirty | Non-repeatable | Phantom | Typical impl |
|---|---|---|---|---|
| Read Uncommitted | possible | possible | possible | rarely used |
| Read Committed | ✗ | possible | possible | Postgres/Oracle DEFAULT |
| Repeatable Read | ✗ | ✗ | possible* | MySQL InnoDB DEFAULT |
| Serializable | ✗ | ✗ | ✗ | 2PL or SSI |

*InnoDB's Repeatable Read largely blocks phantoms too via next-key (gap) locks — a favorite gotcha.

## How engines implement it — MVCC
- **MVCC** (multi-version concurrency control): writers create new row versions; readers see a **snapshot** as of their start — readers never block writers and vice versa. This is how Postgres/InnoDB give Read Committed / Repeatable Read cheaply.
- Read Committed = new snapshot per STATEMENT; Repeatable Read = one snapshot per TRANSACTION.
- Serializable: either true 2-phase locking (locks held to commit, blocking) or Postgres's **SSI** (optimistic — detect dangerous patterns, abort one txn; retry on serialization_failure).

## Handling the lost update (the practical interview question)
1. **Atomic write**: UPDATE accounts SET bal = bal - 100 WHERE id=1 — push the math into the DB.
2. **Pessimistic**: SELECT … FOR UPDATE — lock the row up front.
3. **Optimistic**: version column — UPDATE … WHERE id=1 AND version=7; zero rows updated → retry. Best under low contention.

## Choosing in practice
- Default (Read Committed / RR) is right for most apps; escalate to SELECT FOR UPDATE or Serializable only around genuinely racy flows (inventory, balance transfer, seat booking).
- Serializable costs: blocking or retry storms under contention — scope it to the few transactions that need it.
- Distributed twist: replicas serve stale reads regardless of isolation level — isolation is per-node; cross-node consistency is a different axis (quorums, read-your-writes).
`,
    qa: [
      { q: "Name the four read anomalies in escalating order.", a: "Dirty read (see uncommitted), non-repeatable read (row changes between reads), phantom (range gains/loses rows), lost update (interleaved read-modify-write overwrites). Each isolation level knocks out more of them." },
      { q: "Default isolation of Postgres vs MySQL InnoDB?", a: "Postgres: Read Committed. InnoDB: Repeatable Read (with next-key locks that also mostly prevent phantoms). Knowing the defaults signals real production experience." },
      { q: "How does MVCC let readers and writers not block each other?", a: "Writes create new row versions instead of overwriting; each transaction reads the newest version visible to its snapshot. Readers see consistent past state; writers proceed. Cost: version cleanup (vacuum/purge) and snapshot bookkeeping." },
      { q: "Read Committed vs Repeatable Read in MVCC terms?", a: "When the snapshot is taken: per statement (RC — each query sees latest committed) vs per transaction (RR — frozen view for the whole txn). One-line answer interviewers love." },
      { q: "Three fixes for the lost-update problem?", a: "1) Atomic in-DB update (SET bal = bal - x). 2) Pessimistic SELECT FOR UPDATE. 3) Optimistic version-check update with retry. Choose by contention level and hold time." },
      { q: "Why not run everything at Serializable?", a: "Throughput: 2PL serializable holds locks to commit (blocking, deadlocks); SSI aborts under contention (retry storms). Most reads don't need it. Scope strict isolation to the racy transactions only." },
      { q: "What's a gap/next-key lock?", a: "InnoDB RR locks the index RANGE scanned, not just found rows — blocking inserts into the gap, hence no phantoms. Side effect: surprising lock contention on hot ranges (e.g., inserting adjacent keys)." },
      { q: "Does Serializable isolation fix stale reads from replicas?", a: "No — isolation is within one node. A lagging async replica serves old data at any isolation level. Cross-node freshness needs sync replication, quorum reads, or read-your-writes routing (session pinning)." }
    ],
    mock: { easy: [], medium: [
      { q: "Two users buy the last item simultaneously; both see stock=1 and both succeed. Diagnose and fix.", a: "Lost update via check-then-act at default isolation. Fixes: atomic conditional UPDATE stock=stock-1 WHERE id=? AND stock>0 (rows-affected=0 → sold out); or SELECT FOR UPDATE around the check; or version-column optimistic retry. Discuss contention: hot-item flash sale → queue writes or use Redis DECR with reconciliation." },
      { q: "Design money transfer between two accounts — isolation and locking story.", a: "One transaction: debit + credit atomically. Lock both rows via SELECT FOR UPDATE in a GLOBAL ORDER (e.g., lower account id first) to prevent deadlock; or optimistic versions with retry. Idempotency key on the transfer to survive client retries; ledger table (append-only) for audit. Mention: never read balance then write it — always relative updates or locked reads." }
    ], hard: [] }
  });
})();
