import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getWorkbenchData } from './integrations/forgeOpsClient';
import type { WorkbenchSnapshot } from './types';
import { fallbackWorkbenchSnapshot } from './workbenchData';

type WorkbenchDataContextValue = {
  data: WorkbenchSnapshot;
  loading: boolean;
  refresh: () => Promise<void>;
  applyAgentData: (snapshot?: WorkbenchSnapshot) => void;
};

const WorkbenchDataContext = createContext<WorkbenchDataContextValue | undefined>(
  undefined,
);

let initialLoadPromise: Promise<WorkbenchSnapshot> | null = null;

function loadInitialWorkbench() {
  if (!initialLoadPromise) initialLoadPromise = getWorkbenchData();
  return initialLoadPromise;
}

export function WorkbenchDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(fallbackWorkbenchSnapshot);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const snapshot = await getWorkbenchData();
    setData(snapshot);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadInitialWorkbench().then((snapshot) => {
      if (!active) return;
      setData(snapshot);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<WorkbenchDataContextValue>(() => ({
    data,
    loading,
    refresh,
    applyAgentData(snapshot) {
      if (snapshot) setData(snapshot);
    },
  }), [data, loading]);

  return (
    <WorkbenchDataContext.Provider value={value}>
      {children}
    </WorkbenchDataContext.Provider>
  );
}

export function useWorkbenchData() {
  const context = useContext(WorkbenchDataContext);
  if (!context) {
    throw new Error('useWorkbenchData must be used within WorkbenchDataProvider');
  }
  return context;
}
