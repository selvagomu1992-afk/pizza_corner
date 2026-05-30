import 'dotenv/config'
import { prisma } from './Config/prisma.js'
import bcrypt from 'bcrypt'

// ─── Seed Data ────────────────────────────────────────────────────────────────

const products = [
    { name: 'Butter Croissant 100g',   description: 'Flaky and buttery',                                          price: 45,  originalPrice: 50,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/zvoeqbvrbrt7atqj0dbu.png', category: 'bakery',            unit: '100g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Brown Bread 400g',        description: 'Soft and healthy, Ideal for breakfast',                      price: 35,  originalPrice: 40,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/vy1xa7zovcu22smzapzv.png', category: 'bakery',            unit: '400g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Organic Quinoa 500g',     description: 'High protein, Gluten-free',                                  price: 420, originalPrice: 450, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/cxrrgnf12xuhkr4dyhi2.png', category: 'pantry-staples',    unit: '500g',  stock: 100, isOrganic: true,  rating: 4.5, reviewCount: 12 },
    { name: 'Barley 1kg',              description: 'Rich in fiber, Helps digestion',                             price: 140, originalPrice: 150, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/spb5sgy8g24rned9nwog.png', category: 'pantry-staples',    unit: '1kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Brown Rice 1kg',          description: 'Whole grain and nutritious',                                  price: 110, originalPrice: 120, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/dboutcrkdjhoxcvbbqne.png', category: 'pantry-staples',    unit: '1kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Basmati Rice 5kg',        description: 'Long grain and aromatic, Perfect for biryani',               price: 520, originalPrice: 550, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/evuovl2nlwdjukosfz23.png', category: 'pantry-staples',    unit: '5kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Wheat Flour 5kg',         description: 'Soft and fluffy rotis, Rich in nutrients',                   price: 230, originalPrice: 250, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/ooitbkcjcky0gkjmkatb.png', category: 'pantry-staples',    unit: '5kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Knorr Cup Soup 70g',      description: 'Convenient and tasty',                                       price: 30,  originalPrice: 35,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/vnzb2qbwtpab5gnqvx0f.png', category: 'pantry-staples',    unit: '70g',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Maggi Noodles 280g',      description: 'Instant and easy to cook',                                   price: 50,  originalPrice: 55,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/dsep7owmwvfrukzbslqo.png', category: 'pantry-staples',    unit: '280g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Tomato 1 kg',             description: 'Juicy and ripe, Rich in Vitamin C, Farm fresh quality',      price: 28,  originalPrice: 30,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/kdbfytxisrjymgy0ubhk.png', category: 'fruits-vegetables', unit: '1kg',   stock: 100, isOrganic: true,  rating: 4.5, reviewCount: 12 },
    { name: 'Potato 500g',             description: 'Fresh and organic, Rich in carbohydrates',                   price: 35,  originalPrice: 40,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/tzibj2ntsnbn4e0u5kwv.png', category: 'fruits-vegetables', unit: '500g',  stock: 100, isOrganic: true,  rating: 4.5, reviewCount: 12 },
    { name: 'Carrot 500g',             description: 'Sweet and crunchy, Good for eyesight',                       price: 44,  originalPrice: 50,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/ceqgisupuizyste9aifg.png', category: 'fruits-vegetables', unit: '500g',  stock: 100, isOrganic: true,  rating: 4.5, reviewCount: 12 },
    { name: 'Spinach 500g',            description: 'Rich in iron, High in vitamins',                             price: 15,  originalPrice: 18,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/bhrtl76sscvmeiq4kchm.png', category: 'fruits-vegetables', unit: '500g',  stock: 100, isOrganic: true,  rating: 4.5, reviewCount: 12 },
    { name: 'Onion 500g',              description: 'Fresh and pungent, A kitchen staple',                        price: 45,  originalPrice: 50,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/wnvtwlm2tphqburhsmyc.png', category: 'fruits-vegetables', unit: '500g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Apple 1 kg',              description: 'Boosts immunity, Rich in fiber',                             price: 90,  originalPrice: 100, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/pjt1y6xdo46tluemhf0o.png', category: 'fruits-vegetables', unit: '1kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Banana 1 kg',             description: 'Sweet and ripe, High in potassium',                          price: 45,  originalPrice: 50,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/dsnmko6gqtyw31okby80.png', category: 'fruits-vegetables', unit: '1kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Orange 1 kg',             description: 'Juicy and sweet, Rich in Vitamin C',                         price: 75,  originalPrice: 80,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/r1wxfortw5h12g7egx7k.png', category: 'fruits-vegetables', unit: '1kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Mango 1 kg',              description: 'Sweet and flavorful, Rich in Vitamin A',                     price: 140, originalPrice: 150, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/nb1mpxuo4fdcik6ey5yj.png', category: 'fruits-vegetables', unit: '1kg',   stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Grapes 500g',             description: 'Fresh and juicy, Rich in antioxidants',                      price: 65,  originalPrice: 70,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/jsmb7caaokhnyci2coga.png', category: 'fruits-vegetables', unit: '500g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Amul Milk 1L',            description: 'Fresh milk, Rich in calcium',                                price: 55,  originalPrice: 60,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/ooamzy497lhsj2gjuwby.png', category: 'dairy-eggs',        unit: '1L',    stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Paneer 200g',             description: 'Soft and fresh, Rich in protein',                            price: 85,  originalPrice: 90,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/vihqr6wquv57byurvz46.png', category: 'dairy-eggs',        unit: '200g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Eggs 12 pcs',             description: 'Farm fresh, Rich in protein',                                price: 85,  originalPrice: 90,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/cnjrpbcnqesqxy1wr30g.png', category: 'dairy-eggs',        unit: '12pcs', stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Cheese 200g',             description: 'Creamy and delicious, Perfect for pizzas',                   price: 130, originalPrice: 140, image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/gek3mmiig3lixlkpxks8.png', category: 'dairy-eggs',        unit: '200g',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Coca-Cola 1.5L',          description: 'Perfect for parties, Best served chilled',                   price: 75,  originalPrice: 80,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/eljxcdud6fduwfim5rdx.png', category: 'beverages',         unit: '1.5L',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Sprite 1.5L',             description: 'Chilled and refreshing, Perfect for celebrations',           price: 60,  originalPrice: 75,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/daiglpvgna1dlhjplbve.png', category: 'beverages',         unit: '1.5L',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: '7 Up 1.5L',               description: 'Refreshing lemon-lime flavor',                               price: 70,  originalPrice: 76,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/qt1ypzsoqni12ghf2ryp.png', category: 'beverages',         unit: '1.5L',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
    { name: 'Fanta 1.5L',              description: 'Sweet and fizzy',                                            price: 65,  originalPrice: 70,  image: 'https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/nexecd3mgyzrpeun1bee.png', category: 'beverages',         unit: '1.5L',  stock: 100, isOrganic: false, rating: 4.5, reviewCount: 12 },
]

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function main() {
    console.log('🌱 Starting database seed...\n')

    // Read admin credentials from .env
    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@pizzacorner.com'
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

    // ── 1. Admin User ──────────────────────────────────────────────────────────
    console.log('👤 Seeding admin user...')
    const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    const admin = await prisma.user.upsert({
        where:  { email: ADMIN_EMAIL },
        update: { isAdmin: true, password: adminPassword },
        create: {
            name:     'Admin',
            email:    ADMIN_EMAIL,
            password: adminPassword,
            phone:    '+1 (111) 000-0001',
            isAdmin:  true,
        },
    })
    console.log('  ✓ Admin:', admin.email)

    // ── 2. Test User ───────────────────────────────────────────────────────────
    console.log('👤 Seeding test user...')
    const userPassword = await bcrypt.hash('user123', 10)
    const testUser = await prisma.user.upsert({
        where:  { email: 'user@pizzacorner.com' },
        update: {},
        create: {
            name:     'Test User',
            email:    'user@pizzacorner.com',
            password: userPassword,
            phone:    '+1 (111) 000-0002',
            addresses: {
                create: [
                    {
                        label:     'Home',
                        address:   '42 Green Valley Road',
                        city:      'Portland',
                        state:     'OR',
                        zip:       '97201',
                        isDefault: true,
                        lat:       45.5051,
                        lng:       -122.675,
                    },
                    {
                        label:     'Work',
                        address:   '100 Tech Park Ave, Suite 300',
                        city:      'Portland',
                        state:     'OR',
                        zip:       '97204',
                        isDefault: false,
                        lat:       45.5231,
                        lng:       -122.676,
                    },
                ],
            },
        },
    })
    console.log('  ✓ User:', testUser.email)

    // ── 3. Delivery Partners ───────────────────────────────────────────────────
    console.log('🚴 Seeding delivery partners...')
    const deliveryPassword = await bcrypt.hash('delivery123', 10)

    const partners = await Promise.all([
        prisma.deliveryPartner.upsert({
            where:  { email: 'rahul@pizzacorner.com' },
            update: {},
            create: { name: 'Rahul Kumar', email: 'rahul@pizzacorner.com', password: deliveryPassword, phone: '9876543210', vehicleType: 'bike',    isActive: true },
        }),
        prisma.deliveryPartner.upsert({
            where:  { email: 'john@pizzacorner.com' },
            update: {},
            create: { name: 'John Doe',    email: 'john@pizzacorner.com',  password: deliveryPassword, phone: '9876543211', vehicleType: 'scooter', isActive: true },
        }),
        prisma.deliveryPartner.upsert({
            where:  { email: 'priya@pizzacorner.com' },
            update: {},
            create: { name: 'Priya Singh', email: 'priya@pizzacorner.com', password: deliveryPassword, phone: '9876543212', vehicleType: 'bike',    isActive: false },
        }),
    ])
    partners.forEach(p => console.log('  ✓ Partner:', p.email, `(${p.isActive ? 'active' : 'inactive'})`))

    // ── 4. Products ────────────────────────────────────────────────────────────
    console.log('\n📦 Seeding products...')
    let created = 0
    let skipped = 0

    for (const product of products) {
        const existing = await prisma.product.findFirst({ where: { name: product.name } })
        if (existing) {
            skipped++
            continue
        }
        await prisma.product.create({ data: product })
        created++
    }
    console.log(`  ✓ ${created} products created, ${skipped} already existed`)

    // ── 5. Categories ─────────────────────────────────────────────────────────
    console.log('\n🏷️ Seeding categories...')
    const categoryNames = [
        { name: 'Pizzas',            image: '' },
        { name: 'Sides',             image: '' },
        { name: 'Beverages',         image: '' },
        { name: 'Desserts',          image: '' },
        { name: 'Combos',            image: '' },
    ]
    let catCreated = 0
    let catSkipped = 0
    for (const cat of categoryNames) {
        const existing = await prisma.category.findUnique({ where: { name: cat.name } })
        if (existing) { catSkipped++; continue }
        await prisma.category.create({ data: cat })
        catCreated++
    }
    // Clear outdated image URLs on existing categories
    await prisma.category.updateMany({ where: { image: { not: '' } }, data: { image: '' } })
    console.log(`  ✓ ${catCreated} categories created, ${catSkipped} already existed (images cleared)`)

    // ── 6. Pincodes ────────────────────────────────────────────────────────────
    console.log('\n📍 Seeding pincodes...')
    const pincodes = [
        { pincode: '110001', deliveryFee: 40 },
        { pincode: '110002', deliveryFee: 50 },
        { pincode: '110003', deliveryFee: 35 },
        { pincode: '110004', deliveryFee: 30 },
        { pincode: '110005', deliveryFee: 45 },
        { pincode: '110006', deliveryFee: 55 },
        { pincode: '201301', deliveryFee: 60 },
        { pincode: '201302', deliveryFee: 65 },
        { pincode: '201303', deliveryFee: 70 },
        { pincode: '201304', deliveryFee: 50 },
        { pincode: '122001', deliveryFee: 40 },
        { pincode: '122002', deliveryFee: 45 },
        { pincode: '122003', deliveryFee: 35 },
        { pincode: '122004', deliveryFee: 50 },
        { pincode: '122005', deliveryFee: 55 },
        { pincode: '560001', deliveryFee: 40 },
        { pincode: '560002', deliveryFee: 45 },
        { pincode: '560003', deliveryFee: 35 },
        { pincode: '560004', deliveryFee: 50 },
        { pincode: '560005', deliveryFee: 55 },
    ]
    let pinCreated = 0
    let pinSkipped = 0
    for (const p of pincodes) {
        const existing = await prisma.pincode.findFirst({ where: { pincode: p.pincode } })
        if (existing) { pinSkipped++; continue }
        await prisma.pincode.create({ data: p })
        pinCreated++
    }
    console.log(`  ✓ ${pinCreated} pincodes created, ${pinSkipped} already existed`)

    // ── 7. Offers ──────────────────────────────────────────────────────────────
    console.log('\n🎉 Seeding offers...')
    const now = new Date()
    const offers = [
        { title: 'Weekend Special',       description: 'Get 20% off on all pizzas every weekend!',                        discountType: 'percent',   discountValue: 20, freeItem: '', minPurchase: 0,    startDate: now, endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        { title: 'Free Garlic Bread',     description: 'Free garlic bread on orders above ₹500',                         discountType: 'free_item', discountValue: 0,  freeItem: 'Garlic Bread', minPurchase: 500, startDate: now, endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
        { title: 'Flat ₹100 Off',         description: 'Flat ₹100 off on orders above ₹999',                             discountType: 'flat',      discountValue: 100, freeItem: '', minPurchase: 999, startDate: now, endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) },
        { title: 'New User Offer',        description: '15% off on your first order!',                                   discountType: 'percent',   discountValue: 15, freeItem: '', minPurchase: 0,    startDate: now, endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
        { title: 'Free Drink',            description: 'Get a free Pepsi on orders above ₹299',                          discountType: 'free_item', discountValue: 0,  freeItem: 'Pepsi 500ml', minPurchase: 299, startDate: now, endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    ]
    let offCreated = 0
    let offSkipped = 0
    for (const offer of offers) {
        const existing = await prisma.offer.findFirst({ where: { title: offer.title } })
        if (existing) { offSkipped++; continue }
        await prisma.offer.create({ data: { ...offer, isActive: true } })
        offCreated++
    }
    console.log(`  ✓ ${offCreated} offers created, ${offSkipped} already existed`)

    // ── 8. Coupons ─────────────────────────────────────────────────────────────
    console.log('\n🎫 Seeding coupons...')
    const coupons = [
        { code: 'PIZZA50',   description: '50% off on your order (up to ₹150)', discountPercent: 50, discountFlat: 0, minPurchase: 299,  maxUses: 100, usedCount: 0, expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
        { code: 'FLAT75',    description: 'Flat ₹75 off on orders above ₹500',   discountPercent: 0,  discountFlat: 75, minPurchase: 500,  maxUses: 50,  usedCount: 0, expiresAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) },
        { code: 'WELCOME20', description: '20% off for new customers',           discountPercent: 20, discountFlat: 0, minPurchase: 0,    maxUses: 200, usedCount: 0, expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
        { code: 'FREEDEL',   description: 'Free delivery on orders above ₹399',  discountPercent: 0,  discountFlat: 49, minPurchase: 399,  maxUses: 0,    usedCount: 0, expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        { code: 'HALF200',   description: 'Get ₹200 off on orders above ₹599',   discountPercent: 0,  discountFlat: 200, minPurchase: 599, maxUses: 30,  usedCount: 0, expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    ]
    let cupCreated = 0
    let cupSkipped = 0
    for (const coupon of coupons) {
        const existing = await prisma.coupon.findUnique({ where: { code: coupon.code } })
        if (existing) { cupSkipped++; continue }
        await prisma.coupon.create({ data: { ...coupon, isActive: true } })
        cupCreated++
    }
    console.log(`  ✓ ${cupCreated} coupons created, ${cupSkipped} already existed`)

    // ── 9. Sample Order ────────────────────────────────────────────────────────
    console.log('\n🛒 Seeding sample order...')
    const sampleProducts = await prisma.product.findMany({ take: 2 })
    const userAddress    = await prisma.address.findFirst({ where: { userId: testUser.id, isDefault: true } })

    if (sampleProducts.length >= 2 && userAddress) {
        const orderItems = sampleProducts.map(p => ({
            product:  p.id,
            name:     p.name,
            image:    p.image,
            price:    p.price,
            quantity: 1,
            unit:     p.unit ?? 'piece',
        }))

        const subtotal    = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
        const deliveryFee = subtotal >= 20 ? 0 : 2.99
        const tax         = parseFloat((subtotal * 0.08).toFixed(2))
        const total       = parseFloat((subtotal + deliveryFee + tax).toFixed(2))

        const existingOrder = await prisma.order.findFirst({ where: { userId: testUser.id } })
        if (!existingOrder) {
            const order = await prisma.order.create({
                data: {
                    userId:          testUser.id,
                    items:           orderItems,
                    shippingAddress: {
                        label:   userAddress.label,
                        address: userAddress.address,
                        city:    userAddress.city,
                        state:   userAddress.state,
                        zip:     userAddress.zip,
                        lat:     userAddress.lat,
                        lng:     userAddress.lng,
                    },
                    paymentMethod:   'card',
                    subtotal,
                    deliveryFee,
                    tax,
                    total,
                    status:          'Out for Delivery',
                    statusHistory:   [
                        { status: 'Placed',            note: 'Order placed successfully',    timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
                        { status: 'Confirmed',         note: 'Order confirmed',              timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
                        { status: 'Packed',            note: 'Order packed',                 timestamp: new Date(Date.now() - 3600000).toISOString() },
                        { status: 'Out for Delivery',  note: 'Assigned to Rahul Kumar',      timestamp: new Date().toISOString() },
                    ],
                    deliveryPartnerId: partners[0].id,
                    deliveryOtp:       '482916',
                    liveLocation:      { lat: 45.5051, lng: -122.675, updatedAt: new Date().toISOString() },
                    isPaid:            true,
                },
            })
            console.log('  ✓ Sample order created:', order.id.slice(-8).toUpperCase())
        } else {
            console.log('  ✓ Sample order already exists, skipped')
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    const counts = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.deliveryPartner.count(),
        prisma.order.count(),
        prisma.category.count(),
        prisma.pincode.count(),
        prisma.offer.count(),
        prisma.coupon.count(),
    ])

    console.log('\n✅ Seed complete!')
    console.log('─────────────────────────────')
    console.log(`  Users:             ${counts[0]}`)
    console.log(`  Products:          ${counts[1]}`)
    console.log(`  Delivery Partners: ${counts[2]}`)
    console.log(`  Orders:            ${counts[3]}`)
    console.log(`  Categories:        ${counts[4]}`)
    console.log(`  Pincodes:          ${counts[5]}`)
    console.log(`  Offers:            ${counts[6]}`)
    console.log(`  Coupons:           ${counts[7]}`)
    console.log('─────────────────────────────')
    console.log('\n🔑 Test credentials:')
    console.log(`  Admin:    ${ADMIN_EMAIL}   / ${ADMIN_PASSWORD}`)
    console.log('  User:     user@pizzacorner.com    / user123')
    console.log('  Delivery: rahul@pizzacorner.com   / delivery123')
}

main()
    .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
