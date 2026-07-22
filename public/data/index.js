// Registry + topic-model engine (v3). Content files self-register; the UI consumes a normalized
// Track → Module → Topic → Lesson model built by buildTrackModel().
//
// Two content sources, merged transparently:
//   1. Legacy  notes(track, weekIdx, {concepts, qa, mock, resources, plan})  — still supported.
//      A track's modules point at a legacy week via `from.week`; the engine auto-splits that
//      week's `concepts` markdown on `##` headings into Topics, and `###` into Lessons.
//   2. Explicit topic(track, topicId, {title, size, lessons, concepts, resources, qa, practice})
//      — richer, per-topic content that OVERRIDES/enriches an auto-split topic with the same id.
//
// globals: PrepStackRegister, TRACKS, RESOURCES, NOTES, TOPICS
(function () {
  window.TRACKS = window.TRACKS || {};     // key -> {name, icon, blurb, modules:[...]}
  window.RESOURCES = window.RESOURCES || {}; // key -> [{name,link,type,by}]  (track-level aggregate)
  window.NOTES = window.NOTES || {};        // key -> weekIdx -> {concepts,qa,mock,resources,plan}
  window.TOPICS = window.TOPICS || {};      // key -> topicId -> explicit topic content

  function slug(s) {
    return String(s)
      .toLowerCase()
      .replace(/[`*_#>|]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "topic";
  }

  function mergeNotes(existing, incoming) {
    const out = existing || {};
    if (incoming.plan) out.plan = out.plan ? out.plan + "\n\n---\n\n" + incoming.plan : incoming.plan;
    if (incoming.resources && incoming.resources.length) out.resources = (out.resources || []).concat(incoming.resources);
    if (incoming.concepts) out.concepts = out.concepts ? out.concepts + "\n\n---\n\n" + incoming.concepts : incoming.concepts;
    if (incoming.qa && incoming.qa.length) out.qa = (out.qa || []).concat(incoming.qa);
    if (incoming.mock) {
      out.mock = out.mock || {};
      ["easy", "medium", "hard"].forEach((t) => {
        if (incoming.mock[t] && incoming.mock[t].length) out.mock[t] = (out.mock[t] || []).concat(incoming.mock[t]);
      });
    }
    if (incoming.days) out.days = Object.assign(out.days || {}, incoming.days);
    return out;
  }

  function mergeTopic(existing, incoming) {
    const out = existing || {};
    ["title", "size", "icon"].forEach((k) => { if (incoming[k] != null) out[k] = incoming[k]; });
    if (incoming.lessons) out.lessons = incoming.lessons.slice();
    if (incoming.concepts) out.concepts = out.concepts ? out.concepts + "\n\n---\n\n" + incoming.concepts : incoming.concepts;
    ["resources", "qa", "practice"].forEach((k) => {
      if (incoming[k] && incoming[k].length) out[k] = (out[k] || []).concat(incoming[k]);
    });
    return out;
  }

  // Split a week's `concepts` markdown into topics on `## ` headings; `### ` become lessons.
  function splitConcepts(md) {
    if (!md) return [];
    const lines = String(md).replace(/\r\n/g, "\n").split("\n");
    const topics = [];
    let cur = null;
    let inFence = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) inFence = !inFence;
      const h2 = !inFence && line.match(/^##\s+(.*)$/) && !line.startsWith("###");
      const h3 = !inFence && line.match(/^###\s+(.*)$/);
      if (h2) {
        const title = line.replace(/^##\s+/, "").trim();
        // preamble = lines under ## before the first ### (intro / TL;DR)
        cur = { title, body: [line], preamble: [], sections: [], _sec: null };
        topics.push(cur);
      } else if (cur) {
        cur.body.push(line);
        if (h3) {
          cur._sec = { title: h3[1].trim(), body: [line] };
          cur.sections.push(cur._sec);
        } else if (cur._sec) {
          cur._sec.body.push(line);
        } else {
          cur.preamble.push(line);
        }
      }
    }
    return topics.map((t) => {
      const preamble = t.preamble.join("\n").trim();
      // Each ### becomes a bite-sized lesson; preamble rides on the first one.
      let lessonSections;
      if (t.sections.length) {
        lessonSections = t.sections.map((s, i) => ({
          title: s.title,
          concepts: (i === 0 && preamble ? preamble + "\n\n" : "") + s.body.join("\n").trim()
        }));
      } else {
        lessonSections = [{ title: "Overview", concepts: t.body.join("\n").trim() }];
      }
      return {
        title: t.title,
        lessons: lessonSections.map((s) => s.title),
        lessonSections,
        size: lessonSections.length,
        concepts: t.body.join("\n").trim()
      };
    });
  }

  // Compose the normalized model the UI renders. Cached until content changes.
  function buildTrackModel(key) {
    const track = window.TRACKS[key];
    if (!track) return null;
    const explicit = window.TOPICS[key] || {};
    const usedIds = new Set();
    const uniq = (base) => { let id = base, n = 2; while (usedIds.has(id)) id = base + "-" + n++; usedIds.add(id); return id; };

    const modules = (track.modules || []).map((mod) => {
      const week = mod.from && mod.from.week != null ? (window.NOTES[key] || {})[mod.from.week] : null;
      const autoTopics = splitConcepts(week && week.concepts);
      const topics = autoTopics.map((at) => {
        const id = uniq(mod.id + "-" + slug(at.title));
        const ex = explicit[at.title] || explicit[id];
        const base = {
          id,
          title: at.title.replace(/[`*]/g, ""),
          size: at.size,
          lessons: at.lessons,
          lessonSections: at.lessonSections,
          concepts: at.concepts,
          resources: [],
          qa: [],
          practice: []
        };
        // Module-level Q&A / practice / resources / plan flow down as topic fallback.
        base.moduleQa = (week && week.qa) || [];
        base.modulePractice = ((week && week.mock && week.mock.medium) || [])
          .concat((week && week.mock && week.mock.hard) || []);
        base.moduleResources = (week && week.resources) || [];
        base.modulePlan = (week && week.plan) || "";
        return ex ? Object.assign(base, mergeTopic({}, Object.assign({ concepts: base.concepts }, ex))) : base;
      });
      // Any explicit topics declared for this module but not auto-derived: append.
      (mod.extraTopics || []).forEach((tid) => {
        if (explicit[tid]) {
          const t = explicit[tid];
          topics.push(Object.assign({ id: uniq(tid), resources: [], qa: [], practice: [], lessons: t.lessons || ["Overview"], size: t.size || 1 }, t));
        }
      });
      return { id: mod.id, title: mod.title, blurb: mod.blurb || "", topics };
    });

    return { key, name: track.name, icon: track.icon, blurb: track.blurb, modules };
  }

  window.PrepStackRegister = {
    track(key, def) { window.TRACKS[key] = Object.assign({}, window.TRACKS[key], def); },
    resources(key, list) { window.RESOURCES[key] = (window.RESOURCES[key] || []).concat(list); },
    notes(track, weekIdx, content) {
      window.NOTES[track] = window.NOTES[track] || {};
      window.NOTES[track][weekIdx] = mergeNotes(window.NOTES[track][weekIdx], content);
    },
    topic(track, topicId, content) {
      window.TOPICS[track] = window.TOPICS[track] || {};
      window.TOPICS[track][topicId] = mergeTopic(window.TOPICS[track][topicId], content);
    }
  };

  window.PrepStackModel = { build: buildTrackModel, slug };
})();
