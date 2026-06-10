'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Package, ShoppingBag, Layers, Users, FileText, LogOut } from 'lucide-react';

const NAV = [
  { href: '/admin',           icon: BarChart2,   label: 'Overview',  exact: true },
  { href: '/admin/products',  icon: Package,     label: 'Products'             },
  { href: '/admin/orders',    icon: ShoppingBag, label: 'Orders'               },
  { href: '/admin/inventory', icon: Layers,      label: 'Inventory'            },
  { href: '/admin/customers', icon: Users,       label: 'Customers'            },
  { href: '/admin/invoices',  icon: FileText,    label: 'Invoices'             },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setAuthed(!!localStorage.getItem('arah_token'));
    const refresh = () => setAuthed(!!localStorage.getItem('arah_token'));
    window.addEventListener('arah:auth', refresh);
    return () => window.removeEventListener('arah:auth', refresh);
  }, []);

  if (!hydrated) return <div style={{ minHeight: '100vh', backgroundColor: '#F8F6F0' }} />;
  if (!authed) return <>{children}</>;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F8F6F0' }}>
      <aside className="w-56 min-h-screen fixed top-0 left-0 flex flex-col py-8 px-5 z-40" style={{ backgroundColor: '#1B4332' }}>
        <div className="mb-10">
          <Link href="/" className="font-serif text-xl font-bold text-white hover:text-white/80 transition-colors">Arah</Link>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: '#C9A84C' }}>Admin</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all"
                style={{ backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.6)' }}>
                <Icon size={16} />{label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => { localStorage.removeItem('arah_token'); setAuthed(false); window.dispatchEvent(new Event('arah:auth')); }}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <LogOut size={14} /> Sign out
        </button>
      </aside>
      <main className="ml-56 flex-1">{children}</main>
    </div>
  );
}
