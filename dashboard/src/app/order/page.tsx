'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface CartItem {
  product_id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

export default function OrderPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('arah_cart');
      if (raw) setItems(JSON.parse(raw));
    }
  }, []);

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
      sessionStorage.removeItem('arah_cart');
      toast.success('Order placed! Invoice coming your way.');
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
        <h1 className="font-serif text-3xl font-bold mb-8" style={{ color: '#1B4332' }}>Your Order</h1>

        {/* ORDER SUMMARY */}
        <div className="bg-white rounded-lg p-6 mb-6 border" style={{ borderColor: '#E5E0D5' }}>
          <h2 className="font-semibold mb-4 text-sm tracking-widest uppercase" style={{ color: '#C9A84C' }}>
            Order Summary
          </h2>
          {items.length === 0 ? (
            <p className="text-gray-500">No items in cart.</p>
          ) : (
            <>
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between py-2 border-b" style={{ borderColor: '#E5E0D5' }}>
                  <span>{i.name} × {i.quantity} {i.unit}</span>
                  <span className="font-semibold">{naira(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-4 font-bold text-lg" style={{ color: '#1B4332' }}>
                <span>Total</span>
                <span>{naira(total)}</span>
              </div>
            </>
          )}
        </div>

        {/* CUSTOMER DETAILS */}
        <div className="bg-white rounded-lg p-6 border" style={{ borderColor: '#E5E0D5' }}>
          <h2 className="font-semibold mb-4 text-sm tracking-widest uppercase" style={{ color: '#C9A84C' }}>
            Your Details
          </h2>
          {(['name', 'phone', 'address', 'city'] as const).map((field) => (
            <div key={field} className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>
                {field === 'name' ? 'Full Name *' : field === 'phone' ? 'Phone Number *' : field === 'address' ? 'Delivery Address' : 'City'}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full border rounded-sm px-4 py-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: '#E5E0D5' }}
                placeholder={field === 'phone' ? '08012345678' : ''}
              />
            </div>
          ))}

          <button
            onClick={submit}
            disabled={submitting || !items.length}
            className="w-full py-4 text-white font-semibold rounded-sm mt-2 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#1B4332' }}
          >
            {submitting ? 'Placing order...' : 'Confirm Order'}
          </button>
          <p className="text-xs text-center mt-3" style={{ color: '#6B7280' }}>
            Your invoice will be sent to your WhatsApp number after confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
