// ========== Loon 抓包专用精简脚本 ==========
var NEED_KEYS = ["Cookie", "User-Agent", "Accept", "Accept-Language", "Accept-Encoding", "Origin", "Referer", "new-api-user", "Host"];
var HEADER_KEY_PREFIX = "NewAPI_Headers";
var HOSTS_LIST_KEY = "NewAPI_Hosts";
var ACCOUNTS_KEY_PREFIX = "NewAPI_Accounts";
function safeJsonParse(str){try{return JSON.parse(str);}catch(_){return null;}}
function pickNeedHeaders(src){var dst={},lowerMap={};for(var k in (src||{}))lowerMap[String(k).toLowerCase()]=src[k];for(var i=0;i<NEED_KEYS.length;i++){var n=NEED_KEYS[i];var v=src[n]!==undefined?src[n]:lowerMap[String(n).toLowerCase()];if(v!==undefined)dst[n]=v;}return dst;}
function headerKeyForHost(host,account){return account&&account.trim()?HEADER_KEY_PREFIX+":"+host+":"+account:HEADER_KEY_PREFIX+":"+host;}
function getHostFromRequest(){var h=($request&&$request.headers)||{};var host=h.Host||h.host;if(host)return String(host).trim();try{return new URL($request.url).hostname;}catch(_){return "";}}
function siteName(host){try{var name=host.replace(/^www\./,"").split(".")[0].trim();name=name.replace(/[-_]api$/i,"").replace(/[-_]service$/i,"").replace(/^api[-_]/i,"");return (name||host).toUpperCase();}catch(_){return host;}}
function getSavedHosts(){try{var list=safeJsonParse($persistentStore.read(HOSTS_LIST_KEY))||[];return Array.isArray(list)?list.filter(Boolean):[];}catch(e){return [];}}
function getAccountsForHost(host){try{var list=safeJsonParse($persistentStore.read(ACCOUNTS_KEY_PREFIX+":"+host));return Array.isArray(list)&&list.length>0?list:[""];}catch(e){return [""];}}
console.log("🚀 NewAPI 抓包 | " + new Date().toLocaleString());
if (typeof $request === "undefined") {
  console.log("⚠️ 该脚本只用于抓包，定时签到请用 NewAPI.checkin.js");
  $done({});
} else {
  var picked = pickNeedHeaders($request.headers || {});
  var host = getHostFromRequest();
  var account = String(picked["new-api-user"] || "").trim();
  if (!host || !picked.Cookie || !account) {
    console.log("❌ 抓包失败 | host=" + host + " | Cookie=" + (picked.Cookie?"有":"无") + " | new-api-user=" + (account||"无"));
    $notification.post("NewAPI 抓包", "❌ 抓包失败", "缺少 Cookie 或 new-api-user（需已登录站点）");
  } else {
    var key = headerKeyForHost(host, account);
    var old = safeJsonParse($persistentStore.read(key));
    var ok = $persistentStore.write(JSON.stringify(picked), key);
    if (ok) {
      var hosts = getSavedHosts();
      if (hosts.indexOf(host) === -1) { hosts.push(host); $persistentStore.write(JSON.stringify(hosts), HOSTS_LIST_KEY); }
      var accs = getAccountsForHost(host).filter(Boolean);
      if (accs.indexOf(account) === -1) { accs.push(account); $persistentStore.write(JSON.stringify(accs), ACCOUNTS_KEY_PREFIX+":"+host); }
      $persistentStore.write(null, "NewAPI_Failed:" + host + ":" + account);
      console.log("✅ 已保存 | " + siteName(host) + " | 账号 " + account + " | " + (old?"更新":"新增") + " | 该站点共 " + getAccountsForHost(host).length + " 个账号");
      $notification.post("NewAPI 抓包", "✅ 抓包成功", siteName(host) + " · 账号 " + account);
    } else {
      console.log("❌ 写入存储失败");
      $notification.post("NewAPI 抓包", "❌ 抓包失败", "写入存储失败");
    }
  }
  $done({});
}
