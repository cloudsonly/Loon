# UA 改写 · 指定域名

基于 he2o 的 [UA.js](https://he2o.vercel.app/Resource/Plugin/UA.js) 改造：**只对插件里填写的域名替换 `User-Agent`**，域名可以任意改、任意加。

## 两个安装地址，二选一

| | 推荐版 `UA.lpx` | 任意域名版 `UA.anyhost.lpx` |
|---|---|---|
| 安装地址 | `.../plugin/UA/UA.lpx` | `.../plugin/UA/UA.anyhost.lpx` |
| `[MITM] hostname` | `yuanshen.help, *.yuanshen.help` | `*` |
| 改/加域名 | 只在 `yuanshen.help` 及其子域内：**只改输入框**即可；换成完全不同的主域：需同步改 `[MITM]` 一行 | **任何域名都只改输入框**，配置一行都不用动 |
| 代价 | 只解密这一个域名，最安全 | 解密全部 HTTPS，需信任 CA；有证书绑定的 App 可能连不上 |

```
https://raw.githubusercontent.com/cloudsonly/Loon/refs/heads/main/plugin/UA/UA.lpx
https://raw.githubusercontent.com/cloudsonly/Loon/refs/heads/main/plugin/UA/UA.anyhost.lpx
```

两个版本共用同一个 `UA.js`。

## 参数（插件详情页里填）

| 参数 | 说明 |
|---|---|
| **生效域名** | 要改 UA 的域名，多个用英文逗号分隔，也支持空格/换行/分号。可以是裸域名、完整 URL、`*.example.com` 通配。默认 `yuanshen.help` |
| 原 UA 特征 | **按正则匹配**当前 UA。建议只填一段，如 `iPhone OS 17_0`；整条粘贴需转义 `.` `+` `(` `)` |
| 新 UA | **整条替换**后的 UA（不是替换匹配到的那一段），如 `MyApp/9.9` |

域名和原/新 UA 三项都有值才生效；域名不在列表里 → 请求原样放行，一个头都不动。

例：把 `生效域名` 改成 `yuanshen.help, api.example.com, *.foo.com`，三个域都会改 UA，其它不会。

## 为什么推荐版的 `[MITM]` 还得手动改

Loon 的 `[MITM] hostname` 是**静态字段，不支持 `${参数}` 绑定**（官方文档明确列出「不支持参数绑定」，MitM 文档里也没有任何变量写法）。所以：

- 脚本规则可以写宽（`request if ${url} ~= /^https?:\/\//i`），把精确判断交给脚本里的域名白名单——这部分完全参数化了；
- 但 MITM 必须先解密才能改请求头，这一行没法跟着输入框变。

两种解法就是上面的两个版本：要么 MITM 精确到域名（换主域时手动改一行），要么 MITM 全开（永不用改，代价是全流量解密）。如果只在一个主域下折腾，推荐前者。

## 换成别的主域时（推荐版）要改的一行

编辑 `UA.lpx`：

```
[MITM]
hostname = 你的域名, *.你的域名
```

加子域不用改这一行（`*.你的域名` 已覆盖）；`生效域名` 输入框里填子域名即可（或直接用 `*.你的域名`）。

## 与原版的区别

| | 原版 | 本版 |
|---|---|---|
| `[Script]` 匹配 | `^https?:\/\/.*`（所有请求） | 规则写宽，脚本内按「生效域名」白名单精确判断 |
| `[MITM]` | `hostname = *` | 精确到域名（推荐版） |
| 域名管理 | 改正则 | 插件输入框，支持多域名/通配 |
| `Demo` 参数 | 存在但无用途 | 移除 |
| `$argument` | 只认对象 | 兼容对象 / 数组 / JSON / `k=v,k=v` |

## 注意事项

- 需要安装并信任 Loon 的 CA 才能解密目标域名；有 SSL Pinning 的 App 可能连不上。
- 只改 HTTP header，改不了 App 在 URL / body 里另带的一份 UA 字段。
- 非法正则会被静默忽略（沿用原版行为），不报错、也不会替换。
- 排查：看 Loon 脚本日志里「UA替换」是否只在目标域名出现；若没出现，先查 MITM 是否覆盖了新域名。

## 文件

- `UA.lpx` — 推荐，MITM 精确到域名
- `UA.anyhost.lpx` — MITM 全开，域名完全自由
- `UA.js` — 请求脚本（带域名白名单，两个版本共用）
