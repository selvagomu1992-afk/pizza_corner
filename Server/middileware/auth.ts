import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../Config/prisma.js'

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret'

export interface AuthRequest extends Request {
    user?: {
        id:      string
        email:   string
        isAdmin: boolean
        role?:   'user' | 'delivery'
    }
}

// ─── Helper: extract & verify token ──────────────────────────────────────────
const verifyToken = (req: Request): { id: string; role?: string } | null => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return null
    try {
        return jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { id: string; role?: string }
    } catch {
        return null
    }
}

// ─── protect ──────────────────────────────────────────────────────────────────
// Verifies JWT, loads user/partner from DB, attaches to req.user
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const decoded = verifyToken(req) as { id: string; email?: string; role?: string } | null

    if (!decoded) {
        res.status(401).json({ success: false, message: 'Unauthorized — no valid token provided' })
        return
    }

    try {
        // ── Admin token (env login or legacy id "admin") ──
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'
        if (decoded.email === ADMIN_EMAIL || decoded.id === 'admin') {
            req.user = {
                id:      decoded.id,
                email:   decoded.email || ADMIN_EMAIL,
                isAdmin: true,
                role:    'user',
            }
            next()
            return
        }

        // ── Delivery partner token not allowed on user routes ──
        if (decoded.role === 'delivery') {
            res.status(403).json({ success: false, message: 'Forbidden — user access only' })
            return
        }

        // ── Regular user token ──
        const user = await prisma.user.findUnique({
            where:  { id: decoded.id },
            select: { id: true, email: true, isAdmin: true },
        })

        if (!user) {
            res.status(401).json({ success: false, message: 'Unauthorized — user not found' })
            return
        }

        req.user = {
            id:      user.id,
            email:   user.email,
            isAdmin: user.isAdmin === true || user.email === ADMIN_EMAIL,
            role:    'user',
        }
        next()
    } catch {
        res.status(401).json({ success: false, message: 'Unauthorized — invalid or expired token' })
    }
}

// ─── protectDelivery ──────────────────────────────────────────────────────────
// Dedicated middleware for delivery-only routes
// Validates token, confirms active delivery partner, rejects user tokens
export const protectDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const decoded = verifyToken(req)

    if (!decoded) {
        res.status(401).json({ success: false, message: 'Unauthorized — no valid token provided' })
        return
    }

    if (decoded.role !== 'delivery') {
        res.status(403).json({ success: false, message: 'Forbidden — delivery partner access only' })
        return
    }

    try {
        const partner = await prisma.deliveryPartner.findUnique({
            where:  { id: decoded.id },
            select: { id: true, email: true, isActive: true },
        })

        if (!partner) {
            res.status(401).json({ success: false, message: 'Unauthorized — delivery account not found' })
            return
        }

        if (!partner.isActive) {
            res.status(403).json({ success: false, message: 'Forbidden — delivery account is deactivated. Contact admin.' })
            return
        }

        req.user = { id: partner.id, email: partner.email, isAdmin: false, role: 'delivery' }
        next()
    } catch {
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
