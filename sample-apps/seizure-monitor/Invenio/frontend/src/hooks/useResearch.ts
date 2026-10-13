import { useQuery } from '@tanstack/react-query'
import { searchPapers } from '@/lib/api'
import { ISearchFilters, ISearchResponse } from '@/types'

export function useResearch(filters: ISearchFilters, enabled = true) {
  return useQuery<ISearchResponse, Error>({
    queryKey: ['research', filters],
    queryFn: () => searchPapers(filters),
    enabled: enabled && Boolean(filters.query),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
  })
}
