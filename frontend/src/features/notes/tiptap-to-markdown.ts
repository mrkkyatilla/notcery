import type { JSONContent } from '@tiptap/core'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import TurndownService from 'turndown'

import { EMPTY_TIPTAP_DOC, normalizeContentJson } from '@/features/notes/tiptap-document'
import type { TipTapDocument } from '@/features/notes/types'

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
]

function plainFallback(doc: TipTapDocument): string {
  const lines: string[] = []
  const walk = (node: Record<string, unknown>) => {
    if (node.type === 'text' && typeof node.text === 'string') {
      lines.push(node.text)
    }
    const children = node.content
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === 'object') walk(child as Record<string, unknown>)
      }
    }
    if (['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(String(node.type))) {
      lines.push('')
    }
  }
  walk(doc as unknown as Record<string, unknown>)
  return lines.filter(Boolean).join('\n\n')
}

export function tiptapJsonToMarkdown(contentJson: unknown): string {
  const doc = normalizeContentJson(contentJson)
  if (doc.content?.length === 0) return ''

  try {
    const html = generateHTML(doc as JSONContent, extensions)
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    })
    turndown.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content: string) => `~~${content}~~`,
    })
    const md = turndown.turndown(html).trim()
    return md || plainFallback(doc)
  } catch {
    return plainFallback(doc)
  }
}

export function needsTipTapMigration(
  contentMarkdown: string | undefined | null,
  contentJson: unknown,
): boolean {
  const md = (contentMarkdown ?? '').trim()
  if (md.length > 0) return false
  const doc = normalizeContentJson(contentJson)
  return (doc.content?.length ?? 0) > 0
}

export function migrateNoteContent(
  contentMarkdown: string | undefined | null,
  contentJson: unknown,
): string {
  if (!needsTipTapMigration(contentMarkdown, contentJson)) {
    return contentMarkdown ?? ''
  }
  return tiptapJsonToMarkdown(contentJson ?? EMPTY_TIPTAP_DOC)
}
