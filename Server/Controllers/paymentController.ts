import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import { Prisma } from '@prisma/client'
import crypto from 'crypto'
import { AuthRequest } from '../middileware/auth.js'
import { resolveAdminUserId } from '../lib/ensureAdminUser.js'
import { getCashfreeClient, getCashfreeMode, extractPaymentSessionId } from '../lib/cashfree.js'
import { sendOrderConfirmationEmail } from '../Config/emailService.js'

const cashfree = getCashfreeClient()

const TAX_RATE             = 0.05  // 5% GST
const FREE_DELIVERY_THRESHOLD = 20
const DELIVERY_FEE         = 2.99

const generateOtp = () => crypto.randomInt(100000, 999999).toString()

/** Cashfree requires a valid 10-digit Indian phone (no spaces/country formatting). */
const sanitizeCashfreePhone = (phone?: string | null): string => {
    if (!phone) return '9999999999'
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10) return digits.slice(-10)
    return '9999999999'
}

const cashfreeErrorMessage = (error: unknown): string => {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    return err?.response?.data?.message || err?.message || 'Payment gateway error'
}

const POS_TAX_RATE = 0.05

type OrderItemRow = { product: string; name: string; image: string; price: number; quantity: number; unit: string }

const decrementOrderStock = async (items: OrderItemRow[]) => {
    for (const item of items) {
        await prisma.product.update({
            where: { id: item.product },
            data:  { stock: { decrement: item.quantity } },
        }).catch(() => {})
    }
}

const buildCounterTotals = (
    orderItems: OrderItemRow[],
    discount: number,
    discountType: 'flat' | 'percent'
) => {
    const subtotal    = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const discountAmt = discountType === 'percent'
        ? Math.min((subtotal * discount) / 100, subtotal)
        : Math.min(discount, subtotal)
    const taxable = subtotal - discountAmt
    const tax     = parseFloat((taxable * POS_TAX_RATE).toFixed(2))
    const total   = parseFloat((taxable + tax).toFixed(2))
    return { subtotal, discountAmt, tax, total }
}

// ─── POST /api/payment/create-order ──────────────────────────────────────────
// Creates a Cashfree order and returns payment_session_id for the frontend
export const createPaymentOrder = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { items, shippingAddress, paymentMethod, couponCode } = req.body

        if (!items?.length || !shippingAddress || !paymentMethod) {
            res.status(400).json({ success: false, message: 'items, shippingAddress and paymentMethod are required' })
            return
        }

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
        const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
        const tax         = parseFloat((taxable * TAX_RATE).toFixed(2))
        const total       = parseFloat((taxable + deliveryFee + tax).toFixed(2))

        // Get user details for Cashfree
        const user = await prisma.user.findUnique({
            where:  { id: userId },
            select: { name: true, email: true, phone: true },
        })

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' })
            return
        }

        // For cash on delivery — skip Cashfree, create order directly
        if (paymentMethod === 'cash') {
            const order = await prisma.order.create({
                data: {
                    userId,
                    items:           orderItems,
                    shippingAddress,
                    paymentMethod:   'cash',
                    subtotal,
                    deliveryFee,
                    tax,
                    total,
                    status:          'Placed',
                    statusHistory:   [{ status: 'Placed', note: 'Order placed (Cash on Delivery)', timestamp: new Date().toISOString() }],
                    deliveryOtp:     generateOtp(),
                    isPaid:          false,
                    ...(validatedCouponCode && { couponCode: validatedCouponCode, discountAmount: couponDiscount }),
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            })

            res.status(201).json({
                success:       true,
                paymentMethod: 'cash',
                order,
            })

            // Increment coupon usage
            if (validatedCouponCode) {
                await prisma.coupon.update({
                    where: { code: validatedCouponCode },
                    data:  { usedCount: { increment: 1 } },
                }).catch(() => {})
            }

            // Send order confirmation email with delivery OTP (non-blocking)
            const cashUser = order.user as { name: string; email: string }
            if (cashUser?.email) {
                sendOrderConfirmationEmail({
                    to:            cashUser.email,
                    name:          cashUser.name,
                    orderId:       order.id,
                    items:         orderItems,
                    total:         order.total,
                    paymentMethod: 'cash',
                    deliveryOtp:   order.deliveryOtp ?? '',
                }).catch(() => {})
            }
            return
        }

        // For online payment — create Cashfree order
        const cfOrderId = `order_${Date.now()}_${userId.slice(-6)}`

        const cfOrder = await cashfree.PGCreateOrder({
            order_id:       cfOrderId,
            order_amount:   total,
            order_currency: 'INR',
            customer_details: {
                customer_id:    userId,
                customer_name:  user.name,
                customer_email: user.email,
                customer_phone: sanitizeCashfreePhone(user.phone),
            },
            order_meta: {
                return_url: `${process.env.CLIENT_URL}/checkout/verify?order_id={order_id}`,
                notify_url: `${process.env.SERVER_URL}/api/payment/webhook`,
            },
                order_note: `Pizza Corner order for ${user.name}`,
        } as any)

        // Store pending order in DB with cfOrderId for verification later
        const order = await prisma.order.create({
            data: {
                userId,
                items:           orderItems,
                shippingAddress,
                paymentMethod:   'online',
                subtotal,
                deliveryFee,
                tax,
                total,
                status:          'Pending Payment',
                statusHistory:   [{ status: 'Pending Payment', note: 'Awaiting payment confirmation', timestamp: new Date().toISOString() }],
                deliveryOtp:     generateOtp(),
                isPaid:          false,
                liveLocation:    { cfOrderId },
                ...(validatedCouponCode && { couponCode: validatedCouponCode, discountAmount: couponDiscount }),
            },
        })

        const sessionId = extractPaymentSessionId(cfOrder.data as Record<string, unknown>)

        if (!sessionId) {
            console.error('Cashfree PGCreateOrder response:', JSON.stringify(cfOrder.data))
            res.status(500).json({ success: false, message: 'Failed to get payment session from Cashfree' })
            return
        }

        res.status(200).json({
            success:           true,
            paymentMethod:     'online',
            orderId:           order.id,
            cfOrderId,
            paymentSessionId:  sessionId,
            cashfreeMode:      getCashfreeMode(),
            amount:            total,
        })
    } catch (error) {
        console.error('Create payment order error:', error)
        res.status(500).json({ success: false, message: 'Payment order creation failed' })
    }
}

// ─── POST /api/payment/verify ─────────────────────────────────────────────────
// Called after Cashfree redirect — verifies payment and confirms order
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const { cfOrderId, orderId } = req.body

        if (!cfOrderId || !orderId) {
            res.status(400).json({ success: false, message: 'cfOrderId and orderId are required' })
            return
        }

        // Fetch payment status from Cashfree
        const cfResponse = await cashfree.PGFetchOrder(cfOrderId)
        const cfData     = cfResponse.data

        const isPaid = cfData?.order_status === 'PAID'

        const order = await prisma.order.findUnique({ where: { id: orderId } })
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        const history = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []

        if (isPaid) {
            history.push({ status: 'Placed', note: 'Payment confirmed via Cashfree', timestamp: new Date().toISOString() })

            const shipping = order.shippingAddress as Record<string, unknown> | null
            const isCounter  = shipping?.type === 'counter'
            const newStatus  = isCounter ? 'Delivered' : 'Placed'

            const updated = await prisma.order.update({
                where: { id: orderId },
                data:  {
                    isPaid:        true,
                    status:        newStatus,
                    statusHistory: history,
                    liveLocation:  Prisma.JsonNull,
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            })

            if (order.status === 'Pending Payment') {
                await decrementOrderStock(order.items as OrderItemRow[])
            }

            // Increment coupon usage
            if (order.couponCode) {
                await prisma.coupon.update({
                    where: { code: order.couponCode },
                    data:  { usedCount: { increment: 1 } },
                }).catch(() => {})
            }

            res.status(200).json({ success: true, paid: true, order: updated })
        } else {
            history.push({ status: 'Payment Failed', note: `Cashfree status: ${cfData?.order_status}`, timestamp: new Date().toISOString() })

            await prisma.order.update({
                where: { id: orderId },
                data:  { status: 'Cancelled', statusHistory: history },
            })

            res.status(200).json({ success: true, paid: false, status: cfData?.order_status })
        }
    } catch (error) {
        console.error('Verify payment error:', error)
        res.status(500).json({ success: false, message: 'Payment verification failed' })
    }
}

// ─── POST /api/payment/webhook ────────────────────────────────────────────────
// Cashfree webhook — auto-confirms payment server-side
export const paymentWebhook = async (req: Request, res: Response) => {
    try {
        const signature = (req.headers['x-webhook-signature'] || '') as string
        const timestamp = (req.headers['x-webhook-timestamp'] || '') as string
        const rawBody   = JSON.stringify(req.body)

        // Verify webhook signature
        const expectedSig = crypto
            .createHmac('sha256', process.env.CASHFREE_SECRET_KEY!)
            .update(timestamp + rawBody)
            .digest('base64')

        if (signature !== expectedSig) {
            res.status(400).json({ success: false, message: 'Invalid webhook signature' })
            return
        }

        const { data, type } = req.body

        if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
            const cfOrderId = data?.order?.order_id
            if (!cfOrderId) { res.status(200).json({ received: true }); return }

            // Find order by cfOrderId stored in liveLocation
            const order = await prisma.order.findFirst({
                where: { liveLocation: { path: ['cfOrderId'], equals: cfOrderId } },
            })

            if (order && !order.isPaid) {
                const history   = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []
                const shipping  = order.shippingAddress as Record<string, unknown> | null
                const isCounter = shipping?.type === 'counter'
                history.push({
                    status:    isCounter ? 'Delivered' : 'Placed',
                    note:      'Payment confirmed via webhook',
                    timestamp: new Date().toISOString(),
                })

                await prisma.order.update({
                    where: { id: order.id },
                    data:  {
                        isPaid:        true,
                        status:        isCounter ? 'Delivered' : 'Placed',
                        statusHistory: history,
                        liveLocation:  Prisma.JsonNull,
                    },
                })

                if (order.status === 'Pending Payment') {
                    await decrementOrderStock(order.items as OrderItemRow[])
                }

                // Increment coupon usage
                if (order.couponCode) {
                    await prisma.coupon.update({
                        where: { code: order.couponCode },
                        data:  { usedCount: { increment: 1 } },
                    }).catch(() => {})
                }
            }
        }

        res.status(200).json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        res.status(500).json({ success: false, message: 'Webhook processing failed' })
    }
}

// ─── POST /api/payment/counter-order ───────────────────────────────────────────
// Counter billing: cash completes immediately; card/UPI opens Cashfree checkout
export const createCounterOrder = async (req: AuthRequest, res: Response) => {
    try {
        const userId = await resolveAdminUserId(req.user?.id, req.user?.email)

        const {
            items,
            paymentMethod,
            customerName,
            customerPhone,
            billNo,
            discount     = 0,
            discountType = 'flat',
        } = req.body as {
            items:           { productId: string; quantity: number }[]
            paymentMethod:   'cash' | 'card' | 'upi'
            customerName?:   string
            customerPhone?:   string
            billNo?:          string
            discount?:        number
            discountType?:    'flat' | 'percent'
        }

        if (!items?.length || !paymentMethod) {
            res.status(400).json({ success: false, message: 'items and paymentMethod are required' })
            return
        }

        if (!['cash', 'card', 'upi'].includes(paymentMethod)) {
            res.status(400).json({ success: false, message: 'paymentMethod must be cash, card, or upi' })
            return
        }

        const productIds: string[] = items.map((i) => String(i.productId))
        const products   = await prisma.product.findMany({ where: { id: { in: productIds } } })

        if (products.length !== productIds.length) {
            res.status(400).json({ success: false, message: 'One or more products not found' })
            return
        }

        for (const item of items) {
            const product = products.find((p) => p.id === item.productId)!
            if ((product.stock ?? 0) < item.quantity) {
                res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`,
                })
                return
            }
        }

        const orderItems: OrderItemRow[] = items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!
            return {
                product:  product.id,
                name:     product.name,
                image:    product.image,
                price:    product.price,
                quantity: Number(item.quantity),
                unit:     product.unit ?? 'piece',
            }
        })

        const { subtotal, discountAmt, tax, total } = buildCounterTotals(
            orderItems,
            Number(discount) || 0,
            discountType === 'percent' ? 'percent' : 'flat'
        )

        const admin = await prisma.user.findUnique({
            where:  { id: userId },
            select: { name: true, email: true, phone: true },
        })

        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin user not found' })
            return
        }

        const shippingAddress = {
            type:          'counter',
            billNo:        billNo || `POS-${Date.now()}`,
            customerName:  customerName || 'Walk-in Customer',
            customerPhone: customerPhone || '',
            address:       'Store Counter — Walk-in',
            city:          'Chennai',
            state:         'Tamil Nadu',
            zip:           '600001',
            lat:           0,
            lng:           0,
        }

        const storedPaymentMethod =
            paymentMethod === 'cash' ? 'pos_cash' : paymentMethod === 'card' ? 'pos_card' : 'pos_upi'

        // ── Cash: record sale immediately ─────────────────────────────────────
        if (paymentMethod === 'cash') {
            const order = await prisma.order.create({
                data: {
                    userId,
                    items:           orderItems,
                    shippingAddress,
                    paymentMethod:   storedPaymentMethod,
                    subtotal,
                    deliveryFee:     0,
                    tax,
                    total,
                    status:          'Delivered',
                    statusHistory:   [{
                        status:    'Delivered',
                        note:      `Counter sale (cash) — Bill ${shippingAddress.billNo}${discountAmt > 0 ? `, discount ₹${discountAmt.toFixed(2)}` : ''}`,
                        timestamp: new Date().toISOString(),
                    }],
                    deliveryOtp:     generateOtp(),
                    isPaid:          true,
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            })

            await decrementOrderStock(orderItems)

            res.status(201).json({
                success:       true,
                paymentMethod: 'cash',
                order,
                billNo:        shippingAddress.billNo,
            })
            return
        }

        // ── Card / UPI: Cashfree hosted checkout ─────────────────────────────
        const cfOrderId = `pos_${Date.now()}_${userId.slice(-6)}`

        if (total < 1) {
            res.status(400).json({ success: false, message: 'Order total must be at least ₹1' })
            return
        }

        const cfPayload = {
            order_id:       cfOrderId,
            order_amount:   total,
            order_currency: 'INR',
            customer_details: {
                customer_id:    userId,
                customer_name:  customerName || admin.name,
                customer_email: admin.email,
                customer_phone: sanitizeCashfreePhone(customerPhone || admin.phone),
            },
            order_meta: {
                return_url: `${process.env.CLIENT_URL}/admin/counter-sale?cf_verify=1&order_id={order_id}`,
                notify_url: `${process.env.SERVER_URL}/api/payment/webhook`,
            },
            order_note: `Counter sale ${shippingAddress.billNo} (${paymentMethod})`,
        }

        let cfOrder
        try {
            cfOrder = await cashfree.PGCreateOrder(cfPayload as any)
        } catch (cfError) {
            console.error('Cashfree counter PGCreateOrder error:', (cfError as any)?.response?.data || cfError)
            res.status(502).json({ success: false, message: cashfreeErrorMessage(cfError) })
            return
        }

        const order = await prisma.order.create({
            data: {
                userId,
                items:           orderItems,
                shippingAddress,
                paymentMethod:   storedPaymentMethod,
                subtotal,
                deliveryFee:     0,
                tax,
                total,
                status:          'Pending Payment',
                statusHistory:   [{
                    status:    'Pending Payment',
                    note:      `Awaiting ${paymentMethod.toUpperCase()} payment via Cashfree`,
                    timestamp: new Date().toISOString(),
                }],
                deliveryOtp:     generateOtp(),
                isPaid:          false,
                liveLocation:    { cfOrderId, channel: 'pos', payMethod: paymentMethod },
            },
        })

        const sessionId = extractPaymentSessionId(cfOrder.data as Record<string, unknown>)

        if (!sessionId) {
            await prisma.order.delete({ where: { id: order.id } }).catch(() => {})
            console.error('Cashfree counter PGCreateOrder:', JSON.stringify(cfOrder.data))
            res.status(500).json({ success: false, message: 'Failed to start Cashfree payment session' })
            return
        }

        res.status(200).json({
            success:          true,
            paymentMethod:    paymentMethod,
            orderId:          order.id,
            cfOrderId,
            paymentSessionId: sessionId,
            cashfreeMode:     getCashfreeMode(),
            amount:           total,
            billNo:           shippingAddress.billNo,
        })
    } catch (error) {
        console.error('Create counter order error:', error)
        const message = error instanceof Error ? error.message : 'Counter order creation failed'
        res.status(500).json({ success: false, message })
    }
}

// ─── GET /api/payment/status/:cfOrderId ──────────────────────────────────────
export const getPaymentStatus = async (req: Request, res: Response) => {
    try {
        const cfOrderId = String(req.params.cfOrderId)

        const cfResponse = await cashfree.PGFetchOrder(cfOrderId)

        res.status(200).json({
            success: true,
            status:  cfResponse.data?.order_status,
            amount:  cfResponse.data?.order_amount,
        })
    } catch (error) {
        console.error('Get payment status error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch payment status' })
    }
}

// ─── GET /api/payment/verify-redirect/:cfOrderId ─────────────────────────────
// Called after Cashfree redirect — looks up order by cfOrderId, verifies payment
export const verifyRedirect = async (req: Request, res: Response) => {
    try {
        const cfOrderId = String(req.params.cfOrderId)

        // Look up our order by cfOrderId stored in liveLocation
        const order = await prisma.order.findFirst({
            where: { liveLocation: { path: ['cfOrderId'], equals: cfOrderId } },
        })

        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' })
            return
        }

        // Fetch payment status from Cashfree
        const cfResponse = await cashfree.PGFetchOrder(cfOrderId)
        const cfData = cfResponse.data
        const isPaid = cfData?.order_status === 'PAID'

        if (isPaid && !order.isPaid) {
            const history = Array.isArray(order.statusHistory) ? order.statusHistory as any[] : []
            const shipping = order.shippingAddress as Record<string, unknown> | null
            const isCounter = shipping?.type === 'counter'
            history.push({ status: 'Placed', note: 'Payment confirmed via Cashfree', timestamp: new Date().toISOString() })

            await prisma.order.update({
                where: { id: order.id },
                data: {
                    isPaid: true,
                    status: isCounter ? 'Delivered' : 'Placed',
                    statusHistory: history,
                    liveLocation: Prisma.JsonNull,
                },
            })

            if (order.status === 'Pending Payment') {
                await decrementOrderStock(order.items as OrderItemRow[])
            }

            // Increment coupon usage
            if (order.couponCode) {
                await prisma.coupon.update({
                    where: { code: order.couponCode },
                    data:  { usedCount: { increment: 1 } },
                }).catch(() => {})
            }

            res.json({ success: true, paid: true, orderId: order.id, status: 'Placed' })
        } else {
            res.json({ success: true, paid: isPaid, orderId: order.id, status: cfData?.order_status })
        }
    } catch (error) {
        console.error('Verify redirect error:', error)
        res.status(500).json({ success: false, message: 'Payment verification failed' })
    }
}
