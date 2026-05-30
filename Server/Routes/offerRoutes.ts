import { Router } from 'express'
import { getActiveOffers } from '../Controllers/offerController.js'

const router = Router()

router.get('/', getActiveOffers)

export default router
