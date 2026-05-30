import { Router } from 'express'
import {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    deliveryLogin,
} from '../Controllers/authController.js'
import {
    forgotPassword,
    verifyOtp,
    resetPassword,
} from '../Controllers/forgotPasswordController.js'
import { protect } from '../Middleware/authMiddleware.js'

const router = Router()

// ─── Public routes ────────────────────────────────────────────────────────────
router.post('/register',        register)
router.post('/login',           login)
router.post('/delivery/login',  deliveryLogin)
router.post('/forgot-password', forgotPassword)
router.post('/verify-otp',      verifyOtp)
router.post('/reset-password',  resetPassword)

// ─── Protected routes (require valid JWT) ─────────────────────────────────────
router.get('/profile',          protect, getProfile)
router.patch('/profile',        protect, updateProfile)
router.patch('/change-password', protect, changePassword)

export default router
