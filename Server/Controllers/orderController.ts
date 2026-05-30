import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import { inngest } from '../inngest/index.js'
import { sendOrderStatusEmail, sendLowStockAlertEmail, sendOrderConfirmationEmail } from '../Config/emailService.js'
import crypto from 'crypto'

const TAX_RATE    = 0.05  // 5% GST
const FREE_DELIVERY_THRESHOLD = 20
const DELIVERY_FEE = 2.99

const generateOtp = () => crypto.randomInt(100000, 999999).toString()

// ─── POST /api/orders — Place Order ──────────────────────────────────────────
export const placeOrder = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { items, shippingAddress, paymentMethod, couponCode } = req.body

        if (!items?.length || !shippingAddress || !paymentMethod) {
            res.status(400).json({ success: false, message: 'items, shippingAddress and paymentMethod are required' })
            return
        }

        // Validate products and calculate totals
        const productIds: string[] = items.map((i: any) => i.productId)
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } })

        if (products.length !== productIds.length) {
            res.status(400).json({ success: false, message: 'One or more products not found' })
            return
        }

        const orderItems = items.map((item: any) => {
            const product = products.find(p => p.id === item.productId)!
            return {
                product:  product.id,
                name:     product.name,
                image:    product.image,
                price:    product.price,
                quantity: Number(item.quantity),
                unit:     product.unit ?? 'piece',
            }
        })

        const subtotal    = orderItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0)

        // Validate coupon code if provided
        let couponDiscount = 0
        let validatedCouponCode: string | undefined
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } })
            if (!coupon || !coupon.isActive) {
                res.status(400).json({ success: false, message: 'Invalid or inactive coupon code' })
                return
            }
            if (coupon.expiresAt && new Date() > coupon.expiresAt) {
                res.status(400).json({ success: false, message: 'Coupon has expired' })
                return
            }
            if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
                res.status(400).json({ success: false, message: 'Coupon usage limit reached' })
                return
            }
            if (coupon.minPurchase > 0 && subtotal < coupon.minPurchase) {
                res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` })
                return
            }
            if (coupon.discountPercent > 0) couponDiscount = (subtotal * coupon.discountPercent) / 100
            if (coupon.discountFlat > 0) couponDiscount = Math.max(couponDiscount, coupon.discountFlat)
            validatedCouponCode = coupon.code
        }

        const taxable     = Math.max(0, subtotal - couponDiscount)
        const tax         = parseFloat((taxable * TAX_RATE).toFixed(2))

        // Check pincode availability and get delivery fee
        const zip = shippingAddress.zip
        let deliveryFee = DELIVERY_FEE
        if (zip) {
            const pincodeRecord = await prisma.pincode.findFirst({ where: { pincode: String(zip), isActive: true } })
            if (!pincodeRecord) {
                res.status(400).json({ success: false, message: `Delivery not available at pincode ${zip}` })
                return
            }
            deliveryFee = pincodeRecord.deliveryFee
        }
        if (subtotal >= FREE_DELIVERY_THRESHOLD) deliveryFee = 0

        const total       = parseFloat((taxable + deliveryFee + tax).toFixed(2))

        const order = await prisma.order.create({
            data: {
                userId,
                items:           orderItems,
                shippingAddress,
                paymentMethod,
                subtotal,
                deliveryFee,
                tax,
                total,
                status:          'Placed',
                statusHistory:   [{ status: 'Placed', note: 'Order placed successfully', timestamp: new Date().toISOString() }],
                deliveryOtp:     generateOtp(),
                isPaid:          paymentMethod !== 'cash',
                ...(validatedCouponCode && { couponCode: validatedCouponCode, discountAmount: couponDiscount }),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        })

        // Increment coupon usage and reduce stock
        if (validatedCouponCode) {
            await prisma.coupon.update({
                where: { code: validatedCouponCode },
                data:  { usedCount: { increment: 1 } },
            }).catch(() => {})
        }
        for (const item of orderItems) {
            await prisma.product.update({
                where: { id: item.product },
                data: { stock: { decrement: item.quantity } },
            }).catch(() => {})
        }

        res.status(201).json({ success: true, message: 'Order placed successfully', order })

        // Send order confirmation email with delivery OTP (non-blocking)
        const orderUser = order.user as { name: string; email: string }
        if (orderUser?.email) {
            sendOrderConfirmationEmail({
                to:            orderUser.email,
                name:          orderUser.name,
                orderId:       order.id,
                items:         orderItems,
                total:         order.total,
                paymentMethod: order.paymentMethod,
                deliveryOtp:   order.deliveryOtp ?? '',
            }).catch(() => {})
        }

        // Check for low stock and alert admin (non-blocking)
        const orderedProductIds = orderItems.map((i: any) => i.product)
        const lowStockProducts = await prisma.product.findMany({
            where: { id: { in: orderedProductIds }, stock: { lte: 5 } },
            select: { name: true, stock: true },
        }).catch(() => [])
        if (lowStockProducts && lowStockProducts.length > 0) {
            sendLowStockAlertEmail(lowStockProducts).catch(() => {})
        }

        // Fire inngest event (non-blocking — after response sent)
        const user = order.user as { name: string; email: string }
        await inngest.send({
            name: 'order/placed',
            data: {
                orderId:       order.id,
                userEmail:     user.email,
                userName:      user.name,
                total:         order.total,
                deliveryOtp:   order.deliveryOtp ?? '',
                items:         orderItems,
                paymentMethod: order.paymentMethod,
            },
        })
    } catch (error) {
        console.error('Place order error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/orders/my — User's Orders ──────────────────────────────────────
export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { status, page = '1', limit = '10' } = req.query

        const where: any = { userId }
        if (status) where.status = String(status)

        const pageNum  = Math.max(1, Number(page))
        const pageSize = Math.min(50, Math.max(1, Number(limit)))

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * pageSize,
                take: pageSize,
                include: { deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true } } },
            }),
            prisma.order.count({ where }),
        ])

        res.status(200).json({
            success: true,
            orders,
            pagination: { total, page: pageNum, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
        })
    } catch (error) {
        console.error('Get my orders error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/orders/:id — Single Order ──────────────────────────────────────
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const id     = String(req.params.id)
        const userId = req.user!.id

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                user:            { select: { id: true, name: true, email: true, phone: true } },
                deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true } },
            },
        })

        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        // Users can only see their own orders; admins can see all
        if (order.userId !== userId && !req.user!.isAdmin) {
            res.status(403).json({ success: false, message: 'Forbidden' })
            return
        }

        res.status(200).json({ success: true, order })
    } catch (error) {
        console.error('Get order error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/orders/unassigned-count ────────────────────────────────────────
export const getUnassignedCount = async (req: Request, res: Response) => {
    try {
        const count = await prisma.order.count({
            where: { deliveryPartnerId: null, status: { notIn: ['Delivered', 'Cancelled'] } },
        })
        res.status(200).json({ success: true, count })
    } catch (error) {
        console.error('Get unassigned count error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/orders — All Orders (Admin) ────────────────────────────────────
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { status, page = '1', limit = '20' } = req.query

        const where: any = {}
        if (status) where.status = String(status)

        const pageNum  = Math.max(1, Number(page))
        const pageSize = Math.min(100, Math.max(1, Number(limit)))

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * pageSize,
                take: pageSize,
                include: {
                    user:            { select: { id: true, name: true, email: true } },
                    deliveryPartner: { select: { id: true, name: true, phone: true } },
                },
            }),
            prisma.order.count({ where }),
        ])

        res.status(200).json({
            success: true,
            orders,
            pagination: { total, page: pageNum, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
        })
    } catch (error) {
        console.error('Get all orders error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/orders/:id/status — Update Status (Admin) ────────────────────
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const id     = String(req.params.id)
        const { status, note } = req.body

        const VALID_STATUSES = ['Placed', 'Confirmed', 'Assigned', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled']
        if (!status || !VALID_STATUSES.includes(status)) {
            res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
            return
        }

        const existing = await prisma.order.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        const history = Array.isArray(existing.statusHistory) ? existing.statusHistory as any[] : []
        history.push({ status, note: note || `Status updated to ${status}`, timestamp: new Date().toISOString() })

        const order = await prisma.order.update({
            where: { id },
            data: { status, statusHistory: history },
        })

        res.status(200).json({ success: true, message: 'Order status updated', order })

        // Notify user via inngest
        const fullOrder = await prisma.order.findUnique({
            where: { id },
            include: { user: { select: { name: true, email: true } } },
        })
        if (fullOrder?.user) {
            const u = fullOrder.user as { name: string; email: string }

            // Send email notification for important status changes
            if (['Out for Delivery', 'Delivered', 'Cancelled'].includes(status)) {
                sendOrderStatusEmail({ to: u.email, name: u.name, orderId: id, status }).catch(() => {})
            }

            await inngest.send({
                name: 'order/status.updated',
                data: { orderId: id, status, userEmail: u.email, userName: u.name },
            })
        }
    } catch (error) {
        console.error('Update order status error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/orders/:id/assign — Assign Delivery Partner (Admin) ───────────
export const assignDeliveryPartner = async (req: Request, res: Response) => {
    try {
        const id                = String(req.params.id)
        const { deliveryPartnerId } = req.body

        if (!deliveryPartnerId) {
            res.status(400).json({ success: false, message: 'deliveryPartnerId is required' })
            return
        }

        const partner = await prisma.deliveryPartner.findUnique({ where: { id: deliveryPartnerId } })
        if (!partner || !partner.isActive) {
            res.status(400).json({ success: false, message: 'Delivery partner not found or inactive' })
            return
        }

        const existing = await prisma.order.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        const history = Array.isArray(existing.statusHistory) ? existing.statusHistory as any[] : []
        history.push({ status: 'Assigned', note: `Assigned to ${partner.name}`, timestamp: new Date().toISOString() })

        const order = await prisma.order.update({
            where: { id },
            data: { deliveryPartnerId, status: 'Assigned', statusHistory: history },
            include: { deliveryPartner: { select: { id: true, name: true, phone: true } } },
        })

        res.status(200).json({ success: true, message: 'Delivery partner assigned', order })
    } catch (error) {
        console.error('Assign delivery partner error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/orders/:id/deliver — Confirm Delivery via OTP ─────────────────
export const confirmDelivery = async (req: Request, res: Response) => {
    try {
        const id  = String(req.params.id)
        const { otp } = req.body

        if (!otp) {
            res.status(400).json({ success: false, message: 'OTP is required' })
            return
        }

        const order = await prisma.order.findUnique({ where: { id } })
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        if (order.deliveryOtp !== String(otp)) {
            res.status(400).json({ success: false, message: 'Invalid OTP' })
            return
        }

        const history = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []
        history.push({ status: 'Delivered', note: 'Delivered by partner', timestamp: new Date().toISOString() })

        const updated = await prisma.order.update({
            where: { id },
            data: { status: 'Delivered', deliveryOtp: '', statusHistory: history, isPaid: true },
            include: { user: { select: { name: true, email: true } } },
        })

        res.status(200).json({ success: true, message: 'Order delivered successfully', order: updated })

        // Send delivery confirmation email to user (non-blocking)
        const orderUser = (updated as any).user
        if (orderUser?.email) {
            sendOrderStatusEmail({
                to: orderUser.email,
                name: orderUser.name,
                orderId: id,
                status: 'Delivered',
            }).catch(() => {})
        }

        // Check for low stock products and alert admin
        const items = order.items as any[]
        if (Array.isArray(items)) {
            const productIds = items.map((i: any) => i.product).filter(Boolean)
            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, stock: { lte: 5 } },
                select: { name: true, stock: true },
            })
            if (products.length > 0) {
                sendLowStockAlertEmail(products).catch(() => {})
            }
        }
    } catch (error) {
        console.error('Confirm delivery error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/orders/:id/location — Get Live Location (User polling) ──────────
export const getLiveLocation = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const order = await prisma.order.findUnique({
            where: { id },
            select: { liveLocation: true, locationHistory: true },
        })
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }
        res.json({ success: true, liveLocation: order.liveLocation, locationHistory: order.locationHistory })
    } catch (error) {
        console.error('Get live location error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/orders/:id/location — Update Live Location (Delivery) ─────────
export const updateLiveLocation = async (req: Request, res: Response) => {
    try {
        const id  = String(req.params.id)
        const { lat, lng } = req.body

        if (lat === undefined || lng === undefined) {
            res.status(400).json({ success: false, message: 'lat and lng are required' })
            return
        }

        const order = await prisma.order.findUnique({ where: { id } })
        const point = { lat: Number(lat), lng: Number(lng), updatedAt: new Date().toISOString() }
        const history = Array.isArray(order?.locationHistory) ? [...order!.locationHistory as any[]] : []
        history.push(point)

        const updated = await prisma.order.update({
            where: { id },
            data: {
                liveLocation: point,
                locationHistory: history,
            },
        })

        res.status(200).json({ success: true, liveLocation: updated.liveLocation })
    } catch (error) {
        console.error('Update live location error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
