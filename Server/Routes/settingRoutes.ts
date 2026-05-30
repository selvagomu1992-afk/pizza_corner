import { Router } from 'express'
import { getPublicSettings } from '../Controllers/settingController.js'

const router = Router()

// Public — no auth required
router.get('/public', getPublicSettings)

export default router
