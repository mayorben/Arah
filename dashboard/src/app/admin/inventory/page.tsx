'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface LowStockItem { id: string; name: string; stock_quantity: number; low_stock_threshold: number; unit: string; }
interface Movement { id: string; product_name: string; type: string; quantity_change: number; quantity_after: number; notes: string; created_at: string; }

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [restockForm, setRestockForm] = useState({ product_id: '', quantity: '', notes: '' });
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/inventory/low-stock').then((r) => setLowStock(r.data));
    api.get('/inventory/movements').then((r) => setMovements(r.data));
    api.get('/products?active_only=false').then((r) => setProducts(r.data));
  }, []);

  const restock = async () => {
    if (!restockForm.product_id || !restockForm.quantity) { toast.error('Select product and quantity'); return; }
    try {
      await api.post('/inventory/restock', {
        product_id: restockForm.product_id,
        quantity: parseFloat(restockForm.quantity),
        notes: restockForm.notes,
      });
      toast.success('Restock recorded! Customers notified.');
      setRestockForm({ product_id: '', quantity: '', notes: '' });
      api.get('/inventory/low-stock').then((r) => setLowStock(r.data));
      api.get('/inventory/movements').then((r) => setMovements(r.data));
    } catch { toast.error('Restock failed'); }
  };

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold mb-6" style={{ color: '#1B4332' }}>Inventory</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* LOW STOCK */}
        <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E5E0D5' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} style={{ color: '#EF4444' }} />
            <h2 className="font-semibold text-xs tracking-widest uppercase" style={{ color: lowStock.length > 0 ? '#EF4444' : '#10B981' }}>
              Low Stock ({lowStock.length})
            </h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">All products are well stocked. 🎉</p>
          ) : (
            lowStock.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: '#E5E0D5' }}>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">Threshold: {item.low_stock_threshold} {item.unit}</p>
                </div>
                <span className="font-bold text-red-500">{item.stock_quantity} left</span>
              </div>
            ))
          )}
        </div>

        {/* RESTOCK FORM */}
        <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E5E0D5' }}>
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={16} style={{ color: '#1B4332' }} />
            <h2 className="font-semibold text-xs tracking-widest uppercase" style={{ color: '#C9A84C' }}>Record Restock</h2>
          </div>
          <select value={restockForm.product_id} onChange={(e) => setRestockForm((f) => ({ ...f, product_id: e.target.value }))}
            className="w-full border rounded-sm px-4 py-3 mb-3 text-sm outline-none" style={{ borderColor: '#E5E0D5' }}>
            <option value="">Select product...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" placeholder="Quantity added" value={restockForm.quantity}
            onChange={(e) => setRestockForm((f) => ({ ...f, quantity: e.target.value }))}
            className="w-full border rounded-sm px-4 py-3 mb-3 text-sm outline-none" style={{ borderColor: '#E5E0D5' }} />
          <input placeholder="Notes (optional)" value={restockForm.notes}
            onChange={(e) => setRestockForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full border rounded-sm px-4 py-3 mb-4 text-sm outline-none" style={{ borderColor: '#E5E0D5' }} />
          <button onClick={restock} className="w-full py-3 text-white font-semibold rounded-sm text-sm"
            style={{ backgroundColor: '#1B4332' }}>
            Record Restock & Notify Customers
          </button>
        </div>
      </div>

      {/* MOVEMENTS TABLE */}
      <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E0D5' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: '#E5E0D5' }}>
          <h2 className="font-semibold text-xs tracking-widest uppercase" style={{ color: '#C9A84C' }}>Recent Movements</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8F6F0' }}>
              {['Product', 'Type', 'Change', 'After', 'Notes', 'Date'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b" style={{ borderColor: '#E5E0D5' }}>
                <td className="px-5 py-3">{m.product_name}</td>
                <td className="px-5 py-3 capitalize">
                  <span className="px-2 py-1 rounded text-xs font-medium" style={{
                    backgroundColor: m.type === 'restock' ? '#D1FAE5' : '#FEE2E2',
                    color: m.type === 'restock' ? '#065F46' : '#991B1B',
                  }}>{m.type}</span>
                </td>
                <td className={`px-5 py-3 font-mono font-medium ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                </td>
                <td className="px-5 py-3 font-mono">{m.quantity_after}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{m.notes || '—'}</td>
                <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
