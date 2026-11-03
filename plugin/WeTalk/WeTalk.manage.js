/*
WeTalk 账号库维护（独立脚本）
作用：执行 BoxJS → WeTalk 里保存的清理动作（勾选的账号 / 清空全部），并刷新账号列表。
用法：
  1) BoxJS → WeTalk → 勾选要删除的账号 → 右上角保存
  2) BoxJS → WeTalk → 「保存账号记录」那一项的 ▶ 立即执行
  或 在 Loon 里手动运行本脚本地址；或把它加进一个临时 cron。
不安装 BoxJS 也能用：直接设置 key `@WeTalk.delKeys`（JSON 数组，元素是账号 id）或 `@WeTalk.clearAll`（true）。
*/
const SCRIPT_NAME = 'WeTalk账号维护';
const storeKey = 'wetalk_accounts_v1';
const K_DEL_KEYS = '@WeTalk.delKeys';
const K_CLEAR_ALL = '@WeTalk.clearAll';
const K_LIST_ITEMS = '@WeTalk.accountList';
const K_LIST_TEXT = '@WeTalk.accountListText';
const K_RESULT = '@WeTalk.resetToken';

function readKey(key) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key);
    if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key);
  } catch (e) {}
  return null;
}

function writeKey(val, key) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.write(val, key);
    if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(val, key);
  } catch (e) {}
}

function loadStore() {
  const raw = readKey(storeKey);
  if (!raw) return { version: 1, accounts: {}, order: [] };
  try {
    const obj = JSON.parse(raw);
    if (!obj.accounts) obj.accounts = {};
    if (!Array.isArray(obj.order)) obj.order = Object.keys(obj.accounts);
    obj.order = obj.order.filter(id => obj.accounts[id]);
    return obj;
  } catch (e) {
    return { version: 1, accounts: {}, order: [] };
  }
}

function saveStore(store) {
  writeKey(JSON.stringify(store), storeKey);
}

function accountLabel(acc) {
  const p = (acc.capture || {}).paramsRaw || {};
  const uid = p.uid || p.userId || p.id || p.account || p.mobile || p.phone || '';
  const created = acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : '';
  return `${acc.alias || acc.id}${uid ? ' · ' + String(uid).slice(0, 22) : ''}${created ? ' · ' + created : ''}`;
}

function renderAccountList(store) {
  let keys = [];
  try {
    const raw = readKey(K_DEL_KEYS);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) keys = arr.map(String);
  } catch (e) {}
  const selected = new Set(keys);
  const items = store.order.map(id => ({ id, key: id, label: accountLabel(store.accounts[id] || {}) }));
  const text = items.length ? items.map((it, i) => `${i + 1}. ${selected.has(it.id) ? '☑' : '☐'} ${it.label}  (${it.id})`).join('\n') : '（账号库为空）';
  writeKey(JSON.stringify(items), K_LIST_ITEMS);
  writeKey(text, K_LIST_TEXT);
  return text;
}

function main() {
  const store = loadStore();
  const before = store.order.length;
  const msgs = [];

  const clearAll = String(readKey(K_CLEAR_ALL) || 'false').trim();
  if (clearAll === 'true' || clearAll === '1') {
    store.order = [];
    store.accounts = {};
    saveStore(store);
    writeKey('false', K_CLEAR_ALL);
    writeKey('[]', K_DEL_KEYS);
    msgs.push('✅ 已清空全部账号，请重新抓包');
  } else {
    let delIds = [];
    try {
      const raw = readKey(K_DEL_KEYS);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) delIds = arr.map(String).filter(Boolean); }
    } catch (e) {}
    if (delIds.length) {
      const hit = delIds.filter(id => store.accounts[id]);
      store.order = store.order.filter(id => !delIds.includes(id));
      Object.keys(store.accounts).forEach(id => { if (!store.order.includes(id)) delete store.accounts[id]; });
      saveStore(store);
      writeKey('[]', K_DEL_KEYS);
      msgs.push(hit.length ? `🗑 已删除 ${hit.length} 个账号，剩余 ${store.order.length} 个` : `⚠️ 勾选的账号已不存在（剩余 ${store.order.length} 个）`);
    }
  }

  const text = renderAccountList(store);
  const body = (msgs.length ? msgs.join('\n') : 'ℹ️ 无需清理') + '\n\n' + text;
  writeKey(JSON.stringify(msgs.length ? msgs : ['ℹ️ 无需清理']), K_RESULT);
  console.log(`【${SCRIPT_NAME}】\n${body}`);
  try {
    if (typeof $notification !== 'undefined') $notification.post(SCRIPT_NAME, `共 ${store.order.length} 个账号`, body);
    else if (typeof $notify !== 'undefined') $notify(SCRIPT_NAME, `共 ${store.order.length} 个账号`, body);
  } catch (e) {}
  if (typeof $done !== 'undefined') $done({});
}

main();