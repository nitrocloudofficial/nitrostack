import { useQuery } from '@tanstack/react-query'
import { getWorkflowStatus } from '@/lib/api'
import { IWorkflowRun } from '@/types'

export function useWorkflow(runId: string | null) {
  return useQuery<{ run: IWorkflowRun }, Error>({
    queryKey: ['workflow', runId],
    queryFn: () => getWorkflowStatus(runId!),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      // Keep polling every 1 second until completed or failed
      const status = query.state.data?.run?.status
      if (status === 'completed' || status === 'failed') {
        return false
      }
      return 1000 
    },
  })
}
