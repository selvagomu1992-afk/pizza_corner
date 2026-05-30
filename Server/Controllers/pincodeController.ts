import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'

export const getPincodes = async (_req: Request, res: Response) => {
    try {
        const pincodes = await prisma.pincode.findMany({ orderBy: { pincode: 'asc' } })
        res.status(200).json({ success: true, pincodes })
    } catch (error) {
        console.error('Get pincodes error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const createPincode = async (req: Request, res: Response) => {
    try {
        const { pincode, deliveryFee, isActive } = req.body
        if (!pincode) {
            res.status(400).json({ success: false, message: 'Pincode is required' })
            return
        }
        const existing = await prisma.pincode.findFirst({ where: { pincode: String(pincode) } })
        if (existing) {
            res.status(409).json({ success: false, message: 'Pincode already exists' })
            return
        }
        const created = await prisma.pincode.create({
            data: { pincode: String(pincode), deliveryFee: deliveryFee ? Number(deliveryFee) : 0, isActive: isActive !== false },
        })
        res.status(201).json({ success: true, pincode: created })
    } catch (error) {
        console.error('Create pincode error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const updatePincode = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { pincode, deliveryFee, isActive } = req.body
        const existing = await prisma.pincode.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Pincode not found' })
            return
        }
        const updated = await prisma.pincode.update({
            where: { id },
            data: {
                ...(pincode     !== undefined && { pincode: String(pincode) }),
                ...(deliveryFee !== undefined && { deliveryFee: Number(deliveryFee) }),
                ...(isActive    !== undefined && { isActive }),
            },
        })
        res.status(200).json({ success: true, pincode: updated })
    } catch (error) {
        console.error('Update pincode error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const deletePincode = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        await prisma.pincode.delete({ where: { id } })
        res.status(200).json({ success: true, message: 'Pincode deleted' })
    } catch (error) {
        console.error('Delete pincode error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

export const checkPincode = async (req: Request, res: Response) => {
    try {
        const { pincode } = req.params
        const result = await prisma.pincode.findFirst({ where: { pincode: String(pincode), isActive: true } })
        if (!result) {
            res.status(200).json({ success: true, available: false, message: 'Delivery not available in this area' })
            return
        }
        res.status(200).json({ success: true, available: true, deliveryFee: result.deliveryFee, pincode: result.pincode })
    } catch (error) {
        console.error('Check pincode error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
