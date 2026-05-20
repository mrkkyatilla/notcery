import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export type NoteMarkdownEditorHandle = {
  getValue: () => string
  getCursor: () => number
  setValue: (value: string, cursor?: number) => void
}

type Props = {
  value: string
  onChange: (value: string) => void
  noteId: string
}

export const NoteMarkdownEditor = forwardRef<NoteMarkdownEditorHandle, Props>(
  function NoteMarkdownEditor({ value, onChange, noteId }, ref) {
    const { t } = useTranslation('notes')
    const hostRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useImperativeHandle(ref, () => ({
      getValue: () => viewRef.current?.state.doc.toString() ?? value,
      getCursor: () => viewRef.current?.state.selection.main.head ?? value.length,
      setValue: (next, cursor) => {
        const view = viewRef.current
        if (!view) return
        const len = view.state.doc.length
        view.dispatch({
          changes: { from: 0, to: len, insert: next },
          selection: { anchor: cursor ?? next.length },
        })
        onChangeRef.current(next)
      },
    }))

    useEffect(() => {
      const parent = hostRef.current
      if (!parent) return

      const state = EditorState.create({
        doc: value,
        extensions: [
          markdown({ base: markdownLanguage }),
          history(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          placeholder(t('editor.placeholder')),
          EditorView.lineWrapping,
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '0.9375rem',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: 'inherit',
            },
            '.cm-content': {
              padding: '12px 16px',
              caretColor: 'hsl(var(--foreground))',
            },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              borderRight: '1px solid hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
            },
            '&.cm-focused .cm-cursor': {
              borderLeftColor: 'hsl(var(--primary))',
            },
            '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
              backgroundColor: 'hsl(var(--primary) / 0.2) !important',
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      })

      const view = new EditorView({ state, parent })
      viewRef.current = view

      return () => {
        view.destroy()
        viewRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate editor per note
    }, [noteId, t])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current !== value) {
        view.dispatch({
          changes: { from: 0, to: current.length, insert: value },
        })
      }
    }, [value])

    return <div ref={hostRef} className="h-full min-h-0 flex-1 overflow-hidden" />
  },
)
