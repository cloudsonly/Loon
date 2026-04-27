// Turrit response injection for Loon
const reqUrl = $request.url;
const method = ($request.method || 'GET').toUpperCase();
const headers = $response.headers || {};
const contentType = headers['Content-Type'] || headers['content-type'] || '';

function pass(body) {
  if (typeof body === 'string') {
    $done({ body });
  } else {
    $done({});
  }
}

function buildDirectUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname.replace(/^\/+/, '');
    const q = url.searchParams;

    if (host === 't.me' || host === 'telegram.me' || host === 'telegram.dog') {
      if (path.startsWith('+')) {
        return 'turrit://join?invite=' + encodeURIComponent(path.slice(1));
      }
      if (path.startsWith('joinchat/')) {
        return 'turrit://join?invite=' + encodeURIComponent(path.slice('joinchat/'.length));
      }
      if (path === 'joinchat' && q.get('invite')) {
        return 'turrit://join?invite=' + encodeURIComponent(q.get('invite'));
      }
      if (path === 'addstickers' && q.get('set')) {
        return 'turrit://addstickers?set=' + encodeURIComponent(q.get('set'));
      }

      const seg = path.split('/').filter(Boolean);
      if (seg.length >= 2 && /^\d+$/.test(seg[1])) {
        return 'turrit://resolve?domain=' + encodeURIComponent(seg[0]) + '&post=' + encodeURIComponent(seg[1]);
      }
      if (seg.length >= 1 && seg[0]) {
        return 'turrit://resolve?domain=' + encodeURIComponent(seg[0]);
      }
    }
  } catch (e) {}
  return 'turrit://parseurl?url=' + encodeURIComponent(rawUrl);
}

if (method !== 'GET') {
  pass();
} else if (!/text\/html/i.test(contentType)) {
  pass();
} else {
  let url;
  try {
    url = new URL(reqUrl);
  } catch (e) {
    pass();
  }

  const path = url.pathname || '/';
  const hasEmbed = url.searchParams.get('embed') === '1';
  const hasMode = url.searchParams.has('mode');
  const isStats = path === '/v/' || path.indexOf('/v/') === 0;

  if (hasEmbed || hasMode || isStats) {
    pass();
  } else {
    const body = $response.body || '';
    const direct = buildDirectUrl(reqUrl);
    const fallback = 'turrit://parseurl?url=' + encodeURIComponent(reqUrl);
    const injected = '<script>(function(){var direct=' + JSON.stringify(direct) + ';var fallback=' + JSON.stringify(fallback) + ';location.replace(direct);setTimeout(function(){location.href=fallback;},400);})();</script>';

    if (/<head[^>]*>/i.test(body)) {
      pass(body.replace(/<head[^>]*>/i, function(m) { return m + injected; }));
    } else if (/<html[^>]*>/i.test(body)) {
      pass(body.replace(/<html[^>]*>/i, function(m) { return m + '<head>' + injected + '</head>'; }));
    } else {
      pass(injected + body);
    }
  }
}
