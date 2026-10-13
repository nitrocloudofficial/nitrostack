/**
 * main.tsx — Application Entry Point
 *
 * Bootstraps the React application.
 *
 * Future:
 * - Add React Query (TanStack Query) provider for server state management
 * - Add global error boundary
 * - Add performance monitoring (Sentry or similar)
 * - Add analytics (Phase 4)
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
