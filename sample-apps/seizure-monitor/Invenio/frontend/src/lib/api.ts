import { API_BASE_URL, API_PREFIX } from '@/constants'
import { ISearchFilters, ISearchResponse } from '@/types'

/**
 * Basic fetch wrapper for API calls.
 */
export async function searchPapers(filters: ISearchFilters): Promise<ISearchResponse> {
  const params = new URLSearchParams({
    query: filters.query,
  })

  if (filters.source) params.append('source', filters.source)
  if (filters.limit) params.append('limit', filters.limit.toString())

  const url = `${API_BASE_URL}${API_PREFIX}/research/search?${params.toString()}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || `API error: ${response.status}`)
  }

  return response.json()
}

export async function fetchCorrelationGraph(query: string): Promise<any> {
  const params = new URLSearchParams({ query, limit: '30' })
  const url = `${API_BASE_URL}${API_PREFIX}/correlation/graph?${params.toString()}`
  
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || `API error: ${response.status}`)
  }
  return response.json()
}

export async function startWorkflow(query: string): Promise<{ run_id: string }> {
  const url = `${API_BASE_URL}${API_PREFIX}/workflow/run`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function getWorkflowStatus(runId: string): Promise<any> {
  const url = `${API_BASE_URL}${API_PREFIX}/workflow/status/${runId}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function generateWorkspace(runId: string): Promise<{ workspace_id: string }> {
  const url = `${API_BASE_URL}${API_PREFIX}/workspace/generate`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId }),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function getWorkspace(workspaceId: string): Promise<any> {
  const url = `${API_BASE_URL}${API_PREFIX}/workspace/${workspaceId}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function exportWorkspace(workspaceId: string, format: string): Promise<{ content: string }> {
  const url = `${API_BASE_URL}${API_PREFIX}/workspace/export`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, format }),
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}
