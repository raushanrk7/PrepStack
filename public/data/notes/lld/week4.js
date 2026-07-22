// LLD — Week 5: Advanced LLD Problems.
(function () {
  window.PrepStackRegister.notes("lld", 4, {
    concepts: `# Advanced LLD Problems

## Chess game design
**TL;DR:** The benchmark for inheritance vs composition judgment.

### Core model
- Board (8×8 of Cell), Piece hierarchy (abstract Piece → King/Queen/Rook/Bishop/Knight/Pawn), Player, Game (state machine: turns, check/checkmate/stalemate), Move (from, to, captured, special flags).
- **Movement as behavior**: piece.getLegalMoves(board, pos) — or better, a MovementStrategy per piece type (composition) so fairy-chess variants plug in.
- **Move legality is two-layer**: shape-legal (piece geometry) then state-legal (doesn't leave own king in check — simulate, test, revert).
- Special moves are where designs crack: castling (king+rook, neither moved, path safe), en passant (depends on LAST move → Game must keep history), promotion (piece replacement). Move history doubles as undo (Command).

## Board games generalized (Tic-tac-toe → NxN)
- Separate Game (rules/turns), Board (grid state), Player, WinChecker (strategy — row/col/diag counts updated incrementally: O(1) win check per move instead of O(n²) rescan).
- Generalizing question: "now support Connect-4 / Gomoku" — if rules are strategies and board size is a parameter, the design survives; hardcoded 3s fail.

## File system design
- **Composite pattern is the answer**: abstract Node (name, parent, size(), metadata) → File (leaf, content) and Directory (children map name→Node).
- size() recursive on Directory, O(1) on File; path resolution = walk components from root; ls/find/mkdir/rm as operations.
- Follow-ups: symlinks (cycle danger → visited set), permissions (check on each traversal step), in-memory FS (LeetCode 588) — same skeleton.

## LRU cache with pluggable eviction
- Core LRU: HashMap<K, Node> + doubly-linked list, O(1) get (move to head) and put (evict tail).
- **Pluggable eviction = Strategy**: EvictionPolicy interface (onGet, onPut, evictCandidate) with LRU/LFU/FIFO implementations — the cache never knows which policy runs.
- LFU in O(1): freq→DLL-of-nodes map + minFreq pointer (LeetCode 460). TTL: store expiry per entry, lazily expire on get + periodic sweep.

## Elevator system
- ElevatorCar (state: direction, floor, door), ElevatorController (assigns requests), Request (internal: button in car; external: floor+direction), Scheduling strategy.
- **SCAN/LOOK algorithm** (the elevator algorithm): keep moving in one direction serving requests, reverse when none remain ahead — fair, starvation-free. Strategy interface for scheduling → swap nearest-car / zoned dispatch.
- Multi-elevator: controller picks best car (same direction & approaching > idle > opposite). State pattern for door/motion states; Observer for floor displays.

## Splitwise / expense sharing
- User, Group, Expense (payer, amount, participants, SplitStrategy: equal/exact/percent), BalanceSheet as directed graph user→user→amount.
- **Simplify debts**: net each user's balance (+creditor/−debtor), then greedily match max creditor with max debtor — minimal transaction list (heap on both sides).
- Validate: percent splits sum to 100, exact splits sum to amount — put validation in the strategy.

## What "advanced" is really testing
1. Requirement scoping before classes (2 min of questions).
2. Entities vs behaviors: nouns → classes, verbs → methods/strategies.
3. Pattern fluency without pattern-forcing (justify each one).
4. State machines for lifecycle-heavy domains.
5. A working core flow in code, not just boxes — always land one end-to-end method.
`,
    qa: [
      { q: "Chess: why MovementStrategy over overriding getLegalMoves in each subclass?", a: "Both pass; composition wins when variants multiply (fairy pieces, variants reuse sliding logic — Queen = Rook ∪ Bishop movement). Also isolates movement for unit testing without a full Piece/Board." },
      { q: "Chess: what makes en passant a design probe?", a: "Its legality depends on the opponent's immediately previous move — so Board state alone is insufficient; Game must expose move history. Tests whether your Move/Game model captures temporal rules, and history conveniently powers undo." },
      { q: "Why is Composite the right call for a file system?", a: "Files and directories share an interface (name, size, delete) but directories contain children — Composite makes clients treat both uniformly; recursive ops (size, search) fall out naturally as tree walks." },
      { q: "Tic-tac-toe: win check in O(1) per move?", a: "Keep per-row, per-col, and two diagonal counters per player; increment on each move and compare to n. Avoids rescanning the board — and scales to NxN, which is the interviewer's real question." },
      { q: "How does LFU achieve O(1) with eviction by frequency?", a: "HashMap key→node, plus freq→DLL of nodes at that frequency, plus a minFreq pointer. Access moves node to freq+1's list; evict head of minFreq list. All pointer ops, no scans." },
      { q: "Explain SCAN/LOOK for elevators and why not nearest-request-first.", a: "Serve all requests in the current direction, then reverse (LOOK reverses at last request, not top floor). Nearest-first starves far floors under load; SCAN bounds wait time and matches physical motion cost." },
      { q: "Splitwise: minimize settlement transactions?", a: "Net each user to one balance; split into creditors/debtors; repeatedly settle max-debtor against max-creditor (two heaps) — each step zeroes at least one user, ≤ n−1 transactions. Truly minimal transaction count is NP-hard (subset-sum) — say the greedy is the accepted answer." },
      { q: "Interviewer says 'now add feature X' and your design breaks — what went wrong?", a: "Usually behavior hardcoded where a strategy belonged (fixed board size, fixed split logic, movement in switch statements) or missing domain state (no move history). Prevention: ask the extension questions up front and put variability behind interfaces." }
    ],
    mock: { easy: [], medium: [
      { q: "Design an elevator system for a 30-floor building with 4 cars.", a: "Entities: ElevatorCar (State pattern: MovingUp/Down/Idle/DoorOpen), ElevatorController (singleton dispatcher), external HallRequest(floor, dir), internal CarRequest(floor). Dispatch strategy: prefer car moving toward the floor in the same direction, else nearest idle. Per-car SCAN via two sorted request sets (up/down). Observer updates displays. Walk one request end-to-end and mention starvation-freedom." },
      { q: "Design Splitwise with equal, exact, and percent splits.", a: "Expense holds SplitStrategy; strategy validates + computes shares (percents→100, exacts→amount). BalanceSheet aggregates pairwise nets; getBalances(user), simplify() via max-heap matching. Show the OCP win: adding 'split by shares' = one new class, no edits elsewhere." },
      { q: "Design an in-memory file system supporting mkdir, addFile, ls, readFile.", a: "Composite: Node(name) → File(content), Directory(TreeMap<String,Node> for sorted ls). Path resolution splits '/', walks from root, errors on missing/type mismatch. ls: file→itself, dir→sorted children. Discuss extensions: permissions per node checked during walk, symlink nodes with cycle guard, size() as recursive fold." }
    ], hard: [] }
  });
})();
