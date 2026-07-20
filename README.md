# PrepStack 📚

A personal interview-prep planner: structured multi-week roadmaps, curated recall-grade notes, design drills, personal note-taking, and an optional Claude AI tutor.

**Tracks:** DSA · HLD (System Design) · LLD (Object Design) · AI/ML · Agentic AI · AlgoTrading

## Run locally

```bash
# Zero-dependency static mode (either works)
npx serve public
python -m http.server 5173 --directory public

# Full mode with AI proxy (needs Node 18+)
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Open http://localhost:5173 (or the port shown). Without the proxy, the AI panel falls back to a user-pasted API key in Settings — everything else works fully offline.

## Deploy

### Render (recommended — full app with AI proxy)

1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New → Web Service** → connect the repo. `render.yaml` is picked up automatically (Node runtime, `npm install`, `npm start`).
3. Set the `ANTHROPIC_API_KEY` environment variable in the Render dashboard.

### Vercel / Netlify

`vercel.json` and `netlify.toml` are included; set `ANTHROPIC_API_KEY` in the host's dashboard.

### GitHub Pages (static only)

Repo Settings → Pages → serve the `public/` folder. AI tutor requires a user-pasted key.

## Adding content (the part you'll do most)

Content is **data, not code** — everything lives in `public/data/**` and self-registers. To add:

- **Curated notes for a week:** create `public/data/notes/<track>/week<N>.js` calling `PrepStackRegister.notes("<track>", <N>, { concepts, qa, mock, days })`, then add one `<script>` tag to `index.html`.
- **A whole new track:** create `data/tracks/<key>.js` + `data/resources/<key>.js` + notes files, add script tags — the UI picks it up automatically, no `app.js` changes.

See [ARCHITECTURE.md](PrepStack%20_Architecture%20&%20Contributor.md) for schemas, patterns, and hard rules.

## Current content status

| Track | Curriculum | Recall-grade notes |
|---|---|---|
| HLD | ✅ 4/6/8 wk | W1–W4 (load balancing, caching/Redis, consistent hashing/replication, Kafka) + 2 full mock interviews |
| LLD | ✅ 4/6/8 wk | placeholders (W1–W2) |
| DSA / AI-ML / Agents / AlgoTrading | ✅ | — |

## License

MIT
