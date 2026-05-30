import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import {
    HomeIcon, GiftIcon, TruckIcon, PercentIcon, PackageIcon, ShoppingBagIcon,
    ClockIcon, ShoppingCartIcon, CheckCircleIcon, ChevronRightIcon
} from "lucide-react"
import { getActiveOffers, type Offer } from "../admin/AdminOffers"
import { useCart } from "../../Context/CartContext"

// ── Countdown hook keyed to an absolute expiry timestamp ──────────────────────
const useCountdownTo = (isoExpiry: string) => {
    const calc = useCallback(() => {
        const diff = Math.max(0, Math.floor((new Date(isoExpiry).getTime() - Date.now()) / 1000))
        const d = Math.floor(diff / 86400)
        const h = Math.floor((diff % 86400) / 3600)
        const m = Math.floor((diff % 3600) / 60)
        const s = diff % 60
        return { d, h, m, s, total: diff }
    }, [isoExpiry])

    const [time, setTime] = useState(calc)

    useEffect(() => {
        if (time.total === 0) return
        const id = setInterval(() => setTime(calc()), 1000)
        return () => clearInterval(id)
    }, [calc, time.total])

    return time
}

const getOfferType = (o: Offer): string => {
    if (o.discountType === "free_item") return "free_items"
    return o.discountType === "percent" ? "percent" : "flat"
}

// ── Single offer card with live countdown ─────────────────────────────────────
const OfferCard = ({ offer }: { offer: Offer }) => {
    const time = useCountdownTo(offer.endDate)
    const type = getOfferType(offer)
    const isFlat = type === "flat"
    const isFreeItems = type === "free_items"
    const isPercent = type === "percent"
    const pad = (n: number) => String(n).padStart(2, "0")

    const scheme = isPercent ? "orange" : isFlat ? "blue" : "purple"

    const borderColor = scheme === "blue" ? "border-blue-200" : scheme === "purple" ? "border-purple-200" : "border-orange-200"
    const bgGrad = scheme === "blue" ? "from-blue-50" : scheme === "purple" ? "from-purple-50" : "from-orange-50"
    const circleBg = scheme === "blue" ? "bg-blue-400" : scheme === "purple" ? "bg-purple-400" : "bg-amber-400"
    const badgeBg = scheme === "blue" ? "bg-blue-100 text-blue-700" : scheme === "purple" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
    const timerBg = scheme === "blue" ? "bg-blue-100/70" : scheme === "purple" ? "bg-purple-100/70" : "bg-orange-100/70"
    const timerText = scheme === "blue" ? "text-blue-700" : scheme === "purple" ? "text-purple-700" : "text-orange-700"
    const timerLabel = scheme === "blue" ? "text-blue-400" : scheme === "purple" ? "text-purple-400" : "text-orange-400"
    const ctaBg = scheme === "blue" ? "bg-blue-500" : scheme === "purple" ? "bg-purple-500" : "bg-amber-600"

    const units = time.d > 0
        ? [{ label: "DAYS", v: time.d }, { label: "HRS", v: time.h }, { label: "MIN", v: time.m }, { label: "SEC", v: time.s }]
        : [{ label: "HRS", v: time.h }, { label: "MIN", v: time.m }, { label: "SEC", v: time.s }]

    const expired = time.total === 0

    return (
        <div className={`relative overflow-hidden rounded-3xl border-2 transition-all ${borderColor} bg-gradient-to-br ${bgGrad} to-white`}>
            <div className={`absolute -top-6 -right-6 size-28 rounded-full opacity-10 ${circleBg}`} />
            <div className={`absolute -bottom-8 -left-4 size-20 rounded-full opacity-10 ${circleBg}`} />

            <div className="relative p-6">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${badgeBg}`}>
                    {isFreeItems ? <PackageIcon className="size-3.5" /> : isPercent ? <PercentIcon className="size-3.5" /> : <TruckIcon className="size-3.5" />}
                    {isFreeItems
                        ? offer.freeItem ? `Free ${offer.freeItem}` : "Free Item"
                        : isPercent
                        ? `${offer.discountValue}% Discount`
                        : `₹${offer.discountValue} Off`}
                </div>

                <h2 className="text-xl font-bold text-zinc-900 leading-snug mb-1">{offer.title}</h2>
                <p className="text-sm text-zinc-500 mb-5">
                    {isFreeItems
                        ? `Shop for ₹${offer.minPurchase || 0} or more and get ${offer.freeItem || "a free item"}!`
                        : isPercent
                        ? `Shop for ₹${offer.minPurchase || 0} or more and get ${offer.discountValue}% off your order.`
                        : `Shop for ₹${offer.minPurchase || 0} or more and get ₹${offer.discountValue} off your order.`}
                </p>

                {!expired ? (
                    <div className="mb-5">
                        <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
                            <ClockIcon className="size-3.5" /> Offer ends in
                        </div>
                        <div className="flex items-center gap-2">
                            {units.map((u, i) => (
                                <div key={u.label} className="flex items-center gap-2">
                                    <div className={`rounded-xl px-3 py-2.5 min-w-[52px] text-center ${timerBg}`}>
                                        <span className={`text-2xl font-bold tabular-nums ${timerText}`}>{pad(u.v)}</span>
                                        <p className={`text-[10px] font-semibold mt-0.5 ${timerLabel}`}>{u.label}</p>
                                    </div>
                                    {i < units.length - 1 && <span className="text-zinc-300 font-bold text-xl">:</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mb-5 px-4 py-3 bg-zinc-100 rounded-xl text-sm text-zinc-500 font-medium">⏰ This offer has ended</div>
                )}

                {!expired && (
                    <Link to="/products"
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:gap-3 ${ctaBg}`}>
                        <ShoppingCartIcon className="size-4" /> Shop Now <ChevronRightIcon className="size-4" />
                    </Link>
                )}
            </div>
        </div>
    )
}

const HOW_IT_WORKS = [
    { icon: ShoppingCartIcon, title: "Add to cart", desc: "Browse products and add items until you meet the minimum purchase amount." },
    { icon: CheckCircleIcon, title: "Offer unlocks", desc: "The offer is automatically applied when your cart reaches the minimum." },
    { icon: GiftIcon, title: "Enjoy your reward!", desc: "Discount or free item is applied at checkout — no coupon needed." },
]

export default function Offers() {
    const [offers, setOffers] = useState<Offer[]>([])
    const { cartSubtotal } = useCart()

    useEffect(() => {
        const load = () => getActiveOffers().then(setOffers)
        load()
        const id = setInterval(load, 30_000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
                    <Link to="/" className="hover:text-amber-600"><HomeIcon className="size-4" /></Link>
                    <span>/</span>
                    <span className="text-amber-600 font-medium">Offers</span>
                </nav>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-3">
                        <GiftIcon className="size-4" /> Limited-Time Offers
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2">Exclusive Offers 🎁</h1>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                        Shop smart — unlock discounts and free items when you reach the minimum purchase amount.
                    </p>
                </div>

                {cartSubtotal > 0 && (
                    <div className="mb-6 p-4 bg-white rounded-2xl border border-stone-200 flex items-center gap-3">
                        <ShoppingCartIcon className="size-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-zinc-700">Your cart total: <span className="font-bold text-amber-700">₹{cartSubtotal.toFixed(2)}</span></p>
                    </div>
                )}

                {offers.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-stone-200">
                        <GiftIcon className="size-16 text-zinc-200 mx-auto mb-4" />
                        <p className="text-xl font-semibold text-zinc-900 mb-1">No active offers right now</p>
                        <p className="text-sm text-zinc-500 mb-6">Check back soon — new offers are added regularly!</p>
                        <Link to="/products"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors">
                            <ShoppingCartIcon className="size-4" /> Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
                    </div>
                )}

                <div className="mt-12">
                    <h2 className="text-lg font-bold text-zinc-900 mb-5 text-center">How It Works</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {HOW_IT_WORKS.map((step, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
                                <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                                    <step.icon className="size-5 text-amber-600" />
                                </div>
                                <p className="font-semibold text-zinc-900 text-sm mb-1">{step.title}</p>
                                <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
