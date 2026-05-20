import { MarkdownView } from '@/shared/markdown/MarkdownView'
import { cn } from '@/shared/lib/utils'

type Props = {
  content: string
  className?: string
}

export function MarkdownMessage({ content, className }: Props) {
  return <MarkdownView content={content} variant="chat" className={cn(className)} />
}
