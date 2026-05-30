import { Router } from 'express'
import {
    placeOrder,
    getMyOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    assignDeliveryPartner,
    confirmDelivery,
    updateLiveLocation,
} from '../Controllers/orderController.js'
import { protect, protectDelivery } from '../middileware/auth.js'
import { isAdmin } from '../middileware/admin.js'

const router = Router()

// ─── User ─────────────────────────────────────────────────────────────────────
router.post('/',        protect, placeOrder)
router.get('/my',       protect, getMyOrders)
router.get('/:id',      protect, getOrderById)

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/',                    isAdmin, getAllOrders)
router.patch('/:id/status',        isAdmin, updateOrderStatus)
router.patch('/:id/assign',        isAdmin, assignDeliveryPartner)

// ─── Delivery Partner ─────────────────────────────────────────────────────────
router.patch('/:id/deliver',       protectDelivery, confirmDelivery)
router.patch('/:id/location',      protectDelivery, updateLiveLocation)

export default router
