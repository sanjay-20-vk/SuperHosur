type EmptyStateProps = {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  action?: React.ReactNode
}

export function EmptyState({
  title = 'No businesses yet',
  message = 'There are no businesses available in this marketplace yet.',
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  return (
    <div className="state-panel empty-state" aria-live="polite">
      <h3>{title}</h3>
      <p>{message}</p>
      {action ? (
        action
      ) : actionLabel && onAction ? (
        <button
          type="button"
          className="secondary-button inline-button"
          style={{ marginTop: '14px' }}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
