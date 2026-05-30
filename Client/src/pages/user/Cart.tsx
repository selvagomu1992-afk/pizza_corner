import { Link } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { HiOutlineTrash, HiOutlineShoppingBag } from 'react-icons/hi'

const Cart = () => {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCartStore()
  const deliveryFee = subtotal() >= 20 ? 0 : 2.99
  const tax = parseFloat((subtotal() * 0.05).toFixed(2))
  const total = parseFloat((subtotal() + deliveryFee + tax).toFixed(2))

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <HiOutlineShoppingBag className="h-16 w-16 mx-auto text-stone-300 mb-4" />
        <h2 className="text-2xl font-bold text-stone-700 mb-2">Your cart is empty</h2>
        <p className="text-stone-500 mb-6">Hungry? Add some pizzas to your cart</p>
        <Link to="/products" className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700">
          Browse Menu
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Your Cart</h1>
        <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600 font-medium">Clear All</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover bg-stone-100" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800 truncate">{item.name}</h3>
                <p className="text-amber-700 font-bold mt-1">₹{item.price}</p>
              </div>
              <div className="flex items-center border border-stone-300 rounded-lg">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-100">-</button>
                <span className="px-3 py-1.5 font-medium border-x border-stone-300 min-w-[2rem] text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-100">+</button>
              </div>
              <div className="text-right min-w-[5rem]">
                <p className="font-bold text-stone-800">₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button onClick={() => removeItem(item.productId)} className="text-stone-400 hover:text-red-500">
                <HiOutlineTrash className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm h-fit">
          <h3 className="font-bold text-stone-800 text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>₹{subtotal().toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Delivery</span><span>{deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${deliveryFee.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Tax (5%)</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg"><span>Total</span><span className="text-amber-700">₹{total.toFixed(2)}</span></div>
          </div>
          <Link to="/checkout"
            className="mt-6 block w-full bg-amber-600 text-white py-3 rounded-lg font-semibold text-center hover:bg-amber-700 transition">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Cart
