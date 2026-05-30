import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../Config/prisma.js'
import { sendLoginNotificationEmail } from '../Config/emailService.js'
import { ensureAdminUserInDb, userIsAdmin } from '../lib/ensureAdminUser.js'

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret'
const JWT_EXPIRES_IN = '7d'

const generateToken = (payload: object) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

// ─── Register ────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone } = req.body

        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'Name, email and password are required' })
            return
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            res.status(409).json({ success: false, message: 'Email already registered' })
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, phone: phone || '' },
            select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
        })

        const token = generateToken({ id: user.id, email: user.email })

        res.status(201).json({ success: true, message: 'Account created successfully', token, user })
    } catch (error) {
        console.error('Register error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' })
            return
        }

        // ── Try DB login first (works for both admin and regular users) ───────
        const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

        try {
            const user = await prisma.user.findUnique({ where: { email } })

            if (user) {
                // User exists in DB — verify password from DB
                const isMatch = await bcrypt.compare(password, user.password)
                if (!isMatch) {
                    // If this is the admin email, also try the env password as fallback
                    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                        // Env password matches — update DB password to stay in sync
                        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10)
                        await prisma.user.update({ where: { id: user.id }, data: { password: hashed, isAdmin: true } })
                    } else {
                        res.status(401).json({ success: false, message: 'Invalid email or password' })
                        return
                    }
                }

                const token = generateToken({ id: user.id, email: user.email })
                const { password: _, ...safeUser } = user
                const isAdmin = user.isAdmin || email === ADMIN_EMAIL
                res.status(200).json({ success: true, message: 'Login successful', token, user: { ...safeUser, isAdmin } })

                // Send login notification
                const role = isAdmin ? 'admin' : 'user'
                sendLoginNotificationEmail({ to: user.email, name: user.name, role, loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ip: req.ip || '' }).catch(() => {})
                return
            }

            // ── User not in DB — check if it's admin with env credentials ─────
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                // Create admin user in DB
                const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10)
                const adminUser = await prisma.user.create({
                    data: { name: 'Admin', email: ADMIN_EMAIL, password: hashed, phone: '', isAdmin: true }
                })
                const token = generateToken({ id: adminUser.id, email: adminUser.email })
                const { password: _, ...safeUser } = adminUser
                res.status(200).json({ success: true, message: 'Login successful', token, user: { ...safeUser, isAdmin: true } })

                sendLoginNotificationEmail({ to: ADMIN_EMAIL, name: 'Admin', role: 'admin', loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ip: req.ip || '' }).catch(() => {})
                return
            }

            // No user found
            res.status(401).json({ success: false, message: 'Invalid email or password' })
        } catch (dbError) {
            // DB unavailable — fallback to env credentials for admin only
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                const token = generateToken({ id: 'admin', email: ADMIN_EMAIL })
                res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    token,
                    user: { id: 'admin', name: 'Admin', email: ADMIN_EMAIL, isAdmin: true }
                })
                sendLoginNotificationEmail({ to: ADMIN_EMAIL, name: 'Admin', role: 'admin', loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ip: req.ip || '' }).catch(() => {})
                return
            }
            console.error('Login DB error:', dbError)
            res.status(500).json({ success: false, message: 'Internal server error' })
        }
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Get Profile ──────────────────────────────────────────────────────────────
export const getProfile = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user
        const userId   = authUser?.id
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'

        // Fallback token id "admin" — resolve to real DB admin row
        if (!userId || userId === 'admin' || authUser?.email === ADMIN_EMAIL) {
            const admin = await ensureAdminUserInDb()
            res.status(200).json({
                success: true,
                user:    { ...admin, avatar: '', isAdmin: true },
            })
            return
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, phone: true,
                avatar: true, isAdmin: true, addresses: true, createdAt: true,
            },
        })

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' })
            return
        }

        res.status(200).json({
            success: true,
            user:    { ...user, isAdmin: userIsAdmin(user) },
        })
    } catch (error) {
        console.error('Get profile error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id
        const { name, phone } = req.body

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
            },
            select: { id: true, name: true, email: true, phone: true, avatar: true },
        })

        res.status(200).json({ success: true, message: 'Profile updated', user })
    } catch (error) {
        console.error('Update profile error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Change Password ──────────────────────────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'Current and new password are required' })
            return
        }

        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' })
            return
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Current password is incorrect' })
            return
        }

        const hashed = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

        res.status(200).json({ success: true, message: 'Password changed successfully' })
    } catch (error) {
        console.error('Change password error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Delivery Partner Login ───────────────────────────────────────────────────
export const deliveryLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' })
            return
        }

        const partner = await prisma.deliveryPartner.findUnique({ where: { email } })
        if (!partner) {
            res.status(401).json({ success: false, message: 'Invalid email or password' })
            return
        }

        const isMatch = await bcrypt.compare(password, partner.password)
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password' })
            return
        }

        if (!partner.isActive) {
            res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' })
            return
        }

        const token = generateToken({ id: partner.id, email: partner.email, role: 'delivery' })

        const { password: _, ...safePartner } = partner

        res.status(200).json({ success: true, message: 'Login successful', token, partner: safePartner })

        // Send login notification email (non-blocking)
        sendLoginNotificationEmail({ to: partner.email, name: partner.name, role: 'delivery', loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ip: req.ip || '' }).catch(() => {})
    } catch (error) {
        console.error('Delivery login error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
