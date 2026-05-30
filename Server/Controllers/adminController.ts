import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import bcrypt from 'bcrypt'
import { sendOfferNotificationEmail } from '../Config/emailService.js'

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
export const getDashboard = async (_req: Request, res: Response) => {
    try {
        const [
            totalOrders,
            totalUsers,
            totalProducts,
            outOfStock,
            totalPartners,
            recentOrders,
            revenue,
            lowStockProducts,
        ] = await Promise.all([
            prisma.order.count(),
            prisma.user.count(),
            prisma.product.count(),
            prisma.product.count({ where: { stock: 0 } }),
            prisma.deliveryPartner.count(),
            prisma.order.findMany({
                take:    10,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true, email: true } } },
            }),
            prisma.order.aggregate({ _sum: { total: true } }),
            prisma.product.findMany({
                where: { stock: { gt: 0 }, minQty: { gt: 0 } },  // will filter after
                select: { id: true, name: true, stock: true, minQty: true },
                orderBy: { stock: 'asc' },
                take: 20,
            }),
        ])

        // Filter where stock <= minQty (can't do this comparison in Prisma)
        const lowStock = lowStockProducts.filter(p => p.stock !== null && p.minQty !== null && p.stock <= p.minQty)

        res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                totalUsers,
                totalProducts,
                outOfStock,
                totalPartners,
                totalRevenue: revenue._sum.total ?? 0,
            },
            recentOrders,
            lowStockProducts: lowStock,
        })
    } catch (error) {
        console.error('Dashboard error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const { search, page = '1', limit = '20' } = req.query

        const where: any = {}
        if (search) {
            const q = String(search)
            where.OR = [
                { name:  { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ]
        }

        const pageNum  = Math.max(1, Number(page))
        const pageSize = Math.min(100, Math.max(1, Number(limit)))

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select:  { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip:    (pageNum - 1) * pageSize,
                take:    pageSize,
            }),
            prisma.user.count({ where }),
        ])

        res.status(200).json({
            success: true,
            users,
            pagination: { total, page: pageNum, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
        })
    } catch (error) {
        console.error('Get users error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
export const getUserById = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const user = await prisma.user.findUnique({
            where:  { id },
            select: {
                id: true, name: true, email: true, phone: true,
                avatar: true, createdAt: true,
                addresses: true,
                orders: {
                    take:    5,
                    orderBy: { createdAt: 'desc' },
                    select:  { id: true, total: true, status: true, createdAt: true },
                },
            },
        })

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' })
            return
        }

        res.status(200).json({ success: true, user })
    } catch (error) {
        console.error('Get user error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const user = await prisma.user.findUnique({ where: { id } })
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' })
            return
        }

        await prisma.user.delete({ where: { id } })

        res.status(200).json({ success: true, message: 'User deleted' })
    } catch (error) {
        console.error('Delete user error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
export const getAdminOrders = async (req: Request, res: Response) => {
    try {
        const { status, search, page = '1', limit = '20' } = req.query

        const where: any = {}
        if (status) where.status = String(status)
        if (search) {
            const q = String(search)
            where.OR = [
                { id: { contains: q } },
                { user: { name:  { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
            ]
        }

        const pageNum  = Math.max(1, Number(page))
        const pageSize = Math.min(100, Math.max(1, Number(limit)))

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip:    (pageNum - 1) * pageSize,
                take:    pageSize,
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
        console.error('Admin get orders error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/admin/orders/:id/status ──────────────────────────────────────
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const id             = String(req.params.id)
        const { status, note } = req.body

        const VALID = ['Placed', 'Confirmed', 'Assigned', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled']
        if (!status || !VALID.includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid status' })
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
            data:  { status, statusHistory: history },
        })

        res.status(200).json({ success: true, message: 'Order status updated', order })
    } catch (error) {
        console.error('Update order status error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/admin/orders/:id/assign ──────────────────────────────────────
export const assignDeliveryPartner = async (req: Request, res: Response) => {
    try {
        const id                    = String(req.params.id)
        const { deliveryPartnerId } = req.body

        if (!deliveryPartnerId) {
            res.status(400).json({ success: false, message: 'deliveryPartnerId is required' })
            return
        }

        const [order, partner] = await Promise.all([
            prisma.order.findUnique({ where: { id } }),
            prisma.deliveryPartner.findUnique({ where: { id: String(deliveryPartnerId) } }),
        ])

        if (!order)   { res.status(404).json({ success: false, message: 'Order not found' }); return }
        if (!partner || !partner.isActive) {
            res.status(400).json({ success: false, message: 'Delivery partner not found or inactive' })
            return
        }

        const history = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []
        history.push({ status: 'Assigned', note: `Assigned to ${partner.name}`, timestamp: new Date().toISOString() })

        const updated = await prisma.order.update({
            where:   { id },
            data:    { deliveryPartnerId: partner.id, status: 'Assigned', statusHistory: history },
            include: { deliveryPartner: { select: { id: true, name: true, phone: true } } },
        })

        res.status(200).json({ success: true, message: 'Delivery partner assigned', order: updated })
    } catch (error) {
        console.error('Assign delivery partner error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY PARTNERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/delivery-partners ────────────────────────────────────────
export const getDeliveryPartners = async (req: Request, res: Response) => {
    try {
        const { active } = req.query

        const where: any = {}
        if (active === 'true')  where.isActive = true
        if (active === 'false') where.isActive = false

        const partners = await prisma.deliveryPartner.findMany({
            where,
            select:  { id: true, name: true, email: true, phone: true, vehicleType: true, isActive: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        })

        // Get delivery counts for each partner
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const partnersWithCounts = await Promise.all(partners.map(async (p) => {
            const [totalDeliveries, todayDeliveries] = await Promise.all([
                prisma.order.count({ where: { deliveryPartnerId: p.id, status: 'Delivered' } }),
                prisma.order.count({ where: { deliveryPartnerId: p.id, status: 'Delivered', updatedAt: { gte: today } } }),
            ])
            return { ...p, totalDeliveries, todayDeliveries }
        }))

        res.status(200).json({ success: true, partners: partnersWithCounts })
    } catch (error) {
        console.error('Get delivery partners error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /api/admin/delivery-partners ───────────────────────────────────────
export const createDeliveryPartner = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, vehicleType } = req.body

        if (!name || !email || !password || !phone) {
            res.status(400).json({ success: false, message: 'name, email, password and phone are required' })
            return
        }

        const existing = await prisma.deliveryPartner.findUnique({ where: { email } })
        if (existing) {
            res.status(409).json({ success: false, message: 'Email already registered' })
            return
        }

        const hashed  = await bcrypt.hash(password, 10)
        const partner = await prisma.deliveryPartner.create({
            data: { name, email, password: hashed, phone, vehicleType: vehicleType || 'bike' },
            select: { id: true, name: true, email: true, phone: true, vehicleType: true, isActive: true, createdAt: true },
        })

        res.status(201).json({ success: true, message: 'Delivery partner created', partner })
    } catch (error) {
        console.error('Create delivery partner error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/admin/delivery-partners/:id/toggle ───────────────────────────
export const toggleDeliveryPartner = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const partner = await prisma.deliveryPartner.findUnique({ where: { id } })
        if (!partner) {
            res.status(404).json({ success: false, message: 'Delivery partner not found' })
            return
        }

        const updated = await prisma.deliveryPartner.update({
            where:  { id },
            data:   { isActive: !partner.isActive },
            select: { id: true, name: true, isActive: true },
        })

        res.status(200).json({
            success: true,
            message: `Partner ${updated.isActive ? 'activated' : 'deactivated'}`,
            partner: updated,
        })
    } catch (error) {
        console.error('Toggle delivery partner error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── DELETE /api/admin/delivery-partners/:id ─────────────────────────────────
export const deleteDeliveryPartner = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)

        const partner = await prisma.deliveryPartner.findUnique({ where: { id } })
        if (!partner) {
            res.status(404).json({ success: false, message: 'Delivery partner not found' })
            return
        }

        await prisma.deliveryPartner.delete({ where: { id } })

        res.status(200).json({ success: true, message: 'Delivery partner deleted' })
    } catch (error) {
        console.error('Delete delivery partner error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESSES (ALL USERS)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/addresses ────────────────────────────────────────────────
export const getAllAddresses = async (_req: Request, res: Response) => {
    try {
        const addresses = await prisma.address.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        })

        res.status(200).json({ success: true, addresses })
    } catch (error) {
        console.error('Get all addresses error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CREDENTIALS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PATCH /api/admin/credentials ────────────────────────────────────────────
// Change admin email and/or password (stored in database permanently)
export const changeAdminCredentials = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newEmail, newPassword } = req.body

        if (!currentPassword) {
            res.status(400).json({ success: false, message: 'Current password is required' })
            return
        }

        const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

        // Find admin user in DB
        const adminUser = await prisma.user.findFirst({ where: { isAdmin: true } })

        if (adminUser) {
            // Verify current password against DB hash
            const isMatch = await bcrypt.compare(currentPassword, adminUser.password)
            // Also accept the env password as fallback
            if (!isMatch && currentPassword !== ADMIN_PASSWORD) {
                res.status(401).json({ success: false, message: 'Current password is incorrect' })
                return
            }

            const updateData: any = {}
            if (newEmail && newEmail !== adminUser.email) updateData.email = newEmail
            if (newPassword) updateData.password = await bcrypt.hash(newPassword, 10)

            if (Object.keys(updateData).length > 0) {
                await prisma.user.update({ where: { id: adminUser.id }, data: updateData })
            }

            res.status(200).json({
                success: true,
                message: 'Admin credentials updated successfully! Use new credentials to login.',
                newEmail: newEmail || adminUser.email,
            })
        } else {
            // No admin in DB — verify against env
            if (currentPassword !== ADMIN_PASSWORD) {
                res.status(401).json({ success: false, message: 'Current password is incorrect' })
                return
            }

            // Create admin with new credentials
            const hashed = await bcrypt.hash(newPassword || ADMIN_PASSWORD, 10)
            await prisma.user.create({
                data: { name: 'Admin', email: newEmail || ADMIN_EMAIL, password: hashed, phone: '', isAdmin: true }
            })

            res.status(200).json({
                success: true,
                message: 'Admin credentials updated successfully!',
                newEmail: newEmail || ADMIN_EMAIL,
            })
        }
    } catch (error) {
        console.error('Change admin credentials error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNASSIGNED ORDERS COUNT (for admin navbar indicator)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/unassigned-count ──────────────────────────────────────────
export const getUnassignedCount = async (_req: Request, res: Response) => {
    try {
        const count = await prisma.order.count({
            where: {
                deliveryPartnerId: null,
                status: { notIn: ['Delivered', 'Cancelled'] },
            },
        })
        res.json({ success: true, count })
    } catch (error) {
        console.error('Get unassigned count error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// COUNTER BILL
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/admin/counter-bill ──────────────────────────────────────────────
export const createCounterBill = async (req: Request, res: Response) => {
    try {
        const { customerName, customerPhone, items, paymentMethod, counterNo } = req.body

        if (!customerName || !items?.length || !paymentMethod) {
            res.status(400).json({ success: false, message: 'customerName, items and paymentMethod are required' })
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
        const tax         = parseFloat((subtotal * 0.05).toFixed(2))
        const total       = parseFloat((subtotal + tax).toFixed(2))

        // Find or create a walk-in counter user
        const COUNTER_EMAIL = 'counter@pizzacorner.com'
        let counterUser = await prisma.user.findUnique({ where: { email: COUNTER_EMAIL } })
        if (!counterUser) {
            counterUser = await prisma.user.create({
                data: { name: 'Counter', email: COUNTER_EMAIL, password: '', phone: '' },
            })
        }

        const shippingAddress = { address: 'Counter Sale', city: '', state: '', zip: '', lat: 0, lng: 0, label: customerName, phone: customerPhone || '', counterNo: counterNo || '' }

        const order = await prisma.order.create({
            data: {
                userId: counterUser.id,
                items:  orderItems,
                shippingAddress,
                paymentMethod,
                subtotal,
                deliveryFee: 0,
                tax,
                total,
                status:        'Delivered',
                statusHistory: [{ status: 'Delivered', note: `Counter sale — ${customerName}`, timestamp: new Date().toISOString() }],
                deliveryOtp:   '',
                isPaid:        true,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        })

        // Reduce stock
        for (const item of orderItems) {
            await prisma.product.update({
                where: { id: item.product },
                data:  { stock: { decrement: item.quantity } },
            }).catch(() => {})
        }

        res.status(201).json({ success: true, message: 'Counter bill created', order })
    } catch (error) {
        console.error('Counter bill error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/admin/counter-bill/:id ────────────────────────────────────────────
export const getCounterBill = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const order = await prisma.order.findUnique({
            where: { id },
            include: { user: { select: { id: true, name: true, email: true } } },
        })
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }
        res.status(200).json({ success: true, order })
    } catch (error) {
        console.error('Get counter bill error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── PATCH /api/admin/counter-bill/:id ──────────────────────────────────────────
export const updateCounterBill = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        const { customerName, customerPhone, items, paymentMethod, counterNo } = req.body

        const existing = await prisma.order.findUnique({ where: { id } })
        if (!existing) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        const oldItems = existing.items as any[] || []
        const oldProductQtys: Record<string, number> = {}
        for (const i of oldItems) {
            oldProductQtys[i.product] = (oldProductQtys[i.product] || 0) + i.quantity
        }

        if (items?.length) {
            // Validate products
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

            const subtotal = orderItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
            const tax      = parseFloat((subtotal * 0.05).toFixed(2))
            const total    = parseFloat((subtotal + tax).toFixed(2))

            const shippingAddress: any = { address: 'Counter Sale', city: '', state: '', zip: '', lat: 0, lng: 0, label: customerName || existing.shippingAddress.label, phone: customerPhone || existing.shippingAddress.phone || '', counterNo: counterNo || existing.shippingAddress.counterNo || '' }

            const updated = await prisma.order.update({
                where: { id },
                data: {
                    items: orderItems,
                    subtotal,
                    tax,
                    total,
                    shippingAddress,
                    ...(paymentMethod && { paymentMethod }),
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            })

            // Adjust stock: restore old quantities, deduct new quantities
            const newProductQtys: Record<string, number> = {}
            for (const i of orderItems) {
                newProductQtys[i.product] = (newProductQtys[i.product] || 0) + i.quantity
            }
            for (const [prodId, oldQty] of Object.entries(oldProductQtys)) {
                const newQty = newProductQtys[prodId] || 0
                const diff = oldQty - newQty
                if (diff !== 0) {
                    await prisma.product.update({
                        where: { id: prodId },
                        data:  { stock: { increment: diff } },
                    }).catch(() => {})
                }
            }
            // Deduct stock for entirely new products
            for (const [prodId, newQty] of Object.entries(newProductQtys)) {
                if (!(prodId in oldProductQtys)) {
                    await prisma.product.update({
                        where: { id: prodId },
                        data:  { stock: { decrement: newQty } },
                    }).catch(() => {})
                }
            }

            res.status(200).json({ success: true, message: 'Counter bill updated', order: updated })
        } else {
            // Only update customer details
            const shippingAddress = existing.shippingAddress as any
            const updated = await prisma.order.update({
                where: { id },
                data: {
                    ...(customerName  && { shippingAddress: { ...shippingAddress, label: customerName } }),
                    ...(customerPhone && { shippingAddress: { ...shippingAddress, phone: customerPhone } }),
                    ...(counterNo     && { shippingAddress: { ...shippingAddress, counterNo } }),
                    ...(paymentMethod && { paymentMethod }),
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            })
            res.status(200).json({ success: true, message: 'Counter bill updated', order: updated })
        }
    } catch (error) {
        console.error('Update counter bill error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /api/admin/offers/notify ────────────────────────────────────────────
export const notifyOffer = async (req: Request, res: Response) => {
    try {
        const { title, description, discountType, discountValue, freeItem, minPurchase, endDate } = req.body

        if (!title || !endDate) {
            res.status(400).json({ success: false, message: 'Offer title and endDate are required' })
            return
        }

        // Fire-and-forget — don't block the response
        const userCount = await prisma.user.count({
            where: { email: { not: process.env.ADMIN_EMAIL || '' } },
        })
        sendOfferNotificationEmail({
            offerLabel: title,
            offerDescription: description || '',
            discountType: discountType || 'percent',
            discountValue: Number(discountValue) || 0,
            freeItem: freeItem || '',
            minPurchase: Number(minPurchase) || 0,
            expiresAt: endDate,
        }).catch(err => console.error('Offer email send error:', err))

        res.json({ success: true, message: 'Offer notification emails queued', userCount })
    } catch (error) {
        console.error('Notify offer error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── GET /api/admin/sales-by-category ──────────────────────────────────────────
export const getSalesByCategory = async (_req: Request, res: Response) => {
    try {
        const orders = await prisma.order.findMany({
            where: { status: { notIn: ['Cancelled', 'Returned'] } },
            orderBy: { createdAt: 'desc' },
        })

        const productSales = new Map<string, { name: string; qty: number; revenue: number }>()
        const orderItems = orders.flatMap(o => (o.items as any[]) || [])

        const productIds = [...new Set(orderItems.map((i: any) => i.product).filter(Boolean))] as string[]
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        })
        const productMap = new Map(products.map(p => [p.id, p]))

        for (const item of orderItems) {
            const prod = productMap.get(item.product)
            if (!prod) continue
            const catId = prod.category || 'Uncategorized'
            if (!productSales.has(catId)) {
                productSales.set(catId, { name: prod.category || 'Uncategorized', qty: 0, revenue: 0 })
            }
            const entry = productSales.get(catId)!
            entry.qty += Number(item.quantity) || 0
            entry.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0)
        }

        const sales: { category: string; quantity: number; revenue: number }[] = []
        let totalQty = 0
        let totalRevenue = 0

        for (const [, v] of productSales) {
            sales.push({ category: v.name, quantity: v.qty, revenue: Math.round(v.revenue) })
            totalQty += v.qty
            totalRevenue += v.revenue
        }

        sales.sort((a, b) => b.revenue - a.revenue)

        // Also fetch monthly breakdown per category for trend
        const monthlyRaw = new Map<string, { category: string; month: string; quantity: number; revenue: number }>()
        for (const order of orders) {
            const month = order.createdAt.toISOString().slice(0, 7)
            const items = (order.items as any[]) || []
            for (const item of items) {
                const prod = productMap.get(item.product)
                if (!prod) continue
                const catName = prod.category || 'Uncategorized'
                const key = `${catName}::${month}`
                if (!monthlyRaw.has(key)) {
                    monthlyRaw.set(key, { category: catName, month, quantity: 0, revenue: 0 })
                }
                const e = monthlyRaw.get(key)!
                e.quantity += Number(item.quantity) || 0
                e.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0)
            }
        }

        const monthly: { category: string; month: string; quantity: number; revenue: number }[] = []
        for (const [, v] of monthlyRaw) {
            monthly.push(v)
        }
        monthly.sort((a, b) => a.month.localeCompare(b.month))

        res.json({
            success: true,
            sales,
            monthly,
            totals: { totalOrders: orders.length, totalQty, totalRevenue: Math.round(totalRevenue) },
        })
    } catch (error) {
        console.error('Sales by category error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
