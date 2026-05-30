import { Request, Response } from 'express'
import { prisma } from '../Config/prisma.js'

const DEFAULTS = {
  companyName: 'Pizza Corner',
  logo: '',
  heroEffect: 'fade',
  heroBadge: { enabled: false, text: '', bgColor: '#d97706', textColor: '#ffffff' },
  heroSlides: [
    {
      type: 'image',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200',
      title: 'Fresh Pizza, Delivered Hot',
      subtitle: 'Artisan pizzas made with fresh ingredients. Order online and track in real-time.',
      ctaText: 'Order Now',
      ctaLink: '/products',
      order: 0,
    },
    {
      type: 'image',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
      title: 'Weekend Special Deals',
      subtitle: 'Buy 1 Get 1 Free on all large pizzas. Offer ends today!',
      ctaText: 'Grab Deal',
      ctaLink: '/products',
      order: 1,
    },
    {
      type: 'image',
      image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200',
      title: 'New: Classic Burgers',
      subtitle: 'Juicy grilled burgers with our signature sauce. Try one today!',
      ctaText: 'Explore Burgers',
      ctaLink: '/products?category=Burger',
      order: 2,
    },
    {
      type: 'image',
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200',
      title: 'Family Feast Deals',
      subtitle: 'Feeding a crowd? Our family combos start at just ₹499.',
      ctaText: 'View Combos',
      ctaLink: '/products',
      order: 3,
    },
    {
      type: 'image',
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200',
      title: 'Chilled Beverages',
      subtitle: 'Pair your meal with refreshing drinks. Free delivery on orders above ₹299.',
      ctaText: 'Order Now',
      ctaLink: '/products?category=Beverages',
      order: 4,
    },
  ],
}

const getSettingsValue = async (key: string, fallback: unknown) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key } })
    return row?.value ?? fallback
  } catch {
    return fallback
  }
}

const upsertSetting = async (key: string, value: unknown) => {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  })
}

// ─── GET /api/admin/settings ───────────────────────────────────────────────────
export const getSettings = async (_req: Request, res: Response) => {
  try {
    const [companyName, logo, heroEffect, heroBadge, heroSlides] = await Promise.all([
      getSettingsValue('companyName', DEFAULTS.companyName),
      getSettingsValue('logo', DEFAULTS.logo),
      getSettingsValue('heroEffect', DEFAULTS.heroEffect),
      getSettingsValue('heroBadge', DEFAULTS.heroBadge),
      getSettingsValue('heroSlides', DEFAULTS.heroSlides),
    ])
    res.json({ success: true, settings: { companyName, logo, heroEffect, heroBadge, heroSlides } })
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ─── PATCH /api/admin/settings ─────────────────────────────────────────────────
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { companyName, logo, heroEffect, heroBadge, heroSlides } = req.body
    if (companyName !== undefined) await upsertSetting('companyName', companyName)
    if (logo !== undefined) await upsertSetting('logo', logo)
    if (heroEffect !== undefined) await upsertSetting('heroEffect', heroEffect)
    if (heroBadge !== undefined) await upsertSetting('heroBadge', heroBadge)
    if (heroSlides !== undefined) await upsertSetting('heroSlides', heroSlides)
    const [updatedName, updatedLogo, updatedEffect, updatedBadge, updatedSlides] = await Promise.all([
      getSettingsValue('companyName', DEFAULTS.companyName),
      getSettingsValue('logo', DEFAULTS.logo),
      getSettingsValue('heroEffect', DEFAULTS.heroEffect),
      getSettingsValue('heroBadge', DEFAULTS.heroBadge),
      getSettingsValue('heroSlides', DEFAULTS.heroSlides),
    ])
    res.json({ success: true, message: 'Settings updated', settings: { companyName: updatedName, logo: updatedLogo, heroEffect: updatedEffect, heroBadge: updatedBadge, heroSlides: updatedSlides } })
  } catch (error) {
    console.error('Update settings error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ─── GET /api/settings/public ──────────────────────────────────────────────────
export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const [companyName, logo, heroEffect, heroBadge, heroSlides] = await Promise.all([
      getSettingsValue('companyName', DEFAULTS.companyName),
      getSettingsValue('logo', DEFAULTS.logo),
      getSettingsValue('heroEffect', DEFAULTS.heroEffect),
      getSettingsValue('heroBadge', DEFAULTS.heroBadge),
      getSettingsValue('heroSlides', DEFAULTS.heroSlides),
    ])
    res.json({ success: true, settings: { companyName, logo, heroEffect, heroBadge, heroSlides } })
  } catch (error) {
    console.error('Get public settings error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
