'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, ChevronRight } from 'lucide-react';
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
          <a href="#products" className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-sm text-sm font-semibold"
            style={{ backgroundColor: '#C9A84C', color: '#1A1A1A' }}>
            Shop Now <ChevronRight size={16} />
          </a>
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
