# claude-terminal-translate · Claude Code 终端中文翻译插件

**用中文和 Claude Code 对话。** 一个 Claude Code 插件（plugin）：你的中文提问先由 DeepSeek 翻译成英文再发给 Claude，Claude 的英文回答下方自动附上 DeepSeek 翻译的中文。适用于终端（terminal / CLI）里的 Claude Code。

**Chat with Claude Code in Chinese.** A Claude Code plugin that translates your Chinese prompts into English with DeepSeek before Claude sees them, and shows a DeepSeek Chinese translation under each English answer. Built for Claude Code in the terminal (CLI).

关键词 Keywords：Claude Code 中文 · Claude Code 汉化 · Claude 中文翻译 · Claude Code 插件 · DeepSeek 翻译 · 中英互译 · 自动翻译 · Claude Code Chinese · Chinese translation · DeepSeek translate · Claude Code plugin · terminal · CLI

## 为什么做这个 Why

很多中文开发者用中文思考、用中文描述需求最顺手，但读写大段英文费时费力。Claude 对清晰的英文指令理解最稳定，英文回答再逐段翻成中文又打断思路。

这个插件把这两步自动化：

1. **输入**：你照常用中文输入，DeepSeek 翻译成英文后才发给 Claude（代码、路径、命令、URL 原样保留）。
2. **输出**：Claude 用英文回答，DeepSeek 把回答翻成中文，显示在原文下方的「中文翻译」区块里。

DeepSeek 中文能力强、价格低，适合做这层翻译。

Many Chinese-speaking developers think and describe tasks best in Chinese, while reading long English answers slows them down. This plugin automates both directions: you type Chinese, Claude receives clear English; Claude answers in English, you also read it in Chinese.

## 效果 How it looks

```
> 帮我把 main.ts 里的重复代码抽成一个函数
  EN: Extract the duplicated code in main.ts into a function      ← 右上角提示

● I extracted the duplicated block into `parseConfig()` ...

  ---
  **中文翻译**
  我把重复的代码块抽取成了 `parseConfig()` ...
```

## 安装 Install

在 Claude Code 终端里输入：

```
/plugin install translate-for-claude --marketplace JansenChang/claude-terminal-translate
```

按 `y` 添加 marketplace，选择安装范围（推荐 user），然后填入你的 DeepSeek API key。
也可以不填，改为设置环境变量 `DEEPSEEK_API_KEY`。

Press `y` to add the marketplace, pick a scope (user recommended), then enter your DeepSeek API key — or leave it empty and set the `DEEPSEEK_API_KEY` environment variable instead.

API key 在 <https://platform.deepseek.com/api_keys> 获取。

## 使用 Usage

| 操作 | 说明 |
| --- | --- |
| 直接用中文提问 | 自动翻译成英文发送，右上角提示 `EN: …` 显示译文 |
| 以 `=` 开头 | 本条不翻译，原样发送（例如 `=保留中文`） |
| `/translate off` | 关闭自动翻译（跨会话保持） |
| `/translate on` | 重新开启 |
| `/translate` | 查看当前状态 |

- 只翻译你亲手输入的提示；定时任务、后台消息不翻译。
- 回答已经主要是中文时不再翻译；子代理（subagent）的输出不翻译。
- 会话记录里保存的是英文原文，中文翻译只在显示时附加。

## 网络不稳定时 Retries

请求 DeepSeek 时遇到连接中断、HTTP 429 或 5xx，会自动重试，最多 3 次，每次在右上角提示 `重试 n/3…`。
仍然失败时：提问按原文发送，回答保持英文，不会卡住对话。401 等错误不重试（通常是 key 不对）。

Dropped connections, HTTP 429 and 5xx are retried up to 3 times, each retry shown as a toast. If all attempts fail, the prompt is sent as typed and the answer stays in English.

## 适用范围 Where it works

- ✅ 终端里的 Claude Code（CLI），已实际使用验证。Tested in Claude Code in the terminal.
- 需要能访问 `api.deepseek.com`。如果你用代理，DeepSeek 请求偶发断连时插件会自动重试。

## 隐私 Privacy

开启后，你的中文提问和 Claude 的回答全文都会发送到 DeepSeek API（`api.deepseek.com`）。处理敏感代码或数据时请用 `/translate off` 关闭。

When on, your Chinese prompts and Claude's full answers are sent to the DeepSeek API. Turn it off with `/translate off` when working with sensitive material.

## 开发 Development

```
claude plugin validate .
claude plugin test .
```

## License

MIT
