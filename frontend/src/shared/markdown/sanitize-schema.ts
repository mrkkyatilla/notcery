import { defaultSchema } from 'hast-util-sanitize'
import type { Schema } from 'hast-util-sanitize'

const tagNames = [
  ...(defaultSchema.tagNames ?? []),
  'details',
  'summary',
  'del',
  'ins',
  'mark',
]

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames,
  attributes: {
    ...defaultSchema.attributes,
    details: ['open'],
    code: ['className'],
    span: ['className'],
    div: ['className'],
  },
}
