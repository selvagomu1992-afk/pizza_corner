import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'

const PaymentVerify = () => {
  const [searchParams] = useSearchParams()
  const cfOrderId = searchParams.get('order_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cfOrderId) { setError('No order reference found'); setStatus('failed'); return }

    const check = async () => {
      try {
        const { data } = await api.get(`/payment/verify-redirect/${cfOrderId}`)
        if (data.success && data.paid) {
          setStatus('success')
          setOrderId(data.orderId)
        } else {
          setStatus('failed')
          setError(data.status || 'Payment was not completed')
        }
      } catch {
        setStatus('failed')
        setError('Could not verify payment. Please check your orders.')
      }
    }

    const timer = setTimeout(check, 1500)
    return () => clearTimeout(timer)
  }, [cfOrderId])

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {status === 'loading' && (
        <div>
          <Spinner size="lg" />
          <p className="text-stone-600 mt-4 text-lg">Verifying your payment…</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h1>
          <p className="text-stone-600 mb-6">Your order has been placed and payment confirmed.</p>
          <Link to={`/orders/${orderId}`}
            className="inline-block bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700">
            View Order
          </Link>
        </div>
      )}

      {status === 'failed' && (
        <div>
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
          <p className="text-stone-600 mb-2">{error || 'Something went wrong with your payment.'}</p>
          <p className="text-sm text-stone-500 mb-6">Please try again or use a different payment method.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/cart"
              className="inline-block bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700">
              Try Again
            </Link>
            <Link to="/orders"
              className="inline-block border border-stone-300 text-stone-700 px-8 py-3 rounded-lg font-semibold hover:bg-stone-50">
              My Orders
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentVerify
