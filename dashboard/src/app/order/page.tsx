'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  unit: string;
  sale_price: number;
}

interface CartItem {
  product_id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

export default function OrderPage() {
  const router = useRouter();
  const [items, setItems]       = useState<CartItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ name: '', phone: '', address: '', city: '' });
  const [submitting, setSubmitting] = useState(false);

  // Read cart from localStorage and join with product data from the API
  useEffect(() => {
    const rawCart = localStorage.getItem('arah_cart');
    if (!rawCart) { setLoading(false); return; }
    let cartMap: Record<string, number> = {};
    try { cartMap = JSON.parse(rawCart); } catch { setLoading(false); return; }
    if (!Object.keys(cartMap).length) { setLoading(false); return; }

    api.get('/products').then((r) => {
      const byId: Record<string, Product> = {};
      r.data.forEach((p: Product) => { byId[p.id] = p; });
      const built: CartItem[] = Object.entries(cartMap)
        .filter(([id]) => byId[id])
        .map(([id, qty]) => ({
          product_id: id,
          name: byId[id].name,
          unit: byId[id].unit,
          price: byId[id].sale_price,
          quantity: qty,
        }));
      setItems(built);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateQty = (id: string, delta: number) => {
    setItems((prev) => {
      const next = prev.map((i) => i.product_id === id ? { ...i, quantity: i.quantity + delta } : i)
                      .filter((i) => i.quantity > 0);
      // keep localStorage in sync
      const map: Record<string, number> = {};
      next.forEach((i) => { map[i.product_id] = i.quantity; });
      localStorage.setItem('arah_cart', JSON.stringify(map));
      return next;
    });
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const submit = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    if (!items.length) { toast.error('Your cart is empty'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_address: form.address,
        delivery_city: form.city,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      localStorage.removeItem('arah_cart');
      toast.success('Order placed! Invoice coming your way on WhatsApp.');
      router.push(`/?order=${data.order_number}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: '#F8F6F0' }}>
      <div className="max-w-xl mx-auto">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 500, color: '#1B4332' }}>Your Order</h1>
          <Link href="/" style={{ fontSize: 12, color: '#1B4332', textDecoration: 'none', fontWeight: 600, letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back to shop
          </Link>
        </div>

        {/* ORDER SUMMARY */}
        <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E5E0D5' }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 20 }}>
            Order Summary
          </h2>

          {loading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading cart…</p>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#6B7280', marginBottom: 16 }}>No items in cart.</p>
              <Link href="/" style={{ display: 'inline-block', padding: '10px 24px', background: '#1B4332', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Shop Now
              </Link>
            </div>
          ) : (
            <>
              {items.map((i) => (
                <div key={i.product_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F0EB' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1B4332', marginBottom: 2 }}>{i.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF' }}>/ {i.unit}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 16px' }}>
                    <button onClick={() => updateQty(i.product_id, -1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #1B4332', background: 'transparent', color: '#1B4332', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{i.quantity}</span>
                    <button onClick={() => updateQty(i.product_id, +1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #1B4332', background: '#1B4332', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1B4332', minWidth: 80, textAlign: 'right' }}>{naira(i.price * i.quantity)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '2px solid #1B4332' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#1B4332' }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: '#1B4332' }}>{naira(total)}</span>
              </div>
            </>
          )}
        </div>

        {/* CUSTOMER DETAILS */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E5E0D5' }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 20 }}>
            Your Details
          </h2>
          {(['name', 'phone', 'address', 'city'] as const).map((field) => (
            <div key={field} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>
                {field === 'name' ? 'Full Name *' : field === 'phone' ? 'Phone Number *' : field === 'address' ? 'Delivery Address' : 'City'}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                style={{ width: '100%', border: '1.5px solid #E5E0D5', borderRadius: 4, padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder={field === 'phone' ? '08012345678' : ''}
              />
            </div>
          ))}

          <button
            onClick={submit}
            disabled={submitting || !items.length || loading}
            style={{ width: '100%', padding: '16px', background: items.length ? '#1B4332' : '#9CA3AF', color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', borderRadius: 4, border: 'none', cursor: items.length ? 'pointer' : 'not-allowed', marginTop: 8, transition: 'opacity .2s', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Placing order…' : 'Confirm Order'}
          </button>
          <p style={{ fontSize: 11, textAlign: 'center', marginTop: 12, color: '#9CA3AF' }}>
            Your invoice will be sent to your WhatsApp number after confirmation.
          </p>
        </div>

      </div>
    </div>
  );
}
