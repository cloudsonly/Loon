// Turrit Safari Redirect for Loon
const reqUrl = $request.url;
const method = ($request.method || 'GET').toUpperCase();
const appStore = 'https://apps.apple.com/us/app/turrit-a-plus-messenger/id6471781238';

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
    const body = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Redirect</title></head><body><script>
location.replace(${JSON.stringify(direct)});
setTimeout(function(){ location.href = ${JSON.stringify(direct)}; }, 120);
setTimeout(function(){ location.href = ${JSON.stringify(appStore)}; }, 1800);
</script><p style="font-family:-apple-system;padding:20px">正在跳转到第三方 Telegram…</p></body></html>`;

    $done({
      status: 'HTTP/1.1 200 OK',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body,
    });
  }
}
