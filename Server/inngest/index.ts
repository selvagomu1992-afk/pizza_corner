import { Inngest } from 'inngest'
import { prisma } from '../Config/prisma.js'
import {
    sendOrderConfirmationEmail,
    sendOrderStatusEmail,
    sendLowStockAlertEmail,
    sendDailyStockReportEmail,
} from '../Config/emailService.js'

const LOW_STOCK_THRESHOLD = 10

// ─── Inngest Client ───────────────────────────────────────────────────────────
export const inngest = new Inngest({ id: 'grocery-delivery' })

// ─── Function 1: Decrement Stock After Order ──────────────────────────────────
const updateStockOnOrder = inngest.createFunction(
    {
        id:       'update-stock-on-order',
        name:     'Decrement Stock After Order',
        triggers: [{ event: 'order/placed' }],
    },
    async ({ event, step }: { event: any; step: any }) => {
        const items: { product: string; quantity: number }[] = event.data.items

        await step.run('decrement-stock', async () => {
            await Promise.all(
                items.map((item) =>
                    prisma.product.update({
                        where: { id: item.product },
                        data:  { stock: { decrement: item.quantity } },
                    })
                )
            )
        })

        return { updated: items.length }
    }
)

// ─── Function 2: Check Low Stock After Order ──────────────────────────────────
const checkLowStock = inngest.createFunction(
    {
        id:       'check-low-stock',
        name:     'Check Low Stock After Order',
        triggers: [{ event: 'order/placed' }],
    },
    async ({ event, step }: { event: any; step: any }) => {
        const items: { product: string; quantity: number }[] = event.data.items

        const lowStockProducts: { id: string; name: string; stock: number | null }[] =
            await step.run('find-low-stock-products', async () => {
                const productIds = items.map((i) => i.product)
                const products = await prisma.product.findMany({
                    where:  { id: { in: productIds } },
                    select: { id: true, name: true, stock: true },
                })
                return products.filter((p) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
            })

        if (lowStockProducts.length > 0) {
            await step.run('log-low-stock-alert', async () => {
                console.warn(
                    '[LOW STOCK ALERT]',
                    lowStockProducts.map((p) => `${p.name} (${p.stock} left)`).join(', ')
                )
                await sendLowStockAlertEmail(lowStockProducts)
            })
        }

        return { checked: items.length, lowStock: lowStockProducts.length }
    }
)

// ─── Function 3: Send Order Confirmation (with OTP) ───────────────────────────
const sendOrderConfirmation = inngest.createFunction(
    {
        id:       'send-order-confirmation',
        name:     'Send Order Confirmation',
        triggers: [{ event: 'order/placed' }],
    },
    async ({ event, step }: { event: any; step: any }) => {
        const {
            orderId,
            userEmail,
            userName,
            total,
            deliveryOtp,
            items,
            paymentMethod,
        } = event.data as {
            orderId:       string
            userEmail:     string
            userName:      string
            total:         number
            deliveryOtp:   string
            items:         any[]
            paymentMethod: string
        }

        await step.sleep('brief-delay', '2s')

        await step.run('send-confirmation-email', async () => {
            console.log(`[ORDER CONFIRMATION] #${orderId} → ${userEmail} | OTP: ${deliveryOtp}`)
            await sendOrderConfirmationEmail({
                to:            userEmail,
                name:          userName,
                orderId,
                items:         items ?? [],
                total,
                paymentMethod: paymentMethod ?? 'card',
                deliveryOtp:   deliveryOtp ?? '',
            })
        })

        return { sent: true, orderId }
    }
)

// ─── Function 4: Order Status Notification ────────────────────────────────────
const notifyOrderStatusChange = inngest.createFunction(
    {
        id:       'notify-order-status-change',
        name:     'Notify Order Status Change',
        triggers: [{ event: 'order/status.updated' }],
    },
    async ({ event, step }: { event: any; step: any }) => {
        const { orderId, status, userEmail, userName } = event.data as {
            orderId:   string
            status:    string
            userEmail: string
            userName:  string
        }

        await step.run('send-status-notification', async () => {
            console.log(`[STATUS UPDATE] ${userName} (${userEmail}) — Order #${orderId}: ${status}`)
            await sendOrderStatusEmail({ to: userEmail, name: userName, orderId, status })
        })

        return { notified: true, orderId, status }
    }
)

// ─── Function 5: Daily Low Stock Report (Cron) ────────────────────────────────
const dailyLowStockReport = inngest.createFunction(
    {
        id:       'daily-low-stock-report',
        name:     'Daily Low Stock Report',
        triggers: [{ cron: '0 8 * * *' }],
    },
    async ({ step }: { step: any }) => {
        const lowStockProducts: { name: string; category: string; stock: number | null }[] =
            await step.run('fetch-low-stock', async () => {
                return prisma.product.findMany({
                    where:   { stock: { lte: LOW_STOCK_THRESHOLD } },
                    select:  { id: true, name: true, category: true, stock: true },
                    orderBy: { stock: 'asc' },
                })
            })

        await step.run('report-low-stock', async () => {
            if (lowStockProducts.length === 0) {
                console.log('[DAILY REPORT] All products are well stocked.')
            } else {
                console.warn(`[DAILY REPORT] ${lowStockProducts.length} low-stock products:`)
                lowStockProducts.forEach((p) =>
                    console.warn(`  - ${p.name} (${p.category}): ${p.stock} remaining`)
                )
            }
            await sendDailyStockReportEmail(lowStockProducts)
        })

        return { reportedAt: new Date().toISOString(), count: lowStockProducts.length }
    }
)

// ─── Export all functions ─────────────────────────────────────────────────────
export const functions = [
    updateStockOnOrder,
    checkLowStock,
    sendOrderConfirmation,
    notifyOrderStatusChange,
    dailyLowStockReport,
]
