<p align="center">
  <img src="assets/logo.png" alt="Claude Terminal Translate 项目 logo：泡泡浴中的橙色像素角色" width="220">
</p>

<h1 align="center">Claude Terminal Translate</h1>

<p align="center">
  <a href="README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  <strong>用中文和 Claude Code 对话，让翻译自动完成。</strong><br>
  Claude Code 终端中英双向翻译插件，由 DeepSeek 提供翻译能力。
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#使用方式">使用方式</a> ·
  <a href="#工作原理">工作原理</a> ·
  <a href="#隐私说明">隐私说明</a> ·
  <a href="LICENSE">MIT 许可证</a>
</p>

## 为什么做这个插件

用中文描述需求更顺手，但手动把提问译成英文、再把英文回答译回中文，会打断开发节奏。这个插件把两步翻译接进 Claude Code 的终端对话：你照常输入中文，插件发送英文译文；Claude 回答后，插件在原文下方附上中文翻译。

## 功能一览

| 功能 | 说明 |
| --- | --- |
| 中文提问自动翻译 | 发送前通过 DeepSeek 译成英文，并提示 `EN: …` 供你查看 |
| 英文回答附中文 | 回答完成后，在英文原文下方显示「中文翻译」区块 |
| 保留技术内容 | 翻译提示要求保留代码、路径、命令、URL、标识符和 Markdown 格式 |
| 随时切换 | 支持单条跳过和 `/translate on \| off`，开关状态跨会话保存 |
| 失败时保留原文 | 连接异常、HTTP 429 或 5xx 最多重试 3 次；翻译失败后保留提问或回答原文 |

## 快速开始

### 1. 安装插件

在 Claude Code 终端中输入：

```text
/plugin install translate-for-claude --marketplace JansenChang/claude-terminal-translate
```

按提示添加 marketplace，选择安装范围（推荐 `user`），并填写 DeepSeek API key。

### 2. 配置 DeepSeek API key

在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API key。你可以在安装时填写，也可以留空，在启动 Claude Code 的同一个终端中设置环境变量：

```sh
export DEEPSEEK_API_KEY='你的 DeepSeek API key'
```

安装配置中的 API key 优先于环境变量。插件需要能访问 `api.deepseek.com`，使用的翻译模型为 `deepseek-chat`。

### 3. 用中文开始对话

插件默认开启，直接输入中文需求即可。以下为交互示意：

```text
你输入：
> 帮我把 main.ts 里的重复代码抽成一个函数

插件提示：
EN: Extract the duplicated code in main.ts into a function.

Claude 回答：
I extracted the duplicated block into `parseConfig()` ...

---
中文翻译
我把重复的代码块抽取成了 `parseConfig()` ……
```

## 使用方式

| 操作 | 效果 |
| --- | --- |
| 直接输入中文 | 自动翻译成英文后发送 |
| 直接输入纯英文 | 原样发送，无需翻译 |
| 以 `=` 开头，例如 `=保留中文` | 去掉前缀后直接发送 `保留中文`，跳过本条输入翻译 |
| `/translate off` | 关闭后续自动翻译，跨会话保持 |
| `/translate on` | 重新开启自动翻译 |
| `/translate` | 查看当前开关状态 |

`=` 只跳过本条提问的翻译；需要同时关闭回答翻译时，使用 `/translate off`。

## 工作原理

```text
中文提问 → DeepSeek 英文译文 → Claude Code
                                  ↓
中文翻译 ← DeepSeek 翻译 ← Claude 英文回答
```

- 输入翻译处理人工提交的提示；定时任务、后台消息和其他代理投递的提示不翻译。
- 回答完成后再进行翻译，已经主要是中文的回答和子代理输出会跳过。
- 会话记录保留 Claude 的原始回答，中文译文作为显示内容附加，不替换原文；最多缓存最近 50 条译文。
- 翻译提示要求保留技术内容，实际译文仍需核对，尤其是准备执行的命令和涉及业务含义的描述。

## 常见问题

### 没有设置 API key 会怎样？

插件会提示缺少 API key，提问按原文发送，回答保留原文。可以通过 `/plugin` 配置或 `DEEPSEEK_API_KEY` 环境变量补充。

### 网络不稳定或请求失败会怎样？

连接异常、HTTP 429 和 5xx 最多重试 3 次（首次请求加重试，最多 4 次请求），每次会提示 `重试 n/3…`。重试仍失败时，对应的提问或回答保留原文。

HTTP 401 等其他错误不重试。遇到 401，请先检查 API key 是否正确。

### 适用于哪些环境？

本项目面向终端中的 Claude Code（CLI）。需要能加载本项目插件模块的 Claude Code 环境，以及可用的 DeepSeek API 连接。

## 隐私说明

开启翻译后，需要翻译的提问和回答全文会发送到 DeepSeek API（`api.deepseek.com`），包括文本中的代码和上下文。处理敏感代码、凭据或业务数据前，请使用 `/translate off` 关闭翻译。

DeepSeek API 调用会产生相应费用，计费以 DeepSeek 官方说明为准。

## 开发与验证

在支持本项目插件开发命令的 Claude Code 环境中，进入仓库目录后运行：

```sh
claude plugin validate .
claude plugin test .
```

插件配置位于 [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)，翻译逻辑位于 [`hooks/register.ts`](hooks/register.ts)，现有测试位于 [`hooks/register.test.ts`](hooks/register.test.ts)。

## 许可证

本项目使用 [MIT 许可证](LICENSE)。
