import { transporter, FROM } from './mailer.js'
import { prisma } from './prisma.js'

interface OrderItem {
    name:     string
    image:    string
    price:    number
    quantity: number
    unit:     string
}

// ─── Order Confirmation (with OTP) ───────────────────────────────────────────
export const sendOrderConfirmationEmail = async (opts: {
    to:            string
    name:          string
    orderId:       string
    items:         OrderItem[]
    total:         number
    paymentMethod: string
    deliveryOtp:   string
}) => {
    const itemRows = opts.items.map(i => [
        '<tr>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0">',
        '<strong>' + i.name + '</strong><br/>',
        '<span style="color:#888;font-size:12px">' + i.unit + ' × ' + i.quantity + '</span>',
        '</td>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">',
        '$' + (i.price * i.quantity).toFixed(2),
        '</td>',
        '</tr>',
    ].join('')).join('')

    const otpDigits = opts.deliveryOtp
        ? opts.deliveryOtp.split('').map(d =>
            '<span style="display:inline-block;width:36px;height:44px;line-height:44px;background:#fff;border:2px solid #f59e0b;border-radius:8px;font-size:24px;font-weight:bold;color:#1B3022;text-align:center;margin:0 3px">' + d + '</span>'
        ).join('')
        : ''

    const otpSection = opts.deliveryOtp ? [
        '<div style="background:#fff8e1;border:2px dashed #f59e0b;border-radius:12px;padding:20px;margin:20px 0;text-align:center">',
        '<p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:1px">🔐 Delivery OTP</p>',
        '<div style="margin:8px 0">' + otpDigits + '</div>',
        '<p style="margin:8px 0 0;font-size:12px;color:#92400e">Share this OTP <strong>only</strong> with your delivery partner to confirm receipt.</p>',
        '</div>',
    ].join('') : ''

    const html = [
        '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
        '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
        '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner</h1>',
        '</div>',
        '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
        '<h2 style="margin-top:0">Hi ' + opts.name + ', your order is confirmed!</h2>',
        '<p style="color:#555">Order ID: <strong>#' + opts.orderId.slice(-8).toUpperCase() + '</strong></p>',
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">' + itemRows + '</table>',
        '<div style="background:#f9f9f9;padding:12px;border-radius:8px;margin-top:12px">',
        '<div style="display:flex;justify-content:space-between"><span>Total</span><strong>$' + opts.total.toFixed(2) + '</strong></div>',
        '<div style="color:#888;font-size:13px;margin-top:4px">Payment: ' + opts.paymentMethod + '</div>',
        '</div>',
        otpSection,
        '<p style="margin-top:20px;color:#555">We\'ll notify you when your order is on the way. Thank you for shopping with Pizza Corner! 🌿</p>',
        '</div>',
        '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
        '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
        '</div>',
        '</div>',
    ].join('')

    await transporter.sendMail({
        from:    FROM,
        to:      opts.to,
        subject: '✅ Order Confirmed — #' + opts.orderId.slice(-8).toUpperCase(),
        html,
    })
}

// ─── Order Status Update ──────────────────────────────────────────────────────
export const sendOrderStatusEmail = async (opts: {
    to:      string
    name:    string
    orderId: string
    status:  string
}) => {
    const statusConfig: Record<string, { emoji: string; color: string; message: string }> = {
        Confirmed:          { emoji: '✅', color: '#22c55e', message: 'Your order has been confirmed and is being prepared.' },
        Packed:             { emoji: '📦', color: '#3b82f6', message: 'Your order is packed and ready for pickup by our delivery partner.' },
        'Out for Delivery': { emoji: '🚴', color: '#f97316', message: 'Your order is on the way! Our delivery partner is heading to you.' },
        Delivered:          { emoji: '🎉', color: '#22c55e', message: 'Your order has been delivered. Enjoy your fresh groceries!' },
        Cancelled:          { emoji: '❌', color: '#ef4444', message: 'Your order has been cancelled. Contact support if you have questions.' },
    }

    const cfg = statusConfig[opts.status] ?? { emoji: '📋', color: '#6b7280', message: 'Your order status is now: ' + opts.status }

    const html = [
        '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
        '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
        '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner</h1>',
        '</div>',
        '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
        '<h2 style="margin-top:0">Hi ' + opts.name + '!</h2>',
        '<div style="background:' + cfg.color + '15;border-left:4px solid ' + cfg.color + ';padding:16px;border-radius:8px;margin:16px 0">',
        '<p style="margin:0;font-size:18px">' + cfg.emoji + ' <strong>' + opts.status + '</strong></p>',
        '<p style="margin:8px 0 0;color:#555">' + cfg.message + '</p>',
        '</div>',
        '<p style="color:#888;font-size:13px">Order ID: #' + opts.orderId.slice(-8).toUpperCase() + '</p>',
        '</div>',
        '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
        '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
        '</div>',
        '</div>',
    ].join('')

    await transporter.sendMail({
        from:    FROM,
        to:      opts.to,
        subject: cfg.emoji + ' Order Update — ' + opts.status + ' | #' + opts.orderId.slice(-8).toUpperCase(),
        html,
    })
}

// ─── Low Stock Alert (Admin) ──────────────────────────────────────────────────
export const sendLowStockAlertEmail = async (products: { name: string; stock: number | null }[]) => {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) return

    const rows = products.map(p => [
        '<tr>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0">' + p.name + '</td>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#ef4444;font-weight:bold;text-align:right">' + (p.stock ?? 0) + ' left</td>',
        '</tr>',
    ].join('')).join('')

    const html = [
        '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
        '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
        '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner Admin</h1>',
        '</div>',
        '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
        '<h2 style="margin-top:0;color:#ef4444">⚠️ Low Stock Alert</h2>',
        '<p>The following products are running low and need restocking:</p>',
        '<table style="width:100%;border-collapse:collapse">',
        '<thead><tr style="background:#f9f9f9"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:right">Stock</th></tr></thead>',
        '<tbody>' + rows + '</tbody>',
        '</table>',
        '</div>',
        '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
        '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
        '</div>',
        '</div>',
    ].join('')

    await transporter.sendMail({
        from:    FROM,
        to:      adminEmail,
        subject: '⚠️ Low Stock Alert — ' + products.length + ' product' + (products.length > 1 ? 's' : '') + ' running low',
        html,
    })
}

// ─── Offer Notification Email (to all users) ────────────────────────────────
export const sendOfferNotificationEmail = async (opts: {
    offerLabel: string
    offerDescription?: string
    discountType: string
    discountValue: number
    freeItem: string
    minPurchase: number
    expiresAt: string
}) => {
    const now = new Date()
    const expiryDate = new Date(opts.expiresAt)
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000)

    let offerBadge: string
    let offerDetail: string

    if (opts.discountType === 'percent') {
        offerBadge = `🏷️ ${opts.discountValue}% OFF`
        offerDetail = `Get ${opts.discountValue}% off on orders above ₹${opts.minPurchase}`
    } else if (opts.discountType === 'flat') {
        offerBadge = `💰 ₹${opts.discountValue} OFF`
        offerDetail = `Flat ₹${opts.discountValue} off on orders above ₹${opts.minPurchase}`
    } else if (opts.discountType === 'free_item') {
        offerBadge = "🎁 Free Item"
        offerDetail = opts.freeItem
            ? `Get ${opts.freeItem} free on orders above ₹${opts.minPurchase}`
            : `Free item on orders above ₹${opts.minPurchase}`
    } else {
        offerBadge = "🎉 Special Offer"
        offerDetail = `Save big on orders above ₹${opts.minPurchase}`
    }

    const users = await prisma.user.findMany({
        select: { email: true, name: true },
        where: { email: { not: process.env.ADMIN_EMAIL || '' } },
    })

    for (const user of users) {
        try {
            const html = [
                '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
                '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
                '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner</h1>',
                '</div>',
                '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
                '<h2 style="margin-top:0">Hey ' + user.name + '! 🎉</h2>',
                '<p style="color:#555">We have a special offer just for you!</p>',
                '<div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:2px dashed #f59e0b;border-radius:16px;padding:24px;margin:20px 0;text-align:center">',
                '<div style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:8px">' + offerBadge + '</div>',
                '<div style="font-size:20px;font-weight:bold;color:#1B3022;margin:8px 0">' + opts.offerLabel + '</div>',
                '<p style="color:#6b7280;font-size:14px;margin:8px 0">' + offerDetail + '</p>',
                daysLeft > 0
                    ? '<p style="color:#f97316;font-size:13px;font-weight:600;margin:12px 0 0">⏰ Offer ends in ' + daysLeft + ' day' + (daysLeft > 1 ? 's' : '') + '</p>'
                    : '<p style="color:#ef4444;font-size:13px;font-weight:600;margin:12px 0 0">⏰ Offer ends today!</p>',
                '</div>',
                '<div style="text-align:center;margin:20px 0">',
                '<a href="' + (process.env.CLIENT_URL || 'http://localhost:5173') + '/offers" style="display:inline-block;background:#1B3022;color:#fff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px">🛍️ View Offers</a>',
                '</div>',
                '<p style="color:#888;font-size:12px">Thank you for shopping with Pizza Corner! 🌿</p>',
                '</div>',
                '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
                '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
                '</div>',
                '</div>',
            ].join('')

            await transporter.sendMail({
                from: FROM,
                to: user.email,
                subject: '🎉 New Offer: ' + opts.offerLabel + ' | Pizza Corner',
                html,
            })
        } catch {
            // Silently skip failed emails
        }
    }
}

export const sendCouponNotificationEmail = async (opts: {
    code: string
    description: string
    discountPercent: number
    discountFlat: number
    minPurchase: number
    expiresAt: string
}) => {
    let badge: string
    let detail: string
    if (opts.discountPercent > 0) {
        badge = `🏷️ ${opts.discountPercent}% OFF`
        detail = `Use code ${opts.code} to get ${opts.discountPercent}% off${opts.minPurchase > 0 ? ` on orders above ₹${opts.minPurchase}` : ''}`
    } else if (opts.discountFlat > 0) {
        badge = `💰 ₹${opts.discountFlat} OFF`
        detail = `Use code ${opts.code} to get flat ₹${opts.discountFlat} off${opts.minPurchase > 0 ? ` on orders above ₹${opts.minPurchase}` : ''}`
    } else {
        badge = '🎉 Special Discount'
        detail = `Use code ${opts.code} at checkout${opts.minPurchase > 0 ? ` on orders above ₹${opts.minPurchase}` : ''}`
    }

    const users = await prisma.user.findMany({
        select: { email: true, name: true },
        where: { email: { not: process.env.ADMIN_EMAIL || '' } },
    })

    for (const user of users) {
        try {
            const html = [
                '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
                '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
                '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner</h1>',
                '</div>',
                '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
                '<h2 style="margin-top:0">Hey ' + user.name + '! 🎉</h2>',
                '<p style="color:#555">You have an exclusive coupon waiting for you!</p>',
                '<div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:2px dashed #f59e0b;border-radius:16px;padding:24px;margin:20px 0;text-align:center">',
                '<div style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:8px">' + badge + '</div>',
                '<div style="font-size:28px;font-weight:bold;color:#1B3022;margin:8px 0;letter-spacing:2px">' + opts.code + '</div>',
                '<p style="color:#6b7280;font-size:14px;margin:8px 0">' + detail + '</p>',
                opts.expiresAt
                    ? '<p style="color:#f97316;font-size:13px;font-weight:600;margin:12px 0 0">⏰ Valid until ' + new Date(opts.expiresAt).toLocaleDateString('en-IN') + '</p>'
                    : '',
                '</div>',
                '<div style="text-align:center;margin:20px 0">',
                '<a href="' + (process.env.CLIENT_URL || 'http://localhost:5173') + '/cart" style="display:inline-block;background:#1B3022;color:#fff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px">🛍️ Shop Now</a>',
                '</div>',
                '<p style="color:#888;font-size:12px">Thank you for shopping with Pizza Corner! 🌿</p>',
                '</div>',
                '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
                '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
                '</div>',
                '</div>',
            ].join('')

            await transporter.sendMail({
                from: FROM,
                to: user.email,
                subject: '🎉 Exclusive Coupon: ' + opts.code + ' | Pizza Corner',
                html,
            })
        } catch {
            // Silently skip failed emails
        }
    }
}

// ─── Daily Low Stock Report (Admin) ──────────────────────────────────────────
export const sendDailyStockReportEmail = async (products: { name: string; category: string; stock: number | null }[]) => {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) return

    const rows = products.map(p => [
        '<tr>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0">' + p.name + '</td>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#888">' + p.category + '</td>',
        '<td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#ef4444;font-weight:bold;text-align:right">' + (p.stock ?? 0) + '</td>',
        '</tr>',
    ].join('')).join('')

    const bodyContent = products.length === 0
        ? '<p style="color:#22c55e;font-weight:bold">✅ All products are well stocked!</p>'
        : [
            '<table style="width:100%;border-collapse:collapse">',
            '<thead><tr style="background:#f9f9f9">',
            '<th style="padding:8px;text-align:left">Product</th>',
            '<th style="padding:8px;text-align:left">Category</th>',
            '<th style="padding:8px;text-align:right">Stock</th>',
            '</tr></thead>',
            '<tbody>' + rows + '</tbody>',
            '</table>',
        ].join('')

    const subject = products.length === 0
        ? '✅ Daily Stock Report — All products well stocked'
        : '📊 Daily Stock Report — ' + products.length + ' low-stock item' + (products.length > 1 ? 's' : '')

    const html = [
        '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
        '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
        '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner Admin</h1>',
        '</div>',
        '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
        '<h2 style="margin-top:0">📊 Daily Stock Report</h2>',
        '<p style="color:#555">' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>',
        bodyContent,
        '</div>',
        '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
        '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
        '</div>',
        '</div>',
    ].join('')

    await transporter.sendMail({ from: FROM, to: adminEmail, subject, html })
}


// ─── Login Notification Email ─────────────────────────────────────────────────
export const sendLoginNotificationEmail = async (opts: {
    to:       string
    name:     string
    role:     'user' | 'admin' | 'delivery'
    loginTime: string
    ip?:      string
}) => {
    const roleLabel = opts.role === 'admin' ? '🛡️ Admin' : opts.role === 'delivery' ? '🚴 Delivery Partner' : '👤 User'
    const roleColor = opts.role === 'admin' ? '#f59e0b' : opts.role === 'delivery' ? '#3b82f6' : '#22c55e'

    const html = [
        '<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333">',
        '<div style="background:#1B3022;padding:24px;border-radius:12px 12px 0 0;text-align:center">',
        '<h1 style="color:#fff;margin:0;font-size:22px">🛒 Pizza Corner</h1>',
        '</div>',
        '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
        '<h2 style="margin-top:0">Hi ' + opts.name + '! 👋</h2>',
        '<p style="color:#555">You have successfully logged in to your Pizza Corner account.</p>',
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">',
        '<table style="width:100%;border-collapse:collapse;font-size:14px">',
        '<tr><td style="padding:8px 0;color:#888">Account Type</td><td style="padding:8px 0;text-align:right"><span style="background:' + roleColor + '20;color:' + roleColor + ';padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">' + roleLabel + '</span></td></tr>',
        '<tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;text-align:right;font-weight:500">' + opts.to + '</td></tr>',
        '<tr><td style="padding:8px 0;color:#888">Login Time</td><td style="padding:8px 0;text-align:right;font-weight:500">' + opts.loginTime + '</td></tr>',
        opts.ip ? '<tr><td style="padding:8px 0;color:#888">IP Address</td><td style="padding:8px 0;text-align:right;font-weight:500">' + opts.ip + '</td></tr>' : '',
        '</table>',
        '</div>',
        '<p style="color:#888;font-size:13px">If this wasn\'t you, please change your password immediately or contact support.</p>',
        '</div>',
        '<div style="background:#f5f5f5;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#999">',
        '© ' + new Date().getFullYear() + ' Pizza Corner. All rights reserved.',
        '</div>',
        '</div>',
    ].join('')

    await transporter.sendMail({
        from:    FROM,
        to:      opts.to,
        subject: '🔑 Login Alert — ' + roleLabel + ' | Pizza Corner',
        html,
    })
}
