import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'

export const getCategories = async (_req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
        res.status(200).json({ success: true, categories })
    } catch (error) {
        console.error('Get categories error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, image } = req.body
        if (!name?.trim()) {
            res.status(400).json({ success: false, message: 'Category name is required' })
            return
        }
        const existing = await prisma.category.findUnique({ where: { name: name.trim() } })
        if (existing) {
            res.status(409).json({ success: false, message: 'Category already exists' })
            return
        }
        const category = await prisma.category.create({ data: { name: name.trim(), image: image || '' } })
        res.status(201).json({ success: true, category })
    } catch (error) {
        console.error('Create category error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { name, image } = req.body
        const existing = await prisma.category.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Category not found' })
            return
        }
        const updated = await prisma.category.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: String(name) }),
                ...(image !== undefined && { image: String(image) }),
            },
        })
        res.status(200).json({ success: true, category: updated })
    } catch (error) {
        console.error('Update category error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const category = await prisma.category.findUnique({ where: { id } })
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' })
            return
        }
        await prisma.category.delete({ where: { id } })
        res.status(200).json({ success: true, message: 'Category deleted' })
    } catch (error) {
        console.error('Delete category error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
