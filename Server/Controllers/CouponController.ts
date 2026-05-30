import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import { sendCouponNotificationEmail } from '../Config/emailService.js'

export const getCoupons = async (_req: Request, res: Response) => {
    try {
        const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
        res.status(200).json({ success: true, coupons })
    } catch (error) {
        console.error('Get coupons error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const createCoupon = async (req: Request, res: Response) => {
    try {
        const { code, description, discountPercent, discountFlat, minPurchase, maxUses, expiresAt } = req.body
        if (!code?.trim()) {
            res.status(400).json({ success: false, message: 'Coupon code is required' })
            return
        }
        const existing = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } })
        if (existing) {
            res.status(400).json({ success: false, message: 'Coupon code already exists' })
            return
        }
        const coupon = await prisma.coupon.create({
            data: {
                code: code.trim().toUpperCase(),
                description: description?.trim(),
                discountPercent: discountPercent ? Number(discountPercent) : 0,
                discountFlat: discountFlat ? Number(discountFlat) : 0,
                minPurchase: minPurchase ? Number(minPurchase) : 0,
                maxUses: maxUses ? Number(maxUses) : 0,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        })
        res.status(201).json({ success: true, coupon })
    } catch (error) {
        console.error('Create coupon error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const updateCoupon = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { code, description, discountPercent, discountFlat, minPurchase, maxUses, expiresAt, isActive } = req.body
        const data: any = {}
        if (code) data.code = code.trim().toUpperCase()
        if (description !== undefined) data.description = description.trim()
        if (discountPercent !== undefined) data.discountPercent = Number(discountPercent)
        if (discountFlat !== undefined) data.discountFlat = Number(discountFlat)
        if (minPurchase !== undefined) data.minPurchase = Number(minPurchase)
        if (maxUses !== undefined) data.maxUses = Number(maxUses)
        if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null
        if (isActive !== undefined) data.isActive = isActive
        const coupon = await prisma.coupon.update({ where: { id }, data })
        res.status(200).json({ success: true, coupon })
    } catch (error) {
        console.error('Update coupon error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const deleteCoupon = async (req: Request, res: Response) => {
    try {
        await prisma.coupon.delete({ where: { id: String(req.params.id) } })
        res.status(200).json({ success: true, message: 'Coupon deleted' })
    } catch (error) {
        console.error('Delete coupon error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const validateCoupon = async (req: Request, res: Response) => {
    try {
        const { code, subtotal } = req.body
        if (!code?.trim()) {
            res.status(400).json({ success: false, message: 'Coupon code is required', valid: false })
            return
        }
        const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } })
        if (!coupon) {
            res.status(404).json({ success: false, message: 'Invalid coupon code', valid: false })
            return
        }
        if (!coupon.isActive) {
            res.status(400).json({ success: false, message: 'Coupon is no longer active', valid: false })
            return
        }
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
            res.status(400).json({ success: false, message: 'Coupon has expired', valid: false })
            return
        }
        if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
            res.status(400).json({ success: false, message: 'Coupon usage limit reached', valid: false })
            return
        }
        if (coupon.minPurchase > 0 && subtotal < coupon.minPurchase) {
            res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required`, valid: false })
            return
        }
        let discount = 0
        if (coupon.discountPercent > 0) discount = (subtotal * coupon.discountPercent) / 100
        if (coupon.discountFlat > 0) discount = Math.max(discount, coupon.discountFlat)
        res.status(200).json({ success: true, valid: true, coupon, discount })
    } catch (error) {
        console.error('Validate coupon error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const notifyCoupon = async (req: Request, res: Response) => {
    try {
        const { code, description, discountPercent, discountFlat, minPurchase, expiresAt } = req.body
        if (!code) {
            res.status(400).json({ success: false, message: 'Coupon code is required' })
            return
        }
        const userCount = await prisma.user.count({
            where: { email: { not: process.env.ADMIN_EMAIL || '' } },
        })
        sendCouponNotificationEmail({
            code,
            description: description || '',
            discountPercent: Number(discountPercent) || 0,
            discountFlat: Number(discountFlat) || 0,
            minPurchase: Number(minPurchase) || 0,
            expiresAt: expiresAt || '',
        }).catch(err => console.error('Coupon email send error:', err))
        res.json({ success: true, message: 'Coupon notification emails queued', userCount })
    } catch (error) {
        console.error('Notify coupon error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
