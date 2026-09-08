# dsh-web-search

中文 | [English](README.en.md)

![settings](docs/settings-zh.png)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的多渠道网页搜索插件：**Tavily / Serper** 双渠道可同时配置，默认渠道随时切换，关闭全部渠道则回退官方 DeepSeek 搜索。

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