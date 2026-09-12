import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@shared/contexts/AuthContext'
import { EventProvider } from '@shared/contexts/EventContext'
import { ToastProvider } from './components/ui/ToastContext'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <EventProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </EventProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
