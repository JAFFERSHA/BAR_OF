import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bar Inventory & Billing',
  description: 'Stock, purchase, and billing for bars'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
