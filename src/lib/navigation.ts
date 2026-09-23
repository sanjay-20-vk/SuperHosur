export function navigateTo(path: string): void {
  const nextPath = path.startsWith('/') ? path : `/${path}`

  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, '', nextPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}
