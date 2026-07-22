// Serverless proxy for the AI tutor panel. Hides provider API keys from the browser.
// Works on both Vercel (Node request/response handler) and Netlify Functions (event/context handler).
// Multi-provider: routes to Claude / Gemini / Groq / OpenAI based on the request's `provider` field.

const { callLLM, availableProviders, DEFAULT_MODELS } = require("./_lib");

async function handler(req, res) {
  // Vercel-style (req, res)
  if (req?.method === "GET" || req?.body?.ping) {
    return res.status(200).json({ ok: true, providers: availableProviders(), defaultModels: DEFAULT_MODELS });
  }

  const { status, body } = await callLLM(req.body || {});
  return res.status(status).json(body);
}

// Netlify-style handler(event, context)
handler.handler = async function (event) {
  const payload = event.body ? JSON.parse(event.body) : {};
  if (event.httpMethod === "GET" || payload.ping) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, providers: availableProviders(), defaultModels: DEFAULT_MODELS })
    };
  }
  const { status, body } = await callLLM(payload);
  return { statusCode: status, body: JSON.stringify(body) };
};

module.exports = handler;
