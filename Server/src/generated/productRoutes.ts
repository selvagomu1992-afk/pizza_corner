import { Router } from 'express'
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    markOutOfStock,
} from '../Controllers/ProductControllers.js'
import { protect } from '../Middleware/authMiddleware.js'
import { uploadPng } from '../Middleware/upload.js'

const router = Router()

// ─── Public ───────────────────────────────────────────────────────────────────

router.get('/', getProducts)
router.get('/:id', getProductById)

// ─── Admin (protected) ────────────────────────────────────────────────────────
router.post('/', protect, uploadPng.single('image'), createProduct)
router.patch('/:id', protect, uploadPng.single('image'), updateProduct)
router.delete('/:id', protect, deleteProduct)
router.patch('/:id/out-of-stock', protect, markOutOfStock)

export default router
