import { useQuery } from '@tanstack/react-query'

import { getLabImport } from '@/features/lab/lab-import-api'

export function labImportKey(importId: string) {
  return ['lab-import', importId] as const
}

export function useLabImportStatus(importId: string | null) {
  return useQuery({
    queryKey: labImportKey(importId ?? ''),
    queryFn: () => getLabImport(importId!),
    enabled: Boolean(importId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'pending' || status === 'running') return 2000
      return false
    },
  })
}
