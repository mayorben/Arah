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

const HeartIcon = ({ filled, size = 16 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} fill={filled ? '#E53E3E' : 'none'} stroke={filled ? '#E53E3E' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

export default function Storefront() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [cart, setCart]             = useState<Record<string, number>>({});
  const [cartReady, setCartReady]   = useState(false);
  const [favorites, setFavorites]   = useState<Set<string>>(new Set());
  const [favsReady, setFavsReady]   = useState(false);
  const [slide, setSlide]           = useState(0);
  const [activeCat, setActiveCat]   = useState('All');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  const waNumber = process.env.NEXT_PUBLIC_OWNER_WHATSAPP || '2349074041180';
  const waHref   = `https://wa.me/${waNumber}?text=Hi!%20I%20want%20to%20place%20an%20order.`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('arah_cart');
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem('arah_cart', JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    try { const s = localStorage.getItem('arah_favorites'); if (s) setFavorites(new Set(JSON.parse(s))); } catch {}
    setFavsReady(true);
  }, []);
  useEffect(() => {
    if (favsReady) localStorage.setItem('arah_favorites', JSON.stringify([...favorites]));
  }, [favorites, favsReady]);

  const toggleFavorite = (id: string) =>
    setFavorites((f) => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n; });

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

  const addToCart = (id: string, maxStock: number) =>
    setCart((c) => {
      if ((c[id] || 0) >= maxStock) return c;
      return { ...c, [id]: (c[id] || 0) + 1 };
    });

  const removeFromCart = (id: string) =>
    setCart((c) => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const favCount  = favorites.size;

  const DEFAULT_CATS = ['Grains', 'Legumes', 'Oils & Fats', 'Swallow', 'Seasonings'];
  const dbCats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const extraCats = dbCats.filter((c) => !DEFAULT_CATS.includes(c));
  const categories = ['All', ...DEFAULT_CATS, ...extraCats, 'Favourite'];

  const visible = activeCat === 'Favourite'
    ? products.filter((p) => favorites.has(p.id))
    : activeCat === 'All' ? products : products.filter((p) => p.category === activeCat);

  const goToFavourites = () => {
    setActiveCat('Favourite');
    productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: 'var(--cream)' }}>

      {/* ── NAV ── */}
      <nav style={{ background: 'var(--green)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="font-display" style={{ fontSize: 28, fontWeight: 600, color: 'white', letterSpacing: '.04em' }}>Arah</span>
          <span className="font-label" style={{ fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>Provisions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

          {/* Favourite icon */}
          <button
            onClick={goToFavourites}
            aria-label="Favourites"
            style={{ position: 'relative', color: 'white', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <HeartIcon filled={favCount > 0} size={20} />
            {favCount > 0 && (
              <span style={{ position: 'absolute', top: -8, right: -8, background: '#E53E3E', color: 'white', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {favCount}
              </span>
            )}
          </button>

          {/* Cart icon */}
          <Link href="/order" style={{ position: 'relative', color: 'white', display: 'flex', alignItems: 'center' }}>
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
      <div id="products" ref={productsRef} style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 6, height: 360, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.7 }} />
            ))}
          </div>
        ) : (
          <>
            {/* Category pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
              {categories.map((cat) => (
                <button key={cat} className={`filter-pill${activeCat === cat ? ' active' : ''}`} onClick={() => setActiveCat(cat)}
                  style={cat === 'Favourite' ? { display: 'flex', alignItems: 'center', gap: 5 } : undefined}>
                  {cat === 'Favourite' && <HeartIcon filled={favCount > 0} size={12} />}
                  {cat}
                  {cat === 'Favourite' && favCount > 0 && (
                    <span style={{ background: '#E53E3E', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{favCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }} className="product-grid-responsive">
              {visible.map((p) => {
                const outOfStock = p.stock_quantity <= 0;
                const lowStock   = !outOfStock && p.stock_quantity < 6;
                const atCartMax  = (cart[p.id] || 0) >= p.stock_quantity;

                return (
                  <div key={p.id} className="taeillo-card">

                    {/* ── IMAGE ── */}
                    <div className="taeillo-img-wrap">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="taeillo-img" />
                      ) : (
                        <div className="taeillo-img-placeholder">
                          <span className="font-display" style={{ fontSize: 52, color: 'var(--gold)', opacity: .45 }}>{p.name.charAt(0)}</span>
                        </div>
                      )}

                      {/* Out of stock overlay */}
                      {outOfStock && (
                        <div className="taeillo-oos-overlay">
                          <span className="taeillo-oos-badge">Out of Stock</span>
                        </div>
                      )}

                      {/* Low stock badge on image */}
                      {lowStock && (
                        <span className="taeillo-lowstock-badge">
                          Only {Math.floor(p.stock_quantity)} left
                        </span>
                      )}

                      {/* Featured */}
                      {p.is_featured && !outOfStock && (
                        <span className="font-label taeillo-featured-badge">Featured</span>
                      )}

                      {/* Heart */}
                      <button
                        onClick={() => toggleFavorite(p.id)}
                        title={favorites.has(p.id) ? 'Remove from favourites' : 'Add to favourites'}
                        className="taeillo-heart-btn"
                      >
                        <HeartIcon filled={favorites.has(p.id)} size={15} />
                      </button>
                    </div>

                    {/* ── INFO ── */}
                    <div className="taeillo-info">
                      <p className="taeillo-category">{p.category}</p>
                      <h3 className="taeillo-name font-display">{p.name}</h3>
                      {p.short_description && (
                        <p className="taeillo-desc">{p.short_description}</p>
                      )}

                      <div className="taeillo-bottom">
                        <div className="taeillo-price-row">
                          <span className="font-display taeillo-price">{naira(p.sale_price)}</span>
                          <span className="taeillo-unit">/ {p.unit}</span>
                        </div>

                        {outOfStock ? (
                          <div className="taeillo-oos-label">Out of Stock</div>
                        ) : cart[p.id] ? (
                          <div className="taeillo-stepper">
                            <button onClick={() => removeFromCart(p.id)} className="taeillo-step-btn taeillo-step-minus">−</button>
                            <span className="taeillo-step-count">{cart[p.id]}</span>
                            <button
                              onClick={() => addToCart(p.id, p.stock_quantity)}
                              disabled={atCartMax}
                              className={`taeillo-step-btn taeillo-step-plus${atCartMax ? ' disabled' : ''}`}
                            >+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(p.id, p.stock_quantity)} className="taeillo-add-btn font-label">
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {visible.length === 0 && activeCat === 'Favourite' && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <HeartIcon filled={false} size={36} />
                  <p style={{ marginTop: 16, fontSize: 15, fontWeight: 300 }}>No favourites yet — tap the heart on any product to save it here.</p>
                </div>
              )}
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
        /* ── Taeillo-inspired product card ── */
        .taeillo-card {
          background: #fff;
          border: 1px solid #EDEAE3;
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow .25s, transform .25s;
        }
        .taeillo-card:hover {
          box-shadow: 0 8px 32px rgba(27,67,50,.12);
          transform: translateY(-2px);
        }

        /* image */
        .taeillo-img-wrap {
          position: relative;
          height: 240px;
          background: #F5F3EE;
          overflow: hidden;
        }
        .taeillo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .45s ease;
        }
        .taeillo-card:hover .taeillo-img { transform: scale(1.04); }
        .taeillo-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F5F3EE;
        }

        /* out of stock overlay */
        .taeillo-oos-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,.72);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .taeillo-oos-badge {
          background: #1a1a1a;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .2em;
          text-transform: uppercase;
          padding: 7px 18px;
          border-radius: 2px;
          font-family: 'Josefin Sans', sans-serif;
        }

        /* low stock pill on image */
        .taeillo-lowstock-badge {
          position: absolute;
          bottom: 10px;
          left: 12px;
          background: #FEF3C7;
          color: #92400E;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: 'Josefin Sans', sans-serif;
          border: 1px solid #FCD34D;
        }

        /* featured badge */
        .taeillo-featured-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: var(--green);
          color: #fff;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 2px;
        }

        /* heart */
        .taeillo-heart-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,.95);
          border: none;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 1px 5px rgba(0,0,0,.14);
          z-index: 2;
          transition: transform .15s;
        }
        .taeillo-heart-btn:hover { transform: scale(1.12); }

        /* info area */
        .taeillo-info {
          padding: 16px 18px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 4px;
        }
        .taeillo-category {
          font-size: 9px;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #9CA3AF;
          font-weight: 700;
          font-family: 'Josefin Sans', sans-serif;
          margin: 0;
        }
        .taeillo-name {
          font-size: 19px;
          font-weight: 500;
          color: #111;
          line-height: 1.22;
          margin: 0;
          letter-spacing: .01em;
        }
        .taeillo-desc {
          font-size: 12.5px;
          color: #6B7280;
          line-height: 1.58;
          margin: 4px 0 0;
          font-weight: 300;
          flex: 1;
        }

        /* bottom row */
        .taeillo-bottom {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #F0EEEA;
        }
        .taeillo-price-row {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-bottom: 12px;
        }
        .taeillo-price {
          font-weight: 600;
          font-size: 20px;
          color: var(--green);
          letter-spacing: .01em;
        }
        .taeillo-unit {
          font-size: 11px;
          color: #9CA3AF;
          font-weight: 300;
        }

        /* OOS label (in info, below price) */
        .taeillo-oos-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #9CA3AF;
          font-family: 'Josefin Sans', sans-serif;
        }

        /* Add to Cart button */
        .taeillo-add-btn {
          width: 100%;
          padding: 11px 0;
          background: var(--green);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: background .18s, opacity .18s;
        }
        .taeillo-add-btn:hover { background: #145a32; }

        /* qty stepper */
        .taeillo-stepper {
          display: flex;
          align-items: center;
          gap: 0;
          width: 100%;
          border: 1.5px solid var(--green);
          border-radius: 2px;
          overflow: hidden;
        }
        .taeillo-step-btn {
          flex: 0 0 40px;
          height: 38px;
          background: transparent;
          border: none;
          color: var(--green);
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background .15s;
        }
        .taeillo-step-btn:hover:not(.disabled) { background: rgba(27,67,50,.07); }
        .taeillo-step-btn.taeillo-step-plus {
          background: var(--green);
          color: #fff;
        }
        .taeillo-step-btn.taeillo-step-plus:hover:not(.disabled) { background: #145a32; }
        .taeillo-step-btn.disabled {
          opacity: .35;
          cursor: not-allowed;
        }
        .taeillo-step-count {
          flex: 1;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          color: var(--green);
        }

        /* filter pill overrides */
        .filter-pill { display: inline-flex; align-items: center; }

        /* responsive */
        @media (max-width: 900px) {
          .product-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .product-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .wa-text { display: none; }
          .taeillo-img-wrap { height: 180px; }
          .taeillo-name { font-size: 16px; }
          .taeillo-price { font-size: 17px; }
        }
      `}</style>
    </div>
  );
}
