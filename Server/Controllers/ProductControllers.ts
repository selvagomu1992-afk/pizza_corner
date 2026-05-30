import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 80

const compressImage = async (buffer: Buffer): Promise<Buffer> => {
    const image = sharp(buffer)
    const metadata = await image.metadata()
    const w = metadata.width ?? MAX_DIMENSION
    const h = metadata.height ?? MAX_DIMENSION

    let resizeOpts: { width?: number; height?: number } = {}
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w > h) {
            resizeOpts = { width: MAX_DIMENSION }
        } else {
            resizeOpts = { height: MAX_DIMENSION }
        }
    }

    return image
        .resize({ ...resizeOpts, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer()
}

const uploadToCloudinary = async (buffer: Buffer): Promise<string> => {
    const compressed = await compressImage(buffer)
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'pizzacorner/products' },
            (err, result) => err ? reject(err) : resolve(result!.secure_url)
        )
        stream.end(compressed)
    })
}

// ─── GET /products ────────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
    try {
        const {
            category, organic, minPrice, maxPrice,
            sort, search, page = '1', limit = '20',
        } = req.query

        const where: any = {}

        const categoryQ = category ? String(category) : undefined
        const organicQ  = organic  ? String(organic)  : undefined
        const minQ      = minPrice ? Number(minPrice)  : undefined
        const maxQ      = maxPrice ? Number(maxPrice)  : undefined
        const sortQ     = sort     ? String(sort)      : undefined
        const searchQ   = search   ? String(search)    : undefined
        const pageNum   = Math.max(1, Number(page))
        const pageSize  = Math.min(100, Math.max(1, Number(limit)))

        if (categoryQ)           where.category  = categoryQ
        if (organicQ === 'true') where.isOrganic = true
        if (searchQ)             where.name      = { contains: searchQ, mode: 'insensitive' }
        if (minQ !== undefined || maxQ !== undefined) {
            where.price = {
                ...(minQ !== undefined && { gte: minQ }),
                ...(maxQ !== undefined && { lte: maxQ }),
            }
        }

        const orderBy: any =
            sortQ === 'price_asc'  ? { price: 'asc' }         :
            sortQ === 'price_desc' ? { price: 'desc' }        :
            sortQ === 'rating'     ? { rating: 'desc' }       :
            sortQ === 'discount'   ? { originalPrice: 'desc' } :
                                     { createdAt: 'desc' }

        const [products, total] = await Promise.all([
            prisma.product.findMany({ where, orderBy, skip: (pageNum - 1) * pageSize, take: pageSize }),
            prisma.product.count({ where }),
        ])

        res.status(200).json({
            success: true,
            products,
            pagination: { total, page: pageNum, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
        })
    } catch (error) {
        console.error('Get products error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /products/:id ────────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const product = await prisma.product.findUnique({ where: { id } })

        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' })
            return
        }

        res.status(200).json({ success: true, product })
    } catch (error) {
        console.error('Get product error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /products (Admin) ───────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, description, price, originalPrice, category, unit, stock, minQty, isOrganic } = req.body

        if (!name || !price || !category) {
            res.status(400).json({ success: false, message: 'Name, price and category are required' })
            return
        }

        if (!req.file) {
            res.status(400).json({ success: false, message: 'Product image is required' })
            return
        }

        const imageUrl = await uploadToCloudinary(req.file.buffer)

        const product = await prisma.product.create({
            data: {
                name,
                description:   description   || '',
                price:         Number(price),
                originalPrice: originalPrice ? Number(originalPrice) : Number(price),
                image:         imageUrl,
                category,
                unit:          unit  || 'piece',
                stock:         stock ? Number(stock) : 0,
                minQty:        minQty ? Number(minQty) : 0,
                isOrganic:     isOrganic === 'true' || isOrganic === true,
            },
        })

        res.status(201).json({ success: true, message: 'Product created', product })
    } catch (error) {
        console.error('Create product error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /products/:id (Admin) ──────────────────────────────────────────────
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { name, description, price, originalPrice, category, unit, stock, minQty, isOrganic } = req.body

        const existing = await prisma.product.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Product not found' })
            return
        }

        const imageUrl = req.file
            ? await uploadToCloudinary(req.file.buffer)
            : existing.image

        if (imageUrl === null) return

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(name          !== undefined && { name }),
                ...(description   !== undefined && { description }),
                ...(price         !== undefined && { price: Number(price) }),
                ...(originalPrice !== undefined && { originalPrice: Number(originalPrice) }),
                ...(category      !== undefined && { category }),
                ...(unit          !== undefined && { unit }),
                ...(stock         !== undefined && { stock: Number(stock) }),
                ...(minQty        !== undefined && { minQty: Number(minQty) }),
                ...(isOrganic     !== undefined && { isOrganic: isOrganic === 'true' || isOrganic === true }),
                image: imageUrl,
            },
        })

        res.status(200).json({ success: true, message: 'Product updated', product })
    } catch (error) {
        console.error('Update product error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── DELETE /products/:id (Admin) ─────────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const existing = await prisma.product.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Product not found' })
            return
        }

        await prisma.product.delete({ where: { id } })

        res.status(200).json({ success: true, message: 'Product deleted' })
    } catch (error) {
        console.error('Delete product error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /products/:id/out-of-stock (Admin) ─────────────────────────────────
export const markOutOfStock = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const product = await prisma.product.update({
            where: { id },
            data: { stock: 0 },
        })

        res.status(200).json({ success: true, message: 'Marked as out of stock', product })
    } catch (error) {
        console.error('Mark out of stock error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /products/:id/rate ───────────────────────────────────────────────────
export const rateProduct = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { rating } = req.body

        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
            return
        }

        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' })
            return
        }

        const oldTotal = (product.rating ?? 0) * (product.reviewCount ?? 0)
        const newCount = (product.reviewCount ?? 0) + 1
        const newRating = (oldTotal + rating) / newCount

        const updated = await prisma.product.update({
            where: { id },
            data: {
                rating: Math.round(newRating * 10) / 10,
                reviewCount: newCount,
            },
        })

        res.status(200).json({ success: true, product: updated })
    } catch (error) {
        console.error('Rate product error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
