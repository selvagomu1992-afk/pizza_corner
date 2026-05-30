import { Router } from 'express'
import { uploadImage, uploadImages, deleteImage } from '../Controllers/uploadController.js'
import { protect } from '../middileware/auth.js'
import { isAdmin } from '../middileware/admin.js'
import { upload, uploadVideo } from '../Middleware/upload.js'

const router = Router()

// All upload routes require authentication
// Single image upload — field name: "image"
router.post('/image',   protect, upload.single('image'),   uploadImage)

// Multiple images upload — field name: "images" (max 10)
router.post('/images',  protect, upload.array('images', 10), uploadImages)

// Video upload — field name: "video" (max 50 MB)
router.post('/video', protect, uploadVideo.single('video'), uploadImage)

// Delete image — admin only
router.delete('/image', isAdmin, deleteImage)

export default router
