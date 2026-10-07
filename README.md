# deepseek-translate

用中文和 Claude Code 对话：你的中文提问会先由 DeepSeek 翻译成英文再发给 Claude，Claude 的英文回答下方会自动附上中文翻译。

Chat with Claude Code in Chinese: your Chinese prompts are translated to English by DeepSeek before Claude sees them, and each English answer is shown with a Chinese translation underneath.

## 安装 Install

在 Claude Code 终端里输入：

```
/plugin install deepseek-translate --marketplace JansenChang/deepseek-translate
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
