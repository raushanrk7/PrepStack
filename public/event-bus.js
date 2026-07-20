// Tiny pub/sub. window.EventBus
(function () {
  const listeners = new Map();

  function on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => off(evt, fn);
  }

  function off(evt, fn) {
    listeners.get(evt)?.delete(fn);
  }

  function emit(evt, payload) {
    listeners.get(evt)?.forEach((fn) => fn(payload));
  }

  function once(evt, fn) {
    const unsub = on(evt, (payload) => {
      unsub();
      fn(payload);
    });
    return unsub;
  }

  window.EventBus = { on, off, emit, once };
})();
