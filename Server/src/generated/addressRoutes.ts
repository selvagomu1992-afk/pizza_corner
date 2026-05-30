import { Router } from 'express'
import {
    getAddresses,
    addAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    getDefaultAddress,
    validateAddress,
    adminGetUserAddresses,
    adminDeleteAddress,
} from '../Controllers/addressController.js'
import { protect } from '../middileware/auth.js'
import { isAdmin } from '../middileware/admin.js'

const router = Router()

// ─── Payment / Checkout helpers (before /:id to avoid route conflicts) ────────
router.get('/default',          protect, getDefaultAddress)
router.post('/validate',        protect, validateAddress)

// ─── User CRUD ────────────────────────────────────────────────────────────────
router.get('/',                 protect, getAddresses)
router.post('/',                protect, addAddress)
router.patch('/:id',            protect, updateAddress)
router.patch('/:id/default',    protect, setDefaultAddress)
router.delete('/:id',           protect, deleteAddress)

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/user/:userId', isAdmin, adminGetUserAddresses)
router.delete('/admin/:id',       isAdmin, adminDeleteAddress)

export default router
