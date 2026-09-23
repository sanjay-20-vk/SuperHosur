type EmptyStateProps = {
  title?: string
  message?: string
}

export function EmptyState({
  title = 'No businesses yet',
  message = 'There are no businesses available in this marketplace yet.',
}: EmptyStateProps) {
  return (
    <div className="state-panel empty-state" aria-live="polite">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
