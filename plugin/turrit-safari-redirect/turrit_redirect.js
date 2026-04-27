// Turrit Safari Redirect for Loon
const reqUrl = $request.url;
const method = ($request.method || 'GET').toUpperCase();

function pass() {
  $done({});
}

if (method !== 'GET') {
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
  const isAssetLike = /\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i.test(path);

  if (hasEmbed || hasMode || isStats || isAssetLike) {
    pass();
  } else {
    const direct = 'turrit://parseurl?url=' + encodeURIComponent(reqUrl);
    $done({
      status: 'HTTP/1.1 302 Found',
      headers: {
        Location: direct,
        'Cache-Control': 'no-store',
      },
    });
  }
}
