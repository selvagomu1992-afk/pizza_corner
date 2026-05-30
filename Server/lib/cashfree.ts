import { Cashfree, CFEnvironment } from 'cashfree-pg'

export type CashfreeMode = 'production' | 'sandbox'

export const getCashfreeMode = (): CashfreeMode =>
    process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production'

let client: Cashfree | null = null

export const getCashfreeClient = (): Cashfree => {
    if (!client) {
        const appId = process.env.CASHFREE_APP_ID
        const secretKey = process.env.CASHFREE_SECRET_KEY
        if (!appId || !secretKey) {
            throw new Error('CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be set in environment variables')
        }
        const mode = getCashfreeMode()
        client = new Cashfree(
            mode === 'sandbox' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION,
            appId,
            secretKey
        )
    }
    return client
}

export const extractPaymentSessionId = (data: Record<string, unknown> | undefined | null): string | null => {
    if (!data) return null
    const id = data.payment_session_id ?? data.paymentSessionId
    return typeof id === 'string' && id.length > 0 ? id : null
}
