import { Router } from 'express'
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, notifyCoupon } from '../Controllers/CouponController.js'
import { protect } from '../Middleware/authMiddleware.js'
import { isAdmin } from '../middileware/admin.js'

const router = Router()

router.post('/validate', validateCoupon)

router.use(isAdmin)
router.get('/', getCoupons)
router.post('/', createCoupon)
router.patch('/:id', updateCoupon)
router.delete('/:id', deleteCoupon)
router.post('/notify', notifyCoupon)

export default router
