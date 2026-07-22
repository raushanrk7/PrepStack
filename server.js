// Entry point for hosting PrepStack on Render (or any plain Node host).
// Serves the static frontend from public/ and proxies /api/chat to Anthropic.

const express = require("express");
const path = require("path");
const { callLLM, availableProviders, DEFAULT_MODELS } = require("./api/_lib");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.all("/api/chat", async (req, res) => {
  if (req.method === "GET" || req.body?.ping) {
    return res.status(200).json({ ok: true, providers: availableProviders(), defaultModels: DEFAULT_MODELS });
  }
  const { status, body } = await callLLM(req.body || {});
  res.status(status).json(body);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`PrepStack running on http://localhost:${PORT}`);
});
