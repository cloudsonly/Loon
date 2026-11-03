/*
WeTalk 账号清理（BoxJS 脚本条目 ▶ 执行，结果直接弹在「执行结果」里）
  地址带 ?index=1,3  → 删除列表里第 1、3 个账号
  地址带 ?all=1      → 清空全部账号（同时把「清空全部账号」开关复位）
  不带参数           → 只列出账号，不做任何修改

为什么这么设计：BoxJS 的文本设置框要重新进页面才刷新，常显示空白旧值；
而脚本的执行结果会当场弹出，不存在刷新问题。
*/
const ARG = (typeof $script !== 'undefined' && $script && $script.argument) ? String($script.argument) : '';
const storeKey = 'wetalk_accounts_v1';
const K_CLEAR_ALL = '@WeTalk.clearAll';
const K_LAST_DEL = '@WeTalk.lastDeleted';

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

function arg(name) {
  const m = ARG.match(new RegExp('[?&]' + name + '=([^&]*)'));
  return m ? decodeURIComponent(m[1]) : '';
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

const out = [];
const store = loadStore();
const before = store.order.length;

const idxArg = arg('index').trim();
const allArg = arg('all');
const clearSwitch = String(readK(K_CLEAR_ALL) || 'false').trim().toLowerCase();

if (allArg === '1' || clearSwitch === 'true' || clearSwitch === '1') {
  store.order = [];
  store.accounts = {};
  writeK(JSON.stringify(store), storeKey);
  writeK('false', K_CLEAR_ALL);
  writeK('', K_LAST_DEL);
  out.push(`✅ 已清空全部 ${before} 个账号`);
  out.push('重新打开 WeTalk App 抓一次包即可。');
} else if (idxArg) {
  const idxs = idxArg.split(/[,\s，、]+/).map(x => parseInt(x, 10)).filter(n => n > 0);
  const delIds = idxs.map(n => store.order[n - 1]).filter(Boolean);
  if (!delIds.length) {
    out.push(`⚠️ 序号无效：${idxArg}（当前共 ${before} 个账号）`);
  } else {
    const removedLines = delIds.map((id, i) => `  ${i + 1}. ${label(store.accounts[id] || {})}  (${id})`);
    const nextAccounts = {};
    const keep = store.order.filter(id => !delIds.includes(id));
    keep.forEach(id => { nextAccounts[id] = store.accounts[id]; });
    store.order = keep;
    store.accounts = nextAccounts;
    writeK(JSON.stringify(store), storeKey);
    writeK(removedLines.join('\n'), K_LAST_DEL);
    out.push(`🗑 已删除 ${delIds.length} 个账号，剩余 ${store.order.length} 个`);
    out.push('删掉的：');
    out.push(...removedLines);
  }
} else {
  out.push(`当前共 ${before} 个账号：`);
}

out.push('');
out.push('当前列表：');
out.push(listOf(store));
if (!idxArg && allArg !== '1') {
  out.push('');
  out.push('要删哪几个？把序号填进「① 删除指定的账号」的地址再点那条 ►，例如：');
  out.push('  .../WeTalk.del.js?index=2,3');
}

const text = out.join('\n');
console.log(text);
try {
  if (typeof $notification !== 'undefined') $notification.post('WeTalk 账号清理', `共 ${store.order.length} 个账号`, text);
  else if (typeof $notify !== 'undefined') $notify('WeTalk 账号清理', `共 ${store.order.length} 个账号`, text);
} catch (e) {}
if (typeof $done !== 'undefined') $done({});