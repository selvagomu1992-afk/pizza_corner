import { create } from 'zustand'
import type { CartItem } from '../types'

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  subtotal: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: JSON.parse(localStorage.getItem('cart') || '[]'),

  addItem: (item) => {
    const items = get().items
    const existing = items.find((i) => i.productId === item.productId)
    let updated: CartItem[]
    if (existing) {
      updated = items.map((i) =>
        i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
      )
    } else {
      updated = [...items, item]
    }
    localStorage.setItem('cart', JSON.stringify(updated))
    set({ items: updated })
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.productId !== productId)
    localStorage.setItem('cart', JSON.stringify(updated))
    set({ items: updated })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    const updated = get().items.map((i) =>
      i.productId === productId ? { ...i, quantity } : i
    )
    localStorage.setItem('cart', JSON.stringify(updated))
    set({ items: updated })
  },

  clearCart: () => {
    localStorage.removeItem('cart')
    set({ items: [] })
  },

  subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),

  itemCount: () => get().items.reduce((c, i) => c + i.quantity, 0),
}))
