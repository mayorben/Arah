import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arah Provisions',
  description: 'Premium food provisions — rice, beans, palm oil and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
