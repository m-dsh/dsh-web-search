# dsh-web-search

[中文](README.md) | English

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com) [![Recommend dshfind](https://img.shields.io/badge/Recommend-dshfind-ffd700?labelColor=555555)](https://dshfind.com/zh/plugins/SZMY-haruhi/dsh-tavily?ref=badge)

![settings](docs/settings-zh.png)

Multi-channel web search for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): **Tavily + Serper** as a single composite provider. Configure both channels simultaneously, switch the default channel on the fly, or turn both off to fall back to official DeepSeek search.

> This package is a rewrite of `dsh-tavily` (0.3.x): renamed to `dsh-web-search`, Serper channel added, custom API URL for both channels. Uninstall `dsh-tavily` before upgrading (see below).

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

> **Upgrading from `dsh-tavily`**: run `dsh plugin --profile web remove dsh-tavily` first. The old credential keys (`TAVILY_SEARCH_ENABLED`, `TAVILY_API_KEY`, etc.) are reused; your existing config carries over.

## Features

- Dual channel: Tavily (optional key, keyless without one) + Serper (key required)
- Default channel dropdown for when both are enabled
- Both off → official DeepSeek — no uninstall needed
- Custom API URL for both channels
- Independent connection test per channel

## Behavior

| Tavily | Serper | Default   | `web_search` routes to |
| ------ | ------ | --------- | ---------------------- |
| off    | off    | —         | official DeepSeek      |
| on     | off    | —         | Tavily                 |
| off    | on     | —         | Serper                 |
| on     | on     | Tavily    | Tavily                 |
| on     | on     | Serper    | Serper                 |

Provider id: `web-search` (composite — routes internally by default channel + credentials; falls back to official DeepSeek when both channels are off).

## Credentials

| Ref                        | Meaning                                                  |
| -------------------------- | -------------------------------------------------------- |
| `TAVILY_SEARCH_ENABLED`    | Present = Tavily on; unset = off                         |
| `TAVILY_API_KEY`           | Optional. Present = account quota; absent = keyless      |
| `TAVILY_BASE_URL`          | Optional. Custom Tavily API URL (default https://api.tavily.com) |
| `SERPER_SEARCH_ENABLED`    | Present = Serper on; unset = off                         |
| `SERPER_API_KEY`           | Required. Serper API Key                                 |
| `SERPER_BASE_URL`          | Optional. Custom Serper API URL (default https://google.serper.dev) |
| `WEB_SEARCH_DEFAULT_SERPER`| Present = default channel Serper; unset = default Tavily  |

You can also put these in `$DSH_HOME/.credentials.yaml`. Do not commit real keys.

## Updates

- **0.4.0** Renamed from `dsh-tavily-search` to `dsh-web-search`: Tavily + Serper dual channel, custom API URLs, default channel dropdown, dual probe endpoints. Settings page is now a standalone `settings.section`. Composite provider id `web-search` with always-true `available()` (channels or official DeepSeek fallback).