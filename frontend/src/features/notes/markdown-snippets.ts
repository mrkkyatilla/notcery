export type MarkdownSnippetId =
  | 'table'
  | 'checklist'
  | 'callout'
  | 'mermaid'
  | 'details'
  | 'math'

export const MARKDOWN_SNIPPETS: Record<MarkdownSnippetId, string> = {
  table: `| Sütun A | Sütun B |
| ------- | ------- |
| Hücre 1 | Hücre 2 |
`,
  checklist: `- [ ] Yapılacak
- [x] Tamamlandı
`,
  callout: `> [!TIP]
> Kısa ipucu metni
`,
  mermaid: `\`\`\`mermaid
flowchart TD
  startNode[Baslangic] --> stepA[Adim]
  stepA --> endNode[Son]
\`\`\`
`,
  details: `<details>
<summary>Detay basligi</summary>

Gizli icerik burada.

</details>
`,
  math: `Satir ici: $E = mc^2$

Blok:
$$
\\int_a^b f(x)\\,dx
$$
`,
}

export function insertSnippet(current: string, cursor: number, snippet: string): {
  value: string
  cursor: number
} {
  const before = current.slice(0, cursor)
  const after = current.slice(cursor)
  const needsNewline = before.length > 0 && !before.endsWith('\n')
  const prefix = needsNewline ? '\n\n' : ''
  const value = before + prefix + snippet + after
  const cursorPos = before.length + prefix.length + snippet.length
  return { value, cursor: cursorPos }
}
