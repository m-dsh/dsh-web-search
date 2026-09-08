# dsh-web-search

[中文](README.md) | English

![settings](docs/settings-zh.png)

Multi-channel web search for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): **Tavily + Serper** as a single composite provider. Configure both channels simultaneously, switch the default channel on the fly, or turn both off to fall back to official DeepSeek search.

## Install

npm:

```sh
dsh plugin --profile web add dsh-web-search
```

Or follow GitHub:

```sh
dsh plugin --profile web add github:SZMY-haruhi/dsh-tavily
```

Settings → **Web Search**: toggle each channel, enter API keys, set custom URLs, and test connectivity. Use the dropdown to pick the default channel when both are on — or just enable one. Toggles and default channel apply instantly; keys and URLs use a unified "Save" button.

Remove:

```sh
dsh plugin --profile web remove dsh-web-search
```

> `dsh.bundle` · prebuilt `lib/` · git install does not need `allowBuilds`