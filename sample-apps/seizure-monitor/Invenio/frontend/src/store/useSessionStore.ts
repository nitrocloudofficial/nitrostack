import { create } from 'zustand'
import packagesData from '../data/packages.json'

interface SessionState {
  activeSessionId: string | null;
  query: string;
  packages: {
    researchPackage: any;
    correlationPackage: any;
    evidencePackage: any;
    hypothesisPackage: any;
    reportPackage: any;
  } | null;
  activeInspectorNode: any | null;
  plannerStatus: Record<string, string>;
  setInspectorNode: (node: any) => void;
  loadSession: (newQuery?: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  query: "",
  packages: null,
  activeInspectorNode: null,
  plannerStatus: {
    "Planner": "QUEUED",
    "Research": "QUEUED",
    "KnowledgeGraph": "QUEUED",
    "Correlation": "QUEUED",
    "Evidence": "QUEUED",
    "Report": "QUEUED"
  },
  
  setInspectorNode: (node) => set({ activeInspectorNode: node }),
  
  loadSession: async (newQuery?: string) => {
    if (newQuery) set({ query: newQuery })
    const currentQuery = newQuery || useSessionStore.getState().query
    
    // Reset state before running
    set({ 
      activeSessionId: null,
      packages: null,
      plannerStatus: {
        "Planner": "QUEUED",
        "Research": "QUEUED",
        "KnowledgeGraph": "QUEUED",
        "Correlation": "QUEUED",
        "Evidence": "QUEUED",
        "Report": "QUEUED"
      }
    })
    
    try {
      const { startWorkflow } = await import('../lib/api')
      const { run_id } = await startWorkflow(currentQuery)
      set({ activeSessionId: run_id })
    } catch (error) {
      console.error("Workflow start failed", error)
    }
  }
}))
