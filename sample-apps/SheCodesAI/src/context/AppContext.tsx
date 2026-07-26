'use client';

import React, { createContext, useContext, useState } from 'react';
import { 
  ContextPack, 
  ApprovalTask, 
  WorkflowNode, 
  IntegrationItem, 
  KnowledgeArticle, 
  VectorMemoryNode, 
  Workspace, 
  NotificationItem,
  CalendarEventItem 
} from '../types';
import { 
  CONTEXT_PACKS, 
  MOCK_APPROVAL_TASKS, 
  MOCK_WORKFLOW_NODES, 
  MOCK_INTEGRATIONS, 
  MOCK_KNOWLEDGE_ARTICLES, 
  MOCK_VECTOR_NODES, 
  MOCK_WORKSPACES, 
  MOCK_NOTIFICATIONS,
  MOCK_CALENDAR_EVENTS 
} from '../data/mockData';

export type ActiveTab = 
  | 'landing' 
  | 'dashboard' 
  | 'live_room' 
  | 'workflow_builder' 
  | 'context_packs' 
  | 'knowledge_hub' 
  | 'vector_memory' 
  | 'integrations' 
  | 'analytics' 
  | 'calendar' 
  | 'workspace_settings' 
  | 'notifications';

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedPack: ContextPack;
  setSelectedPack: (pack: ContextPack) => void;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  setCurrentWorkspace: (ws: Workspace) => void;
  tasks: ApprovalTask[];
  approveTask: (id: string) => void;
  rejectTask: (id: string) => void;
  editTask: (updated: ApprovalTask) => void;
  workflowNodes: WorkflowNode[];
  setWorkflowNodes: React.Dispatch<React.SetStateAction<WorkflowNode[]>>;
  triggerNodeProgression: () => void;
  integrations: IntegrationItem[];
  knowledgeArticles: KnowledgeArticle[];
  vectorNodes: VectorMemoryNode[];
  notifications: NotificationItem[];
  calendarEvents: CalendarEventItem[];
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isReasoningRunning: boolean;
  setIsReasoningRunning: (running: boolean) => void;
  reasoningStageIndex: number;
  setReasoningStageIndex: (idx: number | ((prev: number) => number)) => void;
  customPacks: ContextPack[];
  addCustomPack: (pack: ContextPack) => void;
  customTranscript: string;
  setCustomTranscript: (t: string) => void;
  uploadedFileName: string | null;
  setUploadedFileName: (name: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedPack, setSelectedPack] = useState<ContextPack>(CONTEXT_PACKS[1]); // Default to Software Dev
  const [workspaces] = useState<Workspace[]>(MOCK_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(MOCK_WORKSPACES[0]);
  const [tasks, setTasks] = useState<ApprovalTask[]>(MOCK_APPROVAL_TASKS);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>(MOCK_WORKFLOW_NODES);
  const [integrations] = useState<IntegrationItem[]>(MOCK_INTEGRATIONS);
  const [knowledgeArticles] = useState<KnowledgeArticle[]>(MOCK_KNOWLEDGE_ARTICLES);
  const [vectorNodes] = useState<VectorMemoryNode[]>(MOCK_VECTOR_NODES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [calendarEvents] = useState<CalendarEventItem[]>(MOCK_CALENDAR_EVENTS);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isReasoningRunning, setIsReasoningRunning] = useState<boolean>(false);
  const [reasoningStageIndex, setReasoningStageIndex] = useState<number>(0);
  const [customPacks, setCustomPacks] = useState<ContextPack[]>([]);
  const [customTranscript, setCustomTranscript] = useState<string>(
    "Haswitheswari KamboJi: Team, today we are deploying the FastAPI auth microservice to Staging. Ananya, please configure the ChromaDB vector store container. Priya, review the Q3 Context Pack matrix in Notion. David, schedule the client architecture sync."
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Trigger Node 5 -> Node 6 -> Node 7 completion sequence on Task Approval
  const triggerNodeProgression = () => {
    // 1. Mark Node 4 (Human Approval Gate) as COMPLETED
    setWorkflowNodes(prev => prev.map(n => {
      if (n.id === 'node-4') {
        return {
          ...n,
          status: 'completed',
          progress: 100,
          duration: '12.4s',
          logs: [...n.logs, 'User clicked Approve: Human Approval Gate passed successfully!']
        };
      }
      return n;
    }));

    // 2. Activate Node 5 (MCP Router & Orchestrator)
    setTimeout(() => {
      setWorkflowNodes(prev => prev.map(n => {
        if (n.id === 'node-5') {
          return {
            ...n,
            status: 'completed',
            progress: 100,
            duration: '0.9s',
            logs: [
              'Human Approval received from Haswitheswari KamboJi',
              'MCP Microservice Gateway activated',
              'Dispatched Task #101 to GitHub API (Issue #42 created)',
              'Dispatched Task #102 to Jira API (DEV-842 created)',
              'Dispatched Task #104 to Google Calendar API (Event scheduled)'
            ]
          };
        }
        return n;
      }));
    }, 400);

    // 3. Activate Node 6 (Notion Knowledge Hub Sync)
    setTimeout(() => {
      setWorkflowNodes(prev => prev.map(n => {
        if (n.id === 'node-6') {
          return {
            ...n,
            status: 'completed',
            progress: 100,
            duration: '1.1s',
            logs: [
              'Target Notion Database: Sprint Knowledge Base',
              'Created page: Sprint 24 Architecture Sync & FastAPI Strategy',
              'Published 3 architectural decisions to Notion workspace'
            ]
          };
        }
        return n;
      }));
    }, 900);

    // 4. Activate Node 7 (ChromaDB Memory Update)
    setTimeout(() => {
      setWorkflowNodes(prev => prev.map(n => {
        if (n.id === 'node-7') {
          return {
            ...n,
            status: 'completed',
            progress: 100,
            duration: '0.6s',
            logs: [
              'Generated 1,536-dimensional OpenAI text-embedding-3 vectors',
              'ChromaDB Collection: acme_workspace_memory',
              'Indexed 3 new vector memory nodes with 0.96 cosine similarity score',
              'All 7 Workflow Nodes Completed Successfully!'
            ]
          };
        }
        return n;
      }));
    }, 1400);
  };

  const approveTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'approved', executionLog: 'Executed successfully via MCP Orchestrator' } : t));
    triggerNodeProgression();
  };

  const rejectTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected', executionLog: 'Rejected by human reviewer' } : t));
  };

  const editTask = (updated: ApprovalTask) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...updated, status: 'edited' } : t));
  };

  const addCustomPack = (newPack: ContextPack) => {
    setCustomPacks(prev => [...prev, newPack]);
    setSelectedPack(newPack);
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      selectedPack,
      setSelectedPack,
      workspaces,
      currentWorkspace,
      setCurrentWorkspace,
      tasks,
      approveTask,
      rejectTask,
      editTask,
      workflowNodes,
      setWorkflowNodes,
      triggerNodeProgression,
      integrations,
      knowledgeArticles,
      vectorNodes,
      notifications,
      calendarEvents,
      isSearchOpen,
      setIsSearchOpen,
      isNotificationsOpen,
      setIsNotificationsOpen,
      isReasoningRunning,
      setIsReasoningRunning,
      reasoningStageIndex,
      setReasoningStageIndex,
      customPacks,
      addCustomPack,
      customTranscript,
      setCustomTranscript,
      uploadedFileName,
      setUploadedFileName
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
