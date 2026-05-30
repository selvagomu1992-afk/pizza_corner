import multer from 'multer'

// Store in memory so we can stream directly to Cloudinary
const storage = multer.memoryStorage()

// Allow only PNG (for product images)
const pngFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(new Error('Only PNG files are allowed'))
    }
}

// Allow all image types (for branding/general uploads)
const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image files are allowed'))
    }
}

// Allow all video types
const videoFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true)
    } else {
        cb(new Error('Only video files are allowed'))
    }
}

// General image upload (all formats)
export const upload = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

// Video upload
export const uploadVideo = multer({
    storage,
    fileFilter: videoFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

// PNG-only upload (for products with background removal)
export const uploadPng = multer({
    storage,
    fileFilter: pngFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})
