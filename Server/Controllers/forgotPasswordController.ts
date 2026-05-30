import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { transporter, FROM } from '../Config/mailer.js'

// In-memory OTP store (use Redis in production)
const otpStore: Map<string, { otp: string; expires: number }> = new Map()

const generateOtp = () => crypto.randomInt(100000, 999999).toString()

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' })
            return
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            // Don't reveal if email exists
            res.status(200).json({ success: true, message: 'If this email exists, an OTP has been sent' })
            return
        }

        const otp = generateOtp()
        otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }) // 10 min expiry

        // Send OTP email
        await transporter.sendMail({
            from: FROM,
            to: email,
            subject: '🔐 Password Reset OTP — Pizza Corner',
            html: [
                '<div style="font-family:sans-serif;max-width:480px;margin:auto;color:#333">',
                '<div style="background:#1B3022;padding:20px;border-radius:12px 12px 0 0;text-align:center">',
                '<h1 style="color:#fff;margin:0;font-size:20px">🛒 Pizza Corner</h1>',
                '</div>',
                '<div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none">',
                '<h2 style="margin-top:0">Password Reset</h2>',
                '<p style="color:#555">Use this OTP to reset your password:</p>',
                '<div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:12px;padding:20px;text-align:center;margin:20px 0">',
                '<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1B3022;margin:0">' + otp + '</p>',
                '</div>',
                '<p style="color:#888;font-size:13px">This OTP expires in 10 minutes. Do not share it with anyone.</p>',
                '</div>',
                '<div style="background:#f5f5f5;padding:12px;border-radius:0 0 12px 12px;text-align:center;font-size:11px;color:#999">',
                '© ' + new Date().getFullYear() + ' Pizza Corner',
                '</div>',
                '</div>',
            ].join(''),
        })

        res.status(200).json({ success: true, message: 'OTP sent to your email' })
    } catch (error) {
        console.error('Forgot password error:', error)
        res.status(500).json({ success: false, message: 'Failed to send OTP' })
    }
}

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            res.status(400).json({ success: false, message: 'Email and OTP are required' })
            return
        }

        const stored = otpStore.get(email)
        if (!stored) {
            res.status(400).json({ success: false, message: 'No OTP found. Request a new one.' })
            return
        }

        if (Date.now() > stored.expires) {
            otpStore.delete(email)
            res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' })
            return
        }

        if (stored.otp !== String(otp)) {
            res.status(400).json({ success: false, message: 'Invalid OTP' })
            return
        }

        res.status(200).json({ success: true, message: 'OTP verified' })
    } catch (error) {
        console.error('Verify OTP error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body
        if (!email || !otp || !newPassword) {
            res.status(400).json({ success: false, message: 'Email, OTP and new password are required' })
            return
        }

        if (newPassword.length < 6) {
            res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
            return
        }

        const stored = otpStore.get(email)
        if (!stored || stored.otp !== String(otp) || Date.now() > stored.expires) {
            res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
            return
        }

        const hashed = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({ where: { email }, data: { password: hashed } })

        otpStore.delete(email)

        res.status(200).json({ success: true, message: 'Password reset successfully' })
    } catch (error) {
        console.error('Reset password error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
