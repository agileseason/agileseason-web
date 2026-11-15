import MarkdownIt from 'markdown-it'

// Безопасный рендер markdown: сырой HTML экранируется (html: false),
// а markdown-it сам отбрасывает ссылки вида javascript:, vbscript:, data:.
// Поэтому результат можно выводить через v-html.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

// Ссылки открываем в новой вкладке
const defaultLinkOpen = md.renderer.rules.link_open
  ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  token?.attrSet('target', '_blank')
  token?.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function renderMarkdown(text: string): string {
  return md.render(text)
}
