<p align="center">
  <img src="assets/logo.png" alt="Claude Terminal Translate logo: an orange pixel character in a bubble bath" width="220">
</p>

<h1 align="center">Claude Terminal Translate</h1>

<p align="center">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <strong>Chat with Claude Code in Chinese. Let translation happen automatically.</strong><br>
  A Chinese–English translation plugin for Claude Code in the terminal, powered by DeepSeek.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#privacy">Privacy</a> ·
  <a href="LICENSE">MIT license</a>
</p>

## Why this plugin?

Describing a task in Chinese feels natural, but manually translating your prompt into English and the answer back into Chinese interrupts your workflow. This plugin connects both translation steps to your Claude Code terminal session: type in Chinese, send the English translation, and read a Chinese translation below Claude's original answer.

## Features

| Feature | Behavior |
| --- | --- |
| Translate Chinese prompts | DeepSeek translates your prompt into English before submission; an `EN: …` notification shows the translation |
| Add Chinese translations to answers | Once an answer is complete, a Chinese translation appears below the English original |
| Preserve technical content | Translation instructions ask the model to retain code, paths, commands, URLs, identifiers, and Markdown formatting |
| Control translation | Skip a single prompt or use `/translate on \| off`; the toggle persists across sessions |
| Keep the original on failure | Connection errors, HTTP 429, and 5xx responses trigger up to 3 retries; if translation fails, the original prompt or answer is kept |

## Quick start

### 1. Install the plugin

Run this command inside Claude Code in the terminal:

```text
/plugin install translate-for-claude --marketplace JansenChang/claude-terminal-translate
```

Follow the prompts to add the marketplace, choose an installation scope (`user` is recommended), and enter your DeepSeek API key.

### 2. Configure your DeepSeek API key

Create an API key in the [DeepSeek platform](https://platform.deepseek.com/api_keys). Enter it during installation, or leave the field empty and set this environment variable in the terminal where you launch Claude Code:

```sh
export DEEPSEEK_API_KEY='your DeepSeek API key'
```

The key in the plugin configuration takes precedence over the environment variable. The plugin requires access to `api.deepseek.com` and uses `deepseek-chat` for translation.

### 3. Start a conversation in Chinese

Translation is enabled by default. Type your request in Chinese as usual. Here is an illustrative interaction:

```text
Your prompt:
> 帮我把 main.ts 里的重复代码抽成一个函数

Plugin notification:
EN: Extract the duplicated code in main.ts into a function.

Claude's answer:
I extracted the duplicated block into `parseConfig()` ...

---
中文翻译
我把重复的代码块抽取成了 `parseConfig()` ……
```

## Usage

| Action | Result |
| --- | --- |
| Type a Chinese prompt | Translate it into English before sending |
| Type a prompt entirely in English | Send it unchanged |
| Start with `=`, for example `=保持中文` | Remove the prefix and send `保持中文` without translating the prompt |
| `/translate off` | Disable further automatic translation; the setting persists across sessions |
| `/translate on` | Enable automatic translation again |
| `/translate` | Show the current setting |

The `=` prefix skips input translation for that prompt only. Use `/translate off` to disable answer translation as well.

## How it works

```text
Chinese prompt → DeepSeek English translation → Claude Code
                                                   ↓
Chinese translation ← DeepSeek translation ← English answer
```

- Input translation handles prompts submitted by a person. Scheduled tasks, background messages, and deliveries from other agents are skipped.
- Answer translation runs after the answer is complete. Answers already written mostly in Chinese and subagent output are skipped.
- The transcript keeps Claude's original answer. Chinese translations are added for display without replacing the original; the cache keeps up to 50 recent translations.
- The translation instructions ask the model to preserve technical content. Review the result, especially commands you plan to run and descriptions that affect business logic.

## FAQ

### What if I have not configured an API key?

The plugin shows a missing-key notification, sends your prompt unchanged, and keeps the original answer. Set the key through `/plugin` configuration or the `DEEPSEEK_API_KEY` environment variable.

### What happens when a request fails?

Connection errors, HTTP 429, and 5xx responses trigger up to 3 retries (up to 4 requests including the initial attempt). Each retry shows a `重试 n/3…` notification. If all attempts fail, the affected prompt or answer is kept unchanged.

Other HTTP errors, including 401, are not retried. Check your API key first if you receive a 401 response.

### Which environments does it support?

This project targets Claude Code in the terminal (CLI). It requires a Claude Code environment that can load this project's plugin modules and a working connection to the DeepSeek API.

## Privacy

When translation is enabled, the full text of prompts and answers that need translation is sent to the DeepSeek API (`api.deepseek.com`), including code and context within that text. Run `/translate off` before working with sensitive code, credentials, or business data.

DeepSeek API usage is billed according to DeepSeek's pricing.

## Development and validation

In a Claude Code environment that supports this project's plugin development commands, run these commands from the repository root:

```sh
claude plugin validate .
claude plugin test .
```

Plugin configuration lives in [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json), translation logic in [`hooks/register.ts`](hooks/register.ts), and existing tests in [`hooks/register.test.ts`](hooks/register.test.ts).

## License

This project is licensed under the [MIT license](LICENSE).
