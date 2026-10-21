# dsh-web-search

中文 | [English](README.en.md)

![settings](docs/settings-zh.png)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的多渠道网页搜索插件：**Tavily / Serper** 双渠道点击展开即可配置，通过「默认渠道」选择搜索实际使用的 API。

## 安装

npm：

```sh
dsh plugin --profile web add dsh-web-search
```

也可以跟 GitHub：

```sh
dsh plugin --profile web add github:m-dsh/dsh-web-search
```

需要 DSH `0.2.0-rc.2` 或更新版本。设置 → **Web 搜索**：Tavily / Serper 各自独立开关、Key、自定义接口地址和连通测试。两个都开启时用下拉选择默认渠道；只开启一个时自动使用。开关、接口地址和默认渠道即时保存生效，Key 点「保存」。设置通过 `configForms` 读写 profile entry `web-search`，请在 DSH 所在电脑通过 localhost 访问。

卸载：

```sh
dsh plugin --profile web remove dsh-web-search
```

> `dsh.bundle` · 预构建 `lib/` · git 安装无需 `allowBuilds`
