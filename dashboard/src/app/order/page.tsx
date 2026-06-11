'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  unit: string;
  sale_price: number;
  stock_quantity: number;
}

interface CartItem {
  product_id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

interface PaystackHandler {
  openIframe: () => void;
}
interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata: Record<string, unknown>;
  callback: (r: { reference: string }) => void;
  onClose: () => void;
}
declare global {
  interface Window {
    PaystackPop?: { setup: (opts: PaystackOptions) => PaystackHandler };
  }
}

const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

export default function OrderPage() {
  const router = useRouter();
  const [items, setItems]               = useState<CartItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [form, setForm]                 = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [submitting, setSubmitting]     = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const pendingOrderRef = useRef<{ order_number: string } | null>(null);

  // Load Paystack inline script
  useEffect(() => {
    if (window.PaystackPop) { setPaystackReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload  = () => setPaystackReady(true);
    script.onerror = () => console.warn('Paystack script failed to load');
    document.head.appendChild(script);
  }, []);

  // Build cart from localStorage + API
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
          name:  byId[id].name,
          unit:  byId[id].unit,
          price: byId[id].sale_price,
          quantity: qty,
        }));
      setItems(built);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateQty = (id: string, delta: number) => {
    setItems((prev) => {
      const next = prev
        .map((i) => i.product_id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0);
      const map: Record<string, number> = {};
      next.forEach((i) => { map[i.product_id] = i.quantity; });
      localStorage.setItem('arah_cart', JSON.stringify(map));
      return next;
    });
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // ── Paystack payment after order is created ───────────────────────────────
  const openPaystack = (orderNumber: string) => {
    if (!window.PaystackPop) {
      toast.error('Payment system not ready. Please refresh the page.');
      setSubmitting(false);
      return;
    }

    const email = form.email.trim() ||
      `${form.phone.replace(/\D/g, '')}@customers.arahprovisions.com`;

    const handler = window.PaystackPop.setup({
      key:      PAYSTACK_KEY,
      email,
      amount:   Math.round(total * 100), // kobo
      currency: 'NGN',
      ref:      orderNumber,
      metadata: {
        order_number:   orderNumber,
        customer_name:  form.name,
        customer_phone: form.phone,
      },
      callback: async ({ reference }) => {
        // Verify server-side and mark order paid
        try {
          await api.post('/payments/verify', { reference, order_number: orderNumber });
          localStorage.removeItem('arah_cart');
          toast.success('Payment confirmed! Your invoice is on the way.');
          router.push(`/?order=${orderNumber}&paid=true`);
        } catch {
          toast.error('Payment received but verification failed. Please contact us.');
          setSubmitting(false);
        }
      },
      onClose: () => {
        toast.error('Payment not completed — your order is saved. Pay when ready.');
        setSubmitting(false);
      },
    });

    handler.openIframe();
  };

  // ── Main submit: create order then open Paystack ──────────────────────────
  const submit = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    if (!items.length) { toast.error('Your cart is empty'); return; }

    if (PAYSTACK_KEY && !paystackReady) {
      toast.error('Payment system loading… please wait a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        customer_name:    form.name,
        customer_phone:   form.phone,
        delivery_address: form.address,
        delivery_city:    form.city,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });

      pendingOrderRef.current = { order_number: data.order_number };

      if (PAYSTACK_KEY) {
        // Open payment popup — submitting stays true; reset in callback/onClose
        openPaystack(data.order_number);
      } else {
        // Paystack not configured — legacy flow
        localStorage.removeItem('arah_cart');
        toast.success('Order placed! Invoice coming to your WhatsApp.');
        router.push(`/?order=${data.order_number}`);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E5E0D5', borderRadius: 4,
    padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
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

        {/* ── ORDER SUMMARY ── */}
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

        {/* ── CUSTOMER DETAILS ── */}
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E5E0D5' }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 20 }}>
            Your Details
          </h2>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>Full Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Chisom Okafor" />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>WhatsApp / Phone *</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inp} placeholder="08012345678" inputMode="tel" />
          </div>

          {/* Email */}
          {PAYSTACK_KEY && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>
                Email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — for payment receipt)</span>
              </label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inp} placeholder="you@email.com" />
            </div>
          )}

          {/* Address */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>Delivery Address</label>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} style={inp} placeholder="Street address" />
          </div>

          {/* City */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>City</label>
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={inp} placeholder="Lagos" />
          </div>

          {/* CTA */}
          <button
            onClick={submit}
            disabled={submitting || !items.length || loading}
            style={{
              width: '100%', padding: '16px',
              background: items.length && !submitting ? '#1B4332' : '#9CA3AF',
              color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '.14em',
              textTransform: 'uppercase', borderRadius: 4, border: 'none',
              cursor: items.length && !submitting ? 'pointer' : 'not-allowed',
              marginBottom: 12, transition: 'opacity .2s',
              opacity: submitting ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                  <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Processing…
              </>
            ) : PAYSTACK_KEY ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                Confirm & Pay
              </>
            ) : 'Confirm Order'}
          </button>

          {/* Paystack badge */}
          {PAYSTACK_KEY && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Secured by</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#011B33', letterSpacing: '.04em' }}>Paystack</span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>· Visa · Mastercard · Verve · Bank Transfer</span>
            </div>
          )}

          {!PAYSTACK_KEY && (
            <p style={{ fontSize: 11, textAlign: 'center', color: '#9CA3AF', marginTop: 4 }}>
              Your invoice will be sent to your WhatsApp number after confirmation.
            </p>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
