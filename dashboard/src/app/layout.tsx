import type { Metadata, Viewport } from 'next';
import { ServiceWorker } from '@/components/ServiceWorker';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#1B4332',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Arah Provisions',
  description: 'Premium food provisions — rice, beans, palm oil and more. Order online or via WhatsApp.',
  manifest: '/manifest.json',
  // iOS PWA support
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Arah Provisions',
    startupImage: '/icons/icon-512x512.png',
  },
  formatDetection: { telephone: false },
  // Open Graph
  openGraph: {
    type: 'website',
    siteName: 'Arah Provisions',
    title: 'Arah Provisions',
    description: 'Premium food provisions — rice, beans, palm oil and more.',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Extra PWA / iOS meta that Next.js Metadata API doesn't cover */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Arah" />
        <meta name="msapplication-TileColor" content="#1B4332" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ServiceWorker />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}
