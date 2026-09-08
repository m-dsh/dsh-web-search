# dsh-web-search

中文 | [English](README.en.md)

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com) [![推荐 dshfind](https://img.shields.io/badge/%E6%8E%A8%E8%8D%90-dshfind-ffd700?labelColor=555555)](https://dshfind.com/zh/plugins/SZMY-haruhi/dsh-tavily?ref=badge)

![settings](docs/settings-zh.png)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的多渠道网页搜索插件：**Tavily / Serper** 双渠道可同时配置，默认渠道随时切换，关闭全部渠道则回退官方 DeepSeek 搜索。

> 本包由 `dsh-tavily`（0.3.x）重构而来：新增 Serper 渠道，两个渠道都支持自定义接口地址。升级前请先卸载旧的 `dsh-tavily`（见下）。

## 安装

npm：

```sh
dsh plugin --profile web add dsh-web-search
```

也可以跟 GitHub：

```sh
dsh plugin --profile web add github:SZMY-haruhi/dsh-tavily
```

设置 → **Web 搜索**：Tavily / Serper 各自独立开关、Key、自定义接口地址和连通测试。两个都开启时用下拉选择默认渠道；只开启一个时自动使用。开关和默认渠道即时生效，Key 和接口地址统一点「保存」。

卸载：

```sh
dsh plugin --profile web remove dsh-web-search
```

> `dsh.bundle` · 预构建 `lib/` · git 安装无需 `allowBuilds`

> **升级自 `dsh-tavily`**：请先 `dsh plugin --profile web remove dsh-tavily` 卸载旧包。旧版的 `TAVILY_SEARCH_ENABLED` / `TAVILY_API_KEY` 等 credential 键仍被沿用，升级后可直接继续使用。

## 特点

- 双渠道并存：Tavily（可选 Key，无 Key 走 keyless）+ Serper（必填 Key）
- 默认渠道下拉选择，两个都开启时切换
- 全部关闭 → 官方 DeepSeek，不用卸包
- 两个渠道都支持自定义接口地址
- 每个渠道独立连通测试

## 行为

| Tavily | Serper | 默认渠道 | `web_search` 走… |
| ------ | ------ | -------- | ---------------- |
| 关     | 关     | —        | 官方 DeepSeek    |
| 开     | 关     | —        | Tavily           |
| 关     | 开     | —        | Serper           |
| 开     | 开     | Tavily   | Tavily           |
| 开     | 开     | Serper   | Serper           |

Provider id：`web-search`（综合 Provider，内部按默认渠道 + 凭证路由到 Tavily 或 Serper；兜底走官方 DeepSeek）。

## 凭证

| 引用                        | 含义                                                 |
| --------------------------- | ---------------------------------------------------- |
| `TAVILY_SEARCH_ENABLED`     | 有此项 = 启用 Tavily；删除 = 关闭                     |
| `TAVILY_API_KEY`            | 可选。有则走账号档；无则 Tavily keyless               |
| `TAVILY_BASE_URL`           | 可选。Tavily 自定义接口地址（默认 https://api.tavily.com） |
| `SERPER_SEARCH_ENABLED`     | 有此项 = 启用 Serper；删除 = 关闭                     |
| `SERPER_API_KEY`            | 必填。Serper API Key                                 |
| `SERPER_BASE_URL`           | 可选。Serper 自定义接口地址（默认 https://google.serper.dev） |
| `WEB_SEARCH_DEFAULT_SERPER` | 有此项 = 默认渠道 Serper；删除 = 默认渠道 Tavily       |

可写在 `$DSH_HOME/.credentials.yaml`。不要把真实钥匙提交进仓库。

## 更新

- **0.4.0** 由 `dsh-tavily-search` 更名重构为 `dsh-web-search`：Tavily / Serper 双渠道并存、各自自定义接口地址、默认渠道下拉选择、双探针端点。设置改为 `settings.section` 独立页面。综合 Provider id `web-search`，`available()` 恒真（渠道 + 官方 DeepSeek 兜底）。

---

## Author

<a href="https://tonkatsu258.vercel.app/index.html">
  <img src="docs/avatar.png" width="96" height="96" alt="tonkatsu258" />
</a>

**感谢star❤️**
**[tonkatsu258](https://tonkatsu258.vercel.app/index.html)** · [个人网站](https://tonkatsu258.vercel.app/index.html)