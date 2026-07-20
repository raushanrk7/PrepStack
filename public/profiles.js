// Local multi-profile system. NOT authenticated — anyone with the browser sees all profiles.
// Every persisted key is namespaced prepstack:u:<profileId>:<suffix> so profiles never collide.
// window.Profiles
(function () {
  const LIST_KEY = "prepstack:profiles:v1";
  const CURRENT_KEY = "prepstack:currentProfileId";
  const LEGACY_PREFIX = "prepstack:";
  const NS_PREFIX = "prepstack:u:";

  function uid() {
    return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function readList() {
    try {
      return JSON.parse(localStorage.getItem(LIST_KEY)) || [];
    } catch {
      return [];
    }
  }

  function writeList(list) {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  }

  function migrateLegacyIfNeeded() {
    const existing = readList();
    if (existing.length > 0) return;

    // Find any un-namespaced legacy keys (prepstack:* that aren't the list/current keys
    // and aren't already namespaced under prepstack:u:).
    const legacyKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        k.startsWith(LEGACY_PREFIX) &&
        !k.startsWith(NS_PREFIX) &&
        k !== LIST_KEY &&
        k !== CURRENT_KEY
      ) {
        legacyKeys.push(k);
      }
    }

    const def = { id: uid(), name: "Default", emoji: "🙂", createdAt: Date.now() };
    writeList([def]);
    localStorage.setItem(CURRENT_KEY, def.id);

    legacyKeys.forEach((k) => {
      const suffix = k.slice(LEGACY_PREFIX.length);
      const value = localStorage.getItem(k);
      localStorage.setItem(`${NS_PREFIX}${def.id}:${suffix}`, value);
      localStorage.removeItem(k);
    });
  }

  function list() {
    return readList();
  }

  function current() {
    const list_ = readList();
    const id = localStorage.getItem(CURRENT_KEY);
    return list_.find((p) => p.id === id) || list_[0] || null;
  }

  function switchTo(id) {
    const list_ = readList();
    if (!list_.some((p) => p.id === id)) return;
    localStorage.setItem(CURRENT_KEY, id);
    EventBus.emit("change", current());
  }

  function create({ name, emoji }) {
    const list_ = readList();
    const profile = { id: uid(), name: name || "New profile", emoji: emoji || "🙂", createdAt: Date.now() };
    list_.push(profile);
    writeList(list_);
    EventBus.emit("created", profile);
    return profile;
  }

  function remove(id) {
    let list_ = readList();
    const wasCurrent = current()?.id === id;
    list_ = list_.filter((p) => p.id !== id);
    writeList(list_);

    // Drop every namespaced key belonging to this profile.
    const prefix = `${NS_PREFIX}${id}:`;
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));

    if (wasCurrent && list_.length > 0) {
      localStorage.setItem(CURRENT_KEY, list_[0].id);
    }
    EventBus.emit("deleted", { id });
    if (wasCurrent) EventBus.emit("change", current());
  }

  function key(suffix) {
    const p = current();
    if (!p) throw new Error("No active profile");
    return `${NS_PREFIX}${p.id}:${suffix}`;
  }

  function on(evt, fn) {
    return EventBus.on(evt, fn);
  }

  migrateLegacyIfNeeded();

  window.Profiles = { list, current, switch: switchTo, create, delete: remove, key, on };
})();
