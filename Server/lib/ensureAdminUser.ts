import bcrypt from 'bcrypt'
import { prisma } from '../Config/prisma.js'

const adminEmail = () => process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'
const adminPassword = () => process.env.ADMIN_PASSWORD || 'admin123'

/** Find or create the admin User row (required for orders FK). */
export const ensureAdminUserInDb = async (): Promise<{ id: string; name: string; email: string; phone: string | null }> => {
    const email = adminEmail()

    let user = await prisma.user.findFirst({
        where: { OR: [{ isAdmin: true }, { email }] },
        select: { id: true, name: true, email: true, phone: true, isAdmin: true },
    })

    if (user && !user.isAdmin) {
        user = await prisma.user.update({
            where: { id: user.id },
            data:  { isAdmin: true },
            select: { id: true, name: true, email: true, phone: true, isAdmin: true },
        })
    }

    if (!user) {
        const hashed = await bcrypt.hash(adminPassword(), 10)
        user = await prisma.user.create({
            data: {
                name:     'Admin',
                email,
                password: hashed,
                phone:    '',
                isAdmin:  true,
            },
            select: { id: true, name: true, email: true, phone: true, isAdmin: true },
        })
    }

    return { id: user.id, name: user.name, email: user.email, phone: user.phone }
}

export const resolveAdminUserId = async (tokenUserId?: string, tokenEmail?: string): Promise<string> => {
    const email = adminEmail()

    if (tokenUserId && tokenUserId !== 'admin') {
        const existing = await prisma.user.findUnique({
            where:  { id: tokenUserId },
            select: { id: true, isAdmin: true, email: true },
        })
        if (existing && (existing.isAdmin || existing.email === email)) {
            return existing.id
        }
    }

    const admin = await ensureAdminUserInDb()
    return admin.id
}

export const userIsAdmin = (u: { isAdmin?: boolean; email?: string }) =>
    u.isAdmin === true || u.email === adminEmail()
