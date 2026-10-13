import { useQuery } from '@tanstack/react-query'
import { fetchCorrelationGraph } from '@/lib/api'
import { ICorrelationResponse } from '@/types'

export function useCorrelation(query: string, enabled = true) {
  return useQuery<ICorrelationResponse, Error>({
    queryKey: ['correlation', query],
    queryFn: () => fetchCorrelationGraph(query),
    enabled: enabled && Boolean(query),
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1,
  })
}
