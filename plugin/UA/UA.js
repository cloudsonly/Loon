/*
 * UA 改写 —— 仅对 yuanshen.help(:443) 的请求替换 User-Agent
 * 插件：UA.plugin（旧语法）/ UA.lpx（Loon ≥ 3.5.1 新语法）
 * 特点：脚本内自带 host 白名单（即使规则被改宽也不会影响别的域名）
 *       兼容对象 / 数组 / JSON / "k=v,k=v" 等多种 $argument 形态
 * 原脚本：https://he2o.vercel.app/Resource/Plugin/UA.js
 */

// ===== 白名单：只处理这个地址（双保险，规则被改宽也不影响别的域名）=====
const TARGET = /^https?:\/\/yuanshen\.help(?::443)?(?:\/|\?|$)/i;
let headers = $request.headers || {};

if (!TARGET.test(($request && $request.url) || "")) {
    // 不是目标站：原样放行，一个头都不动
    $done({});
} else {
    // ===== 参数解析：兼容 对象 / "k=v,k=v" 字符串 / [OldUA,NewUA] 数组 =====
    let oldUA = "", newUA = "";
    const a = typeof $argument !== "undefined" ? $argument : {};
    if (Array.isArray(a)) {
        oldUA = a[0] || "";
        newUA = a[1] || "";
    } else if (a && typeof a === "object") {
        oldUA = a.OldUA || "";
        newUA = a.NewUA || "";
    } else if (typeof a === "string") {
        const s = a.trim();
        if (s.charAt(0) === "[" || s.charAt(0) === "{") {
            // 有的工具会把 [{OldUA},{NewUA}] 直接替换成 [值1,值2] 或一段 JSON
            try {
                const p = JSON.parse(s);
                if (Array.isArray(p)) {
                    if (p.length && p[0] && typeof p[0] === "object") {
                        oldUA = p[0].OldUA || "";
                        newUA = p[0].NewUA || "";
                    } else {
                        oldUA = p[0] || "";
                        newUA = p[1] || "";
                    }
                } else {
                    oldUA = p.OldUA || "";
                    newUA = p.NewUA || "";
                }
            } catch (e) {
                // 不带引号的 [iPhone,MyApp] 之类，手工剥方括号
                const parts = s.replace(/^\[|\]$/g, "").split(",");
                oldUA = (parts[0] || "").trim().replace(/^["']|["']$/g, "");
                newUA = (parts[1] || "").trim().replace(/^["']|["']$/g, "");
            }
        } else if (s.indexOf("=") > -1) {
            s.split(",").forEach(kv => {
                const i = kv.indexOf("=");
                const k = kv.slice(0, i).trim();
                const v = kv.slice(i + 1).trim();
                if (k === "OldUA") oldUA = v;
                if (k === "NewUA") newUA = v;
            });
        }
    }

    const uaKey = Object.keys(headers).find(
        key => key.toLowerCase() === "user-agent"
    );

    if (uaKey && oldUA && newUA) {
        try {
            if (new RegExp(oldUA).test(headers[uaKey])) {
                headers[uaKey] = newUA;
            }
        } catch (e) {
        }
    }

    $done({ headers });
}
