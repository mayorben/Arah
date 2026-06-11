'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { api, naira } from '@/lib/api';

const SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1000&q=80',
    fallback: 'https://picsum.photos/seed/grain1/1000/600',
    alt: 'Grains',
    caption: 'Premium Grains',
  },
  {
    src: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80',
    fallback: 'https://picsum.photos/seed/market2/1000/600',
    alt: 'Market',
    caption: 'Fresh from Source',
  },
  {
    src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
    fallback: 'https://picsum.photos/seed/food3/1000/600',
    alt: 'Food',
    caption: 'Oils & Seasonings',
  },
  {
    src: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80',
    fallback: 'https://picsum.photos/seed/produce4/1000/600',
    alt: 'Produce',
    caption: 'Legumes & More',
  },
];

const GRID_ITEMS = [
  {
    src: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=900&q=80',
    fallback: 'https://picsum.photos/seed/ricebig/900/700',
    alt: 'Rice', label: 'Premium Rice', category: 'Grains',
  },
  {
    src: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
    fallback: 'https://picsum.photos/seed/palmoil/500/320',
    alt: 'Palm Oil', label: 'Palm Oil', category: 'Oils & Fats',
  },
  {
    src: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=500&q=80',
    fallback: 'https://picsum.photos/seed/beansbowl/500/320',
    alt: 'Beans', label: 'Beans', category: 'Legumes',
  },
  {
    src: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=500&q=80',
    fallback: 'https://picsum.photos/seed/crayfish/500/320',
    alt: 'Crayfish', label: 'Crayfish', category: 'Seasonings',
  },
  {
    src: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=500&q=80',
    fallback: 'https://picsum.photos/seed/garrisw/500/320',
    alt: 'Garri', label: 'Garri & Swallow', category: 'Swallow',
  },
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

const WA_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CART_SVG = (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 2.7A1 1 0 007 17h11M7 13H5.4M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cart, setCart]           = useState<Record<string, number>>({});
  const [cartReady, setCartReady] = useState(false);
  const [slide, setSlide]         = useState(0);
  const [activeCat, setActiveCat] = useState('All');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const waNumber = process.env.NEXT_PUBLIC_OWNER_WHATSAPP || '2349074041180';
  const waHref   = `https://wa.me/${waNumber}?text=Hi!%20I%20want%20to%20place%20an%20order.`;

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arah_cart');
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    setCartReady(true);
  }, []);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (cartReady) localStorage.setItem('arah_cart', JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    api.get('/products').then((r) => { setProducts(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const goToSlide = useCallback((n: number) => {
    setSlide((n + SLIDES.length) % SLIDES.length);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeFromCart = (id: string) =>
    setCart((c) => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const DEFAULT_CATS = ['Grains', 'Legumes', 'Oils & Fats', 'Swallow', 'Seasonings'];
  const dbCats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const extraCats = dbCats.filter((c) => !DEFAULT_CATS.includes(c));
  const categories = ['All', ...DEFAULT_CATS, ...extraCats];

  const visible = activeCat === 'All' ? products : products.filter((p) => p.category === activeCat);

  return (
    <div style={{ background: 'var(--cream)' }}>

      {/* ── NAV ── */}
      <nav style={{ background: 'var(--green)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="font-display" style={{ fontSize: 28, fontWeight: 600, color: 'white', letterSpacing: '.04em' }}>Arah</span>
          <span className="font-label" style={{ fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>Provisions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/order" style={{ position: 'relative', color: 'white' }}>
            {CART_SVG}
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -8, right: -8, background: '#FBBF24', color: '#000', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/admin" className="font-label" style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}>Admin</Link>
        </div>
      </nav>

      {/* ── SPLIT HERO ── */}
      <div className="hero">
        <div className="hero-left">
          <p className="font-label" style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14, fontWeight: 600 }}>Premium Quality</p>
          <h1 className="font-display" style={{ fontSize: 56, fontWeight: 500, lineHeight: 1.08, marginBottom: 18, color: 'white', letterSpacing: '-.01em' }}>
            The finest provisions,<br />delivered to your door.
          </h1>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 15, maxWidth: 380, lineHeight: 1.72, fontWeight: 300 }}>
            Rice, beans, palm oil and everything your kitchen needs — sourced with care, packed with pride.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 34 }}>
            <a href="#products" className="font-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--gold)', color: 'var(--ink)', fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', borderRadius: 2, textDecoration: 'none' }}>
              Shop Now
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,.35)', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', borderRadius: 2, textDecoration: 'none' }}>
              {WA_SVG} <span className="wa-text">Order on WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="hero-right">
          {SLIDES.map((s, i) => (
            <div key={i} className={`carousel-slide${slide === i ? ' active' : ''}`}>
              <img src={s.src} onError={(e) => { (e.target as HTMLImageElement).src = s.fallback; }} alt={s.alt} loading={i === 0 ? 'eager' : 'lazy'} />
              <div className="slide-caption"><span>{s.caption}</span></div>
            </div>
          ))}

          <button className="carousel-arrow" style={{ left: 16 }} onClick={() => goToSlide(slide - 1)} aria-label="Previous">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button className="carousel-arrow" style={{ right: 16 }} onClick={() => goToSlide(slide + 1)} aria-label="Next">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="carousel-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={`dot${slide === i ? ' active' : ''}`} onClick={() => goToSlide(i)} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── GOLD STRIPE ── */}
      <div style={{ height: 4, background: 'var(--gold)' }} />

      {/* ── IMAGE GRID ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 40px 0' }}>
        <p className="font-label" style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 600 }}>Sourced with care</p>
        <h2 className="font-display" style={{ fontSize: 36, fontWeight: 500, color: 'var(--green)', marginBottom: 24, letterSpacing: '-.01em' }}>Our Provisions</h2>
        <div className="image-grid">
          {GRID_ITEMS.map((g, i) => (
            <div
              key={i}
              className="grid-img"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setActiveCat(g.category);
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <img src={g.src} onError={(e) => { (e.target as HTMLImageElement).src = g.fallback; }} alt={g.alt} />
              <div className="grid-img-label" style={{ opacity: 1, background: 'linear-gradient(transparent, rgba(27,67,50,.82))' }}>
                <span style={{ fontFamily: 'Josefin Sans, sans-serif', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 700 }}>{g.label}</span>
                <span style={{ display: 'block', fontSize: 9, opacity: 0.75, marginTop: 2, letterSpacing: '.1em', textTransform: 'uppercase' }}>Tap to browse →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRODUCTS ── */}
      <div id="products" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 10, height: 280, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.7 }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
              {categories.map((cat) => (
                <button key={cat} className={`filter-pill${activeCat === cat ? ' active' : ''}`} onClick={() => setActiveCat(cat)}>
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="product-grid-responsive">
              {visible.map((p) => (
                <div key={p.id} className="card">
                  <div style={{ height: 200, position: 'relative', overflow: 'hidden', background: 'var(--cream)' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="font-display" style={{ fontSize: 48, color: 'var(--gold)' }}>{p.name.charAt(0)}</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.16) 100%)' }} />
                    {p.is_featured && (
                      <span className="font-label" style={{ position: 'absolute', top: 12, left: 12, background: 'var(--green)', color: 'white', fontSize: 8, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 2 }}>
                        Featured
                      </span>
                    )}
                    {p.stock_quantity < 0 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontWeight: 600 }}>Out of Stock</span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '18px 20px 20px' }}>
                    <p className="font-label" style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{p.category}</p>
                    <h3 className="font-display" style={{ fontSize: 20, fontWeight: 500, marginBottom: 6, color: 'var(--ink)', lineHeight: 1.2, letterSpacing: '.01em' }}>{p.name}</h3>
                    {p.short_description && (
                      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16, fontWeight: 300 }}>{p.short_description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: p.short_description ? 0 : 16 }}>
                      <div>
                        <span className="font-display" style={{ fontWeight: 600, fontSize: 20, color: 'var(--green)', letterSpacing: '.01em' }}>{naira(p.sale_price)}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4, fontWeight: 300 }}>/ {p.unit}</span>
                      </div>
                      {p.stock_quantity >= 0 && (
                        <div>
                          {cart[p.id] ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={() => removeFromCart(p.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--green)', background: 'transparent', color: 'var(--green)', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>−</button>
                              <span style={{ fontWeight: 600, fontSize: 14, minWidth: 16, textAlign: 'center' }}>{cart[p.id]}</span>
                              <button onClick={() => addToCart(p.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--green)', background: 'var(--green)', color: 'white', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(p.id)} className="font-label" style={{ padding: '8px 18px', background: 'var(--green)', color: 'white', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: 'pointer' }}>
                              Add
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── WHATSAPP FLOAT ── */}
      <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ position: 'fixed', bottom: 32, left: 32, background: '#25D366', color: 'white', padding: '14px 22px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 28px rgba(37,211,102,.4)', zIndex: 100, textDecoration: 'none' }} className="font-label wa-float">
        {WA_SVG}
        <span className="wa-text" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>Order on WhatsApp</span>
      </a>

      {/* ── CART FLOAT ── */}
      {cartCount > 0 && (
        <Link href="/order" style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--green)', color: 'white', padding: '16px 26px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 28px rgba(27,67,50,.45)', zIndex: 100, textDecoration: 'none' }} className="font-label">
          {CART_SVG}
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>Cart ({cartCount})</span>
        </Link>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--green)', color: 'white', textAlign: 'center', padding: '40px 24px' }}>
        <p className="font-display" style={{ fontSize: 28, fontWeight: 500, marginBottom: 8, letterSpacing: '.04em' }}>Arah Provisions</p>
        <p className="font-label" style={{ fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>Premium Quality · Honest Prices</p>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .product-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .product-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .wa-text { display: none; }
        }
      `}</style>
    </div>
  );
}
