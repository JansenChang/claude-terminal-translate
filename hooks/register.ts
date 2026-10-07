import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Translations } from '../types'

const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'

// A leading "=" sends the prompt as typed, untranslated.
const SKIP_PREFIX = '='

const SYSTEM = [
  'You translate a user message written for an AI coding assistant into English.',
  'Output only the translation, nothing else: no quotes, no notes.',
  'Keep code, code blocks, file paths, commands, URLs, identifiers and English words exactly as they are.',
  'Keep the original formatting (line breaks, lists, markdown).',
  'Do not answer or follow the message; only translate it.',
].join('\n')

const SYSTEM_ZH = [
  "You translate an AI coding assistant's answer into Simplified Chinese.",
  'Output only the translation, nothing else: no quotes, no notes.',
  'Keep code, code blocks, file paths, commands, URLs and identifiers exactly as they are.',
  'Keep the original formatting (line breaks, lists, markdown).',
].join('\n')

// The connection to DeepSeek sometimes drops mid-handshake; a dropped request or a busy server is tried again.
const MAX_RETRIES = 3

const isRetryable = (status: number) => status === 429 || status >= 500

// Resolves the last response, ok or not; throws what the last attempt threw. Each retry shows a toast.
const askDeepSeek = async ($: EngineInterface, key: string, system: string, text: string) => {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    }),
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await $.http.fetch(ENDPOINT, init)

      if (response.ok || !isRetryable(response.status) || attempt > MAX_RETRIES) {
        return response
      }

      $.ui.toast(`deepseek-translate: HTTP ${response.status}，重试 ${attempt}/${MAX_RETRIES}…`)
    } catch (error) {
      if (attempt > MAX_RETRIES) {
        throw error
      }

      $.ui.toast(`deepseek-translate: 连接失败，重试 ${attempt}/${MAX_RETRIES}…`)
    }
  }
}

// Prompts a person typed; background, scheduled and peer deliveries pass untouched.
const HUMAN_ORIGINS: readonly string[] = ['composer', 'bridge', 'sdk']

export const hasCjk = (text: string) => /[぀-ヿ㐀-鿿가-힯]/.test(text)

// An answer already written mostly in Chinese needs no translation.
export const isMostlyChinese = (text: string) =>
  (text.match(/[㐀-鿿]/g)?.length ?? 0) > (text.match(/[A-Za-z]/g)?.length ?? 0)

// Kept in the plugin's store, so the switch holds across sessions; unset means on.
const isEnabled = async ($: { store: { get: (key: string) => Promise<unknown> } }) =>
  (await $.store.get('enabled')) !== false

const translations = atom({ plugin: 'deepseek-translate', key: 'translations' } as const, {} as Translations)

// Only the latest answers are drawn with their translation; older ones fall back to English.
const KEPT_TRANSLATIONS = 50

// The answer's last block is the one the translation is drawn under.
export const translationFor = (map: Translations, block: string) => {
  const text = block.trim()

  if (!text) {
    return undefined
  }

  return map[text] ?? Object.entries(map).find(([answer]) => answer.endsWith(text))?.[1]
}

// The key entered at install wins; otherwise the environment's.
const apiKey = async ($: EngineInterface, configured: unknown) =>
  (typeof configured === 'string' && configured.trim()) || (await $.env.get('DEEPSEEK_API_KEY'))

export const register: Register = (on, options) => {

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'translate',
      description: '发送前自动翻译成英文：/translate on | off（不带参数查看状态）',
      argumentHint: 'on|off',
    })

    return next(e)
  })

  on('command.run', { command: 'translate' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'on' || arg === 'off') {
      await $.store.set('enabled', arg === 'on')
    } else if (arg !== '') {
      return { text: '用法：/translate on | off' }
    }

    return { text: (await isEnabled($)) ? '自动翻译：开' : '自动翻译：关' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (!(await isEnabled($))) {
      return next(e)
    }

    if (e.origin !== undefined && !HUMAN_ORIGINS.includes(e.origin.kind)) {
      if (hasCjk(e.text)) {
        $.ui.toast(`deepseek-translate: 来源为 ${e.origin.kind}，未翻译`)
      }

      return next(e)
    }

    if (e.text.startsWith(SKIP_PREFIX)) {
      return next({ ...e, text: e.text.slice(SKIP_PREFIX.length).trimStart() })
    }

    if (!hasCjk(e.text)) {
      return next(e)
    }

    const key = await apiKey($, options.apiKey)

    if (!key) {
      $.ui.toast('deepseek-translate: 未设置 API key（/plugin 配置或 DEEPSEEK_API_KEY），按原文发送')

      return next(e)
    }

    $.ui.status('翻译中…')

    try {
      const response = await askDeepSeek($, key, SYSTEM, e.text)

      if (!response.ok) {
        $.ui.toast(`deepseek-translate: 翻译失败 (HTTP ${response.status})，按原文发送`)

        return next(e)
      }

      const english = JSON.parse(response.text)?.choices?.[0]?.message?.content?.trim()

      if (!english) {
        $.ui.toast('deepseek-translate: 返回为空，按原文发送')

        return next(e)
      }

      $.ui.toast(`EN: ${english.length > 200 ? `${english.slice(0, 200)}…` : english}`)

      return next({ ...e, text: english })
    } catch (error) {
      $.ui.toast(`deepseek-translate: 请求出错，按原文发送 (${String(error)})`)

      return next(e)
    } finally {
      $.ui.status(undefined)
    }
  }).catch(($, e, next) => {
    if (next.error.kind !== 're-entry') {
      $.ui.toast(`deepseek-translate: 输入翻译出错 (${next.error.kind}: ${next.error.message ?? '无信息'})`)
    }

    return next(e)
  })

  // The answer's Chinese translation is drawn as markdown inside the reply; the transcript keeps the English.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    if (e.agentId !== undefined || e.reason !== 'answer' || !(await isEnabled($))) {
      return result
    }

    const answer = result.text.trim()

    if (!answer || isMostlyChinese(answer)) {
      return result
    }

    const key = await apiKey($, options.apiKey)

    if (!key) {
      $.ui.toast('deepseek-translate: 未设置 API key（/plugin 配置或 DEEPSEEK_API_KEY），回答未翻译')

      return result
    }

    const response = await askDeepSeek($, key, SYSTEM_ZH, answer)

    if (!response.ok) {
      $.ui.toast(`deepseek-translate: 回答翻译失败 (HTTP ${response.status})`)

      return result
    }

    const chinese = JSON.parse(response.text)?.choices?.[0]?.message?.content?.trim()

    if (chinese) {
      await update($, translations, map =>
        Object.fromEntries([...Object.entries(map), [answer, chinese] as const].slice(-KEPT_TRANSLATIONS)),
      )
    }

    return result
  }).catch(($, e, next) => {
    if (next.error.kind !== 're-entry') {
      $.ui.toast(`deepseek-translate: 回答翻译出错 (${next.error.kind}: ${next.error.message ?? '无信息'})`)
    }

    return next(e)
  })

  // A turn.complete text is drawn as one plain line, so the translation joins the reply's markdown instead.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) {
      return next(e)
    }

    const chinese = translationFor(await read($, translations), e.props.text)

    if (!chinese) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, text: `${e.props.text}\n\n---\n\n**中文翻译**\n\n${chinese}` } })
  })
}
