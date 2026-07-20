// AI tutor panel + Anthropic integration. window.PrepStackAI
(function () {
  let mode = "unconfigured"; // "proxy" | "direct" | "unconfigured"
  let messages = []; // {role, content}
  let panelOpen = false;
  let seedText = "";

  function settingsKey() {
    return Profiles.key("ai-settings:v1");
  }

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem(settingsKey())) || {};
    } catch {
      return {};
    }
  }

  function writeSettings(patch) {
    const cur = readSettings();
    localStorage.setItem(settingsKey(), JSON.stringify({ ...cur, ...patch }));
  }

  async function refreshStatus() {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ping: true })
      });
      if (res.ok) {
        mode = "proxy";
        EventBus.emit("ai:status", { mode });
        return mode;
      }
    } catch {
      /* no proxy available, fall through */
    }
    const settings = readSettings();
    mode = settings.apiKey ? "direct" : "unconfigured";
    EventBus.emit("ai:status", { mode });
    return mode;
  }

  function buildSystemPrompt() {
    const ctx = window.PrepStack?.getCurrentContext?.() || {};
    return [
      "You are an interview-prep tutor embedded in PrepStack, a personal study planner.",
      ctx.trackName ? `The user is currently studying: ${ctx.trackName}.` : "",
      ctx.weekTitle ? `Current week: ${ctx.weekTitle}.` : "",
      ctx.dayName ? `Current day: ${ctx.dayName}.` : "",
      "Be concise, technical, and interview-focused. Use concrete examples and, where useful, ASCII diagrams."
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function send(text) {
    messages.push({ role: "user", content: text });
    EventBus.emit("ai:messages", messages.slice());

    const settings = readSettings();
    const payload = {
      model: settings.model || "claude-sonnet-5",
      system: buildSystemPrompt(),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024
    };

    try {
      let text_;
      if (mode === "proxy") {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");
        text_ = data.text;
      } else if (mode === "direct") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": settings.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({ model: payload.model, system: payload.system, messages: payload.messages, max_tokens: payload.max_tokens })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Request failed");
        text_ = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      } else {
        throw new Error("AI is not configured. Add an API key in Settings.");
      }
      messages.push({ role: "assistant", content: text_, model: payload.model });
    } catch (err) {
      messages.push({ role: "assistant", content: `⚠️ ${err.message}`, error: true });
    }
    EventBus.emit("ai:messages", messages.slice());
  }

  function seed(text, opts = {}) {
    seedText = text || "";
    panelOpen = true;
    EventBus.emit("ai:panel", { open: true, seed: seedText });
    if (opts.autoSend && seedText) {
      send(seedText);
      seedText = "";
    }
  }

  function init() {
    refreshStatus();
  }

  window.PrepStackAI = {
    init,
    refreshStatus,
    seed,
    send,
    getMode: () => mode,
    getMessages: () => messages.slice(),
    getSettings: readSettings,
    setSettings: writeSettings,
    isPanelOpen: () => panelOpen,
    setPanelOpen: (v) => {
      panelOpen = v;
      EventBus.emit("ai:panel", { open: v });
    }
  };
})();
