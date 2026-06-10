'use client';
import { useEffect, useState } from 'react';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface Order {
  id: string; order_number: string; customer_name: string;
  total_amount: number; status: string; channel: string;
  created_at: string; items: { product_name: string; quantity: number; line_total: number }[];
}

const STATUSES = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'];
const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', packed: '#8B5CF6',
  dispatched: '#EC4899', delivered: '#10B981', cancelled: '#EF4444',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => api.get(`/orders${filter ? `?status=${filter}` : ''}`).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/orders/${id}/status?status=${status}`);
    toast.success(`Status updated to ${status}`);
    load();
  };

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold mb-6" style={{ color: '#1B4332' }}>Orders</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('')}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border transition-all"
          style={{ borderColor: '#1B4332', backgroundColor: !filter ? '#1B4332' : 'white', color: !filter ? 'white' : '#1B4332' }}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 text-xs font-semibold rounded-full border capitalize transition-all"
            style={{ borderColor: STATUS_COLORS[s], backgroundColor: filter === s ? STATUS_COLORS[s] : 'white', color: filter === s ? 'white' : STATUS_COLORS[s] }}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E5E0D5' }}>
            <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div className="flex items-center gap-6">
                <span className="font-mono text-xs font-bold" style={{ color: '#1B4332' }}>{o.order_number}</span>
                <span className="font-medium">{o.customer_name}</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#F8F6F0' }}>{o.channel}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold" style={{ color: '#1B4332' }}>{naira(o.total_amount)}</span>
                <span className="px-2 py-1 rounded-full text-xs font-semibold text-white capitalize"
                  style={{ backgroundColor: STATUS_COLORS[o.status] || '#6B7280' }}>
                  {o.status}
                </span>
              </div>
            </div>

            {expanded === o.id && (
              <div className="px-6 pb-4 border-t" style={{ borderColor: '#E5E0D5' }}>
                <div className="py-3 mb-3">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span className="font-medium">{naira(item.line_total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 mr-2 self-center">Update status:</span>
                  {STATUSES.filter((s) => s !== o.status).map((s) => (
                    <button key={s} onClick={() => updateStatus(o.id, s)}
                      className="px-3 py-1 text-xs font-semibold rounded capitalize text-white"
                      style={{ backgroundColor: STATUS_COLORS[s] }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
