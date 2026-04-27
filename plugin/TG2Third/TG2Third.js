// 将 Safari 中的 Telegram 官方外链转换为第三方客户端跳转页

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
        return {
          type: 'join',
          value: path.slice('joinchat/'.length),
          original: u,
        };
      }
      if (path === 'joinchat' && q.get('invite')) {
        return {
          type: 'join',
          value: q.get('invite'),
          original: u,
        };
      }
      if (path.startsWith('+')) {
        return {
          type: 'join',
          value: path.slice(1),
          original: u,
        };
      }
      if (path === 'addstickers' && q.get('set')) {
        return {
          type: 'addstickers',
          value: q.get('set'),
          original: u,
        };
      }
      if (path === 'proxy') {
        return {
          type: 'proxy',
          server: q.get('server') || '',
          port: q.get('port') || '',
          secret: q.get('secret') || '',
          original: u,
        };
      }
      if (path === 'socks') {
        return {
          type: 'socks',
          server: q.get('server') || '',
          port: q.get('port') || '',
          user: q.get('user') || '',
          pass: q.get('pass') || '',
          original: u,
        };
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
    c.push('tg://resolve?' + suffix);
  } else if (info.type === 'join') {
    c.push('turrit://join?invite=' + encodeURIComponent(info.value));
    c.push('tg://join?invite=' + encodeURIComponent(info.value));
  } else if (info.type === 'addstickers') {
    c.push('turrit://addstickers?set=' + encodeURIComponent(info.value));
    c.push('tg://addstickers?set=' + encodeURIComponent(info.value));
  } else if (info.type === 'proxy') {
    const suffix = 'server=' + encodeURIComponent(info.server) + '&port=' + encodeURIComponent(info.port) + '&secret=' + encodeURIComponent(info.secret);
    c.push('turrit://proxy?' + suffix);
    c.push('tg://proxy?' + suffix);
  } else if (info.type === 'socks') {
    let suffix = 'server=' + encodeURIComponent(info.server) + '&port=' + encodeURIComponent(info.port);
    if (info.user) suffix += '&user=' + encodeURIComponent(info.user);
    if (info.pass) suffix += '&pass=' + encodeURIComponent(info.pass);
    c.push('turrit://socks?' + suffix);
    c.push('tg://socks?' + suffix);
  }
  c.push(info.original);
  c.push(appStore);
  return c;
}

const info = parseTelegramUrl(reqUrl);
const candidates = buildCandidates(info);
const title = '正在跳转到 Turrit';
const body = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;background:#f4f7fb;color:#1f2d3d;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#fff;max-width:680px;width:100%;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
h1{font-size:24px;margin:0 0 12px}
p{line-height:1.6;color:#52606d;word-break:break-all}.btn{display:block;text-align:center;text-decoration:none;background:#3b82f6;color:#fff;padding:14px 16px;border-radius:12px;margin-top:12px;font-weight:600}.sub{background:#eef2ff;color:#344054}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#f8fafc;padding:10px;border-radius:10px}
</style>
</head>
<body>
<div class="card">
<h1>${title}</h1>
<p>如果已安装 Turrit，将优先尝试拉起 Turrit；若失败，再尝试 Telegram / 原始链接 / App Store。</p>
<p class="mono">${reqUrl}</p>
<a class="btn" href="${candidates[0] || appStore}">立即打开</a>
<a class="btn sub" href="${appStore}">未安装？前往 App Store</a>
</div>
<script>
const list = ${JSON.stringify(candidates)};
let i = 0;
function openNext(){
  if(i >= list.length) return;
  location.href = list[i++];
  if(i < list.length) setTimeout(openNext, 900);
}
setTimeout(openNext, 150);
</script>
</body>
</html>`;

$done({
  status: 'HTTP/1.1 200 OK',
  headers: { 'Content-Type': 'text/html; charset=utf-8' },
  body,
});
