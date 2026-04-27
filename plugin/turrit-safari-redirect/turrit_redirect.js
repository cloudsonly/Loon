// Turrit Safari Redirect for Loon
const reqUrl = $request.url;
const appStore = 'https://apps.apple.com/us/app/turrit-a-plus-messenger/id6471781238';
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
