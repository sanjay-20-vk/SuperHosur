import { generateCorrelationId } from '../utils/correlation'
import { redactSensitiveData } from '../utils/redact'

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

export interface AppErrorEvent {
  id: string
  timestamp: string
  severity: ErrorSeverity
  message: string
  code?: string
  route?: string
  component?: string
  userId?: string
  correlationId: string
  metadata?: Record<string, unknown>
  stack?: string
}

class ErrorReportingService {
  private currentUserId: string | null = null
  private eventBuffer: AppErrorEvent[] = []
  private maxBufferSize: number = 50

  public setUser(userId: string | null): void {
    this.currentUserId = userId
  }

  public clearUser(): void {
    this.currentUserId = null
  }

  public captureException(
    error: unknown,
    options?: {
      severity?: ErrorSeverity
      code?: string
      component?: string
      metadata?: Record<string, unknown>
    }
  ): string {
    const correlationId = generateCorrelationId('err')
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined

    const event: AppErrorEvent = {
      id: correlationId,
      timestamp: new Date().toISOString(),
      severity: options?.severity || 'error',
      message,
      code: options?.code || 'UNHANDLED_EXCEPTION',
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      component: options?.component,
      userId: this.currentUserId || undefined,
      correlationId,
      metadata: options?.metadata ? redactSensitiveData(options.metadata) : undefined,
      stack,
    }

    this.recordEvent(event)
    return correlationId
  }

  public captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    metadata?: Record<string, unknown>
  ): string {
    const correlationId = generateCorrelationId('msg')
    const event: AppErrorEvent = {
      id: correlationId,
      timestamp: new Date().toISOString(),
      severity,
      message,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userId: this.currentUserId || undefined,
      correlationId,
      metadata: metadata ? redactSensitiveData(metadata) : undefined,
    }

    this.recordEvent(event)
    return correlationId
  }

  private recordEvent(event: AppErrorEvent): void {
    this.eventBuffer.push(event)
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift()
    }

    // In development or test environments, format clean structured diagnostics
    if (import.meta.env?.MODE !== 'production') {
      const logger =
        event.severity === 'fatal' || event.severity === 'error'
          ? console.error
          : event.severity === 'warning'
          ? console.warn
          : console.info
      logger(`[SuperHosur ${event.severity.toUpperCase()}] [${event.correlationId}] ${event.message}`, {
        code: event.code,
        component: event.component,
        metadata: event.metadata,
      })
    }
  }

  public getRecentEvents(): AppErrorEvent[] {
    return [...this.eventBuffer]
  }

  public clearRecentEvents(): void {
    this.eventBuffer = []
  }
}

export const errorReporting = new ErrorReportingService()
