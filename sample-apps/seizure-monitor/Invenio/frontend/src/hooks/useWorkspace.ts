import { useQuery, useMutation } from '@tanstack/react-query'
import { generateWorkspace, getWorkspace, exportWorkspace } from '@/lib/api'
import { IWorkspaceSession, ExportFormat } from '@/types'

export function useGenerateWorkspace() {
  return useMutation({
    mutationFn: (runId: string) => generateWorkspace(runId),
  })
}

export function useWorkspace(workspaceId: string | null) {
  return useQuery<{ workspace: IWorkspaceSession }, Error>({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useExportWorkspace() {
  return useMutation({
    mutationFn: ({ workspaceId, format }: { workspaceId: string; format: ExportFormat }) =>
      exportWorkspace(workspaceId, format),
  })
}
