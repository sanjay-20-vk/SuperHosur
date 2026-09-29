import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { errorReporting } from './services/errorReporting'

// Global Unhandled Error & Promise Rejection Handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorReporting.captureException(event.error || event.message, {
      severity: 'error',
      component: 'window.onerror',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    errorReporting.captureException(event.reason, {
      severity: 'error',
      component: 'window.onunhandledrejection',
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
