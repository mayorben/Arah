'use client';
import { useEffect, useState } from 'react';
import { Plus, Wand2, Check, Copy } from 'lucide-react';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string; name: string; category: string; unit: string;
  sale_price: number; stock_quantity: number; is_active: boolean;
  description: string; short_description: string;
}

interface Prompts { description: string; short_description: string; whatsapp_caption: string; restock_announcement: string; }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [activePrompt, setActivePrompt] = useState<keyof Prompts>('description');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/products?active_only=false').then((r) => setProducts(r.data));
  useEffect(() => { load(); }, []);

  const openStudio = async (p: Product) => {
    setEditing(p);
    const { data } = await api.get(`/ai-content/prompts/${p.id}`);
    setPrompts(data);
    setShowStudio(true);
    setPastedText('');
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prompt copied! Paste it into Claude.ai');
  };

  const applyContent = async () => {
    if (!editing || !pastedText.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post('/ai-content', {
        product_id: editing.id,
        content_type: activePrompt,
        generated_text: pastedText.trim(),
      });
      await api.post('/ai-content/apply', {
        content_id: data.id,
        apply_to_field: activePrompt === 'short_description' ? 'short_description' : 'description',
      });
      toast.success('Applied to product!');
      setPastedText('');
      load();
    } finally { setSaving(false); }
  };

  const PROMPT_LABELS: Record<string, string> = {
    description: 'Long Description',
    short_description: 'Short Tagline',
    whatsapp_caption: 'WhatsApp Caption',
    restock_announcement: 'Restock Announcement',
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: '#1B4332' }}>Products</h1>
        <button className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-sm" style={{ backgroundColor: '#1B4332' }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-lg border" style={{ borderColor: '#E5E0D5' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#E5E0D5', backgroundColor: '#F8F6F0' }}>
              {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E0D5' }}>
                <td className="px-5 py-4 font-medium">{p.name}</td>
                <td className="px-5 py-4 text-gray-500">{p.category}</td>
                <td className="px-5 py-4 font-semibold" style={{ color: '#1B4332' }}>{naira(p.sale_price)}<span className="text-xs text-gray-400 font-normal"> / {p.unit}</span></td>
                <td className="px-5 py-4">
                  <span className={`font-medium ${p.stock_quantity <= 5 ? 'text-red-500' : ''}`}>
                    {p.stock_quantity} {p.unit}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: p.is_active ? '#10B981' : '#6B7280' }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => openStudio(p)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded border transition-colors"
                    style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                    <Wand2 size={12} /> AI Studio
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI CONTENT STUDIO MODAL */}
      {showStudio && editing && prompts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#E5E0D5', backgroundColor: '#1B4332' }}>
              <h2 className="font-serif text-xl font-bold text-white">AI Content Studio</h2>
              <p className="text-sm mt-1" style={{ color: '#C9A84C' }}>{editing.name}</p>
            </div>
            <div className="p-6">
              {/* Content type tabs */}
              <div className="flex gap-2 flex-wrap mb-5">
                {(Object.keys(PROMPT_LABELS) as (keyof Prompts)[]).map((key) => (
                  <button key={key} onClick={() => setActivePrompt(key)}
                    className="px-3 py-1.5 text-xs font-semibold rounded border transition-all"
                    style={{
                      borderColor: activePrompt === key ? '#1B4332' : '#E5E0D5',
                      backgroundColor: activePrompt === key ? '#1B4332' : 'white',
                      color: activePrompt === key ? 'white' : '#6B7280',
                    }}>
                    {PROMPT_LABELS[key]}
                  </button>
                ))}
              </div>

              {/* Instructions */}
              <div className="rounded p-4 mb-4 text-sm" style={{ backgroundColor: '#F8F6F0', borderLeft: '3px solid #C9A84C' }}>
                <p className="font-semibold mb-1" style={{ color: '#1B4332' }}>How to use:</p>
                <p className="text-gray-600">Copy the prompt below → open <strong>claude.ai</strong> → paste → copy Claude's reply → paste it back here.</p>
              </div>

              {/* Prompt box */}
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#6B7280' }}>
                Your Prompt (copy this into Claude.ai)
              </label>
              <div className="relative">
                <pre className="rounded p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap border" style={{ backgroundColor: '#F8F6F0', borderColor: '#E5E0D5', color: '#1A1A1A' }}>
                  {prompts[activePrompt]}
                </pre>
                <button onClick={() => copyPrompt(prompts[activePrompt])}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: '#1B4332', color: 'white' }}>
                  <Copy size={11} /> Copy
                </button>
              </div>

              {/* Paste area */}
              <label className="text-xs font-semibold uppercase tracking-wider block mt-5 mb-2" style={{ color: '#6B7280' }}>
                Paste Claude's Response Here
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={5}
                placeholder="Paste what Claude wrote for you..."
                className="w-full border rounded p-4 text-sm outline-none resize-none"
                style={{ borderColor: '#E5E0D5' }}
              />

              <div className="flex gap-3 mt-4">
                <button onClick={applyContent} disabled={!pastedText.trim() || saving}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-sm disabled:opacity-50"
                  style={{ backgroundColor: '#1B4332' }}>
                  <Check size={14} /> {saving ? 'Saving...' : 'Apply to Product'}
                </button>
                <button onClick={() => setShowStudio(false)}
                  className="px-5 py-2.5 text-sm border rounded-sm"
                  style={{ borderColor: '#E5E0D5' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
