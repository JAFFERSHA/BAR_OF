import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Bar Inventory & Billing',
  description: 'Stock, purchase, and billing for bars'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: '#1a1d2e',
              border: '1px solid #2a2a3a',
              color: '#e2e8f0',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}
