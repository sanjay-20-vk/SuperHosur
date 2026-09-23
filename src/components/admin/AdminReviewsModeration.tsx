import type { AdminBusinessReview } from '../../services/reviews'

export interface AdminReviewsModerationProps {
  reviews: AdminBusinessReview[]
  loading: boolean
  actionLoadingId: string | null
  onUpdateReviewStatus: (
    review: AdminBusinessReview,
    moderationStatus: 'approved' | 'rejected',
    confirmation: string,
  ) => Promise<void>
}

export function AdminReviewsModeration({
  reviews,
  loading,
  actionLoadingId,
  onUpdateReviewStatus,
}: AdminReviewsModerationProps) {
  if (loading || reviews.length === 0) {
    return null
  }

  return (
    <section
      className="photo-manager admin-review-moderation"
      aria-labelledby="review-moderation-title"
      style={{ marginTop: '2.5rem' }}
    >
      <div className="section-header">
        <div>
          <p className="eyebrow">Moderation</p>
          <h2 id="review-moderation-title">Customer reviews moderation</h2>
        </div>
      </div>
      <div className="table-responsive">
        <div className="admin-business-list">
          {reviews.map((review) => {
            const isLoading = actionLoadingId === review.id

            return (
              <article key={review.id} className="owner-business-card admin-business-card">
                <div>
                  <p className="owner-card-label">
                    Review for {review.business_name || 'Business listing'}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong>{review.author_name}</strong>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)} ({review.rating}/5)
                    </span>
                    <span
                      className={
                        review.moderation_status === 'approved'
                          ? 'status-badge verified'
                          : 'status-badge'
                      }
                    >
                      {review.moderation_status === 'rejected'
                        ? 'Rejected'
                        : review.moderation_status === 'approved'
                        ? 'Approved'
                        : 'Pending review'}
                    </span>
                  </div>
                  {review.comment && (
                    <p style={{ marginTop: '8px', color: 'var(--color-text, #333)' }}>
                      {review.comment}
                    </p>
                  )}
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted, #888)',
                      marginTop: '6px',
                      display: 'block',
                    }}
                  >
                    Submitted on {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="owner-business-actions">
                  {review.moderation_status !== 'approved' && (
                    <button
                      type="button"
                      className="primary-button inline-button"
                      disabled={isLoading}
                      onClick={() =>
                        onUpdateReviewStatus(
                          review,
                          'approved',
                          'Approve this customer review for public display?',
                        )
                      }
                    >
                      {isLoading ? 'Updating…' : 'Approve review'}
                    </button>
                  )}
                  {review.moderation_status !== 'rejected' && (
                    <button
                      type="button"
                      className="nav-link danger-button"
                      disabled={isLoading}
                      onClick={() =>
                        onUpdateReviewStatus(review, 'rejected', 'Reject this customer review?')
                      }
                    >
                      Reject
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
