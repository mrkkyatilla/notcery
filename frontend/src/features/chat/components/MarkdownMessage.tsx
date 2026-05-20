import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

import { cn } from '@/shared/lib/utils'

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
  code: ({ children, className }) => {
    const inline = !className
    if (inline) {
      return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
      )
    }
    return (
      <code className="block overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
        {children}
      </code>
    )
  },
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline-offset-2 hover:underline"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
}

type Props = {
  content: string
  className?: string
}

export function MarkdownMessage({ content, className }: Props) {
  return (
    <div
      className={cn(
        'chat-markdown text-sm leading-relaxed [&_.katex]:text-[1.05em]',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
