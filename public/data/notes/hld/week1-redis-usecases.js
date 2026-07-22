// HLD — Redis data-structure design case study (video platform). Merges into week 1 (Caching module);
// the `## ` heading becomes its own Topic, each `### ` a Lesson.
(function () {
  const concepts = `
## Redis Case Study: Designing Data Structures for a Video Platform

Interview framing: *"You're building a YouTube/Netflix-like platform. Design the Redis layer for user profiles, watch history, trending videos, watched-flags, and sessions."* The skill being tested is **picking the right Redis data structure per access pattern** — not just "use a cache".

### Lesson 1 — User Profiles: Hash, not String

**Pattern:** multi-field object, partial reads/writes.

\`\`\`
HSET user:42 name "Asha" plan "premium" avatar "a.png" profile_type "adult"
HMGET user:42 name plan          → 1 round trip, only the fields you need
HSET user:42 plan "free"         → update ONE field, no read-modify-write
\`\`\`

**Why a Hash beats a JSON String:**

| | String (JSON blob) | Hash |
|---|---|---|
| Read 2 of 10 fields | fetch + parse whole blob | \`HMGET\` just those 2 |
| Update 1 field | GET → parse → mutate → SET (race-prone) | atomic \`HSET\` |
| Memory | JSON overhead | ziplist-encoded small hashes are very compact |

**Interview line:** "Hash gives me field-level access in one round trip and atomic single-field updates — a JSON string forces read-modify-write of the whole object."

### Lesson 2 — Watch History: Capped List (LPUSH + LTRIM)

**Pattern:** "last N items", newest first, bounded memory.

\`\`\`
LPUSH user:42:history video:991
LTRIM user:42:history 0 9        → keep only 10 most recent
LRANGE user:42:history 0 9       → render "Continue watching" row
\`\`\`

\`\`\`
newest ──▶ [v991][v877][v850][v723]...[v101] ──▶ trimmed off
            └────────── max 10 kept ─────────┘
\`\`\`

Redis holds only the **hot last-10**; the full history lives in the database. Cache miss / "See all" → fall back to DB. This is the classic **cache-the-head, DB-the-tail** split — Redis stays small and O(1) per write.

### Lesson 3 — Trending: Sorted Set with Time-Decayed Score

**Pattern:** ranked leaderboard that favors *recent* momentum, not all-time views.

\`\`\`
score = views / (age_hours + 2)^1.5      (Hacker News–style gravity)

ZADD trending:2026072114 8421 video:991   ← hourly bucket key
ZREVRANGE trending:2026072114 0 9 WITHSCORES  → top-10 now
\`\`\`

Two critical optimizations to say out loud:

1. **Decay in the score, not by rewriting members** — old videos sink naturally as \`age\` grows in the formula recomputed per bucket.
2. **Hourly buckets, not per-view ZINCRBY on one global key** — per-view writes to a single hot key = write hotspot. Instead, aggregate views (e.g., from a stream/counter) and ZADD into \`trending:{yyyymmddhh}\`; expire old buckets. Reads hit the current (or merged last-k) bucket.

\`\`\`
views stream ─▶ aggregator (per hour) ─▶ ZADD trending:{hour bucket}
                                              │ EXPIRE 48h
frontend ◀── ZREVRANGE top 10 ◀───────────────┘
\`\`\`

### Lesson 4 — "Watched" Flags: Bitmaps (SETBIT)

**Pattern:** boolean per (video, user) at massive scale.

\`\`\`
SETBIT watched:video:991 42 1     → user 42 watched video 991
GETBIT watched:video:991 42       → did they? O(1)
BITCOUNT watched:video:991        → how many users watched
\`\`\`

**The math that wins the interview:** 500M users × 1 bit = **62.5 MB per video**. The naive alternative — a String/Set entry per (user,video) pair at ~50 bytes — is ~25 GB per video, i.e., **~25 TB across 1000 videos vs ~62 GB with bitmaps** (~400× smaller). Bonus: \`BITOP AND\` gives "watched both A and B" for free.

*Caveat to mention:* bitmaps index by numeric userId — needs dense integer IDs (or a mapping layer).

### Lesson 5 — Sessions: Sliding TTL + Active Invalidation

**Pattern:** auto-logout on inactivity + never serve stale entitlements.

\`\`\`
every authenticated request:
  EXPIRE user:42 1800            → sliding 30-min inactivity window

on plan change (webhook/billing event):
  DEL user:42                    → active invalidation; next read rebuilds from DB
\`\`\`

\`\`\`
request ─▶ auth ─▶ EXPIRE session 1800 ─▶ handler
                     (sliding window: TTL resets on every hit)

billing "plan changed" ─▶ DEL user:{id} ─▶ next read = cache miss ─▶ DB ─▶ re-cache
\`\`\`

**Why both:** TTL alone means up to 30 min of a user on "premium" features after downgrading. Active invalidation on the write path (or via CDC/pub-sub) closes that window. This is the standard **TTL-as-safety-net + event-driven-invalidation-as-correctness** answer.

### Lesson 6 — The 30-Second Summary Table

| Need | Structure | Command core | Why |
|---|---|---|---|
| Profile (multi-field) | Hash | HSET / HMGET | field-level atomic access, 1 RTT |
| Last-10 history | List | LPUSH + LTRIM | O(1) capped, DB holds full tail |
| Trending | Sorted Set (hourly buckets) | ZADD / ZREVRANGE | decay score, no hot key |
| Watched flag | Bitmap | SETBIT / BITCOUNT | 62.5 MB vs 25 TB |
| Session | key TTL | EXPIRE 1800 per request | sliding inactivity logout |
| Freshness | — | DEL on change event | TTL = safety net, events = correctness |

Close with: "Each choice maps an access pattern to the structure whose native ops make it O(1)/O(log N) — that's the whole game with Redis."
`;

  window.PrepStackRegister.notes("hld", 1, {
    concepts,
    qa: [
      { q: "Why store a user profile as a Redis Hash instead of a JSON String?", a: "HMGET reads only needed fields in one round trip and HSET updates one field atomically; a JSON string forces fetching/parsing the whole blob and read-modify-write races on update. Small hashes are also memory-compact (ziplist encoding)." },
      { q: "How do you keep watch history bounded in Redis?", a: "LPUSH the new item then LTRIM 0 9 — an O(1) capped list of the 10 most recent. The full history stays in the DB; 'see all' falls back to it." },
      { q: "Why hourly buckets for trending instead of ZINCRBY per view on one key?", a: "A single global sorted set becomes a write hotspot at high view rates. Aggregating counts and ZADD-ing into trending:{hour} spreads writes, lets old buckets expire, and the decay formula views/(age+2)^1.5 naturally sinks stale videos." },
      { q: "Estimate memory for tracking which of 500M users watched a video.", a: "Bitmap: 500M bits ≈ 62.5 MB per video. A per-(user,video) key/set-member approach at ~50 bytes each is ~25 GB per video — bitmaps are ~400× smaller, and BITCOUNT/BITOP come free. Requires dense integer user IDs." },
      { q: "How do you implement 30-min inactivity logout?", a: "Sliding TTL: call EXPIRE session 1800 on every authenticated request. TTL only resets while the user is active, so idle sessions die automatically." },
      { q: "TTL vs active invalidation — when do you need both?", a: "TTL alone leaves a staleness window (a downgraded user keeps premium until expiry). Emit an event on the write path (billing webhook/CDC) that DELs the cached entry so the next read rebuilds. TTL remains the safety net for missed events." }
    ],
    mock: {
      medium: [
        { prompt: "Design the Redis layer for a video platform: profiles, watch history, trending, watched-flags, sessions.", key_points: ["Hash for profiles (HMGET/HSET field-level)", "LPUSH+LTRIM capped history with DB tail", "hourly-bucketed sorted set with decay score views/(age+2)^1.5", "SETBIT bitmaps for watched (62.5MB vs 25TB argument)", "sliding EXPIRE 1800 sessions + DEL-on-event invalidation"] }
      ]
    }
  });
})();
