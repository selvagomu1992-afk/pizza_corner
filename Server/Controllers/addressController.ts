import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'

// ═══════════════════════════════════════════════════════════════════════════════
// USER — Address CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/addresses ───────────────────────────────────────────────────────
export const getAddresses = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id

        const addresses = await prisma.address.findMany({
            where:   { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        })

        res.status(200).json({ success: true, addresses })
    } catch (error) {
        console.error('Get addresses error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /api/addresses ──────────────────────────────────────────────────────
export const addAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { label, address, city, state, zip, lat, lng, isDefault, phone } = req.body

        if (!label || !address || !city || !state || !zip || !phone) {
            res.status(400).json({ success: false, message: 'label, address, city, state, zip and phone are required' })
            return
        }

        if (isDefault) {
            await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
        }

        const count      = await prisma.address.count({ where: { userId } })
        const makeDefault = isDefault || count === 0

        const newAddress = await prisma.address.create({
            data: {
                userId,
                label,
                address,
                city,
                state,
                zip,
                phone:     phone || '',
                lat:       lat ? Number(lat) : 0,
                lng:       lng ? Number(lng) : 0,
                isDefault: makeDefault,
            },
        })

        res.status(201).json({ success: true, message: 'Address added', address: newAddress })
    } catch (error: any) {
        console.error('Add address error:', error)
        if (error?.code === 'P2003') {
            res.status(400).json({ success: false, message: 'User account not found. Please log in again.' })
            return
        }
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/addresses/:id ─────────────────────────────────────────────────
export const updateAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const id     = String(req.params.id)
        const { label, address, city, state, zip, lat, lng, isDefault, phone } = req.body

        const existing = await prisma.address.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            res.status(404).json({ success: false, message: 'Address not found' })
            return
        }

        if (isDefault) {
            await prisma.address.updateMany({ where: { userId, NOT: { id } }, data: { isDefault: false } })
        }

        const updated = await prisma.address.update({
            where: { id },
            data: {
                ...(label     !== undefined && { label }),
                ...(address   !== undefined && { address }),
                ...(city      !== undefined && { city }),
                ...(state     !== undefined && { state }),
                ...(zip       !== undefined && { zip }),
                ...(phone     !== undefined && { phone }),
                ...(lat       !== undefined && { lat: Number(lat) }),
                ...(lng       !== undefined && { lng: Number(lng) }),
                ...(isDefault !== undefined && { isDefault }),
            },
        })

        res.status(200).json({ success: true, message: 'Address updated', address: updated })
    } catch (error) {
        console.error('Update address error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/addresses/:id/default ────────────────────────────────────────
export const setDefaultAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const id     = String(req.params.id)

        const existing = await prisma.address.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            res.status(404).json({ success: false, message: 'Address not found' })
            return
        }

        await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
        const updated = await prisma.address.update({ where: { id }, data: { isDefault: true } })

        res.status(200).json({ success: true, message: 'Default address updated', address: updated })
    } catch (error) {
        console.error('Set default address error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── DELETE /api/addresses/:id ────────────────────────────────────────────────
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const id     = String(req.params.id)

        const existing = await prisma.address.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            res.status(404).json({ success: false, message: 'Address not found' })
            return
        }

        await prisma.address.delete({ where: { id } })

        // Auto-promote next address to default if deleted one was default
        if (existing.isDefault) {
            const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
            if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
        }

        res.status(200).json({ success: true, message: 'Address deleted' })
    } catch (error) {
        console.error('Delete address error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT / CHECKOUT — Address helpers
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/addresses/default — Get default address for checkout ────────────
export const getDefaultAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id

        const address = await prisma.address.findFirst({
            where:   { userId, isDefault: true },
        })

        if (!address) {
            // Fall back to most recent if no default set
            const fallback = await prisma.address.findFirst({
                where:   { userId },
                orderBy: { createdAt: 'desc' },
            })
            res.status(200).json({ success: true, address: fallback ?? null })
            return
        }

        res.status(200).json({ success: true, address })
    } catch (error) {
        console.error('Get default address error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /api/addresses/validate — Validate address before placing order ─────
export const validateAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { addressId } = req.body

        if (!addressId) {
            res.status(400).json({ success: false, message: 'addressId is required' })
            return
        }

        const address = await prisma.address.findUnique({ where: { id: String(addressId) } })

        if (!address) {
            res.status(404).json({ success: false, message: 'Address not found' })
            return
        }

        if (address.userId !== userId) {
            res.status(403).json({ success: false, message: 'Address does not belong to this user' })
            return
        }

        // Return the address in the shipping format expected by orders
        const shippingAddress = {
            label:   address.label,
            address: address.address,
            city:    address.city,
            state:   address.state,
            zip:     address.zip,
            lat:     address.lat,
            lng:     address.lng,
        }

        res.status(200).json({ success: true, valid: true, shippingAddress })
    } catch (error) {
        console.error('Validate address error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Manage any user's addresses
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/addresses/admin/user/:userId — Get all addresses for a user ─────
export const adminGetUserAddresses = async (req: Request, res: Response) => {
    try {
        const userId = String(req.params.userId)

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } })
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' })
            return
        }

        const addresses = await prisma.address.findMany({
            where:   { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        })

        res.status(200).json({ success: true, user, addresses })
    } catch (error) {
        console.error('Admin get user addresses error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── DELETE /api/addresses/admin/:id — Admin delete any address ───────────────
export const adminDeleteAddress = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const existing = await prisma.address.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Address not found' })
            return
        }

        await prisma.address.delete({ where: { id } })

        // Auto-promote next address to default if needed
        if (existing.isDefault) {
            const next = await prisma.address.findFirst({
                where:   { userId: existing.userId },
                orderBy: { createdAt: 'asc' },
            })
            if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
        }

        res.status(200).json({ success: true, message: 'Address deleted by admin' })
    } catch (error) {
        console.error('Admin delete address error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
