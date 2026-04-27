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
    const injected = '<script>location.replace(' + JSON.stringify('turrit://parseurl?url=' + encodeURIComponent(reqUrl)) + ');</script>';

    if (/<head[^>]*>/i.test(body)) {
      pass(body.replace(/<head[^>]*>/i, function(m) { return m + injected; }));
    } else if (/<html[^>]*>/i.test(body)) {
      pass(body.replace(/<html[^>]*>/i, function(m) { return m + '<head>' + injected + '</head>'; }));
    } else {
      pass(injected + body);
    }
  }
}
