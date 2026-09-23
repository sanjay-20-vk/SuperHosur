type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'Loading the marketplace…' }: LoadingStateProps) {
  return (
    <div className="state-panel" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
