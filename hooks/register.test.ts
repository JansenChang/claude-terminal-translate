import { expect, mock, test } from 'claude-code/testing'

const reply = (content: string) => ({
  value: {
    status: 200,
    ok: true,
    headers: {},
    text: JSON.stringify({ choices: [{ message: { content } }] }),
  },
})

// Stand in for the engine: the prompt enters as it arrives, and the UI accepts anything.
const engine = (on: Parameters<Parameters<typeof test>[1]>[1]) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  mock.store(on)
}

test('Chinese prompt is sent to DeepSeek and replaced by the English', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let sent: { url: string; auth?: string; body?: string } | undefined
  on('http.fetch', ($, e) => {
    sent = { url: e.url, auth: e.init?.headers?.Authorization, body: e.init?.body }

    return reply('Fix the bug in `main.ts`')
  })

  const result = await $.prompt.submit({ text: '修复 `main.ts` 里的 bug' })

  expect(sent?.url).toBe('https://api.deepseek.com/chat/completions')
  expect(sent?.auth).toBe('Bearer sk-test')
  expect(sent?.body).toContain('修复')
  expect(result.text).toBe('Fix the bug in `main.ts`')
})

test('English prompt and "=" prefix skip translation', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let calls = 0
  on('http.fetch', () => {
    calls += 1

    return reply('x')
  })

  expect((await $.prompt.submit({ text: 'hello there' })).text).toBe('hello there')
  expect((await $.prompt.submit({ text: '=保持中文' })).text).toBe('保持中文')
  expect(calls).toBe(0)
})

test('HTTP error falls back to the original text', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  on('http.fetch', () => ({ value: { status: 401, ok: false, headers: {}, text: '' } }))

  expect((await $.prompt.submit({ text: '你好' })).text).toBe('你好')
})

test('missing key falls back to the original text', async ($, on) => {
  engine(on)
  mock.env(on, {})

  expect((await $.prompt.submit({ text: '你好' })).text).toBe('你好')
})

test('a prompt typed at the terminal (composer origin) is translated', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  on('http.fetch', () => reply('Hello'))

  expect((await $.prompt.submit({ text: '你好', origin: { kind: 'composer' } })).text).toBe('Hello')
})

test('a scheduled prompt is left as it is', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  on('http.fetch', () => reply('Hello'))

  expect((await $.prompt.submit({ text: '你好', origin: { kind: 'scheduled-trigger' } })).text).toBe('你好')
})

test('/translate off stops translation and /translate on brings it back', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  on('http.fetch', () => reply('Hello'))

  expect((await $.command.run({ command: 'translate', args: '' })).text).toBe('自动翻译：开')
  expect((await $.command.run({ command: 'translate', args: 'off' })).text).toBe('自动翻译：关')
  expect((await $.prompt.submit({ text: '你好' })).text).toBe('你好')

  expect((await $.command.run({ command: 'translate', args: ' ON ' })).text).toBe('自动翻译：开')
  expect((await $.prompt.submit({ text: '你好' })).text).toBe('Hello')

  expect((await $.command.run({ command: 'translate', args: 'maybe' })).text).toBe('用法：/translate on | off')
})

const answer = (text: string) => ({ turnId: 't1', answer: text, reason: 'answer' as const })

const message = (text: string) => ({
  surface: 'terminal' as const,
  component: 'AssistantMessage' as const,
  requestId: 'm1',
  props: { text, isFirstOfReply: true },
})

test("Claude's English answer is drawn with its Chinese translation as markdown", async ($, on) => {
  engine(on)
  on('turn.complete', ($, e) => ({ text: e.answer }))
  let drawn: string | undefined
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    drawn = e.props.text

    return { type: 'Text', props: {}, children: [e.props.text] }
  })
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let body: string | undefined
  on('http.fetch', ($, e) => {
    body = e.init?.body

    return reply('运行 `npm test` 验证')
  })

  const result = await $.turn.complete(answer('Run `npm test` to verify'))
  await $.ui.render(message('Run `npm test` to verify\n'))

  expect(body).toContain('Simplified Chinese')
  expect(result.text).toBe('Run `npm test` to verify')
  expect(drawn).toContain('**中文翻译**\n\n运行 `npm test` 验证')

  await $.ui.render(message('Some other reply'))
  expect(drawn).toBe('Some other reply')
})

test('Chinese answers, subagent turns and /translate off skip the answer translation', async ($, on) => {
  engine(on)
  on('turn.complete', ($, e) => ({ text: e.answer }))
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let calls = 0
  on('http.fetch', () => {
    calls += 1

    return reply('x')
  })

  expect((await $.turn.complete(answer('这是中文回答'))).text).toBe('这是中文回答')
  expect((await $.turn.complete({ ...answer('Hello'), agentId: 'a1' })).text).toBe('Hello')
  await $.command.run({ command: 'translate', args: 'off' })
  expect((await $.turn.complete(answer('Hello'))).text).toBe('Hello')
  expect(calls).toBe(0)
})

test('a failed answer translation keeps the English answer', async ($, on) => {
  engine(on)
  on('turn.complete', ($, e) => ({ text: e.answer }))
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  on('http.fetch', () => ({ value: { status: 500, ok: false, headers: {}, text: '' } }))

  expect((await $.turn.complete(answer('Hello'))).text).toBe('Hello')
})

test('a dropped connection is retried, each retry shown as a toast', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.status', () => ({ value: undefined }))
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(String(e.text))

    return { value: undefined }
  })
  mock.store(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let calls = 0
  on('http.fetch', () => {
    calls += 1

    if (calls <= 2) {
      throw new Error('SSL_ERROR_SYSCALL')
    }

    return reply('Hello')
  })

  expect((await $.prompt.submit({ text: '你好' })).text).toBe('Hello')
  expect(calls).toBe(3)
  expect(toasts.filter(t => t.includes('重试'))).toEqual([
    'translate-for-claude: 连接失败，重试 1/3…',
    'translate-for-claude: 连接失败，重试 2/3…',
  ])
})

test('retries stop after three, then the original text is sent', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let calls = 0
  on('http.fetch', () => {
    calls += 1

    return { value: { status: 503, ok: false, headers: {}, text: '' } }
  })

  expect((await $.prompt.submit({ text: '你好' })).text).toBe('你好')
  expect(calls).toBe(4)
})

test('a 401 is not retried', async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-test' })
  let calls = 0
  on('http.fetch', () => {
    calls += 1

    return { value: { status: 401, ok: false, headers: {}, text: '' } }
  })

  expect((await $.prompt.submit({ text: '你好' })).text).toBe('你好')
  expect(calls).toBe(1)
})

test('the key entered at install is used over the environment', { options: { apiKey: 'sk-config' } }, async ($, on) => {
  engine(on)
  mock.env(on, { DEEPSEEK_API_KEY: 'sk-env' })
  let auth: string | undefined
  on('http.fetch', ($, e) => {
    auth = e.init?.headers?.Authorization

    return reply('Hello')
  })

  expect((await $.prompt.submit({ text: '你好' })).text).toBe('Hello')
  expect(auth).toBe('Bearer sk-config')
})
