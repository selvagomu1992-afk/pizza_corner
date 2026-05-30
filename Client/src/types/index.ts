export interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  isAdmin?: boolean
  createdAt?: string
}

export interface Address {
  id: string
  userId: string
  label: string
  address: string
  city: string
  state: string
  zip: string
  phone?: string
  isDefault: boolean
  lat: number
  lng: number
  createdAt?: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  image: string
  category: string
  unit?: string
  stock?: number
  minQty?: number
  isOrganic?: boolean
  rating?: number
  reviewCount?: number
}

export interface OrderItem {
  product: string
  name: string
  image: string
  price: number
  quantity: number
  unit: string
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  shippingAddress: Record<string, unknown>
  paymentMethod: string
  subtotal: number
  deliveryFee?: number
  tax?: number
  total: number
  status: string
  statusHistory: { status: string; note: string; timestamp: string }[]
  deliveryPartnerId?: string
  deliveryPartner?: DeliveryPartner
  deliveryOtp?: string
  liveLocation?: { lat: number; lng: number; updatedAt: string }
  locationHistory?: { lat: number; lng: number; updatedAt: string }[]
  isPaid?: boolean
  user?: { id: string; name: string; email: string; phone?: string }
  createdAt?: string
  updatedAt?: string
}

export interface DeliveryPartner {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  vehicleType?: string
  isActive?: boolean
  totalDeliveries?: number
  todayDeliveries?: number
  createdAt?: string
}

export interface CartItem {
  productId: string
  name: string
  image: string
  price: number
  quantity: number
  unit: string
  stock: number
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  [key: string]: unknown
}
