import { Request, Response } from 'express'
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

const streamUpload = (buffer: Buffer, folder: string, removeBg: boolean = false): Promise<string> =>
    new Promise((resolve, reject) => {
        const options: any = { folder, resource_type: 'image' }

        if (removeBg) {
            options.background_removal = 'cloudinary_ai'
        }

        const stream = cloudinary.uploader.upload_stream(
            options,
            (err, result) => err ? reject(err) : resolve(result!.secure_url)
        )
        stream.end(buffer)
    })

// ─── POST /api/upload/image ───────────────────────────────────────────────────
// Single image — returns { url }
// Query params: ?folder=xxx&removeBg=true
export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file provided' })
            return
        }

        const folder   = (req.query.folder as string) || 'pizzacorner/misc'
        const removeBg = req.query.removeBg === 'true'
        const compressed = await compressImage(req.file.buffer)
        const url = await streamUpload(compressed, folder, removeBg)

        res.status(200).json({ success: true, url })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Image upload failed'
        console.error('Upload image error:', error)
        res.status(500).json({ success: false, message: msg })
    }
}

// ─── POST /api/upload/images ──────────────────────────────────────────────────
// Multiple images — returns { urls: string[] }
export const uploadImages = async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[]

        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No files provided' })
            return
        }

        const folder   = (req.query.folder as string) || 'pizzacorner/misc'
        const removeBg = req.query.removeBg === 'true'
        const compressed = await Promise.all(files.map(f => compressImage(f.buffer)))
        const urls = await Promise.all(compressed.map(buf => streamUpload(buf, folder, removeBg)))

        res.status(200).json({ success: true, urls })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Image upload failed'
        console.error('Upload images error:', error)
        res.status(500).json({ success: false, message: msg })
    }
}

// ─── DELETE /api/upload/image ─────────────────────────────────────────────────
// Deletes an image by public_id — body: { publicId }
export const deleteImage = async (req: Request, res: Response) => {
    try {
        const { publicId } = req.body

        if (!publicId) {
            res.status(400).json({ success: false, message: 'publicId is required' })
            return
        }

        const result = await cloudinary.uploader.destroy(publicId)

        if (result.result !== 'ok') {
            res.status(400).json({ success: false, message: 'Failed to delete image', result })
            return
        }

        res.status(200).json({ success: true, message: 'Image deleted' })
    } catch (error) {
        console.error('Delete image error:', error)
        res.status(500).json({ success: false, message: 'Image deletion failed' })
    }
}
