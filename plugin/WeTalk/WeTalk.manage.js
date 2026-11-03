/*
WeTalk 账号库维护（独立脚本）
作用：执行 BoxJS → WeTalk 里排队的清理动作（删除勾选的账号 / 清空全部），并刷新账号列表。

两条触发通路：
  1) BoxJS → WeTalk → ③ 立即清理（脚本条目的 ▶），无需打开 App；
  2) 打勾后也可以什么都不点，下次抓包 / cron 签到 / 手动跑 manage 都会自动执行同一份队列。

存储格式说明（兼容旧版）：
  - @WeTalk.delKeys：JSON 数组，元素是账号 id（['a1b2c3','d4e5f6']）；
  - 旧版曾把勾选存成 "id1,id2" 字符串，这里一并兼容；
  - 顺手把 "@WeTalk.delKeys" / "@WeTalk.clearAll" 这类带 @ 的旧字段迁移成正常写法的 key。
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

/* 兼容读取：JSON 数组 / 逗号字符串 / 旧 @ 字段 */
function readDelKeys() {
  let raw = readKey(K_DEL_KEYS);
  let legacy = false;
  if (!raw) { raw = readKey('@' + K_DEL_KEYS); legacy = !!raw; }
  if (!raw) return [];
  raw = String(raw).trim();
  if (!raw) return [];
  let arr = [];
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) arr = j.map(x => (x && typeof x === 'object' ? (x.key || x.id) : x));
  } catch (e) {
    arr = raw.split(/[,\s，、]+/);
  }
  arr = arr.map(x => String(x || '').trim()).filter(Boolean);
  // 旧版可能存的是「序号」(1,2,3)：数字且不是 12 位指纹时，交给调用方按序号解析
  if (legacy) writeKey(JSON.stringify(arr), K_DEL_KEYS);
  return arr;
}

function readClearAll() {
  let raw = readKey(K_CLEAR_ALL);
  if (raw === null || raw === undefined) raw = readKey('@' + K_CLEAR_ALL);
  const v = String(raw || 'false').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function accountLabel(acc) {
  const p = (acc.capture || {}).paramsRaw || {};
  const uid = p.uid || p.userId || p.id || p.account || p.mobile || p.phone || '';
  const created = acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : '';
  return `${acc.alias || acc.id}${uid ? ' · uid:' + String(uid).slice(0, 22) : ''}${created ? ' · ' + created : ''}`;
}

function renderAccountList(store, queue) {
  const selected = new Set((queue || []).map(String));
  const lines = store.order.map((id, i) => {
    const acc = store.accounts[id] || {};
    return `${i + 1}. ${selected.has(id) ? '☑' : '☐'} ${accountLabel(acc)}  (${id})`;
  });
  const text = lines.length ? lines.join('\n') : '（账号库为空）';
  writeKey(text, K_LIST_TEXT);
  writeKey(JSON.stringify(store.order.map(id => ({ id, key: id, label: accountLabel(store.accounts[id] || {}) }))), K_LIST_ITEMS);
  return text;
}

/* 从「② 已存账号」文本里解析哪些行被打了勾（☑ / [x] / ✔） */
function parseCheckedIds() {
  const raw = readKey(K_LIST_TEXT);
  if (!raw) return [];
  const rows = String(raw).split('\n');
  const out = [];
  rows.forEach(line => {
    const m = line.match(/^\s*(\d+)\.\s*(☑|☐|\[x\]|\[ \]|✔|✓)?/i);
    if (!m) return;
    const mark = (m[2] || '').toLowerCase();
    if (!['☑', '[x]', '✔', '✓'].includes(mark)) return;
    const idMatch = line.match(/\(([0-9a-f]{8,})\)\s*$/i);
    if (idMatch) out.push(idMatch[1]);
  });
  return out;
}

function main() {
  const store = loadStore();
  const before = store.order.length;
  const msgs = [];

  if (readClearAll()) {
    store.order = [];
    store.accounts = {};
    saveStore(store);
    writeKey('false', K_CLEAR_ALL);
    writeKey('[]', K_DEL_KEYS);
    writeKey('', '@' + K_CLEAR_ALL);
    writeKey('', '@' + K_DEL_KEYS);
    msgs.push(`✅ 已清空全部 ${before} 个账号，请重新抓包`);
  } else {
    // 决定删除谁：优先用「② 文本里打勾的行」，其次用排队字段 delKeys
    const fromText = parseCheckedIds();
    const rawKeys = fromText.length ? fromText : readDelKeys();
    const delIds = rawKeys.map(k => {
      if (/^\d+$/.test(k) && !store.accounts[k]) {
        const n = parseInt(k, 10);
        return store.order[n - 1] || k; // 旧版「序号」写法
      }
      return k;
    }).filter(Boolean);
    if (delIds.length) {
      const hit = delIds.filter(id => store.accounts[id]);
      const prev = Object.assign({}, store.accounts);
      if (hit.length) {
        const keepOrder = store.order.filter(id => !delIds.includes(id));
        const nextAccounts = {};
        keepOrder.forEach(id => { nextAccounts[id] = store.accounts[id]; });
        store.order = keepOrder;
        store.accounts = nextAccounts;
        saveStore(store);
        writeKey('[]', K_DEL_KEYS);
        writeKey('', '@' + K_DEL_KEYS);
        msgs.push(`🗑 已删除 ${hit.length} 个账号，剩余 ${store.order.length} 个`);
        writeKey(hit.map(id => `〔已删除〕${accountLabel(prev[id] || { id })}  (${id})`).join('\n'), '@WeTalk.lastDeleted');
      } else {
        msgs.push(`⚠️ 勾选的 ${delIds.length} 个账号在库里已不存在（剩余 ${store.order.length} 个）`);
      }
    }
  }

  const text = renderAccountList(store, readDelKeys());
  const body = (msgs.length ? msgs.join('\n') : 'ℹ️ 无需清理') + `\n\n当前账号 ${store.order.length} 个\n` + text;
  writeKey(JSON.stringify(msgs.length ? msgs : ['ℹ️ 无需清理']), K_RESULT);
  console.log(`【${SCRIPT_NAME}】\n${body}`);
  try {
    if (typeof $notification !== 'undefined') $notification.post(SCRIPT_NAME, `共 ${store.order.length} 个账号`, body);
    else if (typeof $notify !== 'undefined') $notify(SCRIPT_NAME, `共 ${store.order.length} 个账号`, body);
  } catch (e) {}
  if (typeof $done !== 'undefined') $done({});
}

main();