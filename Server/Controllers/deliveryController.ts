import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import bcrypt from 'bcrypt'

const ACTIVE_STATUSES    = ['Assigned', 'Packed', 'Out for Delivery']
const COMPLETED_STATUSES = ['Delivered', 'Cancelled']

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/delivery/profile ────────────────────────────────────────────────
export const getProfile = async (req: Request, res: Response) => {
    try {
        const id = req.user!.id

        const partner = await prisma.deliveryPartner.findUnique({
            where:  { id },
            select: { id: true, name: true, email: true, phone: true, avatar: true, vehicleType: true, isActive: true, createdAt: true },
        })

        if (!partner) {
            res.status(404).json({ success: false, message: 'Partner not found' })
            return
        }

        res.status(200).json({ success: true, partner })
    } catch (error) {
        console.error('Get delivery profile error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/delivery/profile ─────────────────────────────────────────────
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const id = req.user!.id
        const { name, phone, vehicleType } = req.body

        const partner = await prisma.deliveryPartner.update({
            where:  { id },
            data: {
                ...(name        && { name }),
                ...(phone       && { phone }),
                ...(vehicleType && { vehicleType }),
            },
            select: { id: true, name: true, email: true, phone: true, vehicleType: true, isActive: true },
        })

        res.status(200).json({ success: true, message: 'Profile updated', partner })
    } catch (error) {
        console.error('Update delivery profile error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/delivery/change-password ─────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
    try {
        const id = req.user!.id
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' })
            return
        }

        const partner = await prisma.deliveryPartner.findUnique({ where: { id } })
        if (!partner) {
            res.status(404).json({ success: false, message: 'Partner not found' })
            return
        }

        const isMatch = await bcrypt.compare(currentPassword, partner.password)
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Current password is incorrect' })
            return
        }

        const hashed = await bcrypt.hash(newPassword, 10)
        await prisma.deliveryPartner.update({ where: { id }, data: { password: hashed } })

        res.status(200).json({ success: true, message: 'Password changed successfully' })
    } catch (error) {
        console.error('Change delivery password error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/delivery/orders?tab=active|completed ────────────────────────────
export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const partnerId = req.user!.id
        const tab       = String(req.query.tab || 'active')
        const page      = Math.max(1, Number(req.query.page || 1))
        const limit     = Math.min(50, Math.max(1, Number(req.query.limit || 20)))

        const statusFilter = tab === 'completed' ? COMPLETED_STATUSES : ACTIVE_STATUSES

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where:   { deliveryPartnerId: partnerId, status: { in: statusFilter } },
                orderBy: { updatedAt: 'desc' },
                skip:    (page - 1) * limit,
                take:    limit,
                include: { user: { select: { id: true, name: true, phone: true } } },
            }),
            prisma.order.count({
                where: { deliveryPartnerId: partnerId, status: { in: statusFilter } },
            }),
        ])

        res.status(200).json({
            success: true,
            orders,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error('Get delivery orders error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/delivery/orders/stats ──────────────────────────────────────────
export const getOrderStats = async (req: Request, res: Response) => {
    try {
        const partnerId = req.user!.id

        const [active, completed, cancelled, earnings] = await Promise.all([
            prisma.order.count({ where: { deliveryPartnerId: partnerId, status: { in: ACTIVE_STATUSES } } }),
            prisma.order.count({ where: { deliveryPartnerId: partnerId, status: 'Delivered' } }),
            prisma.order.count({ where: { deliveryPartnerId: partnerId, status: 'Cancelled' } }),
            prisma.order.aggregate({
                where: { deliveryPartnerId: partnerId, status: 'Delivered' },
                _sum:  { total: true },
            }),
        ])

        res.status(200).json({
            success: true,
            stats: {
                active,
                completed,
                cancelled,
                pending:  active,
                earnings: earnings._sum.total ?? 0,
            },
        })
    } catch (error) {
        console.error('Get delivery stats error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/delivery/orders/:id ────────────────────────────────────────────
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const partnerId = req.user!.id
        const id        = String(req.params.id)

        const order = await prisma.order.findUnique({
            where:   { id },
            include: { user: { select: { id: true, name: true, phone: true, email: true } } },
        })

        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        if (order.deliveryPartnerId !== partnerId) {
            res.status(403).json({ success: false, message: 'Forbidden' })
            return
        }

        res.status(200).json({ success: true, order })
    } catch (error) {
        console.error('Get delivery order error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/delivery/orders/:id/status ───────────────────────────────────
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const partnerId    = req.user!.id
        const id           = String(req.params.id)
        const { status }   = req.body

        const ALLOWED = ['Packed', 'Out for Delivery', 'Cancelled']
        if (!status || !ALLOWED.includes(status)) {
            res.status(400).json({ success: false, message: `Status must be one of: ${ALLOWED.join(', ')}` })
            return
        }

        const order = await prisma.order.findUnique({ where: { id } })
        if (!order || order.deliveryPartnerId !== partnerId) {
            res.status(404).json({ success: false, message: 'Order not found or not assigned to you' })
            return
        }

        const history = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []
        history.push({ status, note: `Status updated to ${status}`, timestamp: new Date().toISOString() })

        const updated = await prisma.order.update({
            where: { id },
            data:  { status, statusHistory: history },
        })

        res.status(200).json({ success: true, message: 'Status updated', order: updated })
    } catch (error) {
        console.error('Update delivery order status error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/delivery/orders/:id/deliver — Confirm delivery via OTP ────────
export const confirmDelivery = async (req: Request, res: Response) => {
    try {
        const partnerId = req.user!.id
        const id        = String(req.params.id)
        const { otp }   = req.body

        if (!otp) {
            res.status(400).json({ success: false, message: 'OTP is required' })
            return
        }

        const order = await prisma.order.findUnique({ where: { id } })
        if (!order || order.deliveryPartnerId !== partnerId) {
            res.status(404).json({ success: false, message: 'Order not found or not assigned to you' })
            return
        }

        if (order.status !== 'Out for Delivery') {
            res.status(400).json({ success: false, message: 'Order must be Out for Delivery to confirm' })
            return
        }

        if (order.deliveryOtp !== String(otp)) {
            res.status(400).json({ success: false, message: 'Invalid OTP' })
            return
        }

        const history = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []
        history.push({ status: 'Delivered', note: 'Delivered by partner', timestamp: new Date().toISOString() })

        const updated = await prisma.order.update({
            where: { id },
            data:  { status: 'Delivered', deliveryOtp: '', statusHistory: history, isPaid: true },
        })

        res.status(200).json({ success: true, message: 'Order delivered successfully', order: updated })
    } catch (error) {
        console.error('Confirm delivery error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/delivery/orders/:id/location — Update live location ───────────
export const updateLiveLocation = async (req: Request, res: Response) => {
    try {
        const partnerId = req.user!.id
        const id        = String(req.params.id)
        const { lat, lng } = req.body

        if (lat === undefined || lng === undefined) {
            res.status(400).json({ success: false, message: 'lat and lng are required' })
            return
        }

        const order = await prisma.order.findUnique({ where: { id } })
        if (!order || order.deliveryPartnerId !== partnerId) {
            res.status(404).json({ success: false, message: 'Order not found or not assigned to you' })
            return
        }

        const point = { lat: Number(lat), lng: Number(lng), updatedAt: new Date().toISOString() }
        const history = Array.isArray(order.locationHistory) ? [...order.locationHistory as any[]] : []
        history.push(point)

        const updated = await prisma.order.update({
            where: { id },
            data:  {
                liveLocation: point,
                locationHistory: history,
            },
        })

        res.status(200).json({ success: true, liveLocation: updated.liveLocation })
    } catch (error) {
        console.error('Update live location error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
