# PrepStack — Architecture & Contributor Guide

> **Purpose of this document:** Give any engineer (or AI coding assistant) everything
> needed to understand, run, extend, and maintain PrepStack **without reading the whole
> codebase first**. Read this top-to-bottom once; then jump to the section you need.

---

## 1. What PrepStack Is

PrepStack is a **personal interview-prep planner** — a static web app that pairs a
structured, multi-week study roadmap with curated recall-grade notes, design-drill
practice, personal note-taking, and an optional Claude AI tutor.

- **Audience:** engineers preparing for technical interviews (currently authored around
  a senior/L5–L6 target).
- **Tracks (topics):** DSA, HLD (System Design), LLD (Object Design), AI/ML, Agentic AI,
  AlgoTrading. Each is independent and pluggable.
- **Zero backend by default.** Pure HTML/CSS/vanilla-JS. Runs by opening
  `public/index.html` directly, or `npx serve public`.
- **Optional serverless function** (`api/chat.js`) hides the Anthropic API key when
  deployed to Vercel/Netlify. Without it, the AI panel falls back to a user-pasted key.

### Core mental model

```
Track (e.g. HLD)
  └─ Duration variant (4 / 6 / 8 weeks)
       └─ Week (e.g. "Storage Deep Dive")
            └─ 7 Days, each: { name, link, type? }
                 ├─ type unset  → LEARN day
                 └─ type:"design" → DESIGN DRILL day

Curated content lives PARALLEL to the roadmap, keyed by track + week (+ optional day):
  NOTES[track][weekIdx] = { concepts, qa[], mock{}, days{} }

Personal user content lives in localStorage via NotesRepo, keyed by profile + track + week + day.
```

---

## 2. Tech Stack & Constraints

| Aspect | Choice | Why / Constraint |
|---|---|---|
| Language | Vanilla JS (ES2019+), no framework | No build step. Must run from `file://` AND a static server. |
| Modules | Plain `<script>` tags, global `window.*` namespaces | No bundler, no ES modules import graph. **Load order in `index.html` matters.** |
| Styling | Single `public/styles.css`, CSS variables for theming | Light/dark via `data-theme`; reading mode via `data-read-mode`. |
| Persistence | `localStorage` only | ~5 MB cap. Namespaced by profile. |
| AI | Anthropic Messages API | Direct (browser, BYO key) OR via `/api/chat` serverless proxy. |
| Hosting | Static (GitHub Pages) or serverless (Vercel/Netlify) | `vercel.json` + `netlify.toml` included. |

**Hard rules for contributors:**
1. **No build step.** Don't introduce npm dependencies for the frontend, bundlers, or transpilation.
2. **No frameworks** (React/Vue/etc.). This was a deliberate simplicity choice.
3. **Content is data, not code.** All study content lives in `public/data/**`. Never hardcode content into `app.js`.
4. **Keep the UI minimal.** The owner has repeatedly asked for "simple, intuitive, no too much." Prefer progressive disclosure (modals, collapsibles) over always-visible chrome. Tabs ≤ 4, filters ≤ 3.

---

## 3. File Map

```
PrepStack/
├── ARCHITECTURE.md          ← you are here
├── README.md                ← user-facing intro + deploy instructions
├── LICENSE                  ← MIT
├── package.json             ← only "scripts": dev/start = npx serve public
├── vercel.json              ← routes / and non-/api to /public
├── netlify.toml             ← publishes /public, maps /api/chat → functions
│
├── api/
│   └── chat.js              ← serverless proxy (Vercel + Netlify compatible)
│
└── public/
    ├── index.html           ← single entry point. Owns <script> load order.
    ├── styles.css           ← ALL styles (light/dark/read-mode/components)
    │
    ├── app.js               ← controller: state, rendering, event wiring
    ├── profiles.js          ← local multi-profile system (window.Profiles)
    ├── event-bus.js         ← tiny pub/sub (window.EventBus)
    ├── notes-repo.js        ← user notes: domain + async repository (window.NotesRepo, NoteFactory)
    ├── claude.js            ← AI tutor panel + Anthropic integration (window.PrepStackAI)
    │
    └── data/                ← ALL STUDY CONTENT (the part you'll edit most)
        ├── index.js         ← defines window.PrepStackRegister {track,resources,notes}
        ├── tracks/<key>.js  ← curriculum: TRACKS[key] = {name, icon, blurb, durations}
        ├── resources/<key>.js  ← RESOURCES[key] = [{title,url,kind}]
        └── notes/<key>/week<N>.js  ← NOTES[key][N] = {concepts, qa, mock, days}
```

`<key>` ∈ `dsa | hld | lld | aiml | agents | algotrading`.

---

## 4. Architecture & Design Patterns

PrepStack is layered even though it's vanilla JS. The patterns were chosen so content
and storage can scale without rewriting the UI.

```
┌─────────────────────────────────────────────────────────┐
│  UI            index.html + app.js render functions      │
│                (roadmap, notes, resources, my-notes tabs, │
│                 modals, AI panel)                         │
├─────────────────────────────────────────────────────────┤
│  Application   app.js controller: `state` object,         │
│                event handlers, tab/modal orchestration    │
├─────────────────────────────────────────────────────────┤
│  Domain        NoteFactory (Factory pattern)              │
│                Profile / Note entities                    │
├─────────────────────────────────────────────────────────┤
│  Messaging     EventBus (Observer / pub-sub)              │
├─────────────────────────────────────────────────────────┤
│  Storage       NotesRepo (Repository pattern, async API)  │
│                Profiles (namespaced localStorage)         │
│                → today: localStorage                      │
│                → swappable to IndexedDB / backend later    │
├─────────────────────────────────────────────────────────┤
│  Content       window.TRACKS / RESOURCES / NOTES          │
│                populated by data/** via PrepStackRegister │
└─────────────────────────────────────────────────────────┘
```

**Patterns in use:**
- **Repository** — `NotesRepo` exposes an async CRUD interface (`list/get/create/update/remove/...`). The UI never touches `localStorage` for notes directly. Swap the backend by rewriting only `notes-repo.js`.
- **Factory** — `NoteFactory.manual()` and `.fromAIMessage()` construct schema-correct `Note` objects with source-specific defaults.
- **Observer / pub-sub** — `EventBus.emit("notes:changed", …)`; `app.js` subscribes to re-render the notes list, badge counts, and open day modal. Decouples writers from renderers.
- **Registry** — `PrepStackRegister.{track,resources,notes}()` lets each content file self-register into the global registries. Adding content = drop a file + one `<script>` tag; no central edits.
- **Namespaced storage** — every localStorage key is `prepstack:u:<profileId>:<suffix>` so profiles never collide (multi-tenant-safe).

---

## 5. Global API Surface (what each module exposes on `window`)

Load order (enforced by `index.html`): **data registries → content → app modules → app.js**.

| Global | Defined in | Key methods / shape |
|---|---|---|
| `PrepStackRegister` | `data/index.js` | `.track(key, def)`, `.resources(key, list)`, `.notes(track, weekIdx, content)` |
| `TRACKS` | populated by `data/tracks/*` | `{ [key]: {name, icon, blurb, durations:{4:[…],6:[…],8:[…]}} }` |
| `RESOURCES` | populated by `data/resources/*` | `{ [key]: [{title, url, kind}] }` |
| `NOTES` | populated by `data/notes/**` | `{ [key]: { [weekIdx]: {concepts, qa, mock, days} } }` |
| `Profiles` | `profiles.js` | `.list() .current() .switch(id) .create({name,emoji}) .delete(id) .key(suffix) .on(evt,fn)` |
| `EventBus` | `event-bus.js` | `.on(evt,fn) .off .emit(evt,payload) .once` |
| `NotesRepo` | `notes-repo.js` | async `.list(filter) .get(id) .create(note) .update(id,patch) .remove(id) .togglePin(id) .clear() .bulkImport(notes) .exportAll() .count()` |
| `NoteFactory` | `notes-repo.js` | `.manual({...})`, `.fromAIMessage({...})` |
| `PrepStack` | `app.js` | `.state`, `.K` (key helpers), `.getCurrentContext()` |
| `PrepStackAI` | `claude.js` | `.init()`, `.refreshStatus()`, `.seed(text, {autoSend})` |

---

## 6. Data Schemas (the contracts you must honor)

### 6.1 Track (`data/tracks/<key>.js`)

```js
PrepStackRegister.track("hld", {
  name: "HLD — High-Level / System Design",   // shown in dropdown
  icon: "🏛️",                                  // emoji, shown in dropdown + headers
  blurb: "From CAP … to designing Twitter…",   // one-line description under the title
  durations: {
    4: [ /* 4 week objects */ ],
    6: [ /* 6 week objects */ ],
    8: [ /* 8 week objects */ ]
  }
});

// A WEEK object:
{
  title: "Storage Deep Dive",
  days: [                         // exactly 7 recommended
    { name: "SQL internals", link: "https://…" },              // LEARN day
    { name: "Design: Twitter Feed", link: "https://…", type: "design" }  // DESIGN day
  ]
}
```

- `type: "design"` marks a design-drill day → gets a 🧩 chip in the roadmap and a
  design-drill card in the Day Notes modal. Unset = a normal learn day.
- Convention: in the 6-week HLD template, **Days 6 & 7 (Sat/Sun) are design days.**

### 6.2 Resources (`data/resources/<key>.js`)

```js
PrepStackRegister.resources("hld", [
  { title: "…", url: "https://…", kind: "video" },
  …
]);
```

- **`kind` drives sorting priority + the card's icon/accent.** Owner's required order:
  **video → article → book/paper → practice/platform → github.**
- Recognized `kind` values (each gets a leading icon in the UI):
  `video (▶ red accent)`, `article (📄)`, `book (📚)`, `paper (📑)`, `course (🎓)`,
  `practice (🧪)`, `platform (⚙️)`, `tool (🔧)`, `github (💻)`.
- **Deep-link, don't homepage-link.** Prefer a specific video/playlist, a specific
  article, or a named book chapter over a channel/blog root.

### 6.3 Notes (`data/notes/<key>/week<N>.js`)

```js
PrepStackRegister.notes("hld", 2, {
  // Week-level comprehensive recall doc (markdown-ish string). REQUIRED.
  concepts: `# Storage Deep Dive …`,

  // Q&A pairs shown in the "Q & A" subtab. Optional.
  qa: [ { q: "…", a: "…" }, … ],

  // Mock interview questions by tier. Each item is either a string OR {q, a}.
  // {q, a} renders the question with a collapsible "Model answer". Optional.
  mock: {
    easy:   [ { q: "…", a: "…" } ],
    medium: [ … ],
    hard:   [ … ]
  },

  // Per-DAY curated content, keyed by day index (0-based). Optional.
  days: {
    1: { concepts: `# Day 2 — Load Balancing …` },     // learn-day curated ref
    5: { type: "design", prompt: "…",                   // design-drill body
         requirements: ["…","…"], rubric: ["…","…"] }
  }
});
```

**Rules:**
- `concepts` is **recall-grade**: comprehensive, organized with `##`/`###` headings, and
  **includes ASCII flow diagrams** (client→LB→app→cache→DB style) inside ```` ``` ```` fences.
  Target ~800–1500 words. Not a summary. (This is an explicit owner requirement.)
- The "markdown-ish" renderer supports: `#`/`##`/`###`, `**bold**`, `` `code` ``,
  `- bullets`, ```` ``` ```` fenced code blocks, and `| pipe | tables |`. See §8.
- A `days[i]` with `type:"design"` needs `prompt` + `requirements[]` + `rubric[]`.
- A `days[i]` without `type` needs `concepts` (a focused per-day version).

### 6.4 Note (user-created, `notes-repo.js`)

```js
Note = {
  id, schemaVersion: 1,
  source: "manual" | "ai" | "imported",
  trackKey, weekIndex, dayIndex: number|null,   // null = week-level note
  title, body, tags: [string], pinned: boolean,
  aiContext?: { question, answer, model },        // only for source:"ai"
  createdAt, updatedAt
}
```

`schemaVersion` exists so future migrations are explicit. Bump it and handle the old
shape in `NotesRepo` if the schema ever changes.

---

## 7. Feature Subsystems (how each works)

### 7.1 Profiles (`profiles.js`)
- Multiple **local** profiles (NOT authenticated — anyone with the browser sees them).
- Each profile namespaces ALL its data under `prepstack:u:<profileId>:<suffix>`.
- On first boot, migrates legacy un-namespaced keys into a "Default" profile.
- Emits `change`/`created`/`deleted`; `app.js` re-hydrates state on `change`.
- `Profiles.key("notes:v1")` → the current profile's storage key. Everything that
  persists per-user calls this.

### 7.2 Notes repository (`notes-repo.js`)
- Async API even though backed by synchronous localStorage — so a future IndexedDB or
  HTTP backend is a drop-in swap.
- `list(filter)` supports `{trackKey, weekIndex, dayIndex, source, tag, search, pinnedOnly}`.
- Emits `notes:changed` on every mutation → UI reacts via EventBus.
- `exportAll()` / `bulkImport()` power JSON export/import in Settings.

### 7.3 Roadmap + Day Notes (`app.js`)
- Roadmap renders weeks → expandable day lists. Each day shows: checkbox (progress,
  persisted), a 🧩 prefix if `type:"design"`, a 📚 chip if curated day content exists,
  and a 📝 button (with count) opening the **Day Notes modal**.
- Day Notes modal shows, top to bottom: curated content (design-drill card OR curated
  concepts), then the user's personal notes for that exact day, then
  "＋ Add note" and "🤖 Ask Claude / Practice this drill" buttons.

### 7.4 My Notes tab (`app.js`)
- Filters: All / 📌 Pinned / 🤖 From AI. Debounced search box. "＋ New note".
- Cards show source-coded left border, tags, and `W2 · D3` location badge.

### 7.5 AI tutor (`claude.js`)
- On boot, probes `/api/chat`. If present → **proxy mode** (server holds key). Else →
  **direct mode** if a key is in Settings, otherwise **unconfigured**.
- Builds a system prompt from `PrepStack.getCurrentContext()` (current track/week/day).
- Each assistant message gets a "💾 Save as note" button → `NoteFactory.fromAIMessage`.
- `PrepStackAI.seed(text)` opens the panel pre-filled — used by the day-modal
  "Ask Claude / Practice drill" buttons.
- Per-profile API key + model (stored via `Profiles.key`).

### 7.6 Serverless proxy (`api/chat.js`)
- Reads `ANTHROPIC_API_KEY` from env, forwards `{model, system, messages, max_tokens}`
  to `api.anthropic.com`, returns flattened `{ text }`.
- Responds to a `{ping:true}` probe so the frontend can detect proxy mode.

---

## 8. The Markdown-ish Renderer (`app.js` → `renderMarkdownish`)

Curated `concepts` and user note bodies are rendered by a small custom parser. It
supports a **subset** of markdown — know it before authoring content:

| Supported | Not supported |
|---|---|
| `#` `##` `###` headings | Nested lists |
| `**bold**` | `*italic*` / `_italic_` |
| `` `inline code` `` | Links `[x](y)` (write raw URLs) |
| `- bullet` lists | Ordered `1.` lists (rendered as text) |
| ```` ``` ```` fenced code blocks (ASCII diagrams) | Blockquotes |
| `\| pipe \| tables \|` (header + `---` separator + rows) | Images |

**Authoring tips:**
- Diagrams go in fenced code blocks. Box-drawing chars (`┌ ─ ┐ │ ▼ ►`) render fine.
- Tables need the `|---|---|` separator row to be detected.
- Because content lives inside JS **template literals**, escape backticks as `` \` ``
  inside code fences (the data files already do this).

---

## 9. How to Extend PrepStack (recipes)

### 9.1 Add curated content to an existing week
1. Open/create `public/data/notes/<track>/week<N>.js`.
2. Call `PrepStackRegister.notes("<track>", <N>, { concepts, qa, mock, days })`.
3. If the file is new, add `<script src="data/notes/<track>/week<N>.js"></script>` to
   `index.html` (in the notes block, after `data/index.js`).
4. Reload. Done.

### 9.2 Add a design drill to a day
In that week's notes file, add to `days`:
```js
days: {
  5: { type:"design", prompt:"Design X…",
       requirements:["…","…"], rubric:["…","…","…"] }
}
```
And ensure the corresponding day in `tracks/<track>.js` has `type:"design"`.

### 9.3 Add a whole new track
1. `data/tracks/<newkey>.js` → `PrepStackRegister.track("<newkey>", {name, icon, blurb, durations})`.
2. `data/resources/<newkey>.js` → `PrepStackRegister.resources("<newkey>", [...])`.
3. `data/notes/<newkey>/week0.js` → at least Week 1 curated content.
4. Add the 3 (or more) `<script>` tags to `index.html`.
5. The track dropdown, tabs, and all UI pick it up automatically — no `app.js` changes.

### 9.4 Add a new week to a track
1. Extend `durations` in `tracks/<track>.js` (add a week object to the 4/6/8 arrays).
2. Optionally add `data/notes/<track>/week<N>.js` + a `<script>` tag for curated content.

---

## 10. Conventions & Gotchas

- **Load order is load-bearing.** `data/index.js` MUST come before any `data/tracks|resources|notes` file, which MUST come before `app.js`. `profiles.js` before `claude.js`/`app.js` (they call `Profiles.key`).
- **Line endings:** repo is authored LF; Git shows CRLF warnings on Windows — harmless.
- **No secrets in the repo.** The Anthropic key is user-supplied (Settings) or an env var on the host. Never commit a key.
- **Content is authored, not scraped.** When adding notes, write recall-grade prose with diagrams; don't paste summaries.
- **A prior bug worth knowing:** editing large `concepts` strings with tools that
  re-encode text can turn real newlines into literal `\n`. When bulk-authoring, prefer a
  script that writes real newlines, and sanity-check with a brace/`});` structure check.
- **UI simplicity is a hard requirement.** Before adding a control, ask "does this need
  to be always visible, or can it live in a modal/menu?"

---

## 11. Run & Deploy

```bash
# Run locally (either works)
open public/index.html            # simplest; AI proxy probe will 404 (falls back to BYO key)
npx serve public                  # proper static server

# Deploy — Vercel (has serverless AI proxy)
npm i -g vercel && vercel
# then set ANTHROPIC_API_KEY in the Vercel dashboard → redeploy

# Deploy — Netlify
npm i -g netlify-cli && netlify deploy --prod
# set ANTHROPIC_API_KEY in Site settings → Environment variables

# Deploy — GitHub Pages (static only, no AI proxy → BYO key)
# Repo Settings → Pages → Source: main branch, /public folder
```

---

## 12. Current Content Status (as of this doc)

| Track | Curriculum (4/6/8 wk) | Recall-grade weeks authored | Design drills w/ bodies |
|---|---|---|---|
| DSA | ✅ | W1 only | — |
| HLD | ✅ | W1–W5 (+ some per-day) | HLD 6-wk Sat/Sun |
| LLD | ✅ | W1 only | — |
| AI/ML | ✅ | W1, W2, W4, W5 | W1, W4, W5 Sat/Sun |
| Agentic AI | ✅ | W1–W4 | W1, W2, W4 Sat/Sun |
| AlgoTrading | ✅ | W1 only | — |

**Open work** (good first tasks for a new contributor/AI):
- Fill recall-grade `concepts` for the remaining weeks of each track (DSA W2+, LLD W2+,
  AI/ML W3/W6, Agents W5/W6, AlgoTrading W2+).
- Author design-drill bodies for AlgoTrading and remaining tracks' Sat/Sun days.
- Deep-link resources (video→article→chapter) for DSA, AI/ML, Agents, AlgoTrading
  (HLD + LLD already done).
- Optional: per-day `link` audit so each roadmap day points to the single best resource.

---

## 13. Design Philosophy (why it's built this way)

1. **Content scales by adding files, not editing a monolith.** The registry pattern +
   per-week files mean a contributor touches exactly one file to add a week, and git
   diffs stay scoped.
2. **Storage is swappable.** The Repository + namespaced-keys design means moving from
   localStorage to a real backend later touches one module, not the UI.
3. **The UI stays quiet.** Progressive disclosure over dense chrome. This is a repeated,
   explicit owner preference — respect it.
4. **The AI is a helper, not a dependency.** Everything works with the AI panel disabled;
   the tutor augments, it isn't required.

---

*This document is the single source of truth for onboarding. If you change architecture,
update this file in the same commit.*