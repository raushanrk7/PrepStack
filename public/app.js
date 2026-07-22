// Controller: state, rendering, event wiring. window.PrepStack
(function () {
  const STATE_SUFFIX = "ui-state:v1";
  const PROGRESS_SUFFIX = "progress:v1";
  const KIND_ORDER = ["video", "article", "book", "paper", "course", "practice", "platform", "tool", "github"];
  const KIND_ICON = {
    video: "▶", article: "📄", book: "📚", paper: "📑", course: "🎓",
    practice: "🧪", platform: "⚙️", tool: "🔧", github: "💻"
  };

  let state = {
    trackKey: "hld",
    duration: 6,
    weekIndex: 0,
    activeTab: "roadmap",
    notesSubTab: "concepts",
    theme: "light",
    readMode: false,
    myNotesFilter: "all",
    myNotesSearch: "",
    expandedWeek: 0,
    modal: null // {type:'day', dayIndex} | {type:'settings'} | {type:'note-editor', noteId, prefill}
  };
  let progress = {};
  let notesCache = [];
  let searchDebounce = null;

  // ---------- persistence ----------
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(Profiles.key(STATE_SUFFIX)));
      // Mutate in place — window.PrepStack.state must keep pointing at this object.
      if (saved) Object.assign(state, saved, { modal: null });
    } catch { /* ignore */ }
  }
  function saveState() {
    const { modal, ...persisted } = state;
    localStorage.setItem(Profiles.key(STATE_SUFFIX), JSON.stringify(persisted));
  }
  function loadProgress() {
    try {
      progress = JSON.parse(localStorage.getItem(Profiles.key(PROGRESS_SUFFIX))) || {};
    } catch {
      progress = {};
    }
  }
  function saveProgress() {
    localStorage.setItem(Profiles.key(PROGRESS_SUFFIX), JSON.stringify(progress));
  }
  function isDayDone(trackKey, duration, weekIdx, dayIdx) {
    return !!progress?.[trackKey]?.[duration]?.[weekIdx]?.[dayIdx];
  }
  function toggleDayDone(trackKey, duration, weekIdx, dayIdx) {
    progress[trackKey] = progress[trackKey] || {};
    progress[trackKey][duration] = progress[trackKey][duration] || {};
    progress[trackKey][duration][weekIdx] = progress[trackKey][duration][weekIdx] || {};
    progress[trackKey][duration][weekIdx][dayIdx] = !progress[trackKey][duration][weekIdx][dayIdx];
    saveProgress();
  }

  // ---------- helpers ----------
  const K = {
    progress: (trackKey, duration, weekIdx, dayIdx) => `${trackKey}:${duration}:${weekIdx}:${dayIdx}`
  };

  function currentTrack() {
    return TRACKS[state.trackKey];
  }
  function currentWeeks() {
    return currentTrack()?.durations?.[state.duration] || [];
  }
  function currentWeek() {
    return currentWeeks()[state.weekIndex];
  }
  function currentWeekNotes() {
    return NOTES?.[state.trackKey]?.[state.weekIndex];
  }
  function getCurrentContext() {
    const track = currentTrack();
    const week = currentWeek();
    const dayIdx = state.modal?.type === "day" ? state.modal.dayIndex : null;
    const day = dayIdx != null ? week?.days?.[dayIdx] : null;
    return {
      trackKey: state.trackKey,
      trackName: track?.name,
      duration: state.duration,
      weekIndex: state.weekIndex,
      weekTitle: week?.title,
      dayIndex: dayIdx,
      dayName: day?.name
    };
  }

  // ---------- markdown-ish renderer ----------
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
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
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        html += `<pre class="code-block"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
        continue;
      }

      if (line.includes("|") && isSepRow(lines[i + 1])) {
        closeList();
        const header = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|")) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        html +=
          '<table class="md-table"><thead><tr>' +
          header.map((c) => `<th>${inlineMd(c)}</th>`).join("") +
          "</tr></thead><tbody>" +
          rows.map((r) => "<tr>" + r.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>").join("") +
          "</tbody></table>";
        continue;
      }

      const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
      if (hMatch) {
        closeList();
        const level = hMatch[1].length + 1;
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
    saveState();
    $app().innerHTML = renderHeader() + renderTabs() + renderTabContent();
    $modalRoot().innerHTML = renderModal();
  }

  function renderHeader() {
    const tracks = Object.keys(TRACKS);
    const track = currentTrack();
    const profiles = Profiles.list();
    const cur = Profiles.current();

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
          <div class="ps-pills" data-action="change-duration">
            ${[4, 6, 8].map((d) => `<button class="ps-pill ${d === state.duration ? "active" : ""}" data-duration="${d}">${d}wk</button>`).join("")}
          </div>
          <select data-action="switch-profile" class="ps-select">
            ${profiles.map((p) => `<option value="${p.id}" ${p.id === cur?.id ? "selected" : ""}>${p.emoji} ${p.name}</option>`).join("")}
          </select>
          <button class="ps-icon-btn" data-action="toggle-theme" title="Toggle theme">${state.theme === "dark" ? "☀️" : "🌙"}</button>
          <button class="ps-icon-btn" data-action="toggle-read-mode" title="Reading mode">${state.readMode ? "📖" : "📄"}</button>
          <button class="ps-icon-btn" data-action="open-settings" title="Settings">⚙️</button>
        </div>
        ${track ? `<p class="ps-blurb">${escapeHtml(track.blurb)}</p>` : ""}
      </header>`;
  }

  function renderTabs() {
    const tabs = [
      { id: "roadmap", label: "🗺️ Roadmap" },
      { id: "notes", label: "📝 Notes" },
      { id: "my-notes", label: "🗒️ My Notes" },
      { id: "resources", label: "🔗 Resources" }
    ];
    return `<nav class="ps-tabs">${tabs
      .map((t) => `<button class="ps-tab ${state.activeTab === t.id ? "active" : ""}" data-action="change-tab" data-tab="${t.id}">${t.label}</button>`)
      .join("")}</nav>`;
  }

  function renderTabContent() {
    if (state.activeTab === "roadmap") return renderRoadmap();
    if (state.activeTab === "notes") return renderNotesTab();
    if (state.activeTab === "my-notes") return renderMyNotesTab();
    if (state.activeTab === "resources") return renderResourcesTab();
    return "";
  }

  function renderRoadmap() {
    const weeks = currentWeeks();
    if (weeks.length === 0) return `<div class="ps-empty">No curriculum yet for this track/duration.</div>`;

    return `<div class="ps-roadmap">${weeks
      .map((week, wIdx) => {
        const expanded = state.expandedWeek === wIdx;
        const weekNotes = NOTES?.[state.trackKey]?.[wIdx];
        const doneCount = (week.days || []).filter((_, dIdx) => isDayDone(state.trackKey, state.duration, wIdx, dIdx)).length;
        return `
        <section class="ps-week ${expanded ? "expanded" : ""}">
          <button class="ps-week-header" data-action="toggle-week" data-week="${wIdx}">
            <span class="ps-week-title">Week ${wIdx + 1} — ${escapeHtml(week.title)}</span>
            <span class="ps-week-progress">${doneCount}/${(week.days || []).length}</span>
          </button>
          ${expanded ? `<ul class="ps-day-list">${(week.days || [])
            .map((day, dIdx) => {
              const done = isDayDone(state.trackKey, state.duration, wIdx, dIdx);
              const hasCurated = day.type === "design" ? !!weekNotes?.days?.[dIdx] : !!weekNotes?.days?.[dIdx]?.concepts;
              const noteCount = notesCache.filter((n) => n.trackKey === state.trackKey && n.weekIndex === wIdx && n.dayIndex === dIdx).length;
              return `
              <li class="ps-day ${done ? "done" : ""}">
                <input type="checkbox" ${done ? "checked" : ""} data-action="toggle-day" data-week="${wIdx}" data-day="${dIdx}" />
                <span class="ps-day-name">
                  ${day.type === "design" ? '<span class="chip chip-design">🧩</span>' : ""}
                  ${hasCurated ? '<span class="chip chip-curated">📚</span>' : ""}
                  <a href="${escapeHtml(day.link)}" target="_blank" rel="noopener">${escapeHtml(day.name)}</a>
                </span>
                <button class="ps-note-btn" data-action="open-day" data-week="${wIdx}" data-day="${dIdx}">📝${noteCount ? ` ${noteCount}` : ""}</button>
              </li>`;
            })
            .join("")}</ul>` : ""}
        </section>`;
      })
      .join("")}</div>`;
  }

  function renderWeekSelector() {
    const weeks = currentWeeks();
    if (weeks.length === 0) return "";
    return `<select class="ps-select ps-week-select" data-action="select-notes-week">
      ${weeks.map((w, idx) => `<option value="${idx}" ${idx === state.weekIndex ? "selected" : ""}>Week ${idx + 1} — ${escapeHtml(w.title)}</option>`).join("")}
    </select>`;
  }

  function renderNotesTab() {
    const wn = currentWeekNotes();
    const week = currentWeek();
    if (!wn) {
      return `${renderWeekSelector()}<div class="ps-empty">No curated notes yet for Week ${state.weekIndex + 1}${week ? ` — ${escapeHtml(week.title)}` : ""}.</div>`;
    }
    const subtabs = [
      { id: "concepts", label: "Concepts" },
      { id: "qa", label: `Q & A${wn.qa?.length ? ` (${wn.qa.length})` : ""}` },
      { id: "mock", label: "Mock Interview" }
    ];

    let body = "";
    if (state.notesSubTab === "concepts") {
      body = `<div class="ps-concepts">${renderMarkdownish(wn.concepts)}</div>`;
    } else if (state.notesSubTab === "qa") {
      body = (wn.qa || []).length
        ? `<div class="ps-qa-list">${wn.qa
            .map((qa) => `<details class="ps-qa-item"><summary>${escapeHtml(qa.q)}</summary><div>${renderMarkdownish(qa.a)}</div></details>`)
            .join("")}</div>`
        : `<div class="ps-empty">No Q&amp;A for this week yet.</div>`;
    } else if (state.notesSubTab === "mock") {
      const tiers = ["easy", "medium", "hard"];
      const any = tiers.some((t) => (wn.mock?.[t] || []).length);
      body = any
        ? tiers
            .map((tier) => {
              const items = wn.mock?.[tier] || [];
              if (!items.length) return "";
              return `<div class="ps-mock-tier">
                <h3 class="ps-mock-tier-title">${tier[0].toUpperCase()}${tier.slice(1)}</h3>
                <ul class="ps-mock-list">${items
                  .map((item) =>
                    typeof item === "string"
                      ? `<li>${escapeHtml(item)}</li>`
                      : `<li><details><summary>${escapeHtml(item.q)}</summary><div>${renderMarkdownish(item.a)}</div></details></li>`
                  )
                  .join("")}</ul>
              </div>`;
            })
            .join("")
        : `<div class="ps-empty">No mock questions for this week yet.</div>`;
    }

    return `
      <div class="ps-notes-tab">
        ${renderWeekSelector()}
        <nav class="ps-subtabs">${subtabs
          .map((t) => `<button class="ps-subtab ${state.notesSubTab === t.id ? "active" : ""}" data-action="change-notes-subtab" data-subtab="${t.id}">${t.label}</button>`)
          .join("")}</nav>
        ${body}
      </div>`;
  }

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
      <div class="ps-my-notes">
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
    const loc = n.weekIndex != null ? `W${n.weekIndex + 1}${n.dayIndex != null ? ` · D${n.dayIndex + 1}` : ""}` : "";
    return `
      <div class="ps-note-card source-${n.source}" data-action="edit-note" data-id="${n.id}">
        <div class="ps-note-card-top">
          <strong>${escapeHtml(n.title || "Untitled")}</strong>
          <button class="ps-icon-btn" data-action="toggle-pin" data-id="${n.id}" title="Pin">${n.pinned ? "📌" : "📍"}</button>
        </div>
        <p class="ps-note-preview">${escapeHtml((n.body || "").slice(0, 140))}</p>
        <div class="ps-note-meta">
          ${track ? `<span class="badge">${track.icon} ${track.name}</span>` : ""}
          ${loc ? `<span class="badge">${loc}</span>` : ""}
          ${(n.tags || []).map((t) => `<span class="badge tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>`;
  }

  function renderResourcesTab() {
    const list = (RESOURCES[state.trackKey] || []).slice().sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    if (list.length === 0) return `<div class="ps-empty">No resources yet for this track.</div>`;
    return `<div class="ps-resources">${list
      .map(
        (r) => `
      <a class="ps-resource-card kind-${r.kind}" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
        <span class="ps-resource-icon">${KIND_ICON[r.kind] || "🔗"}</span>
        <span class="ps-resource-title">${escapeHtml(r.title)}</span>
        <span class="ps-resource-kind">${r.kind}</span>
      </a>`
      )
      .join("")}</div>`;
  }

  // ---------- modals ----------
  function renderModal() {
    if (!state.modal) return "";
    if (state.modal.type === "day") return renderDayModal(state.modal.dayIndex);
    if (state.modal.type === "settings") return renderSettingsModal();
    if (state.modal.type === "note-editor") return renderNoteEditorModal(state.modal);
    return "";
  }

  function renderDayModal(dayIdx) {
    const week = currentWeek();
    const day = week?.days?.[dayIdx];
    const wn = currentWeekNotes();
    const dayNotes = wn?.days?.[dayIdx];
    const personalNotes = notesCache.filter((n) => n.trackKey === state.trackKey && n.weekIndex === state.weekIndex && n.dayIndex === dayIdx);

    let curatedBlock = `<div class="ps-empty">No curated content for this day yet.</div>`;
    if (dayNotes?.type === "design") {
      curatedBlock = `
        <div class="ps-design-drill">
          <h3>🧩 Design Drill</h3>
          <p>${escapeHtml(dayNotes.prompt || "")}</p>
          ${dayNotes.requirements?.length ? `<h4>Requirements</h4><ul>${dayNotes.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` : ""}
          ${dayNotes.rubric?.length ? `<h4>Rubric</h4><ul>${dayNotes.rubric.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` : ""}
        </div>`;
    } else if (dayNotes?.concepts) {
      curatedBlock = `<div class="ps-concepts">${renderMarkdownish(dayNotes.concepts)}</div>`;
    }

    return `
      <div class="ps-modal-overlay" data-action="close-modal">
        <div class="ps-modal" data-stop-close>
          <button class="ps-modal-close" data-action="close-modal">✕</button>
          <h2>Day ${dayIdx + 1} — ${escapeHtml(day?.name || "")}</h2>
          ${curatedBlock}
          <hr />
          <h3>Your notes</h3>
          ${personalNotes.length ? `<div class="ps-note-cards">${personalNotes.map(renderNoteCard).join("")}</div>` : `<div class="ps-empty">No personal notes for this day.</div>`}
          <div class="ps-modal-actions">
            <button class="ps-btn ps-btn-primary" data-action="new-note-for-day" data-day="${dayIdx}">＋ Add note</button>
            <button class="ps-btn" data-action="ask-claude-day" data-day="${dayIdx}">🤖 ${dayNotes?.type === "design" ? "Practice this drill" : "Ask Claude"}</button>
          </div>
        </div>
      </div>`;
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
            ${profiles
              .map(
                (p) => `<li class="${p.id === cur?.id ? "active" : ""}">
                  <span>${p.emoji} ${escapeHtml(p.name)}</span>
                  ${profiles.length > 1 ? `<button class="ps-icon-btn" data-action="delete-profile" data-id="${p.id}">🗑️</button>` : ""}
                </li>`
              )
              .join("")}
          </ul>
          <button class="ps-btn" data-action="new-profile">＋ New profile</button>

          <h3>AI Tutor (${PrepStackAI.getMode()})</h3>
          ${(() => {
            const labels = PrepStackAI.getProviderLabels();
            const defaults = PrepStackAI.getDefaultModels();
            const providers = PrepStackAI.getProviders();
            const active = PrepStackAI.getActiveProvider();
            const opts = providers
              .map((p) => `<option value="${p}" ${p === active ? "selected" : ""}>${escapeHtml(labels[p] || p)}</option>`)
              .join("");
            const note =
              PrepStackAI.getMode() === "proxy"
                ? "Providers with a key configured on the server."
                : "Providers you can call directly from the browser (ChatGPT needs the server proxy).";
            return `
          <label class="ps-field">Provider
            <select data-action="set-provider">${opts}</select>
          </label>
          <p class="ps-hint">${note}</p>
          <label class="ps-field">API key (used only if no server proxy is available)
            <input type="password" data-action="set-api-key" value="${escapeHtml(settings.apiKey || "")}" placeholder="sk-… / AIza… / gsk_…" />
          </label>
          <label class="ps-field">Model
            <input type="text" data-action="set-model" value="${escapeHtml(settings.model || defaults[active] || "")}" placeholder="${escapeHtml(defaults[active] || "")}" />
          </label>`;
          })()}

          <h3>Data</h3>
          <div class="ps-modal-actions">
            <button class="ps-btn" data-action="export-notes">⬇️ Export notes JSON</button>
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
            <button class="ps-btn ps-btn-primary" data-action="save-note" data-id="${note?.id || ""}" data-week="${prefill.weekIndex ?? state.weekIndex}" data-day="${prefill.dayIndex ?? ""}">Save</button>
            ${note ? `<button class="ps-btn ps-btn-danger" data-action="delete-note" data-id="${note.id}">Delete</button>` : ""}
          </div>
        </div>
      </div>`;
  }

  // ---------- AI panel (rendered in its own fixed container, independent of main re-render) ----------
  function renderAIPanel() {
    const el = document.getElementById("ai-panel");
    if (!el) return;
    const open = PrepStackAI.isPanelOpen();
    if (!open) { el.innerHTML = ""; el.classList.remove("open"); return; }
    el.classList.add("open");
    const msgs = PrepStackAI.getMessages();
    el.innerHTML = `
      <div class="ps-ai-header">
        <span>🤖 AI Tutor</span>
        <button class="ps-icon-btn" data-action="close-ai-panel">✕</button>
      </div>
      <div class="ps-ai-messages" id="ai-messages">
        ${msgs
          .map(
            (m, idx) => `
          <div class="ps-ai-msg ${m.role}">
            <div class="ps-ai-msg-body">${renderMarkdownish(m.content)}</div>
            ${m.role === "assistant" && !m.error ? `<button class="ps-btn ps-btn-tiny" data-action="save-ai-note" data-idx="${idx}">💾 Save as note</button>` : ""}
          </div>`
          )
          .join("")}
      </div>
      <form class="ps-ai-input" data-action="ai-send">
        <input type="text" id="ai-input" placeholder="Ask about this topic…" autocomplete="off" />
        <button class="ps-btn ps-btn-primary" type="submit">Send</button>
      </form>`;
    const container = document.getElementById("ai-messages");
    if (container) container.scrollTop = container.scrollHeight;
  }

  // ---------- event wiring ----------
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
      // Only close when the click landed directly on the overlay (or the explicit ✕ button),
      // not when it bubbled up from content inside .ps-modal.
      if (e.target.classList.contains("ps-modal-overlay") || e.target.classList.contains("ps-modal-close")) {
        state.modal = null;
        render();
      }
      return;
    }

    switch (action) {
      case "toggle-week":
        state.expandedWeek = state.expandedWeek === +el.dataset.week ? null : +el.dataset.week;
        state.weekIndex = +el.dataset.week;
        render();
        break;
      case "toggle-day":
        toggleDayDone(state.trackKey, state.duration, +el.dataset.week, +el.dataset.day);
        render();
        break;
      case "open-day":
        state.weekIndex = +el.dataset.week;
        state.modal = { type: "day", dayIndex: +el.dataset.day };
        render();
        break;
      case "change-tab":
        state.activeTab = el.dataset.tab;
        render();
        break;
      case "change-notes-subtab":
        state.notesSubTab = el.dataset.subtab;
        render();
        break;
      case "change-notes-filter":
        state.myNotesFilter = el.dataset.filter;
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
      case "new-note":
        state.modal = { type: "note-editor", noteId: null, prefill: { weekIndex: state.weekIndex } };
        render();
        break;
      case "new-note-for-day":
        state.modal = { type: "note-editor", noteId: null, prefill: { weekIndex: state.weekIndex, dayIndex: +el.dataset.day } };
        render();
        break;
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
        NotesRepo.remove(el.dataset.id).then(() => {
          refreshNotesCache();
          state.modal = null;
          render();
        });
        break;
      case "new-profile": {
        const name = prompt("Profile name?");
        if (name) {
          const p = Profiles.create({ name, emoji: "🙂" });
          Profiles.switch(p.id);
        }
        break;
      }
      case "delete-profile":
        if (confirm("Delete this profile and all its notes/progress?")) {
          Profiles.delete(el.dataset.id);
        }
        break;
      case "export-notes":
        exportNotes();
        break;
      case "clear-notes":
        if (confirm("Delete ALL notes for this profile?")) {
          NotesRepo.clear().then(refreshNotesCache);
        }
        break;
      case "ask-claude-day": {
        const dayIdx = +el.dataset.day;
        const wn = currentWeekNotes();
        const dn = wn?.days?.[dayIdx];
        const day = currentWeek()?.days?.[dayIdx];
        state.modal = null;
        render();
        PrepStackAI.setPanelOpen(true);
        renderAIPanel();
        PrepStackAI.seed(dn?.type === "design" ? `Let's practice this design drill: ${dn.prompt}` : `Can you help me understand: ${day?.name}?`);
        renderAIPanel();
        break;
      }
      case "save-ai-note": {
        const msgs = PrepStackAI.getMessages();
        const idx = +el.dataset.idx;
        const answer = msgs[idx];
        const question = [...msgs.slice(0, idx)].reverse().find((m) => m.role === "user");
        NotesRepo.create(
          NoteFactory.fromAIMessage({
            trackKey: state.trackKey,
            weekIndex: state.weekIndex,
            dayIndex: state.modal?.type === "day" ? state.modal.dayIndex : null,
            question: question?.content,
            answer: answer?.content,
            model: answer?.model
          })
        ).then(refreshNotesCache);
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
      state.weekIndex = 0;
      state.expandedWeek = 0;
      render();
    } else if (action === "change-duration") {
      // handled via click on pill buttons, not select — no-op
    } else if (action === "switch-profile") {
      Profiles.switch(el.value);
    } else if (action === "set-api-key") {
      PrepStackAI.setSettings({ apiKey: el.value });
      PrepStackAI.refreshStatus();
    } else if (action === "set-model") {
      PrepStackAI.setSettings({ model: el.value });
    } else if (action === "set-provider") {
      PrepStackAI.setProvider(el.value);
      render(); // refresh modal so model placeholder/default updates
    } else if (action === "select-notes-week") {
      state.weekIndex = +el.value;
      render();
    }
  }

  document.addEventListener("click", (e) => {
    const pill = e.target.closest('[data-duration]');
    if (pill) {
      state.duration = +pill.dataset.duration;
      state.weekIndex = 0;
      state.expandedWeek = 0;
      render();
    }
  });

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
        // restore focus + caret after re-render
        const input = document.querySelector('[data-action="search-notes"]');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 300);
    }
  }

  function saveNoteFromEditor(btn) {
    const title = document.getElementById("note-title").value.trim();
    const body = document.getElementById("note-body").value.trim();
    const tags = document
      .getElementById("note-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const id = btn.dataset.id;
    const weekIndex = btn.dataset.week === "" ? null : +btn.dataset.week;
    const dayIndex = btn.dataset.day === "" ? null : +btn.dataset.day;

    const op = id
      ? NotesRepo.update(id, { title, body, tags })
      : NotesRepo.create(NoteFactory.manual({ trackKey: state.trackKey, weekIndex, dayIndex, title, body, tags }));

    op.then(() => {
      refreshNotesCache();
      state.modal = null;
      render();
    });
  }

  async function exportNotes() {
    const all = await NotesRepo.exportAll();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prepstack-notes.json";
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

    Profiles.on("change", () => {
      loadState();
      loadProgress();
      refreshNotesCache();
    });
    EventBus.on("notes:changed", refreshNotesCache);
    EventBus.on("ai:panel", renderAIPanel);
    EventBus.on("ai:messages", renderAIPanel);
    EventBus.on("ai:status", () => {
      if (state.modal?.type === "settings") render();
    });

    PrepStackAI.init();
  }

  window.PrepStack = { state, K, getCurrentContext, init };

  document.addEventListener("DOMContentLoaded", init);
})();
