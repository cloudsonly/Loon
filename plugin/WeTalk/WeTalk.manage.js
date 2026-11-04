/*
WeTalk 账号库维护（独立脚本，可在 Loon 插件「通用脚本」里手动执行）
  参数 action=list                 → 只列出账号，不做改动
  参数 action=clear                → 清空全部账号
  参数 action=delete&index=2,3     → 删除第 2、3 个（序号见 list）
  不带 action                      → 兼容 BoxJS：执行开关「清空全部账号」

为什么独立成一个脚本：Loon 插件详情页只显示 [Argument] 开关，不列脚本条目，
把常用的手动操作做成插件里的 generic 脚本，才能在插件页里看到并点执行。
*/
const storeKey = 'wetalk_accounts_v1';

function parseArg() {
  const a = (typeof $argument !== 'undefined') ? $argument : null;
  if (!a) return {};
  if (typeof a === 'object') return a;
  const t = String(a).trim();
  if (!t) return {};
  const out = {};
  t.replace(/^\{|\}$/g, '').split(/[,;\n]/).forEach(pair => {
    const i = pair.indexOf('=');
    if (i < 0) { if (pair.trim()) out[pair.trim()] = true; return; }
    // 值里可能还带 &（如 index=1,3&video=false），先整段保留，后面再拆
    out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  // 形如 action=delete&index=1,3 的查询串，第二段里还有 & 分隔
  const hadAmp = String(a).indexOf('&') >= 0;
  if (hadAmp) {
    const flat = {};
    String(a).trim().replace(/^\{|\}$/g, '').split(/[&;]/).forEach(pair => {
      const i = pair.indexOf('=');
      if (i < 0) return;
      flat[pair.slice(0, i).trim()] = pair.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    });
    Object.assign(out, flat);
  }
  Object.keys(out).forEach(k => {
    if (out[k] && typeof out[k] === 'string' && out[k].indexOf('&') >= 0) {
      const [left, ...rest] = out[k].split('&');
      out[k] = left;
      rest.forEach(chunk => {
        const j = chunk.indexOf('=');
        if (j > 0) out[chunk.slice(0, j)] = chunk.slice(j + 1);
      });
    }
  });
  return out;
}

function readK(k) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k);
    if (typeof $prefs !== 'undefined') return $prefs.valueForKey(k);
  } catch (e) {}
  return null;
}

function writeK(v, k) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.write(v, k);
    if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(v, k);
  } catch (e) {}
}

function loadStore() {
  const raw = readK(storeKey);
  if (!raw) return { version: 1, accounts: {}, order: [] };
  try {
    const o = JSON.parse(raw);
    if (!o.accounts) o.accounts = {};
    if (!Array.isArray(o.order)) o.order = Object.keys(o.accounts);
    o.order = o.order.filter(id => o.accounts[id]);
    return o;
  } catch (e) {
    return { version: 1, accounts: {}, order: [] };
  }
}

function label(acc) {
  const p = (acc.capture || {}).paramsRaw || {};
  const uid = p.uid || p.userId || p.id || p.account || p.mobile || p.phone || '';
  const d = acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : '';
  return `${acc.alias || acc.id}${uid ? ' · uid:' + String(uid).slice(0, 20) : ''}${d ? ' · ' + d : ''}`;
}

function listOf(store) {
  if (!store.order.length) return '（账号库为空）';
  return store.order.map((id, i) => `${i + 1}. ${label(store.accounts[id] || {})}`).join('\n');
}

const args = parseArg();
const action = String(args.action || '').trim();
const out = [];
const store = loadStore();
const before = store.order.length;

if (action === 'clear') {
  store.order = [];
  store.accounts = {};
  writeK(JSON.stringify(store), storeKey);
  writeK('false', '@WeTalk.clearAll');
  out.push(`✅ 已清空全部 ${before} 个账号`);
} else if (action === 'delete') {
  const idxs = String(args.index || '').split(/[,\s，、]+/).map(x => parseInt(x, 10)).filter(n => n > 0);
  const delIds = idxs.map(n => store.order[n - 1]).filter(Boolean);
  if (!delIds.length) {
    out.push(`⚠️ index 无效：${args.index || '(空)'}，当前共 ${before} 个账号`);
  } else {
    const removed = delIds.map((id, i) => `  ${i + 1}. ${label(store.accounts[id] || {})}  (${id})`);
    const keep = store.order.filter(id => !delIds.includes(id));
    const next = {};
    keep.forEach(id => { next[id] = store.accounts[id]; });
    store.order = keep;
    store.accounts = next;
    writeK(JSON.stringify(store), storeKey);
    out.push(`🗑 已删除 ${delIds.length} 个账号，剩余 ${store.order.length} 个`);
    out.push('删掉的：');
    removed.forEach(r => out.push(r));
  }
} else if (action === 'list') {
  out.push(`当前共 ${before} 个账号`);
} else {
  const clear = String(readK('@WeTalk.clearAll') || 'false').trim().toLowerCase();
  if (clear === 'true' || clear === '1') {
    store.order = [];
    store.accounts = {};
    writeK(JSON.stringify(store), storeKey);
    writeK('false', '@WeTalk.clearAll');
    out.push(`✅ 已清空全部 ${before} 个账号（BoxJS 开关）`);
  } else {
    out.push(`当前共 ${before} 个账号`);
  }
}

out.push('');
out.push('当前列表：');
out.push(listOf(store));

const text = out.join('\n');
try { console.log(text); } catch (e) {}
try {
  if (typeof $notification !== 'undefined') $notification.post('WeTalk 账号清理', `共 ${store.order.length} 个账号`, text);
  else if (typeof $notify !== 'undefined') $notify('WeTalk 账号清理', `共 ${store.order.length} 个账号`, text);
} catch (e) {}
if (typeof $done !== 'undefined') $done({});