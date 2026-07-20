// Registry: content files self-register here. Adding content = drop a file + one <script> tag.
// notes() MERGES per (track, week): concepts append, qa/mock concatenate, days merge —
// so multiple files can contribute to the same week (e.g. transcript deep-dive + recall cards).
// window.PrepStackRegister, window.TRACKS, window.RESOURCES, window.NOTES
(function () {
  window.TRACKS = window.TRACKS || {};
  window.RESOURCES = window.RESOURCES || {};
  window.NOTES = window.NOTES || {};

  function mergeNotes(existing, incoming) {
    const out = existing || {};
    if (incoming.concepts) {
      out.concepts = out.concepts ? out.concepts + "\n\n---\n\n" + incoming.concepts : incoming.concepts;
    }
    if (incoming.qa && incoming.qa.length) {
      out.qa = (out.qa || []).concat(incoming.qa);
    }
    if (incoming.mock) {
      out.mock = out.mock || {};
      ["easy", "medium", "hard"].forEach((tier) => {
        if (incoming.mock[tier] && incoming.mock[tier].length) {
          out.mock[tier] = (out.mock[tier] || []).concat(incoming.mock[tier]);
        }
      });
    }
    if (incoming.days) {
      out.days = Object.assign(out.days || {}, incoming.days);
    }
    return out;
  }

  window.PrepStackRegister = {
    track(key, def) {
      window.TRACKS[key] = def;
    },
    resources(key, list) {
      window.RESOURCES[key] = (window.RESOURCES[key] || []).concat(list);
    },
    notes(track, weekIdx, content) {
      window.NOTES[track] = window.NOTES[track] || {};
      window.NOTES[track][weekIdx] = mergeNotes(window.NOTES[track][weekIdx], content);
    }
  };
})();
