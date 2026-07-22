# PrepStack — Tech Stack & Workflow (Interview Guide)

> **What this document is for.** A talk-track for explaining PrepStack in an interview —
> *what it is, what each piece of the stack does, why it's there, and how a request flows
> end to end.* Read top-to-bottom once and you can whiteboard the whole system from memory.
> For deep contributor details (schemas, hard rules) see the *Architecture & Contributor
> Guide*; this doc stays at the "explain it out loud" altitude.

---

## 0. The 30-second pitch

> "PrepStack is a **personal interview-prep planner**. It pairs a multi-week study roadmap
> with curated recall-grade notes, design drills, personal note-taking, and an optional
> Claude AI tutor. I built it deliberately as a **zero-build, framework-free static web app**
> — pure HTML/CSS/vanilla JS — with **content treated as data** so the whole thing scales by
> dropping in files, not editing a monolith. The only server-side piece is a **thin
> serverless proxy** that hides the AI API key. It runs from a plain `file://`, a static
> host, or a Node server — the same codebase, three deploy targets."

Three sentences of *why it's interesting*:
1. **Layered architecture in vanilla JS** — Repository, Factory, Observer, Registry patterns, no framework.
2. **Content-as-data / plugin registry** — adding a track or a week touches one file, zero controller changes.
3. **Swappable everything** — storage layer and AI transport are both drop-in replaceable behind stable interfaces.

---

## 1. The tech stack at a glance

| Layer | Technology | Role in one line |
|---|---|---|
| **Frontend runtime** | Vanilla JS (ES2019+), no framework, no bundler | The entire app UI + logic — deliberately buildless |
| **Markup / entry** | Single `index.html` | One entry point; owns `<script>` load order |
| **Styling** | One `styles.css`, CSS custom properties | Theming (light/dark), reading mode, all components |
| **Client persistence** | Browser `localStorage` | Per-profile storage for notes, progress, settings |
| **Content** | Plain `.js` data files under `public/data/**` | The curriculum + notes, self-registering into globals |
| **AI** | Anthropic Messages API (Claude) | The optional tutor; called direct or via proxy |
| **Backend (optional)** | Node.js + Express (`server.js`) | Serves static files + proxies `/api/chat` |
| **Serverless (optional)** | `api/chat.js` (Vercel / Netlify function) | Same proxy, function-shaped, key kept server-side |
| **Tooling** | Python (`scripts/convert_artifacts.py`) | One-off content authoring helper, not runtime |
| **Hosting** | Render / Vercel / Netlify / GitHub Pages | Four targets, one codebase |
| **Config** | `package.json`, `render.yaml`, `vercel.json`, `netlify.toml` | Declares run/build/deploy per host |

**The single most important design decision:** *no build step and no framework.* Everything
below is a consequence of that choice.

---

## 2. Each technology — role, why it's here, what it provides

### 2.1 Vanilla JavaScript (no framework, no bundler)
- **Role:** the entire application — state, rendering, event handling, AI integration.
- **Why chosen:** must run from a raw `file://` open *and* a static server with **zero
  install and zero build**. A framework (React/Vue) would force a bundler, a toolchain, and
  a `node_modules` — all of which contradict the "open the file and it works" goal.
- **What it provides:** portability and longevity. No dependency rot, no build breakage, and
  anyone can read the source with no transpilation between what's written and what runs.
- **Interview talking point:** *"Choosing 'no framework' was a constraint I imposed to keep
  the app honest — I had to re-implement the useful parts of a framework (a pub/sub bus, a
  repository, a registry) explicitly, which is exactly what makes the architecture legible."*

### 2.2 `index.html` — the single entry point
- **Role:** the one HTML file; it hosts the UI shell and, crucially, **declares script load
  order** (`event-bus → profiles → notes-repo → claude → data registries → content → app.js`).
- **Why chosen:** with no module bundler, load order *is* the dependency graph. Making it
  explicit and centralized in one file keeps it debuggable.
- **What it provides:** deterministic init — lower layers exist on `window` before higher
  layers use them.

### 2.3 `styles.css` + CSS custom properties
- **Role:** all styling in one stylesheet; theming via CSS variables toggled by
  `data-theme` (light/dark) and `data-read-mode` attributes on the root.
- **Why chosen:** theming without a CSS-in-JS library or preprocessor — flip one attribute,
  the variable cascade repaints the app.
- **What it provides:** instant theme + reading-mode switching, and a single place to reason
  about visual design.

### 2.4 `localStorage` — client-side persistence
- **Role:** stores everything per-user — notes, day-progress checkboxes, settings, AI key/model.
- **Why chosen:** no backend required for the core product; the data is personal and small.
- **What it provides:** offline-first persistence with a ~5 MB budget.
- **Key detail:** every key is **namespaced** as `prepstack:u:<profileId>:<suffix>` so
  multiple local profiles never collide — a multi-tenant-safe scheme on a single-user store.
- **Deliberate limitation to name in an interview:** it's *local and unauthenticated* —
  anyone on that browser sees the profiles. The Repository pattern (below) is what makes
  upgrading past this a one-module change.

### 2.5 Content-as-data files (`public/data/**`)
- **Role:** the curriculum and curated notes live as plain `.js` files that **self-register**
  into global registries (`TRACKS`, `RESOURCES`, `NOTES`) via `PrepStackRegister`.
- **Why chosen:** content changes far more often than code. Keeping content *out* of the
  controller means git diffs stay scoped and non-engineers can contribute a week of notes.
- **What it provides:** a **plugin model** — drop a file, add one `<script>` tag, and the
  dropdown/tabs/roadmap pick it up with **no `app.js` changes**.
- **Interview talking point:** *"This is the Registry pattern. Each content file is a plugin
  that registers itself; the core never enumerates content, it just reads the registries."*

### 2.6 Anthropic Messages API (Claude) — the AI tutor
- **Role:** an optional in-app tutor that answers with awareness of the current
  track/week/day, and whose answers can be saved as notes.
- **Why chosen:** augments study without becoming a hard dependency — the app is fully
  functional with AI disabled.
- **What it provides:** two transport modes behind one UI — **direct** (browser sends a
  user-pasted key) or **proxy** (server holds the key). The frontend probes `/api/chat` on
  boot and auto-selects the mode.
- **Model:** defaults to `claude-sonnet-5` server-side; the `anthropic-version` header pins
  the API contract.

### 2.7 Node.js + Express (`server.js`) — the optional backend
- **Role:** for full-server hosts (Render). Serves the static `public/` folder **and**
  exposes `POST /api/chat`, plus an SPA-style catch-all that returns `index.html`.
- **Why chosen:** one process that does static hosting + the AI proxy, so Render needs no
  extra config beyond `npm start`.
- **What it provides:** the key-hiding proxy in a long-running server form. It shares its
  core logic with the serverless function via `api/_lib.js` (`callAnthropic`).

### 2.8 Serverless function (`api/chat.js`) — the optional proxy
- **Role:** the same AI proxy, shaped as a Vercel/Netlify function (it exports **both** a
  Vercel `(req,res)` handler and a Netlify `handler(event)` — one file, two platforms).
- **Why chosen:** on static hosts there's no long-running server, so the proxy has to be a
  function. Sharing `_lib.js` means the proxy logic is written **once**.
- **What it provides:** server-side key custody without running a full server, plus a
  `{ping:true}` probe endpoint the frontend uses to detect proxy mode.
- **Detail worth mentioning:** `_lib.js` is underscore-prefixed so Vercel/Netlify **don't
  expose it as a route** — it's shared code, not an endpoint.

### 2.9 Python helper (`scripts/convert_artifacts.py`) — authoring tool
- **Role:** a build-time-*optional*, offline authoring aid that converts note artifacts into
  the `data/notes/**` card format.
- **Why chosen:** bulk-authoring recall cards by hand is error-prone; a script writes real
  newlines and correct structure.
- **What it provides:** faster content creation — but it is **not part of the runtime**; the
  app never depends on Python.

### 2.10 Hosting + config files
- **`render.yaml`** — Render web service: Node runtime, `npm install` → `npm start`,
  `ANTHROPIC_API_KEY` as an unsynced (secret) env var. *Full app + AI proxy.*
- **`vercel.json`** — rewrites everything except `/api/*` to `/public`. *Static + serverless AI.*
- **`netlify.toml`** — publishes `public/`, maps `/api/chat` → a Netlify function. *Static + serverless AI.*
- **GitHub Pages** — serve `public/` only. *Static; AI falls back to a user-pasted key.*
- **What this provides:** one repo, four deploy targets, graceful degradation of the AI
  feature depending on whether a server is present.

---

## 3. Architecture — the layered view

Even though it's vanilla JS, PrepStack is cleanly layered so content and storage scale
without rewriting the UI:

```
┌──────────────────────────────────────────────────────────────┐
│  UI            index.html + app.js render functions            │
│                (roadmap · notes · resources · my-notes · modals│
│                 · AI panel)                                     │
├──────────────────────────────────────────────────────────────┤
│  Application   app.js controller: state object, event          │
│                handlers, tab/modal orchestration               │
├──────────────────────────────────────────────────────────────┤
│  Domain        NoteFactory (Factory) · Profile/Note entities   │
├──────────────────────────────────────────────────────────────┤
│  Messaging     EventBus (Observer / pub-sub)                   │
├──────────────────────────────────────────────────────────────┤
│  Storage       NotesRepo (Repository, async API)               │
│                Profiles (namespaced localStorage)              │
│                → today: localStorage                           │
│                → swappable to IndexedDB / HTTP backend later    │
├──────────────────────────────────────────────────────────────┤
│  Content       window.TRACKS / RESOURCES / NOTES               │
│                populated by data/** via PrepStackRegister      │
└──────────────────────────────────────────────────────────────┘
```

### Design patterns (and the one-liner to say for each)
| Pattern | Where | Say this |
|---|---|---|
| **Repository** | `NotesRepo` | "Async CRUD interface over storage; the UI never touches `localStorage` for notes. Swap the backend by rewriting one module." |
| **Factory** | `NoteFactory.manual()` / `.fromAIMessage()` | "Constructs schema-correct Note objects with source-specific defaults, so callers can't build invalid notes." |
| **Observer / pub-sub** | `EventBus` | "Writers `emit('notes:changed')`; renderers subscribe. Decouples who mutates data from who repaints." |
| **Registry** | `PrepStackRegister` | "Each content file self-registers. Adding content is additive — no central list to edit." |
| **Namespaced storage** | `Profiles.key()` | "Every key is `prepstack:u:<profileId>:<suffix>` — profiles are isolated, multi-tenant-safe on one store." |

---

## 4. Workflow — how a request flows end to end

### 4.1 Cold boot (page load)
```
Browser loads index.html
   │  scripts run in declared order:
   ├─ event-bus.js  → window.EventBus
   ├─ profiles.js   → window.Profiles  (picks/creates current profile, migrates legacy keys)
   ├─ notes-repo.js → window.NotesRepo + NoteFactory
   ├─ claude.js     → window.PrepStackAI  (not connected yet)
   ├─ data/index.js → window.PrepStackRegister
   ├─ data/**       → each file self-registers into TRACKS / RESOURCES / NOTES
   └─ app.js        → reads registries + current profile, renders roadmap/tabs
                      PrepStackAI.init() probes /api/chat → sets AI mode
```

### 4.2 User writes a note (the Repository + Observer loop)
```
User clicks "＋ Add note" in the Day Notes modal
   → app.js calls NoteFactory.manual({...})        (Factory builds a valid Note)
   → NotesRepo.create(note)                         (Repository persists to localStorage,
                                                      under Profiles.key(...))
   → NotesRepo emits EventBus 'notes:changed'       (Observer)
   → app.js subscribers re-render: notes list, badge counts, open modal
```
*Point to make:* the click handler never knows about `localStorage`, and the renderer never
knows who triggered the change — the EventBus sits between them.

### 4.3 Asking the AI tutor (two transport modes, one UI)
```
On boot: PrepStackAI probes GET/ping /api/chat
   ├─ 200 → PROXY MODE   (a server/function is present; it holds the key)
   └─ 404 → DIRECT MODE  (no server; use the user-pasted key from Settings)
                          └─ if no key → UNCONFIGURED (panel prompts for a key)

User asks a question:
   app.js builds system prompt from PrepStack.getCurrentContext() (track/week/day)
      │
      ├─ PROXY MODE:  browser → POST /api/chat → server.js OR api/chat.js
      │                         → api/_lib.js callAnthropic() → api.anthropic.com
      │                         → returns flattened { text }
      │
      └─ DIRECT MODE: browser → api.anthropic.com directly (x-api-key = user key)
      │
   Response renders in the panel with a "💾 Save as note" button
      → NoteFactory.fromAIMessage(...) → NotesRepo.create(...) → EventBus → re-render
```
*Key security point:* in proxy mode the Anthropic key **never reaches the browser** — it
lives in an env var on the host, and `_lib.js` reads it server-side.

### 4.4 Adding content (the contributor workflow)
```
Add a week of notes:
   1. create public/data/notes/<track>/week<N>.js
        → PrepStackRegister.notes("<track>", <N>, { concepts, qa, mock, days })
   2. add one <script> tag to index.html
   3. reload → roadmap + notes tab show it. Zero app.js changes.

Add a whole track: drop tracks/<key>.js + resources/<key>.js + notes files,
   add script tags → dropdown/tabs pick it up automatically.
```

---

## 5. Deployment topology (one codebase → four targets)

```
                         ┌─────────────── same repo ───────────────┐
                         │                                          │
   GitHub Pages          Vercel / Netlify                Render (Node)
   ────────────          ────────────────                ─────────────
   serves public/        serves public/  +               server.js serves public/
   STATIC only           api/chat.js (serverless fn)     + /api/chat route
                         via _lib.js                      via _lib.js
        │                       │                               │
   AI = DIRECT mode        AI = PROXY mode                 AI = PROXY mode
   (user pastes key)       (key in host env)               (key in host env)
```

The AI feature **degrades gracefully**: with a server → key-hiding proxy; without one →
user-supplied key; with neither → everything except the tutor still works.

---

## 6. Likely interview questions (with crisp answers)

**Q: Why no framework?**
> To guarantee zero-build portability — it runs from `file://` and any static host. The
> tradeoff is I hand-rolled the framework-shaped parts (EventBus, Repository, Registry),
> which I consider a feature: the architecture is explicit, not hidden in a library.

**Q: How would you move off `localStorage` to a real backend?**
> Rewrite only `notes-repo.js`. The UI already talks to an **async** Repository interface,
> so swapping `localStorage` for `fetch()` calls or IndexedDB is a single-module change —
> no controller or render code moves.

**Q: How is the AI key protected?**
> In proxy mode the key lives in a host env var and is only read server-side in
> `api/_lib.js`. The browser calls `/api/chat`; the server injects the key and forwards to
> Anthropic. The key never ships to the client. Direct mode (user's own key) exists only for
> pure-static hosting where there's no server.

**Q: How do you avoid duplicating the proxy logic across Render and serverless?**
> Both `server.js` and `api/chat.js` import `callAnthropic` from `api/_lib.js`. One
> implementation, two entry shapes (a long-running Express route and a function handler).

**Q: How does content scale?**
> Registry pattern. Each content file self-registers into global registries; the core reads
> registries and never maintains a manifest. Adding a week or a whole track is additive —
> one file plus one `<script>` tag — so diffs stay scoped and merge-safe.

**Q: What's the multi-profile design?**
> Every persisted key is namespaced `prepstack:u:<profileId>:<suffix>` via `Profiles.key()`.
> Profiles are isolated on a single `localStorage`. It's local and unauthenticated by design
> — the Repository seam is where real auth/backend would slot in later.

**Q: Biggest limitations you'd call out?**
> (1) Local, unauthenticated storage — fine for a personal tool, not for shared/multi-device
> use. (2) `localStorage` ~5 MB cap. (3) Load-order coupling from having no bundler. All
> three are consequences of the zero-build constraint, and each has a clear upgrade path
> (backend Repository, IndexedDB, or a bundler) that doesn't require an architecture rewrite.

---

## 7. One-paragraph summary to memorize

> "PrepStack is a zero-build, framework-free static web app for interview prep. The frontend
> is layered vanilla JS using Repository, Factory, Observer, and Registry patterns; content
> is data — self-registering `.js` files — so it scales by adding files, not editing code.
> Persistence is namespaced `localStorage` behind an async Repository, so a real backend is a
> one-module swap. The only server-side code is a thin AI proxy, written once in `_lib.js` and
> reused by both an Express server (Render) and a serverless function (Vercel/Netlify), which
> hides the Anthropic key. Same repo deploys four ways, and the AI tutor degrades gracefully
> when no server is present."
