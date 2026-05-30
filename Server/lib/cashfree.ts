import { Cashfree, CFEnvironment } from 'cashfree-pg'

export type CashfreeMode = 'production' | 'sandbox'

export const getCashfreeMode = (): CashfreeMode =>
    process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production'

let client: Cashfree | null = null

export const getCashfreeClient = (): Cashfree => {
    if (!client) {
        const mode = getCashfreeMode()
        client = new Cashfree(
            mode === 'sandbox' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION,
            process.env.CASHFREE_APP_ID!,
            process.env.CASHFREE_SECRET_KEY!
        )
    }
    return client
}

export const extractPaymentSessionId = (data: Record<string, unknown> | undefined | null): string | null => {
    if (!data) return null
    const id = data.payment_session_id ?? data.paymentSessionId
    return typeof id === 'string' && id.length > 0 ? id : null
}
