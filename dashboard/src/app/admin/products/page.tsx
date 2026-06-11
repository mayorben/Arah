'use client';
import { useEffect, useState, useMemo } from 'react';
import { Plus, Wand2, Check, Copy, Search, X } from 'lucide-react';
import { api, naira } from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string; name: string; category: string; unit: string;
  sale_price: number; stock_quantity: number; is_active: boolean;
  description: string; short_description: string;
}

interface Prompts { description: string; short_description: string; whatsapp_caption: string; restock_announcement: string; }

const UNITS = ['kg', 'g', 'litre', 'ml', 'bag', 'piece', 'carton', 'bundle', 'cup', 'unit'];
const CATS  = ['Grains', 'Legumes', 'Oils & Fats', 'Swallow', 'Seasonings', 'Vegetables', 'Spices', 'Other'];

const emptyForm = {
  name: '', category: '', unit: 'kg', sale_price: '', cost_price: '',
  stock_quantity: '0', low_stock_threshold: '10',
  short_description: '', description: '', is_active: true, is_featured: false,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch]     = useState('');

  // add-product modal
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ ...emptyForm });
  const [addErrors, setAddErrors] = useState({ name: '', sale_price: '', cost_price: '' });
  const [adding, setAdding]     = useState(false);

  // AI studio
  const [editing, setEditing]         = useState<Product | null>(null);
  const [showStudio, setShowStudio]   = useState(false);
  const [prompts, setPrompts]         = useState<Prompts | null>(null);
  const [pastedText, setPastedText]   = useState('');
  const [activePrompt, setActivePrompt] = useState<keyof Prompts>('description');
  const [saving, setSaving]           = useState(false);

  const load = () => api.get('/products?active_only=false').then((r) => setProducts(r.data));
  useEffect(() => { load(); }, []);

  // ── Search filter ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  // ── Add Product ──────────────────────────────────────────────────────────
  const field = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in addErrors) setAddErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateAdd = (): boolean => {
    const next = { name: '', sale_price: '', cost_price: '' };
    let ok = true;
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = 'Product name is required (min 2 characters)';
      ok = false;
    }
    const price = parseFloat(form.sale_price as string);
    if (!form.sale_price || isNaN(price) || price <= 0) {
      next.sale_price = 'Enter a valid sale price greater than 0';
      ok = false;
    }
    if (form.cost_price) {
      const cost = parseFloat(form.cost_price as string);
      if (isNaN(cost) || cost <= 0) {
        next.cost_price = 'Cost price must be greater than 0';
        ok = false;
      }
    }
    setAddErrors(next);
    return ok;
  };

  const submitAdd = async () => {
    if (!validateAdd()) return;
    setAdding(true);
    try {
      await api.post('/products', {
        name:               form.name.trim(),
        category:           form.category || null,
        unit:               form.unit,
        sale_price:         parseFloat(form.sale_price as string),
        cost_price:         form.cost_price ? parseFloat(form.cost_price as string) : null,
        stock_quantity:     parseFloat(form.stock_quantity as string) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold as string) || 10,
        short_description:  form.short_description.trim() || null,
        description:        form.description.trim() || null,
        is_active:          form.is_active,
        is_featured:        form.is_featured,
      });
      toast.success(`"${form.name}" added!`);
      setShowAdd(false);
      setForm({ ...emptyForm });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Failed to add product');
    } finally {
      setAdding(false);
    }
  };

  // ── AI Studio ─────────────────────────────────────────────────────────────
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

  // ── shared input style ────────────────────────────────────────────────────
  const inp = 'w-full border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-green-700';

  return (
    <div className="p-8">

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: '#1B4332' }}>Products</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-sm"
          style={{ backgroundColor: '#1B4332' }}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-5" style={{ maxWidth: 420 }}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or category…"
          className="w-full border rounded px-4 py-2.5 pl-9 text-sm outline-none"
          style={{ borderColor: '#E5E0D5', background: 'white' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-lg border overflow-x-auto" style={{ borderColor: '#E5E0D5' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#E5E0D5', backgroundColor: '#F8F6F0' }}>
              {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  {search ? `No products matching "${search}"` : 'No products yet'}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E0D5' }}>
                <td className="px-5 py-4 font-medium">{p.name}</td>
                <td className="px-5 py-4 text-gray-500">{p.category}</td>
                <td className="px-5 py-4 font-semibold" style={{ color: '#1B4332' }}>
                  {naira(p.sale_price)}<span className="text-xs text-gray-400 font-normal"> / {p.unit}</span>
                </td>
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
        {search && filtered.length > 0 && (
          <p className="px-5 py-2 text-xs text-gray-400 border-t" style={{ borderColor: '#E5E0D5' }}>
            {filtered.length} of {products.length} products
          </p>
        )}
      </div>

      {/* ── ADD PRODUCT MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E5E0D5', backgroundColor: '#1B4332', borderRadius: '8px 8px 0 0' }}>
              <div>
                <h2 className="font-serif text-xl font-bold text-white">Add New Product</h2>
                <p className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>Fill in the details below to list a new product</p>
              </div>
              <button onClick={() => { setShowAdd(false); setAddErrors({ name: '', sale_price: '', cost_price: '' }); }} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1">

              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>
                    Product Name <span className="text-red-400">*</span>
                  </label>
                  <input value={form.name} onChange={(e) => field('name', e.target.value)}
                    placeholder="e.g. Local Brown Rice" className={inp}
                    style={{ borderColor: addErrors.name ? '#EF4444' : '#E5E0D5' }} />
                  {addErrors.name && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{addErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Category</label>
                  <select value={form.category} onChange={(e) => field('category', e.target.value)}
                    className={inp} style={{ borderColor: '#E5E0D5' }}>
                    <option value="">— select —</option>
                    {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Sale price + Cost price + Unit */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>
                    Sale Price (₦) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="0" step="0.01" value={form.sale_price}
                    onChange={(e) => field('sale_price', e.target.value)}
                    placeholder="4500" className={inp}
                    style={{ borderColor: addErrors.sale_price ? '#EF4444' : '#E5E0D5' }} />
                  {addErrors.sale_price && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{addErrors.sale_price}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Cost Price (₦)</label>
                  <input type="number" min="0" step="0.01" value={form.cost_price}
                    onChange={(e) => field('cost_price', e.target.value)}
                    placeholder="3200 (optional)" className={inp}
                    style={{ borderColor: addErrors.cost_price ? '#EF4444' : '#E5E0D5' }} />
                  {addErrors.cost_price && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{addErrors.cost_price}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Unit</label>
                  <select value={form.unit} onChange={(e) => field('unit', e.target.value)}
                    className={inp} style={{ borderColor: '#E5E0D5' }}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Stock + Low stock threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Opening Stock Quantity</label>
                  <input type="number" min="0" step="0.01" value={form.stock_quantity}
                    onChange={(e) => field('stock_quantity', e.target.value)}
                    placeholder="50" className={inp} style={{ borderColor: '#E5E0D5' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Low Stock Alert Below</label>
                  <input type="number" min="0" value={form.low_stock_threshold}
                    onChange={(e) => field('low_stock_threshold', e.target.value)}
                    placeholder="10" className={inp} style={{ borderColor: '#E5E0D5' }} />
                </div>
              </div>

              {/* Short description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Short Tagline</label>
                <input value={form.short_description} onChange={(e) => field('short_description', e.target.value)}
                  placeholder="One punchy sentence shown on the storefront card"
                  className={inp} style={{ borderColor: '#E5E0D5' }} />
              </div>

              {/* Full description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Full Description</label>
                <textarea value={form.description} onChange={(e) => field('description', e.target.value)}
                  rows={3} placeholder="Longer product description (optional)…"
                  className={`${inp} resize-none`} style={{ borderColor: '#E5E0D5' }} />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                {([['is_active', 'Active (visible on store)'], ['is_featured', 'Featured product']] as [string, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                    <div
                      onClick={() => field(key, !form[key as keyof typeof form])}
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{ background: form[key as keyof typeof form] ? '#1B4332' : '#D1D5DB' }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        style={{ transform: form[key as keyof typeof form] ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </div>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* footer */}
            <div className="p-5 border-t flex gap-3 justify-end" style={{ borderColor: '#E5E0D5' }}>
              <button onClick={() => { setShowAdd(false); setAddErrors({ name: '', sale_price: '', cost_price: '' }); }}
                className="px-5 py-2.5 text-sm border rounded-sm" style={{ borderColor: '#E5E0D5' }}>
                Cancel
              </button>
              <button onClick={submitAdd} disabled={adding}
                className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-sm disabled:opacity-50"
                style={{ backgroundColor: '#1B4332' }}>
                <Plus size={15} /> {adding ? 'Adding…' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI CONTENT STUDIO MODAL ── */}
      {showStudio && editing && prompts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#E5E0D5', backgroundColor: '#1B4332' }}>
              <h2 className="font-serif text-xl font-bold text-white">AI Content Studio</h2>
              <p className="text-sm mt-1" style={{ color: '#C9A84C' }}>{editing.name}</p>
            </div>
            <div className="p-6">
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

              <div className="rounded p-4 mb-4 text-sm" style={{ backgroundColor: '#F8F6F0', borderLeft: '3px solid #C9A84C' }}>
                <p className="font-semibold mb-1" style={{ color: '#1B4332' }}>How to use:</p>
                <p className="text-gray-600">Copy the prompt below → open <strong>claude.ai</strong> → paste → copy Claude's reply → paste it back here.</p>
              </div>

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

              <label className="text-xs font-semibold uppercase tracking-wider block mt-5 mb-2" style={{ color: '#6B7280' }}>
                Paste Claude's Response Here
              </label>
              <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)}
                rows={5} placeholder="Paste what Claude wrote for you..."
                className="w-full border rounded p-4 text-sm outline-none resize-none"
                style={{ borderColor: '#E5E0D5' }} />

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
