// Registry: content files self-register here. Adding content = drop a file + one <script> tag.
// window.PrepStackRegister, window.TRACKS, window.RESOURCES, window.NOTES
(function () {
  window.TRACKS = window.TRACKS || {};
  window.RESOURCES = window.RESOURCES || {};
  window.NOTES = window.NOTES || {};

  window.PrepStackRegister = {
    track(key, def) {
      window.TRACKS[key] = def;
    },
    resources(key, list) {
      window.RESOURCES[key] = list;
    },
    notes(track, weekIdx, content) {
      window.NOTES[track] = window.NOTES[track] || {};
      window.NOTES[track][weekIdx] = content;
    }
  };
})();
