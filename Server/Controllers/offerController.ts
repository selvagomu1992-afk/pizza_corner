import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'

export const getOffers = async (_req: Request, res: Response) => {
    try {
        const offers = await prisma.offer.findMany({ orderBy: { createdAt: 'desc' } })
        res.json({ success: true, offers })
    } catch (error) {
        console.error('Get offers error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const createOffer = async (req: Request, res: Response) => {
    try {
        const { title, description, discountType, discountValue, freeItem, minPurchase, startDate, endDate } = req.body
        if (!title || !discountType || !startDate || !endDate) {
            res.status(400).json({ success: false, message: 'Missing required fields: title, discountType, startDate, endDate' })
            return
        }
        const offer = await prisma.offer.create({
            data: {
                title: String(title),
                description: description ? String(description) : '',
                discountType: String(discountType),
                discountValue: Number(discountValue),
                freeItem: freeItem ? String(freeItem) : '',
                minPurchase: minPurchase ? Number(minPurchase) : 0,
                startDate: new Date(String(startDate)),
                endDate: new Date(String(endDate)),
                isActive: true,
            },
        })
        res.status(201).json({ success: true, offer })
    } catch (error) {
        console.error('Create offer error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const updateOffer = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { title, description, discountType, discountValue, freeItem, minPurchase, startDate, endDate, isActive } = req.body
        const data: Record<string, unknown> = {}
        if (title !== undefined) data.title = String(title)
        if (description !== undefined) data.description = String(description)
        if (discountType !== undefined) data.discountType = String(discountType)
        if (discountValue !== undefined) data.discountValue = Number(discountValue)
        if (freeItem !== undefined) data.freeItem = String(freeItem)
        if (minPurchase !== undefined) data.minPurchase = Number(minPurchase)
        if (startDate !== undefined) data.startDate = new Date(String(startDate))
        if (endDate !== undefined) data.endDate = new Date(String(endDate))
        if (isActive !== undefined) data.isActive = Boolean(isActive)
        const offer = await prisma.offer.update({ where: { id }, data })
        res.json({ success: true, offer })
    } catch (error) {
        console.error('Update offer error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const deleteOffer = async (req: Request, res: Response) => {
    try {
        await prisma.offer.delete({ where: { id: String(req.params.id) } })
        res.json({ success: true, message: 'Offer deleted' })
    } catch (error) {
        console.error('Delete offer error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const getActiveOffers = async (_req: Request, res: Response) => {
    try {
        const now = new Date()
        const offers = await prisma.offer.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { endDate: 'asc' },
        })
        res.json({ success: true, offers })
    } catch (error) {
        console.error('Get active offers error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
