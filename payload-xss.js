(() => {
  if (window.__H1_THOUGHTSPOT_XSS_SHOWN__) return;
  window.__H1_THOUGHTSPOT_XSS_SHOWN__ = true;
  alert(`XSS origin: ${location.origin}`);
})();
