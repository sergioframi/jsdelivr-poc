(async () => {
  if (window.__H1_THOUGHTSPOT_ATO_POC__) return;
  window.__H1_THOUGHTSPOT_ATO_POC__ = true;

  const receiver = window.opener;
  const origin = location.origin;
  const tokenUrl = `${origin}/api/rest/2.0/auth/session/token`;
  const send = (type, data = {}) => {
    try {
      if (receiver) receiver.postMessage({type, ...data}, '*');
    } catch {}
  };
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  let lastStatus = '';

  const reportStatus = message => {
    if (message === lastStatus) return;
    lastStatus = message;
    send('thoughtspot-ato-status', {message});
  };

  send('thoughtspot-ato-ready', {origin});

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(tokenUrl, {
        credentials: 'include',
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
        headers: {Accept: 'application/json'},
      });

      if (response.status === 0 || response.status === 401 || response.status === 403) {
        reportStatus('Waiting for the authenticated ThoughtSpot session');
      } else if (!response.ok) {
        reportStatus(`Token endpoint returned HTTP ${response.status}; retrying`);
      } else {
        const result = await response.json();
        if (result && typeof result.token === 'string' && result.token.trim().length >= 20) {
          send('thoughtspot-ato-proof', {origin, token: result.token.trim()});
          return;
        }
        reportStatus('Token endpoint returned no token; retrying');
      }
    } catch {
      reportStatus('Waiting for the ThoughtSpot session to become available');
    } finally {
      clearTimeout(abortTimer);
    }

    await wait(1000);
  }

  window.__H1_THOUGHTSPOT_ATO_POC__ = false;
  send('thoughtspot-ato-error', {
    message: 'The session token endpoint did not become available within 60 seconds',
  });
})().catch(error => {
  window.__H1_THOUGHTSPOT_ATO_POC__ = false;
  if (window.opener) {
    window.opener.postMessage(
      {type: 'thoughtspot-ato-error', message: String(error.message || error)},
      '*'
    );
  }
});
