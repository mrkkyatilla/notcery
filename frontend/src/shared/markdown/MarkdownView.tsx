import type { PluggableList } from 'unified'
import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'

import { buildMarkdownComponents } from '@/shared/markdown/markdown-components'
import { rehypePlugins, remarkPlugins } from '@/shared/markdown/pipeline'
import '@/shared/markdown/notes-markdown.css'
import { cn } from '@/shared/lib/utils'

export type MarkdownVariant = 'chat' | 'note'

type Props = {
  content: string
  className?: string
  variant?: MarkdownVariant
}

export function MarkdownView({ content, className, variant = 'chat' }: Props) {
  const rootClass =
    variant === 'note' ? 'note-markdown' : 'chat-markdown text-sm leading-relaxed'

  return (
    <div className={cn(rootClass, '[&_.katex]:text-[1.05em]', className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins as PluggableList}
        components={buildMarkdownComponents(variant)}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
