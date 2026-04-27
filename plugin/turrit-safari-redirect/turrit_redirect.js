// Turrit Safari Redirect for Loon
// Repo: https://github.com/cloudsonly/Loon/tree/main/plugin
// Raw : https://raw.githubusercontent.com/cloudsonly/Loon/main/plugin/turrit_redirect.js

const reqUrl = $request.url;
const appStore = 'https://apps.apple.com/us/app/turrit-a-plus-messenger/id6471781238';

function parseTelegramUrl(u) {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname.replace(/^\/+/, '');
    const q = url.searchParams;

    if (host === 't.me' || host === 'telegram.me' || host === 'telegram.dog') {
      if (path.startsWith('joinchat/')) {
        return { type: 'join', value: path.slice('joinchat/'.length), original: u };
      }
      if (path === 'joinchat' && q.get('invite')) {
        return { type: 'join', value: q.get('invite'), original: u };
      }
      if (path.startsWith('+')) {
        return { type: 'join', value: path.slice(1), original: u };
      }
      if (path === 'addstickers' && q.get('set')) {
        return { type: 'addstickers', value: q.get('set'), original: u };
      }
      if (path) {
        return {
          type: 'resolve',
          domain: path,
          post: q.get('post') || '',
          comment: q.get('comment') || '',
          thread: q.get('thread') || '',
          original: u,
        };
      }
    }
  } catch (e) {}
  return { type: 'raw', original: u };
}

function buildCandidates(info) {
  const c = [];

  if (info.type === 'resolve') {
    let suffix = 'domain=' + encodeURIComponent(info.domain);
    if (info.post) suffix += '&post=' + encodeURIComponent(info.post);
    if (info.comment) suffix += '&comment=' + encodeURIComponent(info.comment);
    if (info.thread) suffix += '&thread=' + encodeURIComponent(info.thread);
    c.push('turrit://resolve?' + suffix);
  } else if (info.type === 'join') {
    c.push('turrit://join?invite=' + encodeURIComponent(info.value));
  } else if (info.type === 'addstickers') {
    c.push('turrit://addstickers?set=' + encodeURIComponent(info.value));
  }

  c.push(appStore);
  return c;
}

const info = parseTelegramUrl(reqUrl);
const candidates = buildCandidates(info);
const direct = candidates[0] || appStore;

const body = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Turrit Redirect</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;background:#f4f7fb;color:#1f2d3d;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#fff;max-width:680px;width:100%;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
h1{font-size:24px;margin:0 0 12px}
p{line-height:1.6;color:#52606d;word-break:break-all}.btn{display:block;text-align:center;text-decoration:none;background:#3b82f6;color:#fff;padding:14px 16px;border-radius:12px;margin-top:12px;font-weight:600}.sub{background:#eef2ff;color:#344054}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#f8fafc;padding:10px;border-radius:10px}
</style>
</head>
<body>
<div class="card">
<h1>正在跳转到 Turrit</h1>
<p>若未自动打开，请点击下方按钮。</p>
<p class="mono">${reqUrl}</p>
<a class="btn" href="${direct}">打开 Turrit</a>
<a class="btn sub" href="${appStore}">前往 App Store</a>
</div>
<script>
setTimeout(function(){ location.href = ${JSON.stringify(direct)}; }, 120);
setTimeout(function(){ location.href = ${JSON.stringify(appStore)}; }, 1800);
</script>
</body>
</html>`;

$done({
  status: 'HTTP/1.1 200 OK',
  headers: { 'Content-Type': 'text/html; charset=utf-8' },
  body,
});
