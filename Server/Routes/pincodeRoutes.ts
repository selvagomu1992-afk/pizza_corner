import { Router } from 'express'
import { checkPincode } from '../Controllers/pincodeController.js'

const router = Router()

router.get('/:pincode', checkPincode)

export default router
