import remarkEmoji from 'remark-emoji'
import remarkGfm from 'remark-gfm'
import remarkGithubAlerts from 'remark-github-alerts'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'

import { markdownSanitizeSchema } from '@/shared/markdown/sanitize-schema'

export const remarkPlugins = [remarkGfm, remarkGithubAlerts, remarkEmoji, remarkMath]

export const rehypePlugins = [
  rehypeKatex,
  [rehypeSanitize, markdownSanitizeSchema],
]
