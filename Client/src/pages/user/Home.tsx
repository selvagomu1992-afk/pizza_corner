import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

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

interface HeroBadge {
  enabled: boolean
  text: string
  bgColor: string
  textColor: string
}

interface Settings {
  companyName: string
  heroEffect: string
  heroBadge: HeroBadge
  heroSlides: HeroSlide[]
}

interface CategoryCard {
  id: string
  name: string
  image: string
}

function effectClasses(effect: string, isActive: boolean): string {
  const base = 'absolute inset-0 transition-all duration-700'
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

const SAMPLE_SLIDES = [
  { image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200', title: 'Fresh Pizza, Delivered Hot', subtitle: 'Artisan pizzas made with fresh ingredients. Order online and track in real-time.', ctaText: 'Order Now', ctaLink: '/products', order: 0, type: 'image' as const },
  { image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200', title: 'Weekend Special Deals', subtitle: 'Buy 1 Get 1 Free on all large pizzas. Offer ends today!', ctaText: 'Grab Deal', ctaLink: '/products', order: 1, type: 'image' as const },
  { image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200', title: 'New: Classic Burgers', subtitle: 'Juicy grilled burgers with our signature sauce. Try one today!', ctaText: 'Explore Burgers', ctaLink: '/products?category=Burger', order: 2, type: 'image' as const },
  { image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200', title: 'Family Feast Deals', subtitle: 'Feeding a crowd? Our family combos start at just ₹499.', ctaText: 'View Combos', ctaLink: '/products', order: 3, type: 'image' as const },
  { image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200', title: 'Chilled Beverages', subtitle: 'Pair your meal with refreshing drinks. Free delivery on orders above ₹299.', ctaText: 'Order Now', ctaLink: '/products?category=Beverages', order: 4, type: 'image' as const },
]

const defaultCategories: CategoryCard[] = [
  { id: 'pizza', name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
  { id: 'burger', name: 'Burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  { id: 'pasta', name: 'Pasta', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400' },
  { id: 'sandwich', name: 'Sandwich', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400' },
  { id: 'fries', name: 'Fries', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400' },
  { id: 'beverages', name: 'Beverages', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400' },
  { id: 'salad', name: 'Salad', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
  { id: 'desserts', name: 'Desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
  { id: 'biryani', name: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
  { id: 'momos', name: 'Momos', image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400' },
]

const Home = () => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [categories, setCategories] = useState<CategoryCard[]>([])
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
  const markBroken = (id: string) => setBrokenImages(prev => new Set(prev).add(id))

  useEffect(() => {
    api.get('/settings/public').then(({ data }) => {
      if (data.success && data.settings?.heroSlides?.length) setSettings(data.settings)
    }).catch(() => {})
    api.get('/categories').then(({ data }) => {
      if (data.success) setCategories(data.categories)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const len = settings?.heroSlides?.length ?? SAMPLE_SLIDES.length
    if (!len) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % len)
    }, 5000)
    return () => clearInterval(timer)
  }, [settings])

  const slides = settings?.heroSlides?.length ? settings.heroSlides : SAMPLE_SLIDES
  const effect = settings?.heroEffect ?? 'fade'
  const displayCats = categories.length > 0 ? categories : []

  return (
    <div>
      {/* ─── Hero Badge ────────────────────────────────── */}
      {settings?.heroBadge?.enabled && settings?.heroBadge?.text && (
        <div className="w-[90%] mx-auto mt-6 mb-0 overflow-hidden rounded-lg" style={{ backgroundColor: settings.heroBadge.bgColor }}>
          <div className="whitespace-nowrap animate-marquee py-2" style={{ color: settings.heroBadge.textColor }}>
            <span className="text-sm md:text-base font-semibold px-4">{settings.heroBadge.text}</span>
          </div>
        </div>
      )}

      {/* ─── Hero Carousel ──────────────────────────────── */}
      {slides.length > 0 ? (
        <section className="relative w-[90%] mx-auto h-[30vh] md:h-[45vh] min-h-[200px] md:min-h-[280px] overflow-hidden rounded-2xl my-10">

          {slides.map((slide, i) => (
            <div key={i} className={effectClasses(effect, i === currentSlide)}>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10" />
              {slide.type === 'video' && slide.videoUrl ? (
                <video src={slide.videoUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={slide.image} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 z-20 flex items-center">
                <div className="max-w-7xl mx-auto px-4 w-full">
                  <h1 className="text-2xl md:text-5xl font-bold text-white mb-2 md:mb-4 max-w-xl">{slide.title}</h1>
                  <p className="text-sm md:text-lg text-gray-200 mb-4 md:mb-8 max-w-lg">{slide.subtitle}</p>
                  <Link to={slide.ctaLink} className="inline-block bg-amber-600 text-white px-5 py-2 md:px-8 md:py-3 rounded-full font-semibold hover:bg-amber-700 shadow-lg text-sm md:text-base">
                    {slide.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`w-3 h-3 rounded-full transition ${i === currentSlide ? 'bg-amber-500' : 'bg-white/50'}`} />
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-gradient-to-br from-amber-50 to-orange-100 py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold text-stone-800 mb-4">
              {settings?.companyName || 'Fresh Pizza'}, Delivered Hot
            </h1>
            <p className="text-lg text-stone-600 mb-8 max-w-2xl mx-auto">
              Artisan pizzas made with fresh ingredients. Order online and track your delivery in real-time.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/products" className="bg-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-amber-700 shadow-lg">
                Order Now
              </Link>
              <Link to="/products?category=Pizza" className="bg-white text-amber-700 px-8 py-3 rounded-full font-semibold hover:bg-stone-50 border border-amber-200">
                View Menu
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Rotating Food Images ──────────────────────────────── */}
      <section className="py-12 overflow-hidden bg-gradient-to-b from-amber-50/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-8 text-center">Our Specialties</h2>
          <div className="flex justify-center items-center gap-6 md:gap-12 flex-wrap">
            {[
              { img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300', label: 'Pizza', link: '/products?category=Pizza' },
              { img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', label: 'Burger', link: '/products?category=Burger' },
              { img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300', label: 'Pasta', link: '/products?category=Pasta' },
              { img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300', label: 'Fries', link: '/products?category=Fries' },
              { img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300', label: 'Beverages', link: '/products?category=Beverages' },
              { img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300', label: 'Salad', link: '/products?category=Salad' },
              { img: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=300', label: 'Sandwich', link: '/products?category=Sandwich' },
              { img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300', label: 'Desserts', link: '/products?category=Desserts' },
            ].map((item, i) => (
              <Link to={item.link} key={i} className="flex flex-col items-center gap-2 group">
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-amber-200 shadow-lg group-hover:border-amber-500 group-hover:shadow-xl transition-all duration-300"
                  style={{ animation: `spin 8s linear infinite`, animationDelay: `${i * -1}s` }}
                >
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover" style={{ animation: `counter-spin 8s linear infinite`, animationDelay: `${i * -1}s` }} />
                </div>
                <span className="text-sm font-semibold text-stone-700 group-hover:text-amber-600 transition-colors">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes counter-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
        `}</style>
      </section>

      {/* ─── Category Cards ──────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-stone-800 mb-8 text-center">Our Menu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {(displayCats.length > 0 ? displayCats : defaultCategories).map((cat) => (
            <Link key={cat.id} to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col">
              <div className="h-40 bg-stone-100 flex items-center justify-center overflow-hidden">
                {cat.image && !brokenImages.has(cat.id) ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    onError={() => markBroken(cat.id)} />
                ) : (
                  <span className="text-stone-300 text-4xl font-bold">{cat.name[0]}</span>
                )}
              </div>
              <div className="p-3 text-center flex items-center justify-center flex-1">
                <h3 className="font-bold text-stone-800 text-sm leading-tight group-hover:text-amber-600 transition-colors">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/products" className="inline-block bg-amber-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-amber-700 transition shadow-md">
            View Full Menu &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
