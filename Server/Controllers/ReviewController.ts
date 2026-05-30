import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'

export const getReviews = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.productId)
        const reviews = await prisma.review.findMany({
            where: { productId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
        })
        res.status(200).json({ success: true, reviews })
    } catch (error) {
        console.error('Get reviews error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const createReview = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.productId)
        const userId = String((req as any).user?.id)
        const { comment, rating } = req.body

        if (!comment?.trim()) {
            res.status(400).json({ success: false, message: 'Comment is required' })
            return
        }
        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
            return
        }

        const existing = await prisma.review.findUnique({
            where: { productId_userId: { productId, userId } },
        })
        if (existing) {
            res.status(400).json({ success: false, message: 'You already reviewed this product' })
            return
        }

        const review = await prisma.review.create({
            data: { productId, userId, comment: comment.trim(), rating },
            include: { user: { select: { id: true, name: true, avatar: true } } },
        })

        const all = await prisma.review.findMany({ where: { productId } })
        const avg = all.reduce((s, r) => s + r.rating, 0) / all.length

        await prisma.product.update({
            where: { id: productId },
            data: {
                rating: Math.round(avg * 10) / 10,
                reviewCount: all.length,
            },
        })

        res.status(201).json({ success: true, review })
    } catch (error) {
        console.error('Create review error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Admin: get all reviews ────────────────────────────────────────────────────
export const getAllReviews = async (_req: Request, res: Response) => {
    try {
        const reviews = await prisma.review.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                product: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        })
        res.status(200).json({ success: true, reviews })
    } catch (error) {
        console.error('Get all reviews error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── Admin: delete a review ────────────────────────────────────────────────────
export const deleteReview = async (req: Request, res: Response) => {
    try {
        const reviewId = String(req.params.id)

        const review = await prisma.review.findUnique({ where: { id: reviewId } })
        if (!review) {
            res.status(404).json({ success: false, message: 'Review not found' })
            return
        }

        await prisma.review.delete({ where: { id: reviewId } })

        const all = await prisma.review.findMany({ where: { productId: review.productId } })
        const avg = all.length > 0 ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0

        await prisma.product.update({
            where: { id: review.productId },
            data: {
                rating: Math.round(avg * 10) / 10,
                reviewCount: all.length,
            },
        })

        res.status(200).json({ success: true, message: 'Review deleted' })
    } catch (error) {
        console.error('Delete review error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
