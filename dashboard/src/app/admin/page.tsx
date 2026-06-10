'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, ShoppingBag, Users, AlertTriangle, Package, BarChart2, LogOut } from 'lucide-react';
import { api, naira, login } from '@/lib/api';

interface Overview {
  monthly_revenue: number;
  weekly_orders: number;
  total_customers: number;
  low_stock_count: number;
  top_products: { name: string; revenue: number }[];
  recent_orders: { order_number: string; customer_name: string; total: number; status: string; created_at: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending:    '#F59E0B',
  confirmed:  '#3B82F6',
  packed:     '#8B5CF6',
  dispatched: '#EC4899',
  delivered:  '#10B981',
  cancelled:  '#EF4444',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loginForm, setLoginForm] = useState({ u: '', p: '' });
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('arah_token');
    if (token) { setAuthed(true); fetchOverview(); }
  }, []);

  const fetchOverview = () => {
    api.get('/analytics/overview').then((r) => setOverview(r.data)).catch(() => {
      localStorage.removeItem('arah_token'); setAuthed(false);
    });
  };

  const handleLogin = async () => {
    try { await login(loginForm.u, loginForm.p); setAuthed(true); fetchOverview(); }
    catch { alert('Invalid credentials'); }
  };

  const logout = () => { localStorage.removeItem('arah_token'); setAuthed(false); };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1B4332' }}>
        <div className="bg-white rounded-lg p-10 w-full max-w-sm shadow-xl">
          <h1 className="font-serif text-2xl font-bold mb-2 text-center" style={{ color: '#1B4332' }}>Arah Admin</h1>
          <p className="text-xs text-center tracking-widest uppercase mb-8" style={{ color: '#C9A84C' }}>Business Dashboard</p>
          <input placeholder="Username" value={loginForm.u} onChange={(e) => setLoginForm((f) => ({ ...f, u: e.target.value }))}
            className="w-full border rounded-sm px-4 py-3 mb-3 text-sm outline-none" style={{ borderColor: '#E5E0D5' }} />
          <input type="password" placeholder="Password" value={loginForm.p} onChange={(e) => setLoginForm((f) => ({ ...f, p: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full border rounded-sm px-4 py-3 mb-6 text-sm outline-none" style={{ borderColor: '#E5E0D5' }} />
          <button onClick={handleLogin} className="w-full py-3 text-white font-semibold rounded-sm" style={{ backgroundColor: '#1B4332' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F0' }}>
      {/* SIDEBAR */}
      <div className="flex">
        <aside className="w-56 min-h-screen fixed top-0 left-0 flex flex-col py-8 px-5" style={{ backgroundColor: '#1B4332' }}>
          <div className="mb-10">
            <p className="font-serif text-xl font-bold text-white">Arah</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: '#C9A84C' }}>Admin</p>
          </div>
          <nav className="flex-1 space-y-1">
            {[
              { href: '/admin', icon: BarChart2, label: 'Overview' },
              { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
              { href: '/admin/products', icon: Package, label: 'Products' },
              { href: '/admin/inventory', icon: TrendingUp, label: 'Inventory' },
              { href: '/admin/customers', icon: Users, label: 'Customers' },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="flex items-center gap-2 text-white/50 hover:text-white text-sm mt-4 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="ml-56 flex-1 p-8">
          <h1 className="font-serif text-2xl font-bold mb-8" style={{ color: '#1B4332' }}>Overview</h1>

          {overview ? (
            <>
              {/* KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                  { label: 'Revenue This Month', value: naira(overview.monthly_revenue), icon: TrendingUp, color: '#1B4332' },
                  { label: 'Orders This Week', value: overview.weekly_orders, icon: ShoppingBag, color: '#3B82F6' },
                  { label: 'Total Customers', value: overview.total_customers, icon: Users, color: '#8B5CF6' },
                  { label: 'Low Stock Items', value: overview.low_stock_count, icon: AlertTriangle, color: overview.low_stock_count > 0 ? '#EF4444' : '#10B981' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-lg p-5 border shadow-sm" style={{ borderColor: '#E5E0D5' }}>
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-xs tracking-wider uppercase font-semibold" style={{ color: '#6B7280' }}>{label}</p>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <p className="text-2xl font-bold font-serif" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* TOP PRODUCTS */}
              {overview.top_products.length > 0 && (
                <div className="bg-white rounded-lg p-6 border mb-6" style={{ borderColor: '#E5E0D5' }}>
                  <h2 className="font-semibold mb-4 text-xs tracking-widest uppercase" style={{ color: '#C9A84C' }}>
                    Top Products (30 days)
                  </h2>
                  {overview.top_products.map((p) => (
                    <div key={p.name} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: '#E5E0D5' }}>
                      <span className="font-medium">{p.name}</span>
                      <span className="font-semibold" style={{ color: '#1B4332' }}>{naira(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* RECENT ORDERS */}
              <div className="bg-white rounded-lg p-6 border" style={{ borderColor: '#E5E0D5' }}>
                <h2 className="font-semibold mb-4 text-xs tracking-widest uppercase" style={{ color: '#C9A84C' }}>
                  Recent Orders
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#E5E0D5' }}>
                      {['Order', 'Customer', 'Total', 'Status', 'Date'].map((h) => (
                        <th key={h} className="text-left pb-2 font-semibold text-xs uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recent_orders.map((o) => (
                      <tr key={o.order_number} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E0D5' }}>
                        <td className="py-3 font-mono text-xs">{o.order_number}</td>
                        <td className="py-3">{o.customer_name}</td>
                        <td className="py-3 font-semibold" style={{ color: '#1B4332' }}>{naira(o.total)}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: STATUS_COLORS[o.status] || '#6B7280' }}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 text-xs" style={{ color: '#6B7280' }}>
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg h-28 animate-pulse border" style={{ borderColor: '#E5E0D5' }} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
