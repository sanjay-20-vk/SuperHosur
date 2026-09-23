import { AppRouter } from './lib/router'
import { AppLayout } from './layouts/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppLayout>
          <AppRouter />
        </AppLayout>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
