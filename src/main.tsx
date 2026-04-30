import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'
import './index.css'

// Recover from stale dynamic-import chunks after a redeploy. When Vite-built
// lazy chunks 404 (because index.html still references the previous build's
// hashes in an open tab), `vite:preloadError` fires. We reload once — the
// session-storage guard prevents an infinite loop if something else is wrong.
const RELOAD_KEY = 'lookout:chunkReloadAt'
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
  if (Date.now() - last < 10_000) return // already reloaded recently — bail
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
