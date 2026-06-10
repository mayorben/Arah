'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api, naira } from '@/lib/api';

interface Customer {
  id: string; full_name: string; phone: string;
  whatsapp_id: string | null; total_orders: number;
  total_spent: number; created_at: string; city: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api.get(`/customers${search ? `?search=${search}` : ''}`).then((r) => setCustomers(r.data));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold mb-6" style={{ color: '#1B4332' }}>Customers</h1>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-3.5 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full max-w-sm border rounded-sm pl-10 pr-4 py-3 text-sm outline-none"
          style={{ borderColor: '#E5E0D5' }} />
      </div>

      <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E0D5' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8F6F0' }}>
              {['Name', 'Phone', 'WhatsApp', 'Orders', 'Total Spent', 'Location', 'Joined'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E0D5' }}>
                <td className="px-5 py-3 font-medium">{c.full_name}</td>
                <td className="px-5 py-3 font-mono text-xs">{c.phone}</td>
                <td className="px-5 py-3">
                  {c.whatsapp_id ? (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>Via Bot</span>
                  ) : (
                    <span className="text-xs text-gray-400">Web only</span>
                  )}
                </td>
                <td className="px-5 py-3">{c.total_orders}</td>
                <td className="px-5 py-3 font-semibold" style={{ color: '#1B4332' }}>{naira(c.total_spent)}</td>
                <td className="px-5 py-3 text-gray-500">{c.city || '—'}</td>
                <td className="px-5 py-3 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
