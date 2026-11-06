# UA 改写 · 仅 yuanshen.help

基于 he2o 的 [UA.js](https://he2o.vercel.app/Resource/Plugin/UA.js)（「对 UA 学习探索」）改造：**只对一个指定地址的请求替换 `User-Agent`**，其它域名不解密、不改动。

## 安装

Loon ≥ 3.5.1(983)，推荐用新语法版：

```
https://raw.githubusercontent.com/cloudsonly/Loon/refs/heads/main/plugin/UA/UA.lpx
```

旧版 Loon 用兼容语法：

```
https://raw.githubusercontent.com/cloudsonly/Loon/refs/heads/main/plugin/UA/UA.plugin
```

装好后打开插件详情，填两个输入框：

| 参数 | 说明 |
|---|---|
| 原 UA 特征 | **按正则匹配**当前 User-Agent。建议只填一段特征，如 `iPhone OS 17_0`。整条 UA 粘进去要转义 `.` `+` `(` `)` 等元字符 |
| 新 UA | **整条替换**后的 User-Agent（不是只替换匹配到的那一段）。如 `MyApp/9.9` |

两项都填才生效；任一留空则原样放行。

## 与原版的区别

| | 原版 | 本版 |
|---|---|---|
| `[Script]` 匹配 | `^https?:\/\/.*`（所有请求） | `^https?:\/\/yuanshen\.help(:443)?(\/|\?|$)` |
| `[MITM]` | `hostname = *`（解密所有域名） | `hostname = yuanshen.help` |
| 脚本内校验 | 无 | 再加一层 host 白名单，规则被改宽也不会动别的域名 |
| `$argument` | 只认对象 | 兼容对象 / 数组 / JSON / `k=v,k=v` 字符串 |
| `Demo` 参数 | 存在但无用途 | 移除 |

域名边界 `(\/|\?|$)` 用于防止 `yuanshen.help.evil.com` 这类被误命中；`(:443)?` 是因为 443 为 https 默认端口，`$request.url` 里通常不带端口。

## 换成别的地址

三处一起改：

1. `UA.plugin` / `UA.lpx` 的 URL 正则；
2. `[MITM] hostname = ...`；
3. `UA.js` 顶部的 `TARGET` 常量。

当前正则只匹配裸域，`www.yuanshen.help`、`api.yuanshen.help` 等子域名需要显式写进正则。

## 注意事项

- 需要安装并信任 Loon 的 CA 才能解密该域名；有证书绑定（SSL Pinning）的 App 可能连不上。
- 只改 HTTP header，改不了 App 在 URL / body 里另带的一份 UA 字段。
- 非法正则会被静默忽略（原版行为），不报错、也不会替换。
- 无法生效时先看 Loon 脚本日志里「UA替换」这条是否只在访问目标域名时出现。

## 文件

- `UA.lpx` — 新语法插件（推荐）
- `UA.plugin` — 旧语法插件
- `UA.js` — 请求脚本，带 host 白名单
