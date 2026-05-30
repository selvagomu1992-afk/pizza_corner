import { useEffect, useState } from 'react'
import api from '../api/client'

interface HeroBadge {
  enabled: boolean
  text: string
  bgColor: string
  textColor: string
}

interface HeroSlide {
  type?: 'image' | 'video'
  image: string
  videoUrl?: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
  order: number
}

export interface PublicSettings {
  companyName: string
  logo: string
  heroEffect: string
  heroBadge: HeroBadge
  heroSlides: HeroSlide[]
}

let cached: PublicSettings | null = null
let cachePromise: Promise<PublicSettings> | null = null

const DEFAULTS: PublicSettings = {
  companyName: 'Pizza Corner',
  logo: '',
  heroEffect: 'fade',
  heroBadge: { enabled: false, text: '', bgColor: '#d97706', textColor: '#ffffff' },
  heroSlides: [],
}

function fetchSettings(): Promise<PublicSettings> {
  if (cached) return Promise.resolve(cached)
  if (cachePromise) return cachePromise
  cachePromise = api.get('/settings/public').then((res) => {
    cached = res.data.settings as PublicSettings
    return cached!
  }).catch(() => {
    cached = DEFAULTS
    return cached!
  })
  return cachePromise
}

export default function useSettings() {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  return { settings, loaded }
}