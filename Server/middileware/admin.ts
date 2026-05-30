import { Response, NextFunction } from 'express'
import { AuthRequest, protect } from './auth.js'
import { prisma } from '../Config/prisma.js'
import { userIsAdmin } from '../lib/ensureAdminUser.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'

// ─── isAdmin ──────────────────────────────────────────────────────────────────
// Runs protect first, then checks if the user has isAdmin flag in DB or matches ADMIN_EMAIL
export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    await protect(req, res, async () => {
        try {
            if (!req.user?.id) {
                res.status(401).json({ success: false, message: 'Unauthorized' })
                return
            }

            // Delivery partners can never be admins
            if (req.user.role === 'delivery') {
                res.status(403).json({ success: false, message: 'Forbidden — admin access required' })
                return
            }

            // Fallback admin token (id "admin" or admin email without DB row yet)
            if (req.user.email === ADMIN_EMAIL || req.user.id === 'admin' || req.user.isAdmin) {
                req.user = { ...req.user, isAdmin: true }
                next()
                return
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { id: true, email: true, isAdmin: true },
            })

            if (!user) {
                res.status(403).json({ success: false, message: 'Forbidden — admin access required' })
                return
            }

            if (!userIsAdmin(user)) {
                res.status(403).json({ success: false, message: 'Forbidden — admin access required' })
                return
            }

            // Attach isAdmin flag and continue
            req.user = { ...req.user, isAdmin: true }
            next()
        } catch {
            res.status(500).json({ success: false, message: 'Internal server error' })
        }
    })
}
