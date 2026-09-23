import { Component, type ErrorInfo, type ReactNode } from 'react'

export type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

export type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('SuperHosur ErrorBoundary caught an unhandled rendering error:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
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

      const errorMessage =
        this.state.error?.message ||
        'An unexpected rendering error occurred. You can reload the page or return to the marketplace.'

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
                An unexpected error occurred while displaying this page in SuperHosur.
              </p>

              <div className="error-detail-box">
                <code>{errorMessage}</code>
              </div>

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
