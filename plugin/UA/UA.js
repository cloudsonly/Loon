/*
 * UA 改写 —— 只对插件里填写的域名列表替换 User-Agent
 *
 * 配套插件：UA.lpx（MITM hostname = *，任意域名只需改插件输入框）
 * 域名白名单由 [Argument] Hosts 传入，脚本侧再做一次严格校验。
 * 原脚本：https://he2o.vercel.app/Resource/Plugin/UA.js
 */

const DEFAULT_HOSTS = "yuanshen.help";

// 清理字符串参数（剥引号、空白）
function clean(v) {
    return v == null ? "" : String(v).trim().replace(/^["']|["']$/g, "");
}

// ===== 参数解析：兼容对象 / 数组 / JSON / "k=v,k=v" =====
function parseArgs(raw) {
    const out = { Hosts: null, OldUA: "", NewUA: "" };
    let a = raw;

    if (typeof a === "string") {
        const s = a.trim();
        if (s.charAt(0) === "[" || s.charAt(0) === "{") {
            try {
                const p = JSON.parse(s);
                a = (Array.isArray(p) && p.length && p[0] && typeof p[0] === "object") ? p[0] : p;
            } catch (e) {
                const parts = s.replace(/^\[|\]$/g, "").split(",");
                if (parts.length >= 3) {
                    a = { Hosts: clean(parts[0]), OldUA: clean(parts[1]), NewUA: clean(parts[2]) };
                } else {
                    a = { OldUA: clean(parts[0]), NewUA: clean(parts[1]) };
                }
            }
        } else if (s.indexOf("=") > -1) {
            a = {};
            s.split(",").forEach(kv => {
                const i = kv.indexOf("=");
                if (i > -1) a[kv.slice(0, i).trim()] = clean(kv.slice(i + 1));
            });
        }
    }

    if (Array.isArray(a)) {
        if (a.length >= 3) {
            out.Hosts = clean(a[0]); out.OldUA = clean(a[1]); out.NewUA = clean(a[2]);
        } else {
            out.OldUA = clean(a[0]); out.NewUA = clean(a[1]);
        }
    } else if (a && typeof a === "object") {
        out.Hosts = a.Hosts != null ? clean(a.Hosts) : (a.Host != null ? clean(a.Host) : null);
        out.OldUA = clean(a.OldUA);
        out.NewUA = clean(a.NewUA);
    }
    return out;
}

// ===== 把用户填的域名列表编译成 host 正则 =====
// 支持：裸域名、完整 URL、逗号/空格/分号/换行分隔、*.example.com 通配
function compileHosts(raw) {
    if (!raw) return [];
    return String(raw)
        .split(/[,;\s]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(entry => {
            let e = entry
                .replace(/^https?:\/\//i, "")
                .replace(/[\/?#].*$/, "")
                .replace(/^.*@/, "")
                .replace(/:\d+$/, "")
                .replace(/\.$/, "")
                .toLowerCase();
            const wildcard = e.indexOf("*.") === 0;
            if (wildcard) e = e.slice(2);
            const esc = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const prefix = wildcard ? "^(?:[^.]+\\.)*" : "^";
            return new RegExp(prefix + esc + "$", "i");
        });
}

function hostOf(url) {
    const m = /^[a-z][a-z0-9+.-]*:\/\/([^\/?#]+)/i.exec(url || "");
    if (!m) return "";
    return m[1].replace(/^.*@/, "").replace(/:\d+$/, "").replace(/\.$/, "").toLowerCase();
}

// ===== 主逻辑 =====
const args = parseArgs(typeof $argument !== "undefined" ? $argument : {});
const hostsRaw = (args.Hosts === null || args.Hosts === "") ? DEFAULT_HOSTS : args.Hosts;
const url = ($request && $request.url) || "";
let headers = $request.headers || {};

const matchers = compileHosts(hostsRaw);
const hit = matchers.length > 0 && matchers.some(re => re.test(hostOf(url)));

if (!hit || !args.OldUA || !args.NewUA) {
    // 不在白名单 / 参数不全：原样放行，一个头都不动
    $done({});
} else {
    const uaKey = Object.keys(headers).find(
        key => key.toLowerCase() === "user-agent"
    );

    if (uaKey) {
        try {
            if (new RegExp(args.OldUA).test(headers[uaKey])) {
                headers[uaKey] = args.NewUA;
            }
        } catch (e) {
            // 非法正则：静默忽略，与原版行为一致
        }
    }

    $done({ headers });
}
