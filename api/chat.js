// Serverless proxy for the AI tutor panel. Hides ANTHROPIC_API_KEY from the browser.
// Works on both Vercel (Node request/response handler) and Netlify Functions (event/context handler).

const { callAnthropic } = require("./_lib");

async function handler(req, res) {
  // Vercel-style (req, res)
  if (req?.method === "GET") {
    return res.status(200).json({ ok: true });
  }
  if (req?.body?.ping) {
    return res.status(200).json({ ok: true });
  }

  const { status, body } = await callAnthropic(req.body || {});
  return res.status(status).json(body);
}

// Netlify-style handler(event, context)
handler.handler = async function (event) {
  const payload = event.body ? JSON.parse(event.body) : {};
  if (event.httpMethod === "GET" || payload.ping) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }
  const { status, body } = await callAnthropic(payload);
  return { statusCode: status, body: JSON.stringify(body) };
};

module.exports = handler;
