import 'highlight.js/styles/github-dark.min.css'

import { toHtml } from 'hast-util-to-html'
import { useMemo } from 'react'
import { common, createLowlight } from 'lowlight'

import { languageFromFilename } from '@/features/lab/preview-language'

const lowlight = createLowlight(common)

type Props = {
  filename: string
  content: string
}

export function CodePreview({ filename, content }: Props) {
  const html = useMemo(() => {
    const lang = languageFromFilename(filename)
    try {
      const tree = lowlight.highlight(lang, content)
      return toHtml(tree)
    } catch {
      const tree = lowlight.highlight('plaintext', content)
      return toHtml(tree)
    }
  }, [filename, content])

  return (
    <pre className="hljs overflow-auto rounded-md bg-[#1e1e1e] p-3 text-xs leading-relaxed">
      <code
        className="hljs block font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  )
}
