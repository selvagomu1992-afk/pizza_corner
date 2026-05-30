import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { serve } from 'inngest/express'
import authRoutes from './Routes/authRoutes.js'
import productRoutes from './Routes/productRoutes.js'
import uploadRoutes from './Routes/UploadRoutes.js'
import orderRoutes from './Routes/orderRoutes.js'
import addressRoutes from './Routes/addressRoutes.js'
import adminRoutes from './Routes/adminRoutes.js'
import deliveryRoutes from './Routes/deliveryRoutes.js'
import paymentRoutes from './Routes/paymentRoutes.js'
import settingRoutes from './Routes/settingRoutes.js'
import pincodeRoutes from './Routes/pincodeRoutes.js'
import categoryRoutes from './Routes/categoryRoutes.js'
import offerRoutes from './Routes/offerRoutes.js'
import reviewRoutes from './Routes/reviewRoutes.js'
import couponRoutes from './Routes/couponRoutes.js'
import { inngest, functions } from './inngest/index.js'

const app = express()

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// Middleware
app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// ─── Inngest serve endpoint ───────────────────────────────────────────────────
// Inngest cloud calls this to discover and invoke functions
app.use('/api/inngest', serve({ client: inngest, functions }))

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload',   uploadRoutes)
app.use('/api/orders',    orderRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/admin',    adminRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/payment',  paymentRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/pincodes', pincodeRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/coupons', couponRoutes)

// Health check
app.get('/', (_, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Pizza Corner API</title></head>
        <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf7f2">
            <div style="text-align:center">
                <h1 style="color:#1b3022;font-size:2rem">🍕 Pizza Corner API</h1>
                <p style="color:#6b7280">Server is Live!</p>
                <p style="color:#22c55e;font-size:0.875rem">✓ All systems operational</p>
            </div>
        </body>
        </html>
    `)
})

const port = process.env.PORT || 3000

    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`)
        console.log(`Inngest endpoint: http://localhost:${port}/api/inngest`)
    })
}
