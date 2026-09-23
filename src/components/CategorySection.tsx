export type CategorySummary = {
  id: string
  name: string
  slug: string
}

type CategorySectionProps = {
  categories: CategorySummary[]
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
}

export function CategorySection({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySectionProps) {
  if (categories.length === 0) {
    return null
  }

  return (
    <section className="category-section" aria-labelledby="category-section-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Marketplace categories</p>
          <h2 id="category-section-title">Explore by category</h2>
        </div>
        <span className="results-summary">{categories.length} categories</span>
      </div>

      <div className="category-grid" role="list" aria-label="Marketplace categories">
        <button
          type="button"
          className={selectedCategoryId === null ? 'category-pill active' : 'category-pill'}
          role="listitem"
          aria-pressed={selectedCategoryId === null}
          onClick={() => onSelectCategory(null)}
        >
          All categories
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className={
              selectedCategoryId === category.id ? 'category-pill active' : 'category-pill'
            }
            role="listitem"
            aria-pressed={selectedCategoryId === category.id}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </section>
  )
}
