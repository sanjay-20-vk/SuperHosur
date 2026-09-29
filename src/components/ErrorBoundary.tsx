import { Component, type ErrorInfo, type ReactNode } from 'react'
import { errorReporting } from '../services/errorReporting'

export type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

export type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
  correlationId: string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      correlationId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const correlationId = errorReporting.captureException(error, {
      severity: 'fatal',
      component: 'ReactErrorBoundary',
      metadata: { componentStack: errorInfo.componentStack },
    })
    this.setState({ correlationId })
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      correlationId: null,
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="app-shell error-boundary-shell">
          <header className="app-header">
            <div className="brand-block" aria-label="SuperHosur brand and location">
              <a className="brand" href="/" aria-label="SuperHosur home">
                SuperHosur
              </a>
              <span className="location-pill">Hosur, Tamil Nadu</span>
            </div>
            <div className="header-actions">
              <a href="/" className="nav-link">
                Home
              </a>
            </div>
          </header>

          <main className="page-section error-boundary-container">
            <div className="error-boundary-card" role="alert" aria-live="assertive">
              <div className="error-icon-badge" aria-hidden="true">
                ⚠️
              </div>
              <p className="eyebrow" style={{ color: '#ba5d3a' }}>
                Application Notice
              </p>
              <h2>Something went wrong</h2>
              <p className="error-lead">
                An unexpected error occurred while displaying this page in SuperHosur. Your session and listings remain safe.
              </p>

              {this.state.correlationId && (
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
                  Reference ID: <code style={{ userSelect: 'all', color: '#0f172a' }}>{this.state.correlationId}</code>
                </div>
              )}

              <div className="error-actions-row">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="primary-button inline-button"
                  aria-label="Try Again"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="nav-link"
                  style={{ cursor: 'pointer', background: '#ffffff' }}
                  aria-label="Reload page"
                >
                  Reload Page
                </button>
                <a href="/" className="nav-link">
                  Return to Home
                </a>
              </div>
            </div>
          </main>
        </div>
      )
    }

    return this.props.children
  }
}
