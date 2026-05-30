import { Router } from 'express'
import {
    createPaymentOrder,
    createCounterOrder,
    verifyPayment,
    paymentWebhook,
    getPaymentStatus,
} from '../Controllers/paymentController.js'
import { protect } from '../middileware/auth.js'
import { isAdmin } from '../middileware/admin.js'

const router = Router()

// Public — Cashfree webhook (no auth, signature verified internally)
router.post('/webhook', paymentWebhook)

// Protected — user must be logged in
router.post('/create-order', protect, createPaymentOrder)
router.post('/counter-order', isAdmin, createCounterOrder)
router.post('/verify',       protect, verifyPayment)
router.get('/status/:cfOrderId', protect, getPaymentStatus)

export default router
