// Controller: state, rendering, event wiring for the topic-centric model. window.PrepStack
// Track → Module → Topic → Lesson. Content comes from window.PrepStackModel.build(trackKey).
(function () {
  const STATE_SUFFIX = "ui-state:v2";
  const PROGRESS_SUFFIX = "progress:v2";
  const KIND_ICON = {
    video: "▶", article: "📄", book: "📚", paper: "📑", course: "🎓",
    practice: "🧪", platform: "⚙️", tool: "🔧", github: "💻", docs: "📘", roadmap: "🗺️"
  };

  let state = {
    trackKey: "hld",
    activeTab: "roadmap",     // roadmap | my-notes | resources
    selectedTopicId: null,    // when set, roadmap tab shows the topic view
    topicSubTab: "concepts",  // concepts | resources | qa | practice | my-notes
    theme: "light",
    readMode: false,
    myNotesFilter: "all",
    myNotesSearch: "",
    expandedModules: {},      // moduleId -> bool
    modal: null
  };
  let progress = {};          // { topic: { track: { topicId: {read, lessons:{}} } } }
  let notesCache = [];
  let searchDebounce = null;
  let _model = null;          // per-render cache

  // ---------- persistence ----------
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(Profiles.key(STATE_SUFFIX)));
      if (saved) Object.assign(state, saved, { modal: null });
    } catch { /* ignore */ }
  }
  function saveState() {
    const { modal, ...persisted } = state;
    localStorage.setItem(Profiles.key(STATE_SUFFIX), JSON.stringify(persisted));
  }
  function loadProgress() {
    try { progress = JSON.parse(localStorage.getItem(Profiles.key(PROGRESS_SUFFIX))) || {}; }
    catch { progress = {}; }
  }
  function saveProgress() {
    localStorage.setItem(Profiles.key(PROGRESS_SUFFIX), JSON.stringify(progress));
  }

  // ---------- progress (topic-based) ----------
  function topicProg(trackKey, topicId) {
    return progress?.topic?.[trackKey]?.[topicId] || { read: false, lessons: {} };
  }
  function ensureTopicProg(trackKey, topicId) {
    progress.topic = progress.topic || {};
    progress.topic[trackKey] = progress.topic[trackKey] || {};
    progress.topic[trackKey][topicId] = progress.topic[trackKey][topicId] || { read: false, lessons: {} };
    return progress.topic[trackKey][topicId];
  }
  function toggleTopicRead(trackKey, topicId) {
    const p = ensureTopicProg(trackKey, topicId);
    p.read = !p.read;
    saveProgress();
  }
  function toggleLesson(trackKey, topicId, lessonIdx, total) {
    const p = ensureTopicProg(trackKey, topicId);
    p.lessons[lessonIdx] = !p.lessons[lessonIdx];
    // Auto-mark read when all lessons done.
    if (Object.values(p.lessons).filter(Boolean).length >= total) p.read = true;
    saveProgress();
  }
  function isTopicDone(trackKey, topicId) { return !!topicProg(trackKey, topicId).read; }
  function moduleStats(mod) {
    const total = mod.topics.length;
    const done = mod.topics.filter((t) => isTopicDone(state.trackKey, t.id)).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function trackStats() {
    const m = model();
    let total = 0, done = 0;
    (m?.modules || []).forEach((mod) => { total += mod.topics.length; done += mod.topics.filter((t) => isTopicDone(state.trackKey, t.id)).length; });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  // ---------- model access ----------
  function model() { return _model || (_model = window.PrepStackModel.build(state.trackKey)); }
  function findTopic(id) {
    const m = model();
    for (const mod of (m?.modules || [])) {
      const t = mod.topics.find((x) => x.id === id);
      if (t) return { module: mod, topic: t };
    }
    return null;
  }
  function getCurrentContext() {
    const m = model();
    const found = state.selectedTopicId ? findTopic(state.selectedTopicId) : null;
    return {
      trackKey: state.trackKey,
      trackName: m?.name,
      weekTitle: found?.module?.title,
      dayName: found?.topic?.title,
      topicId: found?.topic?.id,
      topicTitle: found?.topic?.title
    };
  }

  // ---------- markdown-ish renderer ----------
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function inlineMd(text) {
    let t = escapeHtml(text);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return t;
  }
  function renderMarkdownish(src) {
    if (!src) return "";
    const lines = String(src).replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let i = 0;
    let inList = false;
    const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
    const isSepRow = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l || "");
    const splitRow = (l) => {
      const cells = l.split("|").map((c) => c.trim());
      if (cells[0] === "") cells.shift();
      if (cells[cells.length - 1] === "") cells.pop();
      return cells;
    };
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim().startsWith("```")) {
        closeList();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) { codeLines.push(lines[i]); i++; }
        i++;
        html += `<pre class="code-block"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
        continue;
      }
      if (line.includes("|") && isSepRow(lines[i + 1])) {
        closeList();
        const header = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|")) { rows.push(splitRow(lines[i])); i++; }
        html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>' +
          header.map((c) => `<th>${inlineMd(c)}</th>`).join("") + "</tr></thead><tbody>" +
          rows.map((r) => "<tr>" + r.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>").join("") +
          "</tbody></table></div>";
        continue;
      }
      const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
      if (hMatch) {
        closeList();
        const level = Math.min(hMatch[1].length + 1, 5);
        html += `<h${level} class="md-h">${inlineMd(hMatch[2])}</h${level}>`;
        i++;
        continue;
      }
      const bMatch = line.match(/^\s*-\s+(.*)$/);
      if (bMatch) {
        if (!inList) { html += '<ul class="md-list">'; inList = true; }
        html += `<li>${inlineMd(bMatch[1])}</li>`;
        i++;
        continue;
      }
      closeList();
      if (line.trim() === "") { i++; continue; }
      if (/^-{3,}$/.test(line.trim())) { html += "<hr />"; i++; continue; }
      html += `<p>${inlineMd(line)}</p>`;
      i++;
    }
    closeList();
    return html;
  }

  // ---------- rendering ----------
  const $app = () => document.getElementById("app");
  const $modalRoot = () => document.getElementById("modal-root");

  function render() {
    _model = null; // rebuild model fresh each render (content may enrich)
    saveState();
    $app().innerHTML = renderHeader() + renderTabs() + renderTabContent();
    $modalRoot().innerHTML = renderModal();
  }

  function ring(pct, size) {
    const s = size || 34, r = s / 2 - 3, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<svg class="ps-ring" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="ps-ring-bg"/>
      <circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="ps-ring-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
      <text x="50%" y="50%" class="ps-ring-txt" dominant-baseline="central" text-anchor="middle">${pct}%</text>
    </svg>`;
  }

  function renderHeader() {
    const tracks = Object.keys(TRACKS);
    const m = model();
    const profiles = Profiles.list();
    const cur = Profiles.current();
    const ts = trackStats();
    return `
      <header class="ps-header">
        <div class="ps-brand">
          <span class="ps-logo">📚</span>
          <span class="ps-title">PrepStack</span>
        </div>
        <div class="ps-header-controls">
          <select data-action="change-track" class="ps-select">
            ${tracks.map((k) => `<option value="${k}" ${k === state.trackKey ? "selected" : ""}>${TRACKS[k].icon} ${TRACKS[k].name}</option>`).join("")}
          </select>
          <select data-action="switch-profile" class="ps-select">
            ${profiles.map((p) => `<option value="${p.id}" ${p.id === cur?.id ? "selected" : ""}>${p.emoji} ${p.name}</option>`).join("")}
          </select>
          <button class="ps-icon-btn" data-action="toggle-theme" title="Toggle theme">${state.theme === "dark" ? "☀️" : "🌙"}</button>
          <button class="ps-icon-btn" data-action="toggle-read-mode" title="Reading mode">${state.readMode ? "📖" : "📄"}</button>
          <button class="ps-icon-btn" data-action="open-settings" title="Settings">⚙️</button>
        </div>
        ${m ? `<div class="ps-track-summary">
          <p class="ps-blurb">${escapeHtml(m.blurb || "")}</p>
          <div class="ps-track-progress">${ring(ts.pct, 40)}<span>${ts.done}/${ts.total} topics</span></div>
        </div>` : ""}
      </header>`;
  }

  function renderTabs() {
    const myCount = notesCache.filter((n) => n.trackKey === state.trackKey).length;
    const tabs = [
      { id: "roadmap", label: "🗺️ Roadmap" },
      { id: "my-notes", label: `🗒️ My Notes${myCount ? ` (${myCount})` : ""}` },
      { id: "resources", label: "🔗 Resources" }
    ];
    return `<nav class="ps-tabs">${tabs
      .map((t) => `<button class="ps-tab ${state.activeTab === t.id ? "active" : ""}" data-action="change-tab" data-tab="${t.id}">${t.label}</button>`)
      .join("")}</nav>`;
  }

  function renderTabContent() {
    if (state.activeTab === "roadmap") return state.selectedTopicId ? renderTopicView() : renderRoadmap();
    if (state.activeTab === "my-notes") return renderMyNotesTab();
    if (state.activeTab === "resources") return renderResourcesTab();
    return "";
  }

  // ---------- roadmap: modules → topics ----------
  function renderRoadmap() {
    const m = model();
    if (!m || !m.modules.length) return `<div class="ps-empty">No curriculum yet for this track.</div>`;
    const lastId = progress?.lastTopic?.[state.trackKey];
    const last = lastId ? findTopic(lastId) : null;
    const resumeBar = last
      ? `<div class="ps-resume ps-animate-in">
          <span class="ps-resume-label">Pick up where you left off</span>
          <button class="ps-btn ps-btn-primary" data-action="open-topic" data-topic="${last.topic.id}">▶ Continue: ${escapeHtml(last.topic.title)}</button>
        </div>`
      : "";
    return resumeBar + `<div class="ps-roadmap ps-animate-in">${m.modules
      .map((mod, mi) => {
        const st = moduleStats(mod);
        const expanded = state.expandedModules[mod.id] !== false; // default open
        return `
        <section class="ps-module ${expanded ? "expanded" : ""}" style="--i:${mi}">
          <button class="ps-module-header" data-action="toggle-module" data-module="${mod.id}">
            <span class="ps-module-caret">▸</span>
            <span class="ps-module-title">${escapeHtml(mod.title)}</span>
            <span class="ps-module-blurb">${escapeHtml(mod.blurb || "")}</span>
            <span class="ps-module-stat">${ring(st.pct, 30)}</span>
          </button>
          <div class="ps-topic-grid" ${expanded ? "" : 'style="display:none"'}>
            ${mod.topics.map((t, ti) => {
              const done = isTopicDone(state.trackKey, t.id);
              const noteCount = notesCache.filter((n) => n.trackKey === state.trackKey && n.topicId === t.id).length;
              return `
              <button class="ps-topic-card ${done ? "done" : ""}" data-action="open-topic" data-topic="${t.id}" style="--i:${ti}">
                <span class="ps-topic-check">${done ? "✓" : ""}</span>
                <span class="ps-topic-title">${escapeHtml(t.title)}</span>
                <span class="ps-topic-meta">
                  <span class="chip">${t.size} lesson${t.size > 1 ? "s" : ""}</span>
                  ${noteCount ? `<span class="chip chip-note">🗒️ ${noteCount}</span>` : ""}
                </span>
              </button>`;
            }).join("")}
          </div>
        </section>`;
      })
      .join("")}</div>`;
  }

  // ---------- topic view ----------
  function renderTopicView() {
    const found = findTopic(state.selectedTopicId);
    if (!found) { state.selectedTopicId = null; return renderRoadmap(); }
    const { module: mod, topic } = found;
    const done = isTopicDone(state.trackKey, topic.id);
    const prog = topicProg(state.trackKey, topic.id);

    const resources = (topic.resources.length ? topic.resources : topic.moduleResources) || [];
    const qa = (topic.qa.length ? topic.qa : topic.moduleQa) || [];
    const practice = (topic.practice.length ? topic.practice : topic.modulePractice) || [];
    const myNotes = notesCache.filter((n) => n.trackKey === state.trackKey && n.topicId === topic.id);

    const subtabs = [
      { id: "concepts", label: "📖 Concepts" },
      { id: "resources", label: `▶ Resources${resources.length ? ` (${resources.length})` : ""}` },
      { id: "qa", label: `❓ Q & A${qa.length ? ` (${qa.length})` : ""}` },
      { id: "practice", label: `🧪 Practice${practice.length ? ` (${practice.length})` : ""}` },
      { id: "my-notes", label: `🗒️ My Notes${myNotes.length ? ` (${myNotes.length})` : ""}` }
    ];
    const sub = subtabs.some((s) => s.id === state.topicSubTab) ? state.topicSubTab : "concepts";

    const sections = (topic.lessonSections && topic.lessonSections.length)
      ? topic.lessonSections
      : [{ title: "Overview", concepts: topic.concepts }];
    const firstUnfinished = sections.findIndex((_, i) => !prog.lessons[i]);
    const openIdx = firstUnfinished === -1 ? sections.length - 1 : firstUnfinished;

    let body = "";
    if (sub === "concepts") {
      const planBlock = topic.modulePlan ? `<details class="ps-plan"><summary>📋 Study plan for this module</summary><div>${renderMarkdownish(topic.modulePlan)}</div></details>` : "";
      body = planBlock + `<div class="ps-lesson-list">${sections.map((s, i) => {
        const doneL = !!prog.lessons[i];
        return `
        <details class="ps-lesson-sec ${doneL ? "done" : ""} ps-animate-in" ${i === openIdx ? "open" : ""} style="--i:${i}">
          <summary>
            <span class="ps-lesson-badge">L${i + 1}</span>
            <span class="ps-lesson-name">${escapeHtml(s.title)}</span>
            <button class="ps-lesson-toggle" data-action="toggle-lesson" data-topic="${topic.id}" data-lesson="${i}" data-total="${sections.length}" title="Mark lesson done">${doneL ? "✅" : "◻"}</button>
          </summary>
          <div class="ps-concepts">${renderMarkdownish(s.concepts)}</div>
        </details>`;
      }).join("")}</div>`;
    } else if (sub === "resources") {
      body = resources.length
        ? `<ul class="ps-resource-list">${resources.map((r) => `
            <li class="ps-resource ps-animate-in">
              <span class="ps-resource-kind">${KIND_ICON[r.type] || "🔗"}</span>
              <a href="${escapeHtml(r.link)}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a>
              ${r.by ? `<span class="ps-resource-by">— ${escapeHtml(r.by)}</span>` : ""}
            </li>`).join("")}</ul>`
        : `<div class="ps-empty">No resources yet.</div>`;
    } else if (sub === "qa") {
      body = qa.length
        ? `<div class="ps-qa-list">${qa.map((x) => `<details class="ps-qa-item ps-animate-in"><summary>${escapeHtml(x.q)}</summary><div>${renderMarkdownish(x.a)}</div></details>`).join("")}</div>`
        : `<div class="ps-empty">No Q&amp;A yet.</div>`;
    } else if (sub === "practice") {
      body = practice.length
        ? `<div class="ps-qa-list">${practice.map((x, idx) => {
            const q = typeof x === "string" ? x : x.q;
            const a = typeof x === "string" ? "" : x.a;
            return `<details class="ps-qa-item ps-practice ps-animate-in"><summary><span class="ps-practice-num">${idx + 1}</span>${escapeHtml(q)}</summary>${a ? `<div>${renderMarkdownish(a)}</div>` : ""}</details>`;
          }).join("")}</div>`
        : `<div class="ps-empty">No practice questions yet.</div>`;
    } else if (sub === "my-notes") {
      body = `
        <div class="ps-modal-actions" style="margin-bottom:1rem">
          <button class="ps-btn ps-btn-primary" data-action="new-note-for-topic" data-topic="${topic.id}">＋ Add note</button>
          <button class="ps-btn" data-action="ask-claude-topic" data-topic="${topic.id}">🤖 Ask ${escapeHtml(PrepStackAI.getProviderLabels()[PrepStackAI.getActiveProvider()] || "AI")}</button>
        </div>
        ${myNotes.length ? `<div class="ps-note-cards">${myNotes.map(renderNoteCard).join("")}</div>` : `<div class="ps-empty">No notes for this topic yet.</div>`}`;
    }

    const lessonsDone = sections.filter((_, i) => prog.lessons[i]).length;
    const lessonPct = Math.round((lessonsDone / sections.length) * 100);
    return `
      <div class="ps-topic-view ps-animate-in">
        <div class="ps-breadcrumb">
          <button class="ps-link" data-action="back-to-roadmap">← ${escapeHtml(model().name.split("—")[0].trim())}</button>
          <span class="ps-crumb-sep">/</span>
          <span class="ps-crumb">${escapeHtml(mod.title)}</span>
        </div>
        <div class="ps-topic-head">
          <h1 class="ps-topic-h1">${escapeHtml(topic.title)}</h1>
          <button class="ps-btn ${done ? "ps-btn-done" : "ps-btn-primary"}" data-action="toggle-topic-read" data-topic="${topic.id}">
            ${done ? "✅ Completed" : "◻ Mark complete"}
          </button>
        </div>
        <div class="ps-lesson-bar" title="${lessonsDone} of ${sections.length} lessons done">
          <div class="ps-lesson-bar-fill" style="width:${lessonPct}%"></div>
          <span class="ps-lesson-bar-txt">${lessonsDone}/${sections.length} lessons</span>
        </div>
        <nav class="ps-subtabs">${subtabs
          .map((t) => `<button class="ps-subtab ${sub === t.id ? "active" : ""}" data-action="change-topic-subtab" data-subtab="${t.id}">${t.label}</button>`)
          .join("")}</nav>
        <div class="ps-topic-body">${body}</div>
        ${renderTopicPagerNav(topic.id)}
      </div>`;
  }

  // Prev/next topic navigation (flattened across modules, in roadmap order).
  function renderTopicPagerNav(topicId) {
    const flat = [];
    (model()?.modules || []).forEach((mod) => mod.topics.forEach((t) => flat.push({ mod, t })));
    const idx = flat.findIndex((x) => x.t.id === topicId);
    if (idx === -1) return "";
    const prev = flat[idx - 1];
    const next = flat[idx + 1];
    const cell = (item, dir) => item
      ? `<button class="ps-pager ps-pager-${dir}" data-action="open-topic" data-topic="${item.t.id}">
           <span class="ps-pager-dir">${dir === "prev" ? "← Previous" : "Next →"}</span>
           <span class="ps-pager-title">${escapeHtml(item.t.title)}</span>
           <span class="ps-pager-mod">${escapeHtml(item.mod.title)}</span>
         </button>`
      : `<span class="ps-pager ps-pager-empty">${dir === "prev" ? "Start of track" : "🎉 End of track"}</span>`;
    return `<nav class="ps-pager-nav ps-animate-in">${cell(prev, "prev")}<span class="ps-pager-pos">${idx + 1} / ${flat.length}</span>${cell(next, "next")}</nav>`;
  }

  // ---------- my notes ----------
  function renderMyNotesTab() {
    const filters = [
      { id: "all", label: "All" },
      { id: "pinned", label: "📌 Pinned" },
      { id: "ai", label: "🤖 From AI" }
    ];
    const filtered = notesCache
      .filter((n) => (state.myNotesFilter === "pinned" ? n.pinned : state.myNotesFilter === "ai" ? n.source === "ai" : true))
      .filter((n) => {
        if (!state.myNotesSearch) return true;
        const q = state.myNotesSearch.toLowerCase();
        return `${n.title}\n${n.body}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return `
      <div class="ps-my-notes ps-animate-in">
        <div class="ps-my-notes-toolbar">
          <div class="ps-filter-group">${filters
            .map((f) => `<button class="ps-pill ${state.myNotesFilter === f.id ? "active" : ""}" data-action="change-notes-filter" data-filter="${f.id}">${f.label}</button>`)
            .join("")}</div>
          <input class="ps-search" type="search" placeholder="Search notes…" value="${escapeHtml(state.myNotesSearch)}" data-action="search-notes" />
          <button class="ps-btn ps-btn-primary" data-action="new-note">＋ New note</button>
        </div>
        ${filtered.length === 0 ? `<div class="ps-empty">No notes yet.</div>` : `<div class="ps-note-cards">${filtered.map(renderNoteCard).join("")}</div>`}
      </div>`;
  }

  function renderNoteCard(n) {
    const track = TRACKS[n.trackKey];
    const loc = n.topicTitle || (n.weekIndex != null ? `W${n.weekIndex + 1}` : "");
    return `
      <div class="ps-note-card source-${n.source} ps-animate-in" data-action="edit-note" data-id="${n.id}">
        <div class="ps-note-card-top">
          <strong>${escapeHtml(n.title || "Untitled")}</strong>
          <button class="ps-icon-btn" data-action="toggle-pin" data-id="${n.id}" title="Pin">${n.pinned ? "📌" : "📍"}</button>
        </div>
        <p class="ps-note-preview">${escapeHtml((n.body || "").slice(0, 140))}</p>
        <div class="ps-note-meta">
          ${track ? `<span class="badge">${track.icon}</span>` : ""}
          ${loc ? `<span class="badge">${escapeHtml(loc)}</span>` : ""}
          ${(n.tags || []).map((t) => `<span class="badge tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>`;
  }

  function renderResourcesTab() {
    const list = (RESOURCES[state.trackKey] || []).slice();
    if (list.length === 0) return `<div class="ps-empty">No track-level resources yet. Check each topic's Resources tab.</div>`;
    // Group by category; uncategorized items go under "General".
    const groups = new Map();
    list.forEach((r) => {
      const cat = r.category || "General";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(r);
    });
    const card = (r, i) => `
      <a class="ps-resource-card kind-${r.type || r.kind} ps-animate-in" style="--i:${i}" href="${escapeHtml(r.link || r.url)}" target="_blank" rel="noopener">
        <span class="ps-resource-icon">${KIND_ICON[r.type || r.kind] || "🔗"}</span>
        <span class="ps-resource-main">
          <span class="ps-resource-title">${escapeHtml(r.name || r.title)}</span>
          ${r.desc ? `<span class="ps-resource-desc">${escapeHtml(r.desc)}</span>` : ""}
        </span>
        <span class="ps-resource-kind">${escapeHtml(r.by || r.type || r.kind || "")}</span>
      </a>`;
    return [...groups.entries()]
      .map(([cat, items]) => `
        <section class="ps-resource-group">
          <h3 class="ps-resource-group-title">${escapeHtml(cat)}</h3>
          <div class="ps-resources">${items.map(card).join("")}</div>
        </section>`)
      .join("");
  }

  // ---------- modals ----------
  function renderModal() {
    if (!state.modal) return "";
    if (state.modal.type === "settings") return renderSettingsModal();
    if (state.modal.type === "note-editor") return renderNoteEditorModal(state.modal);
    return "";
  }

  function renderSettingsModal() {
    const settings = PrepStackAI.getSettings();
    const profiles = Profiles.list();
    const cur = Profiles.current();
    return `
      <div class="ps-modal-overlay" data-action="close-modal">
        <div class="ps-modal" data-stop-close>
          <button class="ps-modal-close" data-action="close-modal">✕</button>
          <h2>Settings</h2>
          <h3>Profiles</h3>
          <ul class="ps-profile-list">
            ${profiles.map((p) => `<li class="${p.id === cur?.id ? "active" : ""}">
              <span>${p.emoji} ${escapeHtml(p.name)}</span>
              ${profiles.length > 1 ? `<button class="ps-icon-btn" data-action="delete-profile" data-id="${p.id}">🗑️</button>` : ""}
            </li>`).join("")}
          </ul>
          <button class="ps-btn" data-action="new-profile">＋ New profile</button>
          <h3>AI Tutor (${PrepStackAI.getMode()})</h3>
          ${(() => {
            const labels = PrepStackAI.getProviderLabels();
            const defaults = PrepStackAI.getDefaultModels();
            const providers = PrepStackAI.getProviders();
            const active = PrepStackAI.getActiveProvider();
            const opts = providers.map((p) => `<option value="${p}" ${p === active ? "selected" : ""}>${escapeHtml(labels[p] || p)}</option>`).join("");
            const note = PrepStackAI.getMode() === "proxy"
              ? "Providers with a key configured on the server."
              : "Providers you can call directly from the browser (ChatGPT needs the server proxy).";
            return `
          <label class="ps-field">Provider
            <select data-action="set-provider">${opts}</select>
          </label>
          <p class="ps-hint">${note}</p>
          <label class="ps-field">Your own API key (optional)
            <input type="password" data-action="set-api-key" value="${escapeHtml(settings.apiKey || "")}" placeholder="AIza… (Gemini) / gsk_… (Groq) / sk-ant-…" />
          </label>
          <p class="ps-hint">🔒 Stored only in <b>this browser, this profile</b> (localStorage). It is never sent to the PrepStack server or anyone else — calls go straight from your browser to the provider. Get a free Gemini key at aistudio.google.com.</p>
          <label class="ps-field">Model
            <input type="text" data-action="set-model" value="${escapeHtml(settings.model || defaults[active] || "")}" placeholder="${escapeHtml(defaults[active] || "")}" />
          </label>`;
          })()}
          <h3>Data</h3>
          <div class="ps-modal-actions">
            <button class="ps-btn" data-action="export-notes">⬇️ Export backup JSON</button>
            <button class="ps-btn" data-action="clear-notes">🗑️ Clear all notes</button>
          </div>
        </div>
      </div>`;
  }

  function renderNoteEditorModal(modal) {
    const note = modal.noteId ? notesCache.find((n) => n.id === modal.noteId) : null;
    const prefill = modal.prefill || {};
    return `
      <div class="ps-modal-overlay" data-action="close-modal">
        <div class="ps-modal" data-stop-close>
          <button class="ps-modal-close" data-action="close-modal">✕</button>
          <h2>${note ? "Edit note" : "New note"}</h2>
          <label class="ps-field">Title
            <input type="text" id="note-title" value="${escapeHtml(note?.title || prefill.title || "")}" />
          </label>
          <label class="ps-field">Body
            <textarea id="note-body" rows="8">${escapeHtml(note?.body || prefill.body || "")}</textarea>
          </label>
          <label class="ps-field">Tags (comma separated)
            <input type="text" id="note-tags" value="${escapeHtml((note?.tags || []).join(", "))}" />
          </label>
          <div class="ps-modal-actions">
            <button class="ps-btn ps-btn-primary" data-action="save-note" data-id="${note?.id || ""}" data-topic="${prefill.topicId || note?.topicId || ""}">Save</button>
            ${note ? `<button class="ps-btn ps-btn-danger" data-action="delete-note" data-id="${note.id}">Delete</button>` : ""}
          </div>
        </div>
      </div>`;
  }

  // ---------- AI panel ----------
  function renderAIPanel() {
    const el = document.getElementById("ai-panel");
    if (!el) return;
    const open = PrepStackAI.isPanelOpen();
    if (!open) { el.innerHTML = ""; el.classList.remove("open"); return; }
    el.classList.add("open");
    const msgs = PrepStackAI.getMessages();
    el.innerHTML = `
      <div class="ps-ai-header">
        <span>🤖 AI Tutor · ${escapeHtml(PrepStackAI.getProviderLabels()[PrepStackAI.getActiveProvider()] || "")}</span>
        <button class="ps-icon-btn" data-action="close-ai-panel">✕</button>
      </div>
      <div class="ps-ai-messages" id="ai-messages">
        ${msgs.map((m, idx) => `
          <div class="ps-ai-msg ${m.role}">
            <div class="ps-ai-msg-body">${renderMarkdownish(m.content)}</div>
            ${m.role === "assistant" && !m.error ? `<button class="ps-btn ps-btn-tiny" data-action="save-ai-note" data-idx="${idx}">💾 Save as note</button>` : ""}
          </div>`).join("")}
      </div>
      <form class="ps-ai-input" data-action="ai-send">
        <input type="text" id="ai-input" placeholder="Ask about this topic…" autocomplete="off" />
        <button class="ps-btn ps-btn-primary" type="submit">Send</button>
      </form>`;
    const container = document.getElementById("ai-messages");
    if (container) container.scrollTop = container.scrollHeight;
  }

  // ---------- events ----------
  function setupEvents() {
    document.body.addEventListener("click", onClick);
    document.body.addEventListener("change", onChange);
    document.body.addEventListener("submit", onSubmit);
    document.body.addEventListener("input", onInput);
  }

  function onClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "close-modal") {
      if (e.target.classList.contains("ps-modal-overlay") || e.target.classList.contains("ps-modal-close")) { state.modal = null; render(); }
      return;
    }
    switch (action) {
      case "toggle-module":
        state.expandedModules[el.dataset.module] = state.expandedModules[el.dataset.module] === false;
        render();
        break;
      case "open-topic":
        state.selectedTopicId = el.dataset.topic;
        state.topicSubTab = "concepts";
        state.activeTab = "roadmap";
        window.scrollTo({ top: 0 });
        progress.lastTopic = progress.lastTopic || {};
        progress.lastTopic[state.trackKey] = el.dataset.topic;
        saveProgress();
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
        break;
      case "back-to-roadmap":
        state.selectedTopicId = null;
        render();
        break;
      case "toggle-topic-read":
        toggleTopicRead(state.trackKey, el.dataset.topic);
        render();
        break;
      case "toggle-lesson":
        e.preventDefault();   // don't collapse the <details> when marking done
        e.stopPropagation();
        toggleLesson(state.trackKey, el.dataset.topic, +el.dataset.lesson, +el.dataset.total);
        render();
        break;
      case "change-topic-subtab":
        state.topicSubTab = el.dataset.subtab;
        render();
        break;
      case "change-tab":
        state.activeTab = el.dataset.tab;
        if (el.dataset.tab !== "roadmap") state.selectedTopicId = state.selectedTopicId; // keep topic when returning
        render();
        break;
      case "toggle-theme":
        state.theme = state.theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", state.theme);
        render();
        break;
      case "toggle-read-mode":
        state.readMode = !state.readMode;
        document.documentElement.setAttribute("data-read-mode", state.readMode ? "on" : "off");
        render();
        break;
      case "open-settings":
        state.modal = { type: "settings" };
        render();
        break;
      case "change-notes-filter":
        state.myNotesFilter = el.dataset.filter;
        render();
        break;
      case "new-note":
        state.modal = { type: "note-editor", noteId: null, prefill: {} };
        render();
        break;
      case "new-note-for-topic": {
        const f = findTopic(el.dataset.topic);
        state.modal = { type: "note-editor", noteId: null, prefill: { topicId: el.dataset.topic, topicTitle: f?.topic?.title } };
        render();
        break;
      }
      case "edit-note":
        state.modal = { type: "note-editor", noteId: el.dataset.id };
        render();
        break;
      case "toggle-pin":
        e.stopPropagation();
        NotesRepo.togglePin(el.dataset.id).then(refreshNotesCache);
        break;
      case "save-note":
        saveNoteFromEditor(el);
        break;
      case "delete-note":
        NotesRepo.remove(el.dataset.id).then(() => { refreshNotesCache(); state.modal = null; render(); });
        break;
      case "new-profile": {
        const name = prompt("Profile name?");
        if (name) { const p = Profiles.create({ name, emoji: "🙂" }); Profiles.switch(p.id); }
        break;
      }
      case "delete-profile":
        if (confirm("Delete this profile and all its notes/progress?")) Profiles.delete(el.dataset.id);
        break;
      case "export-notes":
        exportNotes();
        break;
      case "clear-notes":
        if (confirm("Delete ALL notes for this profile?")) NotesRepo.clear().then(refreshNotesCache);
        break;
      case "ask-claude-topic": {
        const f = findTopic(el.dataset.topic);
        PrepStackAI.setPanelOpen(true);
        renderAIPanel();
        PrepStackAI.seed(`Can you help me understand ${f?.topic?.title} for a system-design interview?`);
        renderAIPanel();
        break;
      }
      case "save-ai-note": {
        const msgs = PrepStackAI.getMessages();
        const idx = +el.dataset.idx;
        const answer = msgs[idx];
        const question = [...msgs.slice(0, idx)].reverse().find((m) => m.role === "user");
        const f = state.selectedTopicId ? findTopic(state.selectedTopicId) : null;
        NotesRepo.create(NoteFactory.fromAIMessage({
          trackKey: state.trackKey,
          topicId: f?.topic?.id || null,
          topicTitle: f?.topic?.title || null,
          question: question?.content,
          answer: answer?.content,
          model: answer?.model
        })).then(refreshNotesCache);
        break;
      }
      case "close-ai-panel":
        PrepStackAI.setPanelOpen(false);
        renderAIPanel();
        break;
    }
  }

  function onChange(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "change-track") {
      state.trackKey = el.value;
      state.selectedTopicId = null;
      state.expandedModules = {};
      render();
    } else if (action === "switch-profile") {
      Profiles.switch(el.value);
    } else if (action === "set-api-key") {
      PrepStackAI.setSettings({ apiKey: el.value });
      PrepStackAI.refreshStatus();
    } else if (action === "set-model") {
      PrepStackAI.setSettings({ model: el.value });
    } else if (action === "set-provider") {
      PrepStackAI.setProvider(el.value);
      render();
    }
  }

  function onSubmit(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.dataset.action === "ai-send") {
      e.preventDefault();
      const input = document.getElementById("ai-input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      PrepStackAI.send(text);
    }
  }

  function onInput(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.dataset.action === "search-notes") {
      clearTimeout(searchDebounce);
      const val = el.value;
      searchDebounce = setTimeout(() => {
        state.myNotesSearch = val;
        render();
        const input = document.querySelector('[data-action="search-notes"]');
        if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }, 300);
    }
  }

  function saveNoteFromEditor(btn) {
    const title = document.getElementById("note-title").value.trim();
    const body = document.getElementById("note-body").value.trim();
    const tags = document.getElementById("note-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
    const id = btn.dataset.id;
    const topicId = btn.dataset.topic || null;
    const f = topicId ? findTopic(topicId) : null;
    const op = id
      ? NotesRepo.update(id, { title, body, tags })
      : NotesRepo.create(NoteFactory.manual({ trackKey: state.trackKey, topicId, topicTitle: f?.topic?.title || null, title, body, tags }));
    op.then(() => { refreshNotesCache(); state.modal = null; render(); });
  }

  async function exportNotes() {
    const notes = await NotesRepo.exportAll();
    const all = { exportedAt: new Date().toISOString(), notes, progress };
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prepstack-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function refreshNotesCache() {
    notesCache = await NotesRepo.list();
    render();
  }

  // ---------- init ----------
  async function init() {
    loadState();
    loadProgress();
    document.documentElement.setAttribute("data-theme", state.theme);
    document.documentElement.setAttribute("data-read-mode", state.readMode ? "on" : "off");
    setupEvents();
    notesCache = await NotesRepo.list();
    render();
    Profiles.on("change", () => { loadState(); loadProgress(); refreshNotesCache(); });
    EventBus.on("notes:changed", refreshNotesCache);
    EventBus.on("ai:panel", renderAIPanel);
    EventBus.on("ai:messages", renderAIPanel);
    EventBus.on("ai:status", () => { if (state.modal?.type === "settings") render(); });
    PrepStackAI.init();
  }

  window.PrepStack = { state, getCurrentContext, init };
  document.addEventListener("DOMContentLoaded", init);
})();
