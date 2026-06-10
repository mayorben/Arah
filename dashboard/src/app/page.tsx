'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, ChevronRight, ChevronLeft } from 'lucide-react';
import { api, naira } from '@/lib/api';

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const SLIDES = [
  { src: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1000&q=80', fallback: 'https://picsum.photos/seed/grain1/1000/600', label: 'Premium Grains', alt: 'Grains' },
  { src: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80', fallback: 'https://picsum.photos/seed/market2/1000/600', label: 'Fresh from Source', alt: 'Market' },
  { src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80', fallback: 'https://picsum.photos/seed/food3/1000/600', label: 'Oils & Seasonings', alt: 'Food' },
  { src: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80', fallback: 'https://picsum.photos/seed/produce4/1000/600', label: 'Legumes & More', alt: 'Produce' },
];

const GRID_ITEMS = [
  { src: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=900&q=80', fallback: 'https://picsum.photos/seed/ricebig/900/700', label: 'Premium Rice', alt: 'Rice' },
  { src: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80', fallback: 'https://picsum.photos/seed/palmoil/500/320', label: 'Palm Oil', alt: 'Palm Oil' },
  { src: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=500&q=80', fallback: 'https://picsum.photos/seed/beansbowl/500/320', label: 'Beans', alt: 'Beans' },
  { src: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=500&q=80', fallback: 'https://picsum.photos/seed/crayfish/500/320', label: 'Crayfish', alt: 'Crayfish' },
  { src: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=500&q=80', fallback: 'https://picsum.photos/seed/garrisw/500/320', label: 'Garri & Swallow', alt: 'Garri' },
];

interface Product {
  id: string;
  name: string;
  short_description: string;
  category: string;
  unit: string;
  sale_price: number;
  stock_quantity: number;
  image_url: string | null;
  is_featured: boolean;
}

const waNumber = process.env.NEXT_PUBLIC_OWNER_WHATSAPP || '';
const waUrl = waNumber
  ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`
  : '#';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const goToSlide = useCallback((n: number) => {
    setActiveSlide((n + SLIDES.length) % SLIDES.length);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActiveSlide(s => (s + 1) % SLIDES.length), 4500);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setActiveSlide(s => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    api.get('/products').then(r => { setProducts(r.data); setLoading(false); });
  }, []);

  const addToCart = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart(c => {
    const n = { ...c };
    if (n[id] > 1) n[id]--;
    else delete n[id];
    return n;
  });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = activeFilter === 'All' ? products : products.filter(p => p.category === activeFilter);

  const imgFallback = (e: React.SyntheticEvent<HTMLImageElement>, src: string) => {
    const img = e.currentTarget; img.onerror = null; img.src = src;
  };

  return (
    <div>
      {/* NAV */}
      <nav className="storefront-nav">
        <div className="storefront-nav-inner">
          <div className="brand">
            <span className="brand-name">Arah</span>
            <span className="brand-sub">Provisions</span>
          </div>
          <div className="nav-right">
            <Link href="/order" className="cart-wrap">
              <ShoppingCart size={22} color="white" />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <Link href="/admin" className="nav-link">Admin</Link>
          </div>
        </div>
      </nav>

      {/* SPLIT HERO */}
      <div className="hero">
        <div className="hero-left">
          <p className="hero-label">Premium Quality</p>
          <h1>The finest provisions,<br />delivered to your door.</h1>
          <p>Rice, beans, palm oil and everything your kitchen needs — sourced with care, packed with pride.</p>
          <div className="hero-ctas">
            <a className="hero-cta" href="#products">
              Shop Now <ChevronRight size={16} />
            </a>
            {waNumber && (
              <a className="hero-wa" href={waUrl} target="_blank" rel="noopener noreferrer">
                {WA_ICON} Order on WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="hero-right">
          {SLIDES.map((slide, i) => (
            <div key={i} className={`carousel-slide${i === activeSlide ? ' active' : ''}`}>
              <img
                src={slide.src}
                onError={e => imgFallback(e, slide.fallback)}
                alt={slide.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <div className="slide-caption"><span>{slide.label}</span></div>
            </div>
          ))}
          <button className="carousel-arrow prev" onClick={() => goToSlide(activeSlide - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="carousel-arrow next" onClick={() => goToSlide(activeSlide + 1)}>
            <ChevronRight size={16} />
          </button>
          <div className="carousel-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={`dot${i === activeSlide ? ' active' : ''}`} onClick={() => goToSlide(i)} />
            ))}
          </div>
        </div>
      </div>
      <div className="gold-stripe" />

      {/* IMAGE GRID */}
      <div className="image-grid-section">
        <p className="section-eyebrow">Sourced with care</p>
        <h2 className="section-title">Our Provisions</h2>
        <div className="image-grid">
          {GRID_ITEMS.map((item, i) => (
            <div key={i} className="grid-photo">
              <img src={item.src} onError={e => imgFallback(e, item.fallback)} alt={item.alt} />
              <div className="grid-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="products-section" id="products">
        {categories.length > 0 && (
          <div className="section-filters">
            <button className={`filter-pill${activeFilter === 'All' ? ' active' : ''}`} onClick={() => setActiveFilter('All')}>All</button>
            {categories.map(cat => (
              <button key={cat} className={`filter-pill${activeFilter === cat ? ' active' : ''}`} onClick={() => setActiveFilter(cat)}>{cat}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="product-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 10, height: 320, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => (
              <div key={p.id} className="product-card">
                <div className="card-img-wrap">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, color: '#C9A84C' }}>
                        {p.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="card-img-overlay" />
                  {p.is_featured && <span className="card-badge">Featured</span>}
                  {p.stock_quantity <= 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontWeight: 600 }}>Out of Stock</span>
                    </div>
                  )}
                </div>
                <div className="card-body">
                  <p className="card-cat">{p.category}</p>
                  <h3 className="card-name">{p.name}</h3>
                  {p.short_description && <p className="card-desc">{p.short_description}</p>}
                  <div className="card-footer">
                    <div>
                      <span className="card-price">{naira(p.sale_price)}</span>
                      <span className="card-unit">/ {p.unit}</span>
                    </div>
                    {p.stock_quantity > 0 && (
                      cart[p.id] ? (
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => removeFromCart(p.id)}>−</button>
                          <span className="qty-num">{cart[p.id]}</span>
                          <button className="qty-btn plus" onClick={() => addToCart(p.id)}>+</button>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={() => addToCart(p.id)}>Add</button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING WHATSAPP */}
      {waNumber && (
        <a className="wa-float" href={waUrl} target="_blank" rel="noopener noreferrer">
          {WA_ICON}
          <span>Order on WhatsApp</span>
        </a>
      )}

      {/* FLOATING CART */}
      {cartCount > 0 && (
        <Link href="/order" className="float-cart">
          <ShoppingCart size={20} />
        </Link>
      )}

      {/* FOOTER */}
      <footer className="storefront-footer">
        <p className="f-name">Arah Provisions</p>
        <p className="f-tag">Premium Quality · Honest Prices</p>
      </footer>
    </div>
  );
}
