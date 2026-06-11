'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeCat, setActiveCat] = useState('All');

  useEffect(() => {
    api.get('/products').then((r) => { setProducts(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];
  const visible = products.filter((p) => {
    const matchCat = activeCat === 'All' || p.category === activeCat;
    const matchQ   = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.short_description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* NAV */}
      <nav style={{ background: 'var(--green)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,.25)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 10, textDecoration: 'none' }}>
          <span className="font-display" style={{ fontSize: 28, fontWeight: 600, color: 'white', letterSpacing: '.04em' }}>Arah</span>
          <span className="font-label" style={{ fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>Provisions</span>
        </Link>
        <Link href="/order" className="font-label" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'white', textDecoration: 'none', padding: '8px 18px', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 2 }}>
          View Order
        </Link>
      </nav>

      {/* HEADER */}
      <div style={{ background: 'var(--green)', padding: '48px 40px 56px', borderBottom: '4px solid var(--gold)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 600 }}>Browse our selection</p>
          <h1 className="font-display" style={{ fontSize: 48, fontWeight: 500, color: 'white', marginBottom: 24, letterSpacing: '-.01em' }}>All Provisions</h1>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width: '100%', maxWidth: 420, padding: '12px 18px', borderRadius: 4, border: '1.5px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: 'white', fontSize: 14, outline: 'none' }}
          />
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* FILTERS */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
            {categories.map((cat) => (
              <button key={cat} className={`filter-pill${activeCat === cat ? ' active' : ''}`} onClick={() => setActiveCat(cat)}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 10, height: 280, opacity: 0.6 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p className="font-display" style={{ fontSize: 24, color: 'var(--muted)' }}>No products found</p>
            <button onClick={() => { setSearch(''); setActiveCat('All'); }} className="font-label" style={{ marginTop: 16, padding: '10px 22px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Clear filters
            </button>
          </div>
        ) : (
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
                      <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Out of Stock</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '18px 20px 20px' }}>
                  <p className="font-label" style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{p.category}</p>
                  <h3 className="font-display" style={{ fontSize: 20, fontWeight: 500, marginBottom: 6, color: 'var(--ink)', lineHeight: 1.2 }}>{p.name}</h3>
                  {p.short_description && (
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14, fontWeight: 300 }}>{p.short_description}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div>
                      <span className="font-display" style={{ fontWeight: 600, fontSize: 20, color: 'var(--green)' }}>{naira(p.sale_price)}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4, fontWeight: 300 }}>/ {p.unit}</span>
                    </div>
                    {p.stock_quantity >= 0 && (
                      <Link href="/order" className="font-label" style={{ padding: '8px 18px', background: 'var(--green)', color: 'white', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', borderRadius: 2, textDecoration: 'none' }}>
                        Order
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ background: 'var(--green)', color: 'white', textAlign: 'center', padding: '40px 24px' }}>
        <p className="font-display" style={{ fontSize: 28, fontWeight: 500, marginBottom: 8, letterSpacing: '.04em' }}>Arah Provisions</p>
        <p className="font-label" style={{ fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>Premium Quality · Honest Prices</p>
      </footer>

      <style>{`
        @media (max-width: 900px) { .product-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) {
          .product-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          nav { padding: 14px 20px !important; }
        }
      `}</style>
    </div>
  );
}
