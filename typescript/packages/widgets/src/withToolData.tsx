'use client';

import React, { useEffect, useState } from 'react';

/**
 * Higher-Order Component for Next.js widgets
 * Automatically handles data fetching from window.openai.toolOutput
 * Eliminates boilerplate code across all widgets
 * 
 * Usage:
 * import { withToolData } from 'nitrostack/widgets';
 * export default withToolData<YourDataType>(YourComponent);
 */

export interface ToolOutputWrapper<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function withToolData<T = any>(
  WrappedComponent: React.ComponentType<{ data: T }>
) {
  return function WithToolDataComponent() {
    const [state, setState] = useState<ToolOutputWrapper<T>>({
      data: null,
      loading: true,
      error: null,
    });
    
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      // Mark as mounted to prevent SSR/hydration issues
      setMounted(true);
      // Function to check for data
      const checkForData = () => {
        try {
          if (typeof window !== 'undefined') {
            const openai = (window as any).openai;
            
            if (openai && openai.toolOutput) {
              setState({
                data: openai.toolOutput as T,
                loading: false,
                error: null,
              });
              return true;
            }
          }
        } catch (err) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          return true;
        }
        return false;
      };

      // Check immediately
      if (checkForData()) {
        return;
      };

      // Listen for postMessage (for dev mode)
      const handleMessage = (event: MessageEvent) => {
        console.log('[Widget] Received postMessage:', event.data);
        if (event.data && event.data.type === 'toolOutput') {
          console.log('[Widget] Setting data:', event.data.data);
          setState({
            data: event.data.data as T,
            loading: false,
            error: null,
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: wait longer for postMessage in dev mode
      const timeout = setTimeout(() => {
        // Only show error if we still don't have data
        setState((prevState) => {
          // If we already have data, don't override it
          if (prevState.data && Object.keys(prevState.data).length > 0) {
            return prevState; // Keep existing state
          }
          
          if (!checkForData()) {
            return {
              data: null,
              loading: false,
              error: 'No data available',
            };
          }
          
          return prevState;
        });
      }, 5000); // Increased to 5 seconds for dev mode

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
      };
    }, []);

    // Don't render anything until mounted (prevents SSR issues)
    if (!mounted) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#D4AF37',
          }} />
        </div>
      );
    }

    if (state.loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#D4AF37',
              animation: 'pulse 1.4s ease-in-out infinite',
            }} />
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#D4AF37',
              animation: 'pulse 1.4s ease-in-out 0.2s infinite',
            }} />
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#D4AF37',
              animation: 'pulse 1.4s ease-in-out 0.4s infinite',
            }} />
          </div>
        </div>
      );
    }

    if (state.error || !state.data) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>⚠️</div>
          <div style={{
            color: '#666',
            fontSize: '16px',
            fontWeight: '500',
          }}>
            {state.error || 'No data available'}
          </div>
        </div>
      );
    }

    // Extra safety: validate data is an object with properties
    // This prevents rendering if data is an empty object or invalid
    if (typeof state.data !== 'object' || Object.keys(state.data).length === 0) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>⏳</div>
          <div style={{
            color: '#666',
            fontSize: '16px',
            fontWeight: '500',
          }}>
            Waiting for data...
          </div>
        </div>
      );
    }

    // Wrap component rendering in React Error Boundary to catch any rendering errors
    // We use a class component error boundary because try-catch doesn't work with React rendering
    return (
      <ErrorBoundary>
        <WrappedComponent data={state.data} />
      </ErrorBoundary>
    );
  };
}

/**
 * Error Boundary Component to catch widget rendering errors
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Widget rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>❌</div>
          <div style={{
            color: '#666',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '8px',
          }}>
            Widget Error
          </div>
          <div style={{
            color: '#999',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxWidth: '400px',
            wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Global styles to be injected
 */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.2); }
    }
  `;
  document.head.appendChild(style);
}

