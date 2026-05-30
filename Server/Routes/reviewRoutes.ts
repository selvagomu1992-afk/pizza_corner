import { Router } from 'express'
import { getReviews, createReview } from '../Controllers/ReviewController.js'
import { protect } from '../Middleware/authMiddleware.js'

const router = Router()

router.get('/:productId', getReviews)
router.post('/:productId', protect, createReview)

export default router
