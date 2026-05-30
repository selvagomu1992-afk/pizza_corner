import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

interface HeroSlide {
  type: 'image' | 'video'
  image: string
  videoUrl?: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
  order: number
}

interface HeroBadge {
  enabled: boolean
  text: string
  bgColor: string
  textColor: string
}

interface Settings {
  companyName: string
  logo: string
  heroEffect: string
  heroBadge: HeroBadge
  heroSlides: HeroSlide[]
}

const EFFECTS = [
  { value: 'fade', label: 'Fade', desc: 'Cross-fade between slides' },
  { value: 'slide-right', label: 'Slide Right', desc: 'Slides enter from right' },
  { value: 'slide-left', label: 'Slide Left', desc: 'Slides enter from left' },
  { value: 'zoom', label: 'Zoom', desc: 'Zoom-in transition' },
  { value: 'slide-up', label: 'Slide Up', desc: 'Slides enter from bottom' },
]

export default function AdminBranding() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    companyName: 'Pizza Corner',
    logo: '',
    heroEffect: 'fade',
    heroBadge: { enabled: false, text: '', bgColor: '#d97706', textColor: '#ffffff' },
    heroSlides: [],
  })
  const [previewSlide, setPreviewSlide] = useState(0)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const slideInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post('/upload/image?folder=pizzacorner/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success) {
        setSettings((s) => ({ ...s, logo: res.data.url }))
        toast.success('Logo uploaded')
      }
    } catch {
      toast.error('Logo upload failed')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleSlideUpload = async (i: number, file: File, type: 'image' | 'video') => {
    const fd = new FormData()
    fd.append(type === 'image' ? 'image' : 'video', file)
    try {
      const endpoint = type === 'image' ? '/upload/image' : '/upload/video'
      const res = await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success) {
        const field = type === 'image' ? 'image' : 'videoUrl'
        updateSlide(i, field, res.data.url)
        toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded`)
      }
    } catch {
      toast.error(`${type === 'image' ? 'Image' : 'Video'} upload failed`)
    }
    if (slideInputRefs.current[i]) slideInputRefs.current[i]!.value = ''
  }

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      if (res.data.success) {
        const s = res.data.settings as Settings
        if (!s.heroSlides?.length) {
          s.heroSlides = [
            { image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200', title: 'Fresh Pizza, Delivered Hot', subtitle: 'Artisan pizzas made with fresh ingredients. Order online and track in real-time.', ctaText: 'Order Now', ctaLink: '/products', order: 0, type: 'image' },
            { image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200', title: 'Weekend Special Deals', subtitle: 'Buy 1 Get 1 Free on all large pizzas. Offer ends today!', ctaText: 'Grab Deal', ctaLink: '/products', order: 1, type: 'image' },
            { image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200', title: 'New: Classic Burgers', subtitle: 'Juicy grilled burgers with our signature sauce. Try one today!', ctaText: 'Explore Burgers', ctaLink: '/products?category=Burger', order: 2, type: 'image' },
            { image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200', title: 'Family Feast Deals', subtitle: 'Feeding a crowd? Our family combos start at just ₹499.', ctaText: 'View Combos', ctaLink: '/products', order: 3, type: 'image' },
            { image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200', title: 'Chilled Beverages', subtitle: 'Pair your meal with refreshing drinks. Free delivery on orders above ₹299.', ctaText: 'Order Now', ctaLink: '/products?category=Beverages', order: 4, type: 'image' },
          ]
        }
        setSettings(s)
      }
    }).catch(() => toast.error('Failed to load settings'))
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!settings.heroSlides.length) return
    const timer = setInterval(() => {
      setPreviewSlide((prev) => (prev + 1) % settings.heroSlides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [settings.heroSlides.length])

  const addSlide = () => {
    setSettings((s) => ({
      ...s,
      heroSlides: [
        ...s.heroSlides,
        { image: '', title: '', subtitle: '', ctaText: 'Order Now', ctaLink: '/products', order: s.heroSlides.length, type: 'image' },
      ],
    }))
  }

  const addSampleSlides = () => {
    setSettings((s) => ({
      ...s,
      heroSlides: [
        { image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200', title: 'Fresh Pizza, Delivered Hot', subtitle: 'Artisan pizzas made with fresh ingredients. Order online and track in real-time.', ctaText: 'Order Now', ctaLink: '/products', order: 0, type: 'image' },
        { image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200', title: 'Weekend Special Deals', subtitle: 'Buy 1 Get 1 Free on all large pizzas. Offer ends today!', ctaText: 'Grab Deal', ctaLink: '/products', order: 1, type: 'image' },
        { image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200', title: 'New: Classic Burgers', subtitle: 'Juicy grilled burgers with our signature sauce. Try one today!', ctaText: 'Explore Burgers', ctaLink: '/products?category=Burger', order: 2, type: 'image' },
        { image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200', title: 'Family Feast Deals', subtitle: 'Feeding a crowd? Our family combos start at just ₹499.', ctaText: 'View Combos', ctaLink: '/products', order: 3, type: 'image' },
        { image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200', title: 'Chilled Beverages', subtitle: 'Pair your meal with refreshing drinks. Free delivery on orders above ₹299.', ctaText: 'Order Now', ctaLink: '/products?category=Beverages', order: 4, type: 'image' },
      ],
    }))
  }

  const removeSlide = (i: number) => {
    setSettings((s) => ({
      ...s,
      heroSlides: s.heroSlides.filter((_, idx) => idx !== i).map((slide, idx) => ({ ...slide, order: idx })),
    }))
  }

  const moveSlide = (i: number, dir: 'up' | 'down') => {
    setSettings((s) => {
      const slides = [...s.heroSlides]
      const target = dir === 'up' ? i - 1 : i + 1
      if (target < 0 || target >= slides.length) return s
      ;[slides[i], slides[target]] = [slides[target], slides[i]]
      return { ...s, heroSlides: slides.map((slide, idx) => ({ ...slide, order: idx })) }
    })
  }

  const updateSlide = (i: number, field: keyof HeroSlide, value: string) => {
    setSettings((s) => {
      const slides = [...s.heroSlides]
      slides[i] = { ...slides[i], [field]: field === 'type' ? (value as 'image' | 'video') : value }
      return { ...s, heroSlides: slides }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.patch('/admin/settings', settings)
      if (res.data.success) {
        setSettings(res.data.settings)
        toast.success('Settings saved')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const { heroSlides, heroEffect } = settings

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Branding & Hero Carousel</h1>

      {/* ─── Company Name ────────────────────────────────── */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Company Name</h2>
        <input
          type="text"
          value={settings.companyName}
          onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </section>

      {/* ─── Logo ───────────────────────────────────────── */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Logo</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={settings.logo}
            onChange={(e) => setSettings((s) => ({ ...s, logo: e.target.value }))}
            placeholder="https://example.com/logo.png"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <div>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} hidden />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {uploadingLogo ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
        {settings.logo && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
            <img src={settings.logo} alt="" className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=!' }} />
            <span className="text-sm text-stone-500">Preview</span>
          </div>
        )}
      </section>

      {/* ─── Hero Badge ─────────────────────────────── */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Session Badge</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={settings.heroBadge.enabled} onChange={(e) => setSettings((s) => ({ ...s, heroBadge: { ...s.heroBadge, enabled: e.target.checked } }))} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-4">Animated scrolling banner above the hero carousel for seasonal greetings (IPL, New Year, Pongal, Diwali, etc.)</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Badge Text</label>
            <input type="text" value={settings.heroBadge.text} onChange={(e) => setSettings((s) => ({ ...s, heroBadge: { ...s.heroBadge, text: e.target.value } }))}
              placeholder="e.g. 🎉 Happy Diwali! Flat 20% OFF on all orders"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Background Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={settings.heroBadge.bgColor} onChange={(e) => setSettings((s) => ({ ...s, heroBadge: { ...s.heroBadge, bgColor: e.target.value } }))} className="w-10 h-8 border border-gray-300 rounded cursor-pointer" />
                <input type="text" value={settings.heroBadge.bgColor} onChange={(e) => setSettings((s) => ({ ...s, heroBadge: { ...s.heroBadge, bgColor: e.target.value } }))} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Text Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={settings.heroBadge.textColor} onChange={(e) => setSettings((s) => ({ ...s, heroBadge: { ...s.heroBadge, textColor: e.target.value } }))} className="w-10 h-8 border border-gray-300 rounded cursor-pointer" />
                <input type="text" value={settings.heroBadge.textColor} onChange={(e) => setSettings((s) => ({ ...s, heroBadge: { ...s.heroBadge, textColor: e.target.value } }))} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
              </div>
            </div>
          </div>
          {settings.heroBadge.enabled && settings.heroBadge.text && (
            <div className="mt-2 p-3 rounded-lg overflow-hidden" style={{ backgroundColor: settings.heroBadge.bgColor }}>
              <div className="whitespace-nowrap animate-marquee" style={{ color: settings.heroBadge.textColor }}>
                <span className="text-sm font-semibold">{settings.heroBadge.text}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Carousel Effect ────────────────────────────── */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Carousel Effect</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {EFFECTS.map((eff) => (
            <button
              key={eff.value}
              onClick={() => setSettings((s) => ({ ...s, heroEffect: eff.value }))}
              className={`p-3 rounded-lg border text-left transition ${
                heroEffect === eff.value
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-semibold text-gray-800">{eff.label}</div>
              <div className="text-xs text-gray-500 mt-1">{eff.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Carousel Preview ────────────────────────────── */}
      {heroSlides.length > 0 && (
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-lg font-semibold p-6 pb-0">Live Preview</h2>
          <div className="relative h-56 sm:h-72 overflow-hidden">
            {heroSlides.map((slide, i) => (
              <div
                key={i}
                className={`absolute inset-0 ${getEffectClass(heroEffect, i === previewSlide)}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10" />
                {slide.type === 'video' && slide.videoUrl ? (
                  <video src={slide.videoUrl} autoPlay muted loop className="w-full h-full object-cover" />
                ) : (
                  <img src={slide.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x600?text=No+Image' }} />
                )}
                <div className="absolute inset-0 z-20 flex items-center p-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{slide.title}</h3>
                    <p className="text-sm text-gray-200 mb-3 max-w-md">{slide.subtitle}</p>
                    <Link to={slide.ctaLink} className="inline-block bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold">{slide.ctaText}</Link>
                  </div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
              <button onClick={() => setPreviewSlide((p) => (p - 1 + heroSlides.length) % heroSlides.length)} className="text-white/70 hover:text-white text-lg">◀</button>
              <div className="flex gap-1.5">
                {heroSlides.map((_, i) => (
                  <button key={i} onClick={() => setPreviewSlide(i)} className={`w-2.5 h-2.5 rounded-full transition ${i === previewSlide ? 'bg-amber-500' : 'bg-white/50'}`} />
                ))}
              </div>
              <button onClick={() => setPreviewSlide((p) => (p + 1) % heroSlides.length)} className="text-white/70 hover:text-white text-lg">▶</button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Hero Slides Editor ──────────────────────────── */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Slides ({heroSlides.length}/5)</h2>
          <div className="flex gap-2">
            <button onClick={addSampleSlides} className="px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 border border-stone-300">
              Add 5 Sample
            </button>
            <button onClick={addSlide} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
              + Add Slide
            </button>
          </div>
        </div>

        {heroSlides.length === 0 && (
          <p className="text-gray-400 text-sm">No slides yet. Click "Add Slide" to create one.</p>
        )}

        <div className="space-y-3">
          {heroSlides.map((slide, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slide {i + 1}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveSlide(i, 'up')} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1" title="Move up">▲</button>
                  <button onClick={() => moveSlide(i, 'down')} disabled={i === heroSlides.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1" title="Move down">▼</button>
                  <button onClick={() => removeSlide(i)} className="text-red-400 hover:text-red-600 px-1" title="Remove">✕</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex gap-2 items-center">
                  <button onClick={() => updateSlide(i, 'type', 'image')}
                    className={`px-3 py-1 text-xs rounded font-medium ${slide.type === 'image' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>Image</button>
                  <button onClick={() => updateSlide(i, 'type', 'video')}
                    className={`px-3 py-1 text-xs rounded font-medium ${slide.type === 'video' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>Video</button>
                </div>
                {slide.type === 'image' ? (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Image URL</label>
                    <div className="flex gap-2">
                      <input type="text" value={slide.image} onChange={(e) => updateSlide(i, 'image', e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                      <input type="file" accept="image/*" ref={(el) => slideInputRefs.current[i] = el} onChange={(e) => e.target.files?.[0] && handleSlideUpload(i, e.target.files[0], 'image')} className="hidden" />
                      <button onClick={() => slideInputRefs.current[i]?.click()} className="px-2 py-1.5 bg-stone-100 text-stone-600 text-sm rounded border border-stone-300 hover:bg-stone-200">Upload</button>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Video URL (MP4/WebM)</label>
                    <div className="flex gap-2">
                      <input type="text" value={slide.videoUrl || ''} onChange={(e) => updateSlide(i, 'videoUrl', e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="https://example.com/video.mp4" />
                      <input type="file" accept="video/*" ref={(el) => slideInputRefs.current[i] = el} onChange={(e) => e.target.files?.[0] && handleSlideUpload(i, e.target.files[0], 'video')} className="hidden" />
                      <button onClick={() => slideInputRefs.current[i]?.click()} className="px-2 py-1.5 bg-stone-100 text-stone-600 text-sm rounded border border-stone-300 hover:bg-stone-200">Upload</button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <input type="text" value={slide.title} onChange={(e) => updateSlide(i, 'title', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
                  <input type="text" value={slide.subtitle} onChange={(e) => updateSlide(i, 'subtitle', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CTA Text</label>
                  <input type="text" value={slide.ctaText} onChange={(e) => updateSlide(i, 'ctaText', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CTA Link</label>
                  <input type="text" value={slide.ctaLink} onChange={(e) => updateSlide(i, 'ctaLink', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                {slide.type === 'video' && slide.videoUrl ? (
                  <div className="col-span-2">
                    <video src={slide.videoUrl} className="h-20 w-full object-cover rounded" />
                  </div>
                ) : slide.image ? (
                  <div className="col-span-2">
                    <img src={slide.image} alt="" className="h-20 w-full object-cover rounded" onError={(e) => { (e.currentTarget).style.display = 'none' }} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Save ────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}

function getEffectClass(effect: string, isActive: boolean): string {
  const base = 'transition-all duration-700'
  if (isActive) {
    switch (effect) {
      case 'fade': return `${base} opacity-100`
      case 'slide-right': return `${base} translate-x-0`
      case 'slide-left': return `${base} translate-x-0`
      case 'zoom': return `${base} opacity-100 scale-100`
      case 'slide-up': return `${base} translate-y-0`
      default: return `${base} opacity-100`
    }
  } else {
    switch (effect) {
      case 'fade': return `${base} opacity-0`
      case 'slide-right': return `${base} translate-x-full`
      case 'slide-left': return `${base} -translate-x-full`
      case 'zoom': return `${base} opacity-0 scale-75`
      case 'slide-up': return `${base} translate-y-full`
      default: return `${base} opacity-0`
    }
  }
}
