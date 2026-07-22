// Shared multi-provider LLM proxy used by api/chat.js (Vercel/Netlify) and server.js (Render/Node).
// Not itself a route: filename is prefixed with `_` so Vercel/Netlify don't expose it as an endpoint.
//
// Supported providers (pick via the request's `provider` field, default "anthropic"):
//   anthropic → Claude   (ANTHROPIC_API_KEY)   — paid
//   gemini    → Google   (GEMINI_API_KEY)      — has a free tier
//   groq      → Groq     (GROQ_API_KEY)         — free tier, OpenAI-compatible
//   openai    → ChatGPT  (OPENAI_API_KEY)       — paid
//
// Each provider reads its own env var; you only need to set the keys you actually use.
// The frontend can list providers via GET/ping which returns { providers: [...available] }.

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-5",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini"
};

const ENV_KEYS = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openai: "OPENAI_API_KEY"
};

const DEFAULT_MAX_TOKENS = 1024;

// ---------------- per-provider adapters ----------------

async function callAnthropic({ apiKey, model, system, messages, max_tokens }) {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({ model, system: system || undefined, messages, max_tokens })
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) throw new Error(data?.error?.message || "Anthropic API error");
  return (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// OpenAI + Groq share the same chat-completions shape; only base URL differs.
async function callOpenAICompatible({ baseURL, apiKey, model, system, messages, max_tokens }) {
  const chatMessages = [];
  if (system) chatMessages.push({ role: "system", content: system });
  for (const m of messages) chatMessages.push({ role: m.role, content: m.content });

  const upstream = await fetch(baseURL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: chatMessages, max_tokens })
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) throw new Error(data?.error?.message || "Upstream API error");
  return data?.choices?.[0]?.message?.content || "";
}

async function callGemini({ apiKey, model, system, messages, max_tokens }) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: { maxOutputTokens: max_tokens }
    })
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) throw new Error(data?.error?.message || "Gemini API error");
  return (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text).join("\n");
}

// ---------------- dispatcher ----------------

function availableProviders() {
  return Object.keys(ENV_KEYS).filter((p) => process.env[ENV_KEYS[p]]);
}

async function callLLM({ provider, model, system, messages, max_tokens }) {
  provider = (provider || "anthropic").toLowerCase();

  if (!ENV_KEYS[provider]) {
    return { status: 400, body: { error: `Unknown provider "${provider}".` } };
  }
  const apiKey = process.env[ENV_KEYS[provider]];
  if (!apiKey) {
    return { status: 500, body: { error: `${ENV_KEYS[provider]} is not set on the server.` } };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: "messages[] is required." } };
  }

  const args = {
    apiKey,
    model: model || DEFAULT_MODELS[provider],
    system,
    messages,
    max_tokens: max_tokens || DEFAULT_MAX_TOKENS
  };

  try {
    let text;
    if (provider === "anthropic") text = await callAnthropic(args);
    else if (provider === "gemini") text = await callGemini(args);
    else if (provider === "groq")
      text = await callOpenAICompatible({ ...args, baseURL: "https://api.groq.com/openai/v1/chat/completions" });
    else if (provider === "openai")
      text = await callOpenAICompatible({ ...args, baseURL: "https://api.openai.com/v1/chat/completions" });
    return { status: 200, body: { text, provider } };
  } catch (err) {
    return { status: 502, body: { error: err.message || "Upstream error" } };
  }
}

// Back-compat alias so existing callers keep working.
const callAnthropicCompat = (payload) => callLLM({ ...payload, provider: payload.provider || "anthropic" });

module.exports = { callLLM, callAnthropic: callAnthropicCompat, availableProviders, DEFAULT_MODELS };
