/*
WeTalk 账号库原文（独立脚本）
作用：把账号库 wetalk_accounts_v1 的可读摘要和原始 JSON 写进 BoxJS 的「账号库原文」字段，方便核对。
在 BoxJS → WeTalk → 脚本「查看账号库原文」点 ▶ 执行。
*/
const SCRIPT_NAME = 'WeTalk账号库原文';
const storeKey = 'wetalk_accounts_v1';

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

const raw = readKey(storeKey) || '';
let store = { version: 1, accounts: {}, order: [] };
try { if (raw) store = JSON.parse(raw); } catch (e) {}
if (!store.accounts) store.accounts = {};
if (!Array.isArray(store.order)) store.order = Object.keys(store.accounts);

const summary = store.order.map((id, i) => {
  const a = store.accounts[id] || {};
  const p = (a.capture || {}).paramsRaw || {};
  const created = a.createdAt ? new Date(a.createdAt).toLocaleString() : '-';
  return `${i + 1}. ${a.alias || '-'}  id:${id}\n    参数键: ${Object.keys(p).join(', ')}\n    入库: ${created}`;
}).join('\n');

const body = (summary || '（账号库为空）') + '\n\n===== 原始 JSON =====\n' + (raw || '{}');
writeKey(body, '@WeTalk.accountRaw');
console.log(`【${SCRIPT_NAME}】\n${body}`);
if (typeof $done !== 'undefined') $done({});