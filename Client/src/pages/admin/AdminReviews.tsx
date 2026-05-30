import { useEffect, useState } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import { HiOutlineTrash, HiOutlineStar, HiStar } from 'react-icons/hi'

interface Review {
  id: string
  comment: string
  rating: number
  createdAt: string
  user: { id: string; name: string; email: string }
  product: { id: string; name: string }
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/reviews').then(({ data }) => {
      if (data.success) setReviews(data.reviews)
    }).catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return
    try {
      const { data } = await api.delete(`/admin/reviews/${id}`)
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id))
        toast.success('Review deleted')
      }
    } catch {
      toast.error('Failed to delete review')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">User Reviews</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-stone-400">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border border-stone-200 rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-800 text-sm">{review.user.name}</span>
                  <span className="text-xs text-stone-400">({review.user.email})</span>
                  <span className="text-xs text-amber-600 font-medium">on {review.product.name}</span>
                  <span className="ml-auto text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    s <= review.rating ? <HiStar key={s} className="h-4 w-4" /> : <HiOutlineStar key={s} className="h-4 w-4" />
                  ))}
                </div>
                <p className="text-stone-600 text-sm mt-2">{review.comment}</p>
              </div>
              <button onClick={() => handleDelete(review.id)}
                className="text-red-400 hover:text-red-600 flex-shrink-0 mt-1">
                <HiOutlineTrash className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminReviews
