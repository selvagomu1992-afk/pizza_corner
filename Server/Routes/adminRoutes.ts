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
    createCounterBill,
    getCounterBill,
    updateCounterBill,
    getSalesByCategory,
} from '../Controllers/adminController.js'
import {
    getSettings,
    updateSettings,
} from '../Controllers/settingController.js'
import {
    getOffers,
    createOffer,
    updateOffer,
    deleteOffer,
} from '../Controllers/offerController.js'
import {
    getPincodes,
    createPincode,
    updatePincode,
    deletePincode,
} from '../Controllers/pincodeController.js'
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from '../Controllers/categoryController.js'
import { isAdmin } from '../middileware/admin.js'
import { getAllReviews, deleteReview } from '../Controllers/ReviewController.js'

const router = Router()

// All admin routes require isAdmin middleware
router.use(isAdmin)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard)
router.get('/sales-by-category', getSalesByCategory)

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

// ─── Offer CRUD ──────────────────────────────────────────────────────────────
router.get('/offers', getOffers)
router.post('/offers', createOffer)
router.patch('/offers/:id', updateOffer)
router.delete('/offers/:id', deleteOffer)

// ─── Counter Bill ─────────────────────────────────────────────────────────────
router.post('/counter-bill',       createCounterBill)
router.get('/counter-bill/:id',    getCounterBill)
router.patch('/counter-bill/:id',  updateCounterBill)

// ─── Settings (branding / hero carousel) ──────────────────────────────────────
router.get('/settings', getSettings)
router.patch('/settings', updateSettings)

// ─── Pincodes ─────────────────────────────────────────────────────────────────
router.get('/pincodes', getPincodes)
router.post('/pincodes', createPincode)
router.patch('/pincodes/:id', updatePincode)
router.delete('/pincodes/:id', deletePincode)

// ─── Menu Categories ──────────────────────────────────────────────────────────
router.get('/categories', getCategories)
router.post('/categories', createCategory)
router.patch('/categories/:id', updateCategory)
router.delete('/categories/:id', deleteCategory)

// ─── Reviews ───────────────────────────────────────────────────────────────────
router.get('/reviews', getAllReviews)
router.delete('/reviews/:id', deleteReview)

export default router
