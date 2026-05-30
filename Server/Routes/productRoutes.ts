import { Router } from 'express'
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    markOutOfStock,
    rateProduct,
} from '../Controllers/ProductControllers.js'
import { protect } from '../Middleware/authMiddleware.js'
import { upload } from '../Middleware/upload.js'

const router = Router()

// ─── Public ───────────────────────────────────────────────────────────────────

router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/:id/rate', protect, rateProduct)

// ─── Admin (protected) ────────────────────────────────────────────────────────
router.post('/', protect, upload.single('image'), createProduct)
router.patch('/:id', protect, upload.single('image'), updateProduct)
router.delete('/:id', protect, deleteProduct)
router.patch('/:id/out-of-stock', protect, markOutOfStock)

export default router
