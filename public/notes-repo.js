// User notes: domain (NoteFactory) + async repository (NotesRepo), Repository pattern over localStorage.
// The UI never touches localStorage directly for notes — swap the backend by rewriting only this file.
// window.NotesRepo, window.NoteFactory
(function () {
  const STORAGE_SUFFIX = "notes:v1";

  function uid() {
    return "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(Profiles.key(STORAGE_SUFFIX))) || [];
    } catch {
      return [];
    }
  }

  function writeAll(notes) {
    localStorage.setItem(Profiles.key(STORAGE_SUFFIX), JSON.stringify(notes));
  }

  function matches(note, filter) {
    if (!filter) return true;
    if (filter.trackKey && note.trackKey !== filter.trackKey) return false;
    if (filter.weekIndex != null && note.weekIndex !== filter.weekIndex) return false;
    if (filter.dayIndex !== undefined && note.dayIndex !== filter.dayIndex) return false;
    if (filter.source && note.source !== filter.source) return false;
    if (filter.tag && !(note.tags || []).includes(filter.tag)) return false;
    if (filter.pinnedOnly && !note.pinned) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const hay = `${note.title}\n${note.body}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  async function list(filter) {
    return readAll().filter((n) => matches(n, filter));
  }

  async function get(id) {
    return readAll().find((n) => n.id === id) || null;
  }

  async function create(note) {
    const notes = readAll();
    const full = {
      id: uid(),
      schemaVersion: 1,
      source: note.source || "manual",
      trackKey: note.trackKey,
      weekIndex: note.weekIndex,
      dayIndex: note.dayIndex ?? null,
      topicId: note.topicId ?? null,
      topicTitle: note.topicTitle ?? null,
      title: note.title || "",
      body: note.body || "",
      tags: note.tags || [],
      pinned: !!note.pinned,
      aiContext: note.aiContext,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    notes.push(full);
    writeAll(notes);
    EventBus.emit("notes:changed", { type: "create", note: full });
    return full;
  }

  async function update(id, patch) {
    const notes = readAll();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notes[idx] = { ...notes[idx], ...patch, id, updatedAt: Date.now() };
    writeAll(notes);
    EventBus.emit("notes:changed", { type: "update", note: notes[idx] });
    return notes[idx];
  }

  async function remove(id) {
    const notes = readAll();
    const filtered = notes.filter((n) => n.id !== id);
    writeAll(filtered);
    EventBus.emit("notes:changed", { type: "remove", id });
    return true;
  }

  async function togglePin(id) {
    const note = await get(id);
    if (!note) return null;
    return update(id, { pinned: !note.pinned });
  }

  async function clear() {
    writeAll([]);
    EventBus.emit("notes:changed", { type: "clear" });
  }

  async function bulkImport(notes) {
    const existing = readAll();
    const merged = existing.concat(
      notes.map((n) => ({ ...n, id: n.id || uid(), schemaVersion: n.schemaVersion || 1 }))
    );
    writeAll(merged);
    EventBus.emit("notes:changed", { type: "import", count: notes.length });
    return merged.length;
  }

  async function exportAll() {
    return readAll();
  }

  async function count() {
    return readAll().length;
  }

  window.NotesRepo = {
    list,
    get,
    create,
    update,
    remove,
    togglePin,
    clear,
    bulkImport,
    exportAll,
    count
  };

  window.NoteFactory = {
    manual({ trackKey, weekIndex, dayIndex, topicId, topicTitle, title, body, tags, pinned }) {
      return { source: "manual", trackKey, weekIndex, dayIndex: dayIndex ?? null, topicId: topicId ?? null, topicTitle: topicTitle ?? null, title, body, tags: tags || [], pinned: !!pinned };
    },
    fromAIMessage({ trackKey, weekIndex, dayIndex, topicId, topicTitle, question, answer, model }) {
      return {
        source: "ai",
        trackKey,
        weekIndex,
        dayIndex: dayIndex ?? null,
        topicId: topicId ?? null,
        topicTitle: topicTitle ?? null,
        title: question ? question.slice(0, 80) : "AI note",
        body: answer || "",
        tags: ["ai"],
        pinned: false,
        aiContext: { question, answer, model }
      };
    }
  };
})();
