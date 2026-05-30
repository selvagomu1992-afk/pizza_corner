import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/client'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import type { Product } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineShoppingBag, HiOutlineStar, HiStar, HiUser } from 'react-icons/hi'

interface Review {
  id: string
  comment: string
  rating: number
  createdAt: string
  user: { id: string; name: string; avatar?: string }
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const addItem = useCartStore((s) => s.addItem)

  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!id) return
    api.get(`/products/${id}`).then(({ data }) => {
      if (data.success) {
        setProduct(data.product)
        api.get('/products', { params: { category: data.product.category, limit: '5' } }).then(({ data: r }) => {
          if (r.success) setRelated(r.products.filter((p: Product) => p.id !== data.product.id))
        }).catch(() => {})
      }
    }).finally(() => setLoading(false))
    api.get(`/reviews/${id}`).then(({ data }) => {
      if (data.success) setReviews(data.reviews)
    }).catch(() => {})
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!product) return <div className="text-center py-20 text-stone-500">Product not found</div>

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      unit: product.unit || 'piece',
      stock: product.stock || 0,
    })
    toast.success(`${product.name} added to cart`)
  }

  const handleRate = async (rating: number) => {
    if (!user || submitting) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/products/${product.id}/rate`, { rating })
      if (data.success) setProduct(data.product)
      toast.success('Thank you for rating!')
    } catch {
      toast.error('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !comment.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/reviews/${product.id}`, { comment: comment.trim(), rating: reviewRating })
      if (data.success) {
        setReviews((prev) => [data.review, ...prev])
        setComment('')
        toast.success('Review submitted!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/products" className="text-amber-600 hover:text-amber-700 text-sm font-medium mb-4 inline-block">&larr; Back to Menu</Link>
      <div className="grid md:grid-cols-[1fr_1.5fr] gap-10">
        <div className="aspect-square bg-stone-100 rounded-2xl overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="text-sm text-amber-600 font-semibold uppercase">{product.category}</span>
          <h1 className="text-3xl font-bold text-stone-800 mt-1">{product.name}</h1>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-0.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => handleRate(star)} disabled={submitting || !user}
                  className={`${!user ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
                  title={user ? `Rate ${star} star${star > 1 ? 's' : ''}` : 'Login to rate'}>
                  {star <= Math.round(product.rating ?? 0) ? (
                    <HiStar className="h-5 w-5" />
                  ) : (
                    <HiOutlineStar className="h-5 w-5" />
                  )}
                </button>
              ))}
            </div>
            {product.rating > 0 && (
              <span className="text-sm text-stone-500">
                {product.rating} ({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </div>

          <p className="text-stone-600 mt-4">{product.description || 'Delicious food made with fresh ingredients.'}</p>

          <div className="flex items-baseline gap-3 mt-6">
            <span className="text-3xl font-bold text-amber-700">₹{product.price}</span>
            {discount > 0 && (
              <>
                <span className="text-lg text-stone-400 line-through">₹{product.originalPrice}</span>
                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded font-medium">{discount}% OFF</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center border border-stone-300 rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-stone-600 hover:bg-stone-100">-</button>
              <span className="px-4 py-2 font-medium border-x border-stone-300">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 text-stone-600 hover:bg-stone-100">+</button>
            </div>
            <button onClick={handleAdd} disabled={product.stock === 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${product.stock === 0 ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
              <HiOutlineShoppingBag className="h-5 w-5" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
            <p className="text-sm text-red-500 mt-3">Only {product.stock} left in stock</p>
          )}
          {product.stock === 0 && (
            <p className="text-sm text-red-500 mt-3 font-medium">Out of stock</p>
          )}

          <div className="mt-8 p-4 bg-stone-50 rounded-xl text-sm text-stone-600 space-y-2">
            <p>🛵 Free delivery on orders above ₹20</p>
            <p>💳 Pay online or cash on delivery</p>
            <p>🔄 Easy returns within 24 hours</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">Related Items</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {related.map((item) => (
              <Link key={item.id} to={`/products/${item.id}`}
                className="flex-shrink-0 w-36 bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition group flex flex-col">
                <div className="w-full h-28 bg-stone-100 overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-stone-800 text-sm leading-tight">{item.name}</h3>
                  <p className="text-amber-700 font-bold mt-auto pt-1">₹{item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">Reviews & Comments</h2>

        {user ? (
          <form onSubmit={handleSubmitReview} className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-stone-600">Your rating:</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setReviewRating(s)} className="text-amber-500">
                  {s <= reviewRating ? <HiStar className="h-5 w-5" /> : <HiOutlineStar className="h-5 w-5" />}
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review..." rows={3}
              className="w-full border border-stone-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
            <button type="submit" disabled={submitting || !comment.trim()}
              className="mt-3 bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:bg-stone-300">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        ) : (
          <p className="text-stone-500 mb-8">
            <Link to="/login" className="text-amber-600 hover:underline">Login</Link> to write a review.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-stone-400">No reviews yet. Be the first one!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-stone-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <HiUser className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{review.user.name}</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        s <= review.rating ? <HiStar key={s} className="h-3.5 w-3.5" /> : <HiOutlineStar key={s} className="h-3.5 w-3.5" />
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-stone-600 text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ProductDetail
