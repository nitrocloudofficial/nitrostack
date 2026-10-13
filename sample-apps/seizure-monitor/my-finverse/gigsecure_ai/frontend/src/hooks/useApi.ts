import { useState, useCallback } from 'react';

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}
