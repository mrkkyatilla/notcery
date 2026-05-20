import type { Components } from 'react-markdown'

import { MermaidBlock } from '@/shared/markdown/MermaidBlock'
import { cn } from '@/shared/lib/utils'

function languageFromClassName(className?: string): string | undefined {
  if (!className) return undefined
  const match = /language-(\S+)/.exec(className)
  return match?.[1]
}

export function buildMarkdownComponents(variant: 'chat' | 'note'): Components {
  const textSize = variant === 'chat' ? 'text-sm' : 'text-base'

  return {
    p: ({ children }) => (
      <p className={cn('mb-2 last:mb-0 leading-relaxed', textSize)}>{children}</p>
    ),
    h1: ({ children }) => (
      <h1 className="mb-3 mt-4 text-2xl font-bold first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-4 text-xl font-semibold first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-3 text-lg font-semibold first:mt-0">{children}</h3>
    ),
    ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children, className }) => (
      <li className={cn('leading-relaxed', className, textSize)}>{children}</li>
    ),
    blockquote: ({ children, className }) => (
      <blockquote
        className={cn(
          'mb-2 border-l-4 border-border pl-4 italic text-muted-foreground',
          className,
          textSize,
        )}
      >
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="mb-2 overflow-x-auto">
        <table className={cn('w-full min-w-[280px] border-collapse text-left', textSize)}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-border px-2 py-1.5 font-medium">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-2 py-1.5 align-top">{children}</td>
    ),
    input: ({ checked, disabled }) => (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled ?? true}
        readOnly
        className="mr-2 accent-primary"
      />
    ),
    details: ({ children, open }) => (
      <details
        open={open}
        className="mb-2 rounded-md border border-border bg-muted/20 px-3 py-2"
      >
        {children}
      </details>
    ),
    summary: ({ children }) => (
      <summary className="cursor-pointer font-medium select-none">{children}</summary>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    code: ({ children, className }) => {
      const lang = languageFromClassName(className)
      const text = String(children).replace(/\n$/, '')
      if (lang === 'mermaid') {
        return <MermaidBlock code={text} />
      }
      const inline = !className
      if (inline) {
        return (
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
        )
      }
      return (
        <code
          className={cn(
            'block overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs',
            className,
          )}
        >
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
    hr: () => <hr className="my-4 border-border" />,
  }
}
