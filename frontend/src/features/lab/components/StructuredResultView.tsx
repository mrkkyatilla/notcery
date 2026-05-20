import type { LabOutputMode } from '@/features/lab/types'

type Props = {
  mode: LabOutputMode
  data: Record<string, unknown> | null | undefined
}

export function StructuredResultView({ mode, data }: Props) {
  if (!data) return null

  if (mode === 'risk_matrix' && Array.isArray(data.risks)) {
    const risks = data.risks as Array<Record<string, string>>
    return (
      <div className="mt-3 overflow-x-auto rounded-md border text-xs">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-1 text-left">Risk</th>
              <th className="px-2 py-1 text-left">Severity</th>
              <th className="px-2 py-1 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1 font-medium">{r.title}</td>
                <td className="px-2 py-1">{r.severity}</td>
                <td className="px-2 py-1">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (mode === 'comparison_table' && Array.isArray(data.rows)) {
    const columns = (data.columns as string[]) ?? []
    const rows = data.rows as Array<{ topic?: string; cells?: string[] }>
    return (
      <div className="mt-3 overflow-x-auto rounded-md border text-xs">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-1 text-left">Topic</th>
              {columns.map((c) => (
                <th key={c} className="px-2 py-1 text-left">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1 font-medium">{row.topic}</td>
                {(row.cells ?? []).map((cell, j) => (
                  <td key={j} className="px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
