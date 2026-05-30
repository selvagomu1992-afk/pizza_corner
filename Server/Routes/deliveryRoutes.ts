import { Router } from 'express'
import {
    getProfile,
    updateProfile,
    changePassword,
    getMyOrders,
    getOrderStats,
    getOrderById,
    updateOrderStatus,
    confirmDelivery,
    updateLiveLocation,
} from '../Controllers/deliveryController.js'
import { protectDelivery } from '../middileware/auth.js'

const router = Router()

// All delivery routes require delivery partner JWT
router.use(protectDelivery)

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile',          getProfile)
router.patch('/profile',        updateProfile)
router.patch('/change-password', changePassword)

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders/stats',          getOrderStats)       // before /:id
router.get('/orders',                getMyOrders)
router.get('/orders/:id',            getOrderById)
router.patch('/orders/:id/status',   updateOrderStatus)
router.patch('/orders/:id/deliver',  confirmDelivery)
router.patch('/orders/:id/location', updateLiveLocation)

export default router
