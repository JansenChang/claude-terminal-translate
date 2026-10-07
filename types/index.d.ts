// Each answer's Chinese translation, keyed by the trimmed English answer.
export type Translations = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    'translate-for-claude': { translations: Translations }
  }
}
