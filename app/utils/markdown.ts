import MarkdownIt from 'markdown-it'

// Пункт списка задач: «[ ] текст» / «[x] текст»
const TASK_MARKER = /^\[([ xX])\][ \t]+/

// Чекбоксы списков задач (- [ ] / - [x]).
// Каждому чекбоксу ставим data-line — номер строки пункта в исходном markdown (с 0),
// по нему setTaskChecked находит нужную строку, не путаясь в блоках кода и т.п.
function taskListPlugin(md: MarkdownIt) {
  md.core.ruler.push('task_checkbox', (state) => {
    const tokens = state.tokens
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i]
      const paragraph = tokens[i - 1]
      const item = tokens[i - 2]
      if (inline?.type !== 'inline' || paragraph?.type !== 'paragraph_open' || item?.type !== 'list_item_open') continue

      const first = inline.children?.[0]
      const line = item.map?.[0]
      if (first?.type !== 'text' || line === undefined || !inline.children) continue

      const match = TASK_MARKER.exec(first.content)
      if (!match) continue

      first.content = first.content.slice(match[0].length)
      const checkbox = new state.Token('html_inline', '', 0)
      checkbox.meta = { task: true, checked: match[1] !== ' ' } // для countTasks
      checkbox.content = `<input type="checkbox" class="form-check-input task-checkbox" data-line="${line}"${match[1] === ' ' ? '' : ' checked'}>`
      inline.children.unshift(checkbox)

      // классы для оформления: пункт и содержащий его список
      item.attrJoin('class', 'task-list-item')
      for (let j = i - 3; j >= 0; j--) {
        const parent = tokens[j]
        if (parent && parent.level === item.level - 1 && (parent.type === 'bullet_list_open' || parent.type === 'ordered_list_open')) {
          parent.attrJoin('class', 'contains-task-list')
          break
        }
      }
    }
  })
}

// Безопасный рендер markdown: сырой HTML экранируется (html: false),
// а markdown-it сам отбрасывает ссылки вида javascript:, vbscript:, data:.
// Поэтому результат можно выводить через v-html.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
md.use(taskListPlugin)

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

// Строка с маркером задачи: «- [ ] », «1. [x] », «> - [ ] »
const TASK_LINE = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[)[ xX](\][ \t])/

// Возвращает markdown с переключённым чекбоксом на строке `line` (с 0)
// или null, если на этой строке нет пункта списка задач.
// `line` берём из data-line отрисованного чекбокса, поэтому «псевдо-пункты» в блоках кода сюда не попадают.
export function setTaskChecked(markdown: string, line: number, checked: boolean): string | null {
  // разбиваем с сохранением переводов строк, чтобы вернуть текст без искажений
  const parts = markdown.split(/(\r\n|\r|\n)/)
  const current = parts[line * 2]
  if (current === undefined || !TASK_LINE.test(current)) return null
  parts[line * 2] = current.replace(TASK_LINE, `$1${checked ? 'x' : ' '}$2`)
  return parts.join('')
}

// Сколько в markdown пунктов списка задач и сколько из них отмечено.
// Считаем тем же парсером, что и при отрисовке: пункты в блоках кода не учитываются.
export function countTasks(markdown: string): { done: number, total: number } {
  let done = 0
  let total = 0
  for (const token of md.parse(markdown, {})) {
    for (const child of token.children ?? []) {
      if (child.type === 'html_inline' && child.meta?.task) {
        total++
        if (child.meta.checked) done++
      }
    }
  }
  return { done, total }
}
