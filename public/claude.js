// AI tutor panel + Anthropic integration. window.PrepStackAI
(function () {
  let mode = "unconfigured"; // "proxy" | "direct" | "unconfigured"
  let messages = []; // {role, content}
  let panelOpen = false;
  let seedText = "";
  let proxyProviders = []; // providers whose keys are set on the server

  // Default model per provider (mirrors api/_lib.js).
  const DEFAULT_MODELS = {
    anthropic: "claude-sonnet-5",
    gemini: "gemini-2.0-flash",
    groq: "llama-3.3-70b-versatile",
    openai: "gpt-4o-mini"
  };
  const PROVIDER_LABELS = {
    anthropic: "Claude",
    gemini: "Gemini (free)",
    groq: "Groq (free)",
    openai: "ChatGPT"
  };

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
        const data = await res.json().catch(() => ({}));
        proxyProviders = Array.isArray(data.providers) ? data.providers : [];
        mode = "proxy";
        EventBus.emit("ai:status", { mode, providers: proxyProviders });
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

  // Which provider to use for this request. Honors the saved choice when its key
  // is available on the proxy; otherwise falls back to the first available provider.
  function activeProvider() {
    const saved = readSettings().provider;
    if (mode === "proxy" && proxyProviders.length) {
      return proxyProviders.includes(saved) ? saved : proxyProviders[0];
    }
    return saved || "anthropic";
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

  // Browser-direct call (no proxy). Used when the user pasted their own key in Settings.
  // Note: OpenAI blocks browser-origin calls (CORS) — use the proxy for ChatGPT.
  async function callDirect(provider, apiKey, payload) {
    if (!apiKey) throw new Error("No API key set. Add one in Settings, or deploy with a server key.");

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: payload.model, system: payload.system, messages: payload.messages, max_tokens: payload.max_tokens })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Request failed");
      return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    }

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(payload.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: payload.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          systemInstruction: payload.system ? { parts: [{ text: payload.system }] } : undefined,
          generationConfig: { maxOutputTokens: payload.max_tokens }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Request failed");
      return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text).join("\n");
    }

    // Groq (OpenAI-compatible, allows browser origins).
    if (provider === "groq") {
      const chat = [];
      if (payload.system) chat.push({ role: "system", content: payload.system });
      payload.messages.forEach((m) => chat.push({ role: m.role, content: m.content }));
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: payload.model, messages: chat, max_tokens: payload.max_tokens })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Request failed");
      return data.choices?.[0]?.message?.content || "";
    }

    throw new Error(`${PROVIDER_LABELS[provider] || provider} needs the server proxy (browser calls are blocked). Deploy with the key set on the server.`);
  }

  async function send(text) {
    messages.push({ role: "user", content: text });
    EventBus.emit("ai:messages", messages.slice());

    const settings = readSettings();
    const provider = activeProvider();
    const model = settings.model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;
    const payload = {
      provider,
      model,
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
        text_ = await callDirect(provider, settings.apiKey, payload);
      } else {
        throw new Error("AI is not configured. Add an API key in Settings.");
      }
      messages.push({ role: "assistant", content: text_, model, provider });
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
    getProviders: () => (mode === "proxy" ? proxyProviders.slice() : Object.keys(DEFAULT_MODELS)),
    getActiveProvider: activeProvider,
    getProviderLabels: () => ({ ...PROVIDER_LABELS }),
    getDefaultModels: () => ({ ...DEFAULT_MODELS }),
    setProvider: (p) => writeSettings({ provider: p, model: DEFAULT_MODELS[p] || undefined }),
    isPanelOpen: () => panelOpen,
    setPanelOpen: (v) => {
      panelOpen = v;
      EventBus.emit("ai:panel", { open: v });
    }
  };
})();
