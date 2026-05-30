import { Router } from 'express'
import {
    getDashboard,
    getAllUsers,
    getUserById,
    deleteUser,
    getAdminOrders,
    updateOrderStatus,
    assignDeliveryPartner,
    getDeliveryPartners,
    createDeliveryPartner,
    toggleDeliveryPartner,
    deleteDeliveryPartner,
    changeAdminCredentials,
    getAllAddresses,
    notifyOffer,
    getUnassignedCount,
} from '../Controllers/adminController.js'
import { isAdmin } from '../middileware/admin.js'

const router = Router()

// All admin routes require isAdmin middleware
router.use(isAdmin)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard)

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users',        getAllUsers)
router.get('/users/:id',    getUserById)
router.delete('/users/:id', deleteUser)

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders',                    getAdminOrders)
router.patch('/orders/:id/status',       updateOrderStatus)
router.patch('/orders/:id/assign',       assignDeliveryPartner)

// ─── Delivery Partners ────────────────────────────────────────────────────────
router.get('/delivery-partners',                    getDeliveryPartners)
router.post('/delivery-partners',                   createDeliveryPartner)
router.patch('/delivery-partners/:id/toggle',       toggleDeliveryPartner)
router.delete('/delivery-partners/:id',             deleteDeliveryPartner)

// ─── Admin Credentials ────────────────────────────────────────────────────────
router.patch('/credentials', changeAdminCredentials)

// ─── Addresses ────────────────────────────────────────────────────────────────
router.get('/addresses', getAllAddresses)

// ─── Unassigned orders indicator ──────────────────────────────────────────────
router.get('/unassigned-count', getUnassignedCount)

// ─── Offer Notification ───────────────────────────────────────────────────────
router.post('/offers/notify', notifyOffer)

export default router
