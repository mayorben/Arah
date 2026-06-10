'use client';
import { useEffect, useState } from 'react';
import { Download, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  order_number: string;
  status: string;
  pdf_object_key: string | null;
  whatsapp_sent: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#F59E0B',
  sent:  '#10B981',
  paid:  '#1B4332',
  void:  '#EF4444',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/invoices').then((r) => { setInvoices(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resend = async (id: string, num: string) => {
    try {
      await api.post(`/invoices/${id}/resend`);
      toast.success(`Invoice ${num} queued for resend`);
      setTimeout(load, 2000);
    } catch { toast.error('Failed to resend'); }
  };

  const download = (id: string) => {
    window.open(`/api/invoices/${id}/pdf`, '_blank');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: '#1B4332' }}>Invoices</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-sm border transition-colors hover:bg-gray-50" style={{ borderColor: '#E5E0D5' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E0D5' }}>
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No invoices yet. They appear automatically when orders are placed.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F8F6F0' }}>
                {['Invoice #', 'Order #', 'Status', 'WhatsApp', 'PDF', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E0D5' }}>
                  <td className="px-5 py-3 font-mono font-bold text-xs" style={{ color: '#1B4332' }}>{inv.invoice_number}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{inv.order_number}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: STATUS_COLORS[inv.status] || '#6B7280' }}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {inv.whatsapp_sent
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <Clock size={16} className="text-gray-300" />}
                  </td>
                  <td className="px-5 py-3">
                    {inv.pdf_object_key
                      ? <span className="text-xs text-green-600 font-medium">Ready</span>
                      : <span className="text-xs text-gray-400">Pending</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {inv.pdf_object_key && (
                        <button onClick={() => download(inv.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors hover:bg-gray-50"
                          style={{ borderColor: '#E5E0D5', color: '#1B4332' }}>
                          <Download size={12} /> PDF
                        </button>
                      )}
                      <button onClick={() => resend(inv.id, inv.invoice_number)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors hover:bg-gray-50"
                        style={{ borderColor: '#E5E0D5', color: '#6B7280' }}>
                        <RefreshCw size={12} /> Resend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
