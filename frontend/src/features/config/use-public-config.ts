import { useQuery } from '@tanstack/react-query'

import { fetchPublicConfig } from '@/features/config/config-api'

export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    staleTime: 5 * 60 * 1000,
  })
}
