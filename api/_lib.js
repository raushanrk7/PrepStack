// Shared Anthropic proxy logic used by api/chat.js (Vercel/Netlify) and server.js (Render/Node).
// Not itself a route: filename is prefixed with `_` so Vercel/Netlify don't expose it as an endpoint.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 1024;

async function callAnthropic({ model, system, messages, max_tokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: "ANTHROPIC_API_KEY is not set on the server." } };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: "messages[] is required." } };
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      system: system || undefined,
      messages,
      max_tokens: max_tokens || DEFAULT_MAX_TOKENS
    })
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return { status: upstream.status, body: { error: data?.error?.message || "Anthropic API error" } };
  }

  const text = (data?.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return { status: 200, body: { text } };
}

module.exports = { callAnthropic };
