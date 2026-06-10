'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, ChevronRight } from 'lucide-react';

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { api, naira } from '@/lib/api';

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
  ? `https://wa.me/${waNumber}?text=${encodeURIComponent('Hi! I\'d like to place an order.')}`
  : '#';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products').then((r) => { setProducts(r.data); setLoading(false); });
  }, []);

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeFromCart = (id: string) =>
    setCart((c) => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F0' }}>
      {/* NAV */}
      <nav style={{ backgroundColor: '#1B4332' }} className="sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <span className="font-serif text-2xl font-bold text-white">Arah</span>
            <span className="text-xs tracking-widest uppercase ml-2" style={{ color: '#C9A84C' }}>Provisions</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/order" className="relative text-white hover:text-yellow-300 transition-colors">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">Admin</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ backgroundColor: '#1B4332' }} className="text-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#C9A84C' }}>Premium Quality</p>
          <h1 className="font-serif text-5xl font-bold mb-4 leading-tight">
            The finest provisions,<br />delivered to your door.
          </h1>
          <p className="text-white/70 text-lg max-w-xl">
            Rice, beans, palm oil and everything your kitchen needs — sourced with care, packed with pride.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <a href="#products" className="inline-flex items-center gap-2 px-6 py-3 rounded-sm text-sm font-semibold"
              style={{ backgroundColor: '#C9A84C', color: '#1A1A1A' }}>
              Shop Now <ChevronRight size={16} />
            </a>
            {waNumber && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm text-sm font-semibold text-white transition-colors"
                style={{ border: '1.5px solid rgba(255,255,255,0.35)' }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                {WA_ICON} Order on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* GOLD STRIPE */}
      <div style={{ height: 4, backgroundColor: '#C9A84C' }} />

      {/* PRODUCTS */}
      <div id="products" className="max-w-6xl mx-auto px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="flex gap-3 mb-10 flex-wrap">
                {categories.map((cat) => (
                  <button key={cat} className="px-4 py-1.5 text-xs font-semibold tracking-wider uppercase rounded-full border transition-all"
                    style={{ borderColor: '#C9A84C', color: '#1B4332' }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border"
                  style={{ borderColor: '#E5E0D5' }}>
                  <div className="relative" style={{ backgroundColor: '#F8F6F0', height: 200 }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-serif text-4xl" style={{ color: '#C9A84C' }}>
                          {p.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {p.is_featured && (
                      <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded"
                        style={{ backgroundColor: '#1B4332', color: 'white' }}>
                        Featured
                      </span>
                    )}
                    {p.stock_quantity <= 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-semibold">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#6B7280' }}>{p.category}</p>
                    <h3 className="font-serif text-lg font-semibold mb-1" style={{ color: '#1A1A1A' }}>{p.name}</h3>
                    {p.short_description && (
                      <p className="text-sm mb-3" style={{ color: '#6B7280' }}>{p.short_description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <span className="font-bold text-lg" style={{ color: '#1B4332' }}>{naira(p.sale_price)}</span>
                        <span className="text-xs ml-1" style={{ color: '#6B7280' }}>/ {p.unit}</span>
                      </div>
                      {p.stock_quantity > 0 && (
                        <div className="flex items-center gap-2">
                          {cart[p.id] ? (
                            <>
                              <button onClick={() => removeFromCart(p.id)}
                                className="w-7 h-7 rounded-full border font-bold text-sm transition-colors"
                                style={{ borderColor: '#1B4332', color: '#1B4332' }}>−</button>
                              <span className="font-semibold w-4 text-center">{cart[p.id]}</span>
                              <button onClick={() => addToCart(p.id)}
                                className="w-7 h-7 rounded-full font-bold text-sm text-white"
                                style={{ backgroundColor: '#1B4332' }}>+</button>
                            </>
                          ) : (
                            <button onClick={() => addToCart(p.id)}
                              className="px-4 py-2 text-xs font-semibold text-white rounded-sm"
                              style={{ backgroundColor: '#1B4332' }}>
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

      {/* FLOATING WHATSAPP */}
      {waNumber && (
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-8 left-8 flex items-center gap-3 px-5 py-4 rounded-full shadow-xl text-white font-semibold text-sm transition-transform hover:scale-105"
          style={{ backgroundColor: '#25D366', boxShadow: '0 8px 28px rgba(37,211,102,0.4)' }}>
          {WA_ICON} Order on WhatsApp
        </a>
      )}

      {/* FLOATING CART */}
      {cartCount > 0 && (
        <Link href="/order" className="fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-full shadow-xl text-white font-semibold"
          style={{ backgroundColor: '#1B4332' }}>
          <ShoppingCart size={20} />
          View Cart ({cartCount})
        </Link>
      )}

      {/* FOOTER */}
      <footer className="py-10 text-center text-sm" style={{ backgroundColor: '#1B4332', color: 'white' }}>
        <p className="font-serif text-xl font-bold mb-1">Arah Provisions</p>
        <p style={{ color: '#C9A84C' }} className="text-xs tracking-widest uppercase">Premium Quality · Honest Prices</p>
      </footer>
    </div>
  );
}
