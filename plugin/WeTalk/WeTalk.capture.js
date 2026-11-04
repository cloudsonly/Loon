/*
WeTalk 手动抓包（Loon 插件「抓包一次（手动）」▶ 执行，走 Loon 自己的 HTTP 请求）
原理：Loon 脚本环境没有 App 的登录态，无法凭空生成有效账号；
      所以这里只做两件有用的事：
      1) 用已存账号的抓包参数发一次 queryBalanceAndBonus，验证当前账号是否还有效；
      2) 明确告诉你：要新增/重新抓账号，需要打开 WeTalk App 触发请求插件才会写入。
参数：无
*/
const storeKey = 'wetalk_accounts_v1';
const SECRET = '0fOiukQq7jXZV2GRi9LGlO';
const API_HOST = 'api.wetalkapp.com';

function readK(k) { try { return (typeof $persistentStore !== 'undefined') ? $persistentStore.read(k) : $prefs.valueForKey(k); } catch (e) { return null; } }
function writeK(v, k) { try { return (typeof $persistentStore !== 'undefined') ? $persistentStore.write(v, k) : $prefs.setValueForKey(v, k); } catch (e) {} }

function md5(str) {
  // 精简实现：复用 Env 里的 MD5（与主脚本一致）
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000, lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) return (lResult & 0x40000000) ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8) : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function ConvertToWordArray(string) {
    const l = string.length, t1 = l + 8, t2 = (t1 - (t1 % 64)) / 64, n = (t2 + 1) * 16, arr = Array(n - 1).fill(0);
    let pos = 0, count = 0;
    while (count < l) { const wc = (count - (count % 4)) / 4; pos = (count % 4) * 8; arr[wc] |= string.charCodeAt(count) << pos; count++; }
    const wc = (count - (count % 4)) / 4; pos = (count % 4) * 8;
    arr[wc] |= 0x80 << pos; arr[n - 2] = l << 3; arr[n - 1] = l >>> 29;
    return arr;
  }
  function WordToHex(lValue) { let out = ''; for (let c = 0; c <= 3; c++) { const b = (lValue >>> (c * 8)) & 255; const t = '0' + b.toString(16); out += t.substr(t.length - 2, 2); } return out; }
  function Utf8Encode(string) {
    string = string.replace(/\r\n/g, '\n'); let utftext = '';
    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);
      if (c < 128) utftext += String.fromCharCode(c);
      else if (c > 127 && c < 2048) { utftext += String.fromCharCode((c >> 6) | 192); utftext += String.fromCharCode((c & 63) | 128); }
      else { utftext += String.fromCharCode((c >> 12) | 224); utftext += String.fromCharCode(((c >> 6) & 63) | 128); utftext += String.fromCharCode((c & 63) | 128); }
    }
    return utftext;
  }
  let x = Array(), k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22, S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23, S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  string = Utf8Encode(str); x = ConvertToWordArray(string);
  a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = AddUnsigned(a, AA); b = AddUnsigned(b, BB); c = AddUnsigned(c, CC); d = AddUnsigned(d, DD);
  }
  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}

function getUTCSignDate() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function request(url, headers) {
  return new Promise((resolve, reject) => {
    if (typeof $httpClient !== 'undefined') $httpClient.get({ url, headers }, (e, r, body) => e ? reject(e) : resolve(body));
    else if (typeof $task !== 'undefined') $task.fetch({ url, headers }).then(r => resolve(r.body), e => reject(e && e.error || e));
    else reject('环境不支持');
  });
}

const raw = readK(storeKey);
const out = [];
let store = { version: 1, accounts: {}, order: [] };
let finished = false;
try { if (raw) store = JSON.parse(raw); } catch (e) {}
if (!store.accounts) store.accounts = {};
if (!Array.isArray(store.order)) store.order = Object.keys(store.accounts);
store.order = store.order.filter(id => store.accounts[id]);

out.push(`账号库现有 ${store.order.length} 个账号`);
if (!store.order.length) {
  out.push('');
  out.push('账号库是空的。Loon 无法凭空生成 App 的登录态，所以必须由 WeTalk App 触发一次抓包：');
  out.push('1. 保持本插件「抓包」开关为开（设置里）');
  out.push('2. 打开 WeTalk App，进入首页/我的页面');
  out.push('3. 收到「✅ 新账号已入库」通知即成功，之后可以把抓包开关关掉');
} else {
  // 用第一个账号验证是否还有效
  const id = store.order[0];
  const acc = store.accounts[id] || {};
  const cap = acc.capture || {};
  const params = {};
  Object.keys(cap.paramsRaw || {}).forEach(k => { if (k !== 'sign' && k !== 'signDate') params[k] = cap.paramsRaw[k]; });
  params.signDate = getUTCSignDate();
  const base = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  params.sign = md5(base + SECRET);
  const url = `https://${API_HOST}/app/queryBalanceAndBonus?` + Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
  const headers = Object.assign({}, cap.headers || {});
  delete headers[':authority']; delete headers[':method']; delete headers[':path']; delete headers[':scheme'];
  request(url, headers).then(body => {
    try {
      const d = JSON.parse(body);
      out.push(`第 1 个账号（${acc.alias || id}）验证：retcode=${d.retcode} ${d.retmsg || ''}${d.retcode === 0 ? '（账号有效）' : '（可能已失效，建议清空后重新抓包）'}`);
    } catch (e) {
      out.push(`第 1 个账号请求返回异常：${String(body).slice(0, 120)}`);
    }
    finish();
  }).catch(e => { out.push('请求失败：' + (e && e.error || e)); finish(); });
}

function finish() {
  if (finished) return;
  finished = true;
  out.push('');
  out.push('如需新增账号：保持「抓包」开关开启，打开 WeTalk App 触发一次 queryBalanceAndBonus 即可。');
  const text = out.join('\n');
  console.log(text);
  try { if (typeof $notification !== 'undefined') $notification.post('WeTalk 抓包', '', text); else if (typeof $notify !== 'undefined') $notify('WeTalk 抓包', '', text); } catch (e) {}
  if (typeof $done !== 'undefined') $done({});
}

if (!store.order.length) finish();