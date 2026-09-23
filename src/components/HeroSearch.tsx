type HeroSearchProps = {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
}

export function HeroSearch({ value, onChange, onSubmit }: HeroSearchProps) {
  return (
    <div className="hero-search-panel" role="search" aria-label="Marketplace quick search">
      <div className="search-panel-header">
        <label htmlFor="marketplace-search" className="search-label">
          Find what you need in Hosur
        </label>
        <span className="search-badge">Live search</span>
      </div>

      <div className="search-input-wrap">
        <svg
          className="search-icon-svg"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="marketplace-search"
          type="search"
          maxLength={100}
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit?.()
          }}
          placeholder="Search businesses, products, services, or equipment..."
          aria-label="Search the marketplace"
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <button
        type="button"
        className="primary-button hero-search-submit"
        onClick={() => onSubmit?.()}
        aria-label="Search marketplace"
      >
        <span>Search marketplace</span>
        <span className="button-arrow" aria-hidden="true">
          →
        </span>
      </button>

      <div className="search-suggestions" aria-label="Popular searches">
        <span className="search-suggestion-label">Popular:</span>
        {['Auto Components', 'CNC Machining', 'Fabrication', 'Equipment', 'Plumbing'].map((term) => (
          <button
            key={term}
            type="button"
            className="search-suggestion-chip"
            onClick={() => onChange(term)}
            aria-label={`Search for ${term}`}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
