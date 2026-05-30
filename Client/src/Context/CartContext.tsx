import { createContext, useContext } from 'react'
import { useCartStore } from '../store/cartStore'

interface CartContextType {
  cartSubtotal: number
}

const CartContext = createContext<CartContextType>({ cartSubtotal: 0 })

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const subtotal = useCartStore((s) => s.items.reduce((sum, item) => sum + item.price * item.quantity, 0))
  return <CartContext.Provider value={{ cartSubtotal: subtotal }}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
